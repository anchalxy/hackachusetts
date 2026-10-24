import Storage from 'expo-sqlite/kv-store';

import { topicInfo } from '@/constants/report-topics';
import { getCasesById, type CaseUpdate } from '@/lib/boston-311';
import type { ReportStatus } from '@/ui/theme';

export type { ReportStatus } from '@/ui/theme';

/** One message in a report's thread (DESIGN.md 6c "Updates"), oldest first. */
export type ReportUpdate = {
  who: string;
  /** "you" shows the user's avatar; "city" shows the city hall icon. */
  kind: 'you' | 'city';
  text: string;
  at: number;
};

export type MyReport = {
  id: string;
  /** Shown as "Report #…": the 311 case id when we have one. */
  number: string;
  topic: string;
  /** Short, human title ("Faded crosswalk"). */
  title: string;
  /** What was sent to 311. */
  description: string;
  /** The AI's draft, kept so we can tell if the user edited it. */
  aiDraft: string;
  urgency: 'Low' | 'Medium' | 'High';
  address: string;
  latitude: number;
  longitude: number;
  /** The user's photo, when they took one. Pass it through `photoSource` before showing it. */
  photoUri?: string;
  createdAt: number;
  status: ReportStatus;
  /** When each lifecycle step was reached. */
  history: Partial<Record<ReportStatus, number>>;
  updates: ReportUpdate[];
  department: string;
  /** Set for "Me too" and seeded cases, so we can follow them in 311. */
  caseId?: string;
  team?: string;
  /** Why it wasn't approved (shown as the row subtitle). */
  reason?: string;
};

const KEY = 'myReports';

/** Fixed pins stay on the map for 7 days, then live only in the list. */
export const FIXED_PIN_DAYS = 7;

/** Maps a 311 case onto our lifecycle. */
export function statusFrom311(caseStatus: string, closureReason?: string | null): ReportStatus {
  if (caseStatus === 'In progress') return 'approved';
  if (caseStatus === 'Needs Reallocation') return 'inReview';
  if (caseStatus === 'Closed') {
    if (closureReason === 'Noted') return 'notApproved'; // e.g. "No issue found at location"
    if (closureReason === 'Transitioned') return 'inReview'; // handed off to another system
    return 'fixed';
  }
  return 'submitted';
}

// Reports saved before the redesign used different status names and fewer fields.
const LEGACY_STATUS: Record<string, ReportStatus> = {
  inProgress: 'approved',
  rejected: 'notApproved',
  resolved: 'fixed',
};

function normalize(raw: Partial<MyReport> & { status: string }): MyReport {
  const status = (LEGACY_STATUS[raw.status] ?? raw.status) as ReportStatus;
  const createdAt = raw.createdAt ?? Date.now();
  return {
    id: raw.id ?? String(createdAt),
    number: raw.number ?? raw.caseId ?? `TP-${String(createdAt).slice(-6)}`,
    topic: raw.topic ?? 'Other',
    title: raw.title ?? raw.topic ?? 'Report',
    description: raw.description ?? '',
    aiDraft: raw.aiDraft ?? raw.description ?? '',
    urgency: raw.urgency ?? 'Medium',
    address: raw.address ?? 'Boston',
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    photoUri: raw.photoUri,
    createdAt,
    status,
    history: raw.history ?? { submitted: createdAt, [status]: createdAt },
    updates: raw.updates ?? [],
    department: raw.department ?? topicInfo(raw.topic ?? 'Other').department,
    caseId: raw.caseId,
    team: raw.team ?? (raw as { assignedTeam?: string }).assignedTeam,
    reason: raw.reason ?? (raw as { closureComments?: string }).closureComments,
  };
}

export async function getMyReports(): Promise<MyReport[]> {
  const raw = await Storage.getItem(KEY);
  if (!raw) return [];
  // One corrupt value must not brick the Report tab and every future save.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((r): r is Partial<MyReport> & { status: string } => typeof r === 'object' && r !== null)
    .map(normalize);
}

export async function getMyReport(id: string): Promise<MyReport | undefined> {
  return (await getMyReports()).find((r) => r.id === id);
}

async function saveMyReports(reports: MyReport[]) {
  await Storage.setItem(KEY, JSON.stringify(reports));
}

export type NewReport = Omit<MyReport, 'id' | 'number' | 'createdAt' | 'history' | 'updates'> & {
  number?: string;
  /** `at` defaults to the moment the report is saved. */
  updates?: (Omit<ReportUpdate, 'at'> & { at?: number })[];
};

export async function addMyReport(report: NewReport): Promise<MyReport> {
  const createdAt = Date.now();
  const saved: MyReport = {
    ...report,
    id: String(createdAt),
    number: report.number ?? report.caseId ?? `TP-${String(createdAt).slice(-6)}`,
    createdAt,
    history: { submitted: createdAt, [report.status]: createdAt },
    updates: (report.updates ?? []).map((u) => ({ ...u, at: u.at ?? createdAt })),
  };
  await saveMyReports([saved, ...(await getMyReports())]);
  return saved;
}

/** True if the user already filed or followed this 311 case. */
export async function isFollowing(caseId: string): Promise<boolean> {
  return (await getMyReports()).some((r) => r.caseId === caseId);
}

/** The thread message for moving into a new status. Closure comments are the city's own words. */
function updateFor(status: ReportStatus, update: CaseUpdate, team: string): ReportUpdate | null {
  const at = update.close_date ? Date.parse(update.close_date.replace(' ', 'T').replace('+00', 'Z')) : Date.now();
  switch (status) {
    case 'inReview':
      return { who: team, kind: 'city', text: 'We’re routing this to the right team.', at: Date.now() };
    case 'approved':
      return { who: team, kind: 'city', text: 'Approved and assigned to a crew.', at: Date.now() };
    case 'fixed':
      return { who: team, kind: 'city', text: update.closure_comments || 'Marked fixed.', at };
    case 'notApproved':
      return { who: team, kind: 'city', text: update.closure_comments || 'Closed without action.', at };
    default:
      return null;
  }
}

/** Pulls the latest 311 status for every open report tied to a case, saves, and returns all reports. */
export async function refreshMyReportsFrom311(): Promise<MyReport[]> {
  const reports = await getMyReports();
  const openCaseIds = reports
    .filter((r) => r.caseId && r.status !== 'fixed' && r.status !== 'notApproved')
    .map((r) => r.caseId as string);
  if (openCaseIds.length === 0) return reports;

  const updates = new Map<string, CaseUpdate>();
  for (const update of await getCasesById([...new Set(openCaseIds)])) updates.set(update.case_id, update);

  // Re-read in case a report was added while we were fetching.
  const refreshed = (await getMyReports()).map((report) => {
    const update = report.caseId ? updates.get(report.caseId) : undefined;
    if (!update) return report;
    const status = statusFrom311(update.case_status, update.closure_reason);
    const team = update.assigned_team || report.team || report.department;
    if (status === report.status) return { ...report, team };

    const message = updateFor(status, update, team);
    return {
      ...report,
      status,
      team,
      reason: status === 'notApproved' ? (update.closure_comments ?? undefined) : report.reason,
      history: { ...report.history, [status]: message?.at ?? Date.now() },
      updates: message ? [...report.updates, message] : report.updates,
    };
  });
  await saveMyReports(refreshed);
  return refreshed;
}

/** Pins on the map: open reports, plus fixed ones for 7 days. Not approved never shows. */
export function isOnMap(report: MyReport, now = Date.now()): boolean {
  if (report.status === 'notApproved') return false;
  if (report.status === 'fixed') {
    const fixedAt = report.history.fixed ?? report.createdAt;
    return now - fixedAt < FIXED_PIN_DAYS * 24 * 60 * 60 * 1000;
  }
  return true;
}

export const isOpen = (r: MyReport) => r.status !== 'fixed' && r.status !== 'notApproved';
