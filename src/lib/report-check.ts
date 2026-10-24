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

/** A failure worth one quiet retry: the connection dropped, or the server or Claude hiccuped. */
class TransientError extends Error {}

async function postOnce<T>(body: string, timeoutMs: number): Promise<T> {
  // AbortSignal.timeout isn't available in every React Native runtime.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new Error(`Photo check timed out after ${Math.round(timeoutMs / 1000)}s`);
      throw new TransientError(`Couldn't reach the photo check: ${String(error)}`);
    }
    const json = await response.json().catch(() => ({}));
    if (response.ok) return json as T;
    const message = json.error ?? `Photo check failed (${response.status})`;
    throw response.status === 429 || response.status >= 500 ? new TransientError(message) : new Error(message);
  } finally {
    clearTimeout(timer);
  }
}

/** POSTs to our API route within `timeoutMs` total, retrying a transient failure once if there's time. */
async function post<T>(payload: object, timeoutMs: number): Promise<T> {
  const body = JSON.stringify(payload);
  const deadline = Date.now() + timeoutMs;
  try {
    return await postOnce<T>(body, timeoutMs);
  } catch (error) {
    const left = deadline - Date.now();
    if (!(error instanceof TransientError) || left < 5000) throw error;
    console.warn('[photo check] retrying:', error.message);
    return postOnce<T>(body, left);
  }
}

/**
 * Wakes the API route while the user frames the shot. In development the dev server bundles the
 * route (and the Anthropic SDK) on its first request, which can eat most of the 20s check.
 */
export function warmUpPhotoCheck() {
  fetch('/api/analyze').catch(() => {});
}

/** Sends a base64 JPEG to our API route, which asks Claude whether it's a real 311 issue and drafts it. */
export async function analyzePhoto(imageBase64: string, timeoutMs = 20_000): Promise<AnalyzeResult> {
  try {
    return await post({ image: imageBase64 }, timeoutMs);
  } catch (error) {
    console.warn('[photo check] failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/** Loose check that the (edited) description is about the photo. Fails open on errors. */
export async function descriptionMatches(imageBase64: string, description: string): Promise<boolean> {
  try {
    return (await post<MatchResult>({ image: imageBase64, description }, 15_000)).matches;
  } catch {
    return true; // never block a send on our own outage
  }
}
