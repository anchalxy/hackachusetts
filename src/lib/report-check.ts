import type { ReportTopic } from '@/constants/311-topics';

export type AnalyzeResult = {
  is_valid: boolean;
  topic: ReportTopic;
  description: string;
  reason: string;
};

/** Sends a base64 JPEG to our API route, which asks Claude whether it's a real 311 issue. */
export async function analyzePhoto(imageBase64: string): Promise<AnalyzeResult> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? `Photo check failed (${response.status})`);
  return json;
}
