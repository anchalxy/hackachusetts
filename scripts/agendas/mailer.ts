/**
 * Step 5 helper: send (or mock) a rendered digest email.
 *
 * Behavior:
 *   - DEFAULT is mock: write the rendered email to
 *       data/digests/<week>/<challengeId>.txt | .html | .json
 *     and log what would have been sent. This is what runs in the demo and in CI unless a
 *     provider key is present.
 *   - If an email provider key is in the environment (RESEND_API_KEY), actually send via a
 *     single fetch to the provider's HTTP API. No heavy new dependencies.
 *
 * RECIPIENT OVERRIDE: for now every email is addressed to anchalxy@gmail.com regardless of the
 * challenge's real government POC. We still compute and log the intended real POC so the demo
 * shows where it WOULD go. See the TODO below to switch to the real POC later.
 *
 * No `@/` imports: imported by the plain-Node send-digests script. The API key is read from the
 * environment (loaded from .env.local by claude.ts / send-digests.ts); it is never hardcoded or
 * logged here.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// TODO: replace this hardcoded override with the challenge's real government POC
//       (contact email or office inbox) once we're cleared to email city staff.
export const RECIPIENT_OVERRIDE = 'anchalxy@gmail.com';

/** Where mock digests land. Validated against this root before any write. */
const DIGESTS_ROOT = path.join(process.cwd(), 'data', 'digests');

export type SendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** For the mock file layout and logging. */
  week: string;
  challengeId: string;
  /** The real POC this would go to, for logging only. */
  intendedPoc: string;
};

export type SendResult = {
  mode: 'sent' | 'mock';
  recipient: string;
  files?: { txt: string; html: string; json: string };
};

/** Keep a path inside DIGESTS_ROOT. Blocks "..", absolute segments and stray slashes. */
function safeDigestDir(week: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new Error(`Refusing to write digests for unsafe week "${week}"`);
  const dir = path.join(DIGESTS_ROOT, week);
  const resolved = path.resolve(dir);
  if (resolved !== path.resolve(DIGESTS_ROOT, week) || !resolved.startsWith(path.resolve(DIGESTS_ROOT) + path.sep)) {
    throw new Error(`Refusing to write digests outside ${DIGESTS_ROOT}`);
  }
  return resolved;
}

/** A filesystem-safe challenge id (ids are already slug-like, but validate anyway). */
function safeChallengeId(challengeId: string): string {
  if (!/^[a-z0-9-]+$/i.test(challengeId)) throw new Error(`Unsafe challenge id for a filename: "${challengeId}"`);
  return challengeId;
}

/** True when a real email provider is configured. Only RESEND for now. */
export function hasEmailProvider(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

async function sendViaResend(input: SendInput): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      // The key is read from env; never hardcoded or logged.
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM ?? 'Tea Party Digests <digests@resend.dev>',
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Email provider returned ${response.status} ${response.statusText}`);
  }
}

async function writeMock(input: SendInput): Promise<{ txt: string; html: string; json: string }> {
  const dir = safeDigestDir(input.week);
  const id = safeChallengeId(input.challengeId);
  await mkdir(dir, { recursive: true });
  const txt = path.join(dir, `${id}.txt`);
  const html = path.join(dir, `${id}.html`);
  const json = path.join(dir, `${id}.json`);
  await writeFile(txt, input.text);
  await writeFile(html, input.html);
  await writeFile(
    json,
    JSON.stringify(
      {
        to: input.to,
        intendedPoc: input.intendedPoc,
        subject: input.subject,
        week: input.week,
        challengeId: input.challengeId,
        renderedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  return { txt, html, json };
}

/**
 * Send the email, or mock it. Mock is the default; real send happens only when a provider key
 * is present. In both cases the recipient is forced to RECIPIENT_OVERRIDE for now.
 */
export async function send(input: SendInput): Promise<SendResult> {
  // Force the override recipient but keep the intended POC for the log.
  const recipient = RECIPIENT_OVERRIDE;
  const addressed: SendInput = { ...input, to: recipient };

  if (hasEmailProvider()) {
    await sendViaResend(addressed);
    console.log(
      `  ✉  sent via provider to ${recipient} (intended POC: ${input.intendedPoc}) — ${input.challengeId}`,
    );
    return { mode: 'sent', recipient };
  }

  const files = await writeMock(addressed);
  console.log(
    `  ✉  mocked to ${recipient} (intended POC: ${input.intendedPoc}) — ${input.challengeId} → ${path.relative(process.cwd(), files.txt)}`,
  );
  return { mode: 'mock', recipient, files };
}
