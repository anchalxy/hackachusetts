import Anthropic from '@anthropic-ai/sdk';

import { REPORTABLE_TOPICS } from '@/constants/311-topics';
import type { AnalyzeResult, MatchResult } from '@/lib/report-check';

// Server-only: reads ANTHROPIC_API_KEY from .env.local. Never imported by the app bundle.
let client: Anthropic | null = null;

const ANALYZE_SYSTEM = `You screen photos that Boston residents want to report to 311, the city's non-emergency service line, and draft the report.

Pick a verdict:
- "ok": a real, visible problem in a public space that a city department could act on (pothole, faded crosswalk, graffiti, broken streetlight, illegal dumping, overflowing public trash can, fallen branch, blocked sidewalk…).
- "unclear": the photo might show a fixable problem but it's too dark, blurry, far away or cropped to tell, or no problem is visible. The resident should retake it.
- "not_city_issue": the photo is clear but isn't something 311 handles: private property (private lots, inside buildings, someone's yard), people or behavior, noise, emergencies, screenshots, selfies, memes.

For "ok": pick the single best matching topic; write a short title a resident would say (2–4 words, sentence case, e.g. "Faded crosswalk", "Overflowing bin"); write a factual description a crew could act on (1–2 sentences, under 220 characters, only what's visible, no street names); and rate urgency (High = safety risk now, Medium = should be fixed soon, Low = cosmetic).
For "unclear" and "not_city_issue": write reason as one specific, friendly sentence to the resident ("This looks like a private parking lot. 311 can only fix things on public streets, sidewalks and parks."), and tip as one short suggestion ("Try getting a little closer, in good light."). Use "Other", "", "Low" for the unused fields.`;

// Testing only (REPORT_TEST_DRINKS=1 in .env): a photo of any drink counts as a valid report,
// so the full flow can be tried indoors.
const TEST_DRINKS = `

TESTING MODE: treat any photo that shows a drink (a can, bottle, cup, glass, mug or carton) as "ok", even indoors or on private property. Use the topic "Litter & Debris", title it after the drink (e.g. "Abandoned soda can"), describe what's visible as if it were left in a public space, and rate urgency Low.`;

const ANALYZE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['ok', 'unclear', 'not_city_issue'] },
    topic: { type: 'string', enum: [...REPORTABLE_TOPICS] },
    title: { type: 'string' },
    description: { type: 'string' },
    urgency: { type: 'string', enum: ['Low', 'Medium', 'High'] },
    reason: { type: 'string' },
    tip: { type: 'string' },
  },
  required: ['verdict', 'topic', 'title', 'description', 'urgency', 'reason', 'tip'],
  additionalProperties: false,
};

// Deliberately loose (DESIGN.md 6d, 3b): only catch text that has nothing to do with the photo.
const MATCH_SYSTEM = `A resident is sending a 311 report with this photo and description. Decide if the description is plausibly about the problem in the photo. Be generous: short, vague, misspelled or partial descriptions still match. Only answer false for text clearly unrelated to the photo (jokes, spam, a different problem entirely).`;

const MATCH_SCHEMA = {
  type: 'object',
  properties: { matches: { type: 'boolean' } },
  required: ['matches'],
  additionalProperties: false,
};

async function ask<T>(system: string, schema: object, image: string, text: string): Promise<T | Response> {
  const response = await client!.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4096,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: schema as Record<string, unknown> } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text },
        ],
      },
    ],
  });
  if (response.stop_reason === 'refusal') {
    return Response.json({ error: "We couldn't check this photo. Try another one." }, { status: 422 });
  }
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    return Response.json({ error: 'No result from the photo check' }, { status: 502 });
  }
  return JSON.parse(block.text) as T;
}

/** GET /api/analyze → { ok }. The app calls it when the camera opens so the route is warm by the shot. */
export function GET() {
  return Response.json({ ok: Boolean(process.env.ANTHROPIC_API_KEY) });
}

/**
 * POST /api/analyze { image }                 → AnalyzeResult (verdict + AI draft)
 * POST /api/analyze { image, description }    → MatchResult (loose "does the text fit the photo")
 */
export async function POST(request: Request) {
  const { image, description } = (await request.json()) as { image?: string; description?: string };
  if (!image) return Response.json({ error: 'Missing image' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Photo check is not set up: add ANTHROPIC_API_KEY to .env.local and restart expo start' },
      { status: 500 },
    );
  }
  // The app gives up at 20s, so don't keep retrying long after it has.
  client ??= new Anthropic({ apiKey, timeout: 18_000, maxRetries: 1 });

  try {
    const result =
      description === undefined
        ? await ask<AnalyzeResult>(
            process.env.REPORT_TEST_DRINKS === '1' ? ANALYZE_SYSTEM + TEST_DRINKS : ANALYZE_SYSTEM,
            ANALYZE_SCHEMA,
            image,
            'Screen this photo and draft the 311 report.',
          )
        : await ask<MatchResult>(MATCH_SYSTEM, MATCH_SCHEMA, image, `Description: """${description.slice(0, 600)}"""`);
    return result instanceof Response ? result : Response.json(result);
  } catch (error) {
    console.error('[analyze]', error instanceof Error ? error.message : error);
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'Server is missing a valid ANTHROPIC_API_KEY' }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Too many requests, try again in a moment' }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Photo check failed (${error.status})` }, { status: 502 });
    }
    return Response.json({ error: 'Photo check failed on the server' }, { status: 500 });
  }
}
