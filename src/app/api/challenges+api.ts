import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import demoWeek from '../../../data/challenges/demo-week.json';

// Generated weeks live in data/challenges (written by scripts/agendas, committed by the weekly job).
// Reads from disk, so this works on the dev server; a hosted deploy would need to bundle them.
const DIR = path.join(process.cwd(), 'data', 'challenges');

/**
 * GET /api/challenges?area=boston-allston&mode=live|demo
 * demo → exampleChallenges.md word for word. live → the area's latest generated week,
 * falling back to the demo (with `fallback: true`) if none exists yet.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const area = params.get('area') ?? '';
  if (params.get('mode') !== 'live') return Response.json({ week: demoWeek, fallback: false });

  const indexFile = path.join(DIR, 'index.json');
  const index = existsSync(indexFile) ? JSON.parse(await readFile(indexFile, 'utf8')) : { areas: {} };
  const relative: string | undefined = index.areas[area];
  // Only paths the generator wrote; never anything from the query string.
  if (!relative || !/^\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\.json$/.test(relative)) {
    return Response.json({ week: demoWeek, fallback: true });
  }
  const week = JSON.parse(await readFile(path.join(DIR, relative), 'utf8'));
  return Response.json({ week, fallback: false });
}
