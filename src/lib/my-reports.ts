import Storage from 'expo-sqlite/kv-store';

/** Pin colors from Plan.md: red / yellow / green / gray. */
export type ReportStatus = 'submitted' | 'inReview' | 'inProgress' | 'rejected';

export type MyReport = {
  id: string;
  topic: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt: number;
  status: ReportStatus;
  /** Set when the user tapped "Me too" on an existing 311 case. */
  caseId?: string;
  assignedTeam?: string;
};

const KEY = 'myReports';

/** Maps a 311 `case_status` onto our pin colors. */
export function statusFrom311(caseStatus: string): ReportStatus {
  if (caseStatus === 'In progress') return 'inProgress';
  if (caseStatus === 'Needs Reallocation') return 'inReview';
  return 'submitted';
}

export async function getMyReports(): Promise<MyReport[]> {
  const raw = await Storage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addMyReport(report: Omit<MyReport, 'id' | 'createdAt'>): Promise<MyReport> {
  const saved: MyReport = { ...report, id: String(Date.now()), createdAt: Date.now() };
  const reports = await getMyReports();
  await Storage.setItem(KEY, JSON.stringify([saved, ...reports]));
  return saved;
}

/** True if the user already filed or followed this 311 case. */
export async function isFollowing(caseId: string): Promise<boolean> {
  const reports = await getMyReports();
  return reports.some((r) => r.caseId === caseId);
}
