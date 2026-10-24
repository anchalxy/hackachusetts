import Storage from 'expo-sqlite/kv-store';

import { getCasesById, type CaseUpdate } from '@/lib/boston-311';

/**
 * Pin colors from Plan.md: red / yellow / green / gray.
 * `resolved` reports leave the map and become notifications.
 */
export type ReportStatus = 'submitted' | 'inReview' | 'inProgress' | 'rejected' | 'resolved';

export type MyReport = {
  id: string;
  topic: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt: number;
  status: ReportStatus;
  /** The 311 case this report is tied to. Set for "Me too"; real submissions would set it too. */
  caseId?: string;
  assignedTeam?: string;
  closureComments?: string;
  closedAt?: string;
};

const KEY = 'myReports';

/** Maps a 311 case onto our pin colors. */
export function statusFrom311(caseStatus: string, closureReason?: string | null): ReportStatus {
  if (caseStatus === 'In progress') return 'inProgress';
  if (caseStatus === 'Needs Reallocation') return 'inReview';
  if (caseStatus === 'Closed') {
    if (closureReason === 'Noted') return 'rejected'; // e.g. "No issue found at location"
    if (closureReason === 'Transitioned') return 'inReview'; // handed off to another system
    return 'resolved';
  }
  return 'submitted';
}

export async function getMyReports(): Promise<MyReport[]> {
  const raw = await Storage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveMyReports(reports: MyReport[]) {
  await Storage.setItem(KEY, JSON.stringify(reports));
}

export async function addMyReport(report: Omit<MyReport, 'id' | 'createdAt'>): Promise<MyReport> {
  const saved: MyReport = { ...report, id: String(Date.now()), createdAt: Date.now() };
  await saveMyReports([saved, ...(await getMyReports())]);
  return saved;
}

/** True if the user already filed or followed this 311 case. */
export async function isFollowing(caseId: string): Promise<boolean> {
  const reports = await getMyReports();
  return reports.some((r) => r.caseId === caseId);
}

/** Pulls the latest 311 status for every open report tied to a case, saves, and returns all reports. */
export async function refreshMyReportsFrom311(): Promise<MyReport[]> {
  const reports = await getMyReports();
  const openCaseIds = reports
    .filter((r) => r.caseId && r.status !== 'resolved')
    .map((r) => r.caseId as string);
  if (openCaseIds.length === 0) return reports;

  const updates = new Map<string, CaseUpdate>();
  for (const update of await getCasesById([...new Set(openCaseIds)])) updates.set(update.case_id, update);

  // Re-read in case a report was added while we were fetching.
  const latest = await getMyReports();
  const refreshed = latest.map((report) => {
    const update = report.caseId ? updates.get(report.caseId) : undefined;
    if (!update) return report;
    return {
      ...report,
      status: statusFrom311(update.case_status, update.closure_reason),
      assignedTeam: update.assigned_team,
      closureComments: update.closure_comments ?? undefined,
      closedAt: update.close_date ?? undefined,
    };
  });
  await saveMyReports(refreshed);
  return refreshed;
}
