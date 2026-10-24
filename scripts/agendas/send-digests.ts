/**
 * Step 5 of the challenges pipeline: email a data-driven, pseudonymized citizen-input report to
 * each challenge's government POC, timed ONE DAY BEFORE the challenge deadline.
 *
 *   node scripts/agendas/send-digests.ts [--date YYYY-MM-DD] [--force] [--dry-run]
 *
 * For every published challenge (data/challenges/demo-week.json and each generated week, found
 * the same way as track-updates.ts) that has a government POC — a contact with an email, or an
 * office inbox — it:
 *   - computes sendOn = deadlineDate − 1 day;
 *   - sends only when today (Boston time; --date overrides) === sendOn, unless --force;
 *   - de-dupes via data/digests/sent.json so each challenge is emailed at most once (skip
 *     already-sent unless --force);
 *   - builds the report (report.ts) from the deterministic cohort (submissions.ts) and sends it
 *     via mailer.ts. The recipient is forced to anchalxy@gmail.com for now (see mailer TODO), but
 *     the intended real POC is computed and logged.
 *
 * --dry-run prints what WOULD send and writes nothing (no files, no ledger).
 *
 * The report's numbers are all computed in code; Claude is used only to phrase a neutral summary
 * paragraph, and only when a key is available (off by default here — mock-friendly).
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { Challenge, ChallengeWeek } from '../../src/lib/challenges.ts';
import { bostonDate } from './http.ts';
import { hasEmailProvider, send } from './mailer.ts';
import { buildReport, renderHtml, renderSubject, renderText } from './report.ts';
import { cohortFor } from './submissions.ts';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data', 'challenges');
const DIGESTS = path.join(ROOT, 'data', 'digests');
const LEDGER_FILE = path.join(DIGESTS, 'sent.json');

type Ledger = { sentAt: string; entries: Record<string, { week: string; recipient: string; sentOn: string; at: string }> };

async function readJson<T>(file: string, fallback: T): Promise<T> {
  return existsSync(file) ? (JSON.parse(await readFile(file, 'utf8')) as T) : fallback;
}

/** Every week we've published: the demo week plus each generated area file. Mirrors track-updates.ts. */
async function publishedWeeks(): Promise<ChallengeWeek[]> {
  const weeks: ChallengeWeek[] = [await readJson(path.join(DATA, 'demo-week.json'), null as never)];
  for (const entry of await readdir(DATA, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) continue;
    for (const file of await readdir(path.join(DATA, entry.name))) {
      if (file.endsWith('.json')) weeks.push(await readJson(path.join(DATA, entry.name, file), null as never));
    }
  }
  return weeks.filter(Boolean);
}

/** A government POC exists when a contact has an email OR any contact names an office inbox. */
function governmentPoc(challenge: Challenge): string | null {
  const withEmail = challenge.contacts.find((c) => c.email && c.email.includes('@'));
  if (withEmail?.email) return withEmail.email;
  const office = challenge.contacts.find((c) => c.office);
  if (office?.office) return office.office;
  return null;
}

/** deadlineDate − 1 day, in Boston time, as YYYY-MM-DD. */
function sendOnFor(deadlineDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadlineDate)) return null;
  // Anchor at noon Boston so the −1 day never slips across a DST boundary.
  const d = new Date(`${deadlineDate}T12:00:00-05:00`);
  d.setDate(d.getDate() - 1);
  return bostonDate(d);
}

async function main() {
  const { values } = parseArgs({
    options: {
      date: { type: 'string' },
      force: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  if (values.date && !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) throw new Error('--date must be YYYY-MM-DD');

  const today = values.date ?? bostonDate(new Date());
  const force = Boolean(values.force);
  const dryRun = Boolean(values['dry-run']);

  const weeks = await publishedWeeks();
  const ledger = await readJson<Ledger>(LEDGER_FILE, { sentAt: '', entries: {} });

  const all = weeks.flatMap((w) => w.challenges.map((challenge) => ({ challenge, week: w })));
  console.log(
    `Step 5 · send-digests — today ${today} (Boston${values.date ? ', from --date' : ''})` +
      `${force ? ', --force' : ''}${dryRun ? ', --dry-run' : ''}. ${all.length} published challenges.`,
  );
  console.log(`  Email mode: ${hasEmailProvider() ? 'provider key present (would send)' : 'mock (writing files)'}`);

  let considered = 0;
  let sent = 0;
  for (const { challenge, week } of all) {
    const poc = governmentPoc(challenge);
    if (!poc) {
      continue; // no government POC → nothing to send
    }
    const sendOn = sendOnFor(challenge.deadlineDate);
    if (!sendOn) {
      console.warn(`  ! ${challenge.id}: bad deadlineDate "${challenge.deadlineDate}", skipping`);
      continue;
    }
    considered++;

    const alreadySent = Boolean(ledger.entries[challenge.id]);
    const due = today === sendOn;

    if (!force && !due) {
      continue; // not its day yet
    }
    if (!force && alreadySent) {
      console.log(`  · ${challenge.id}: already sent on ${ledger.entries[challenge.id].at.slice(0, 10)}, skipping`);
      continue;
    }

    // Build the report from the deterministic cohort. Numbers are code-computed.
    const cohort = cohortFor(challenge);
    const report = await buildReport(challenge, cohort, /* useClaude */ false, { sendOn });
    const subject = renderSubject(report);
    const text = renderText(report);
    const html = renderHtml(report);

    console.log(
      `  → ${challenge.id} · "${challenge.title}" · ${report.totalParticipants} participants · ` +
        `deadline ${challenge.deadlineDate} · sendOn ${sendOn}`,
    );
    console.log(`      intended POC: ${poc}`);

    if (dryRun) {
      console.log(`      [dry-run] would send to anchalxy@gmail.com (override); no files or ledger written`);
      continue;
    }

    const result = await send({
      to: poc, // overridden inside mailer to the hardcoded recipient
      subject,
      text,
      html,
      week: week.weekOf,
      challengeId: challenge.id,
      intendedPoc: poc,
    });

    ledger.entries[challenge.id] = {
      week: week.weekOf,
      recipient: result.recipient,
      sentOn: sendOn,
      at: new Date().toISOString(),
    };
    sent++;
  }

  if (!dryRun && sent > 0) {
    await mkdir(DIGESTS, { recursive: true });
    ledger.sentAt = new Date().toISOString();
    await writeFile(LEDGER_FILE, JSON.stringify(ledger, null, 2));
  }

  console.log(
    `Done. ${considered} challenges with a government POC considered; ${sent} ${dryRun ? 'would be sent' : 'sent/mocked'}` +
      `${dryRun ? ' (dry-run: nothing written)' : ''}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
