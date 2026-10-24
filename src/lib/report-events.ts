import Storage from 'expo-sqlite/kv-store';

import { alertReportChange } from '@/lib/device-notifications';
import type { MyReport } from '@/lib/my-reports';
import { creditApprovedReports } from '@/lib/report-leaves';
import type { ReportStatus } from '@/ui/theme';

// Runs on every save of the user's reports (my-reports.ts), wherever the change came from:
// a 311 sync on Profile or the Report tab, or a new submission. Pays leaves for approvals and
// sends a notification for each status the user hasn't heard about yet.

const KEY = 'reportAlertStatus';
/** Recorded without alerting; set for seeded reports until their first 311 sync is done. */
const SILENT = 'silent';

type Seen = Record<string, ReportStatus | typeof SILENT>;

let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
};

async function readSeen(): Promise<Seen | null> {
  const raw = await Storage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Seen) : null;
}

export function onReportsSaved(reports: MyReport[]): Promise<void> {
  return serial(async () => {
    await creditApprovedReports(reports).catch(() => 0);
    const seen = await readSeen();
    const next: Seen = { ...(seen ?? {}) };
    const moved: MyReport[] = [];
    for (const r of reports) {
      const before = seen?.[r.id];
      if (before === SILENT) continue;
      // First run, or a report we've never seen (just filed): remember it without alerting.
      if (seen && before !== undefined && before !== r.status) moved.push(r);
      next[r.id] = r.status;
    }
    await Storage.setItem(KEY, JSON.stringify(next));
    await Promise.all(moved.map((r) => alertReportChange(r).catch(() => {})));
  });
}

/** Seeded history isn't news: keep these quiet until `markReportAlertsSeen`. Call before saving. */
export function silenceReportAlerts(ids: string[]): Promise<void> {
  return serial(async () => {
    const seen = (await readSeen()) ?? {};
    ids.forEach((id) => (seen[id] = SILENT));
    await Storage.setItem(KEY, JSON.stringify(seen));
  });
}

/** Records the seeded reports' synced statuses, so only later changes alert. */
export function markReportAlertsSeen(reports: MyReport[]): Promise<void> {
  return serial(async () => {
    const seen = (await readSeen()) ?? {};
    reports.forEach((r) => (seen[r.id] = r.status));
    await Storage.setItem(KEY, JSON.stringify(seen));
  });
}
