import Storage from 'expo-sqlite/kv-store';

import type { MyReport } from '@/lib/my-reports';
import { addBonusLeaves } from '@/lib/rewards';

// Reports pay once the city approves them (Plan.md: "Approved" = 311 In progress), not on submit.

/** 5 points × 10 leaves per point (tokens.points.leavesPerPoint). */
export const REPORT_LEAVES = 50;

const KEY = 'reportLeavesCredited';

export const earnsLeaves = (r: MyReport) => r.status === 'approved' || r.status === 'fixed';

async function readCredited(): Promise<Set<string> | null> {
  const raw = await Storage.getItem(KEY);
  return raw ? new Set(JSON.parse(raw) as string[]) : null;
}

async function writeCredited(ids: Set<string>) {
  await Storage.setItem(KEY, JSON.stringify([...ids]));
}

/**
 * Records reports as already paid (seeded history is part of the seed balance). Call it BEFORE
 * saving them: saving credits. `existing` keeps the first-run baseline if there isn't one yet.
 */
export function markReportLeavesCredited(ids: string[], existing: MyReport[]): Promise<void> {
  const run = queue.then(async () => {
    const credited = (await readCredited()) ?? new Set(existing.filter(earnsLeaves).map((r) => r.id));
    ids.forEach((id) => credited.add(id));
    await writeCredited(credited);
  });
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Pays REPORT_LEAVES for every report that has reached Approved since we last looked. The first
 * run only takes a baseline, so reports approved before this shipped don't pay out in a lump.
 * Returns how many leaves were added.
 */
export function creditApprovedReports(reports: MyReport[]): Promise<number> {
  // Serialized: a save and a Profile sync can land together, and each must see the other's ids.
  const run = queue.then(() => creditNow(reports));
  queue = run.catch(() => 0);
  return run;
}

let queue: Promise<unknown> = Promise.resolve();

async function creditNow(reports: MyReport[]): Promise<number> {
  const credited = await readCredited();
  const earned = reports.filter(earnsLeaves);
  if (!credited) {
    await writeCredited(new Set(earned.map((r) => r.id)));
    return 0;
  }
  const fresh = earned.filter((r) => !credited.has(r.id));
  if (fresh.length === 0) return 0;
  fresh.forEach((r) => credited.add(r.id));
  await writeCredited(credited);
  addBonusLeaves(fresh.length * REPORT_LEAVES);
  return fresh.length * REPORT_LEAVES;
}
