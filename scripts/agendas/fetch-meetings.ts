/**
 * Step 1 of the challenges pipeline: pull upcoming public meetings for Greater Boston
 * (Boston, Cambridge, Somerville, Brookline) into one normalized file.
 *
 *   node scripts/agendas/fetch-meetings.ts [days]   # default: next 28 days
 *
 * Writes data/agendas/meetings.json. Per Plan.md this runs live once and the output
 * is seeded for the demo; the next step reads agendas and tags neighborhoods.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { fetchBostonNotices } from './sources/boston-notices.ts';
import { fetchCivicClerk } from './sources/civicclerk.ts';
import { fetchLegistar } from './sources/legistar.ts';
import { fetchPrimeGov } from './sources/primegov.ts';
import type { DateWindow, Meeting } from './types.ts';

const OUT = path.join(process.cwd(), 'data', 'agendas', 'meetings.json');

const SOURCES: { name: string; run: (window: DateWindow) => Promise<Meeting[]> }[] = [
  { name: 'Legistar (Boston, Somerville)', run: fetchLegistar },
  { name: 'boston.gov public notices', run: fetchBostonNotices },
  { name: 'PrimeGov (Cambridge)', run: fetchPrimeGov },
  { name: 'CivicClerk (Brookline)', run: fetchCivicClerk },
];

async function main() {
  const days = Number(process.argv[2] ?? 28);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  const window = { from, to };

  // One broken city site shouldn't sink the whole run.
  const results = await Promise.allSettled(SOURCES.map((s) => s.run(window)));
  const meetings: Meeting[] = [];
  const failures: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') meetings.push(...result.value);
    else failures.push(`${SOURCES[i].name}: ${(result.reason as Error).message}`);
  });

  meetings.sort((a, b) => a.start.localeCompare(b.start));
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify({ fetchedAt: new Date().toISOString(), window: { from, to }, meetings }, null, 2),
  );

  const byCity = Object.groupBy(meetings, (m) => m.city);
  console.log(`Wrote ${meetings.length} meetings to ${path.relative(process.cwd(), OUT)}`);
  for (const [city, list] of Object.entries(byCity)) {
    const withDocs = list!.filter((m) => m.docs.length > 0).length;
    console.log(`  ${city.padEnd(10)} ${String(list!.length).padStart(3)} meetings (${withDocs} with agenda docs)`);
  }
  for (const failure of failures) console.warn(`  ! ${failure}`);
  if (failures.length === SOURCES.length) process.exitCode = 1;
}

main();
