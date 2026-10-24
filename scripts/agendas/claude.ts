import Anthropic from '@anthropic-ai/sdk';
import { existsSync } from 'node:fs';

// Locally the key lives in .env.local (gitignored); in GitHub Actions it's a repo secret.
if (!process.env.ANTHROPIC_API_KEY && existsSync('.env.local')) process.loadEnvFile('.env.local');
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set (add it to .env.local or the environment).');
}

export const client = new Anthropic();
export const MODEL = 'claude-opus-5-5';

export type Usage = { input: number; output: number; calls: number };
export const usage: Usage = { input: 0, output: 0, calls: 0 };

/** Opus 5.5 list price: $4 / $20 per million input / output tokens. */
export function costSummary(): string {
  const dollars = (usage.input * 4 + usage.output * 20) / 1_000_000;
  return `${usage.calls} Claude calls, ${usage.input.toLocaleString()} in / ${usage.output.toLocaleString()} out tokens (~$${dollars.toFixed(2)})`;
}

/**
 * One structured-output call. Returns the parsed JSON, or throws with a readable reason.
 * Refusals fall back to Anthropic's recommended model automatically.
 */
export async function structuredCall<T>({
  system,
  content,
  schema,
  effort,
  maxTokens = 16000,
}: {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: Record<string, unknown>;
  effort: 'low' | 'medium' | 'high';
  maxTokens?: number;
}): Promise<T> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    output_config: { effort, format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content }],
  });
  usage.calls += 1;
  usage.input += response.usage.input_tokens;
  usage.output += response.usage.output_tokens;

  if (response.stop_reason === 'refusal') throw new Error('Claude declined this request');
  if (response.stop_reason === 'max_tokens') throw new Error('Response hit max_tokens');
  const text = response.content.find((block) => block.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No text in response');
  return JSON.parse(text.text) as T;
}

/** Runs `fn` over `items` with at most `limit` in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}
