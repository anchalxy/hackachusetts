import Anthropic from '@anthropic-ai/sdk';

import { REPORTABLE_TOPICS } from '@/constants/311-topics';
import type { AnalyzeResult } from '@/lib/report-check';

// Server-only: reads ANTHROPIC_API_KEY from .env.local. Never imported by the app bundle.
let client: Anthropic | null = null;

const SYSTEM = `You screen photos that Boston residents want to report to 311, the city's non-emergency service line.

Decide whether the photo shows a real, visible problem that a city department could act on (for example a pothole, graffiti, a broken streetlight, illegal dumping, an overflowing public trash can, a fallen branch). Selfies, screenshots, memes, indoor scenes, private-property disputes, and photos where no problem is visible are not valid.

If it is valid, pick the single best matching topic and write a short, factual description (one or two sentences, under 200 characters) that a city crew could act on. Describe only what is visible; don't guess street names. If it is not valid, explain why in one short, friendly sentence addressed to the resident.`;

const SCHEMA = {
  type: 'object',
  properties: {
    is_valid: { type: 'boolean' },
    topic: { type: 'string', enum: [...REPORTABLE_TOPICS] },
    description: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['is_valid', 'topic', 'description', 'reason'],
  additionalProperties: false,
};

export async function POST(request: Request) {
  const { image } = (await request.json()) as { image?: string };
  if (!image) return Response.json({ error: 'Missing image' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Photo check is not set up: add ANTHROPIC_API_KEY to .env.local and restart expo start' },
      { status: 500 },
    );
  }
  client ??= new Anthropic({ apiKey });

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4096,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: 'Screen this photo for a 311 report.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: "We couldn't check this photo. Try another one." }, { status: 422 });
    }
    const text = response.content.find((block) => block.type === 'text');
    if (!text || text.type !== 'text') {
      return Response.json({ error: 'No result from the photo check' }, { status: 502 });
    }
    return Response.json(JSON.parse(text.text) as AnalyzeResult);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'Server is missing a valid ANTHROPIC_API_KEY' }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Too many requests, try again in a moment' }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Photo check failed (${error.status})` }, { status: 502 });
    }
    console.error('[analyze]', error);
    return Response.json({ error: 'Photo check failed on the server' }, { status: 500 });
  }
}
