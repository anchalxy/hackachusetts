import type { ReportTopic } from '@/constants/311-topics';

export type AnalyzeResult = {
  /** ok → review screen; unclear → 2b (retake); not_city_issue → 2d (no retake). */
  verdict: 'ok' | 'unclear' | 'not_city_issue';
  topic: ReportTopic;
  title: string;
  description: string;
  urgency: 'Low' | 'Medium' | 'High';
  reason: string;
  tip: string;
};

export type MatchResult = { matches: boolean };

async function post<T>(body: object, timeoutMs: number): Promise<T> {
  // AbortSignal.timeout isn't available in every React Native runtime.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? `Photo check failed (${response.status})`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/** Sends a base64 JPEG to our API route, which asks Claude whether it's a real 311 issue and drafts it. */
export function analyzePhoto(imageBase64: string, timeoutMs = 20_000): Promise<AnalyzeResult> {
  return post({ image: imageBase64 }, timeoutMs);
}

/** Loose check that the (edited) description is about the photo. Fails open on errors. */
export async function descriptionMatches(imageBase64: string, description: string): Promise<boolean> {
  try {
    return (await post<MatchResult>({ image: imageBase64, description }, 15_000)).matches;
  } catch {
    return true; // never block a send on our own outage
  }
}
