import type { Href } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';

import { ago } from '@/components/report/format';
import { topicInfo } from '@/constants/report-topics';
import { trailStop } from '@/constants/trail';
import { isStopDone, streak, type ChallengeProgress } from '@/lib/challenge-progress';
import { shortDate, trailOrder } from '@/lib/challenge-week';
import type { ChallengeWeek } from '@/lib/challenges';
import { FIXED_PIN_DAYS, type MyReport } from '@/lib/my-reports';
import { REPORT_LEAVES } from '@/lib/report-leaves';
import { TOPIC_PHOTO } from '@/lib/seed-311';
import type { IconName } from '@/ui/icon';
import type { ReportStatus } from '@/ui/theme';

// The Profile inbox (DESIGN.md §6), built from what's actually in the app: report status changes
// synced from 311, this week's challenges, and the streak. Nothing here is hard-coded copy.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Rows shown under "Earlier". */
export const MAX_ROWS = 6;
/** Most rows of each kind in the inbox. */
const BUDGET: Record<string, number> = { streak: 1, challenge: 2, report: 3 };
/** Deadlines this close jump the queue. */
const URGENT_DAYS = 2;

export type Trailing =
  | { kind: 'status'; status: ReportStatus }
  | { kind: 'urgent'; label: string }
  | { kind: 'leaves'; amount: number }
  | { kind: 'button'; label: string; href: Href };

export type AppNotification = {
  id: string;
  icon: IconName;
  /** The report's own photo (stored form; pass through photoSource). Shown instead of the icon. */
  photo?: string;
  /** Bold subject, then the rest of the sentence (DESIGN.md §4 copy style). */
  lead: string;
  rest?: string;
  detail: string;
  /** When it happened; drives "1d" and unread. */
  at: number;
  /** Row tap. Buttons have their own href. */
  href: Href;
  trailing: Trailing;
  /** 0 = act now (streak or deadline about to lapse), 1 = news, 2 = everything else. */
  tier: 0 | 1 | 2;
  unread: boolean;
  /** "1d", or omitted when the row is about now (streak). */
  ago?: string;
};

/** A row before read state and the "1d" label are applied. */
type Row = Omit<AppNotification, 'unread' | 'ago'>;

export type FixedHero = {
  report: MyReport;
  /** "Your pothole got fixed!" */
  headline: string;
  /** "PWD Highway" */
  fixedBy: string;
  leaves: number;
  unread: boolean;
};

export type Inbox = { hero: FixedHero | null; rows: AppNotification[]; unread: number };

/** "PWD Highway (BEAM)" → "PWD Highway"; falls back to the department's short name. */
export function teamName(report: MyReport): string {
  const team = report.team?.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return team || topicInfo(report.topic).shortDepartment;
}

const noun = (r: MyReport) => TOPIC_PHOTO[r.topic]?.noun ?? r.title.toLowerCase();

/** Lowercases the first letter so a title reads mid-sentence ("redesign your urban wild"). */
const midSentence = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Days left in the streak week (weeks end Sunday night), counting today. */
export function streakDaysLeft(now: number): number {
  const d = new Date(now);
  return ((7 - d.getDay()) % 7) + 1;
}

const daysUntil = (isoDate: string, now: number) =>
  Math.ceil((new Date(`${isoDate}T23:59:59`).getTime() - now) / DAY);

/** The newest fixed report from the last week. Real 311 cases (caseId) win over local-only ones. */
function pickHero(reports: MyReport[], now: number): MyReport | undefined {
  const recent = reports.filter(
    (r) => r.status === 'fixed' && now - (r.history.fixed ?? r.createdAt) < FIXED_PIN_DAYS * DAY,
  );
  const byNewest = (a: MyReport, b: MyReport) => (b.history.fixed ?? 0) - (a.history.fixed ?? 0);
  return [...recent.filter((r) => r.caseId)].sort(byNewest)[0] ?? [...recent].sort(byNewest)[0];
}

function reportRow(r: MyReport, seenAt: number, now: number): Row | null {
  const at = r.history[r.status] ?? r.createdAt;
  const base = { id: `report-${r.id}-${r.status}`, icon: topicInfo(r.topic).icon, photo: r.photoUri, at, href: `/report/${r.id}` as Href };
  const tier = at > seenAt ? 1 : 2;
  switch (r.status) {
    case 'inReview':
      return { ...base, lead: 'The city is reviewing', detail: `your ${noun(r)} on ${r.address}`, trailing: { kind: 'status', status: r.status }, tier };
    case 'approved':
      return { ...base, lead: `${teamName(r)} approved`, detail: `your ${noun(r)} on ${r.address}`, trailing: { kind: 'status', status: r.status }, tier };
    case 'fixed':
      return { ...base, lead: `${teamName(r)} fixed`, detail: `your ${noun(r)} on ${r.address}`, trailing: { kind: 'leaves', amount: REPORT_LEAVES }, tier };
    case 'notApproved':
      return { ...base, lead: 'Not approved:', rest: `your ${noun(r)}`, detail: r.reason ?? `on ${r.address}`, trailing: { kind: 'status', status: r.status }, tier };
    default:
      // No alert for Submitted: the user did that themselves (DESIGN.md §6).
      return null;
  }
}

function challengeRows(week: ChallengeWeek, progress: ChallengeProgress, now: number): Row[] {
  // Challenges drop when the week is generated; never show a time in the future.
  const published = Math.min(now - HOUR, Date.parse(week.generatedAt) || now - HOUR);
  let starts = 0;
  return trailOrder(week).flatMap((c): Row[] => {
    const stop = trailStop(c.id);
    const leaves = stop?.leaves ?? c.points * 10;
    const done = progress.stops[c.id];
    const sheet = `/challenge/${c.id}` as Href;
    const icon: IconName = stop?.icon ?? 'flag';
    const title = midSentence(stop?.title ?? c.title);

    if (done?.pendingCheckIn) {
      return [{
        id: `challenge-${c.id}-checkin`, icon, at: done.at, href: sheet, tier: 0 as const,
        lead: 'Check in:', rest: title, detail: 'See if 311 handled it',
        trailing: { kind: 'button' as const, label: 'Check in', href: '/flow/rat-patrol/check-in' as Href },
      }];
    }
    if (done && isStopDone(progress, c.id)) {
      return [{
        id: `challenge-${c.id}-done`, icon, at: done.at, href: sheet, tier: 2 as const,
        lead: 'You finished', rest: title, detail: `Due ${shortDate(c.deadlineDate)}`,
        trailing: { kind: 'leaves' as const, amount: done.leaves },
      }];
    }
    // Start goes straight into that challenge's flow; generated weeks without one open its sheet.
    const start = (stop?.flow ?? sheet) as Href;
    const tier = daysUntil(c.deadlineDate, now) <= URGENT_DAYS ? (0 as const) : (2 as const);
    if (c.type === 'meeting') {
      const meets = c.title.match(/([A-Z][a-z]{2}) (\d{1,2})/);
      const when = meets ? shortDate(`${week.weekOf.slice(0, 4)}-${String(new Date(`${meets[1]} 1, 2000`).getMonth() + 1).padStart(2, '0')}-${meets[2].padStart(2, '0')}`) : shortDate(c.deadlineDate);
      return [{
        id: `challenge-${c.id}`, icon: 'calendar' as IconName, at: published, href: sheet, tier,
        lead: 'City Council', rest: `meets ${when}`, detail: `Take notes for +${leaves} leaves`,
        trailing: { kind: 'button' as const, label: 'RSVP', href: start },
      }];
    }
    // One "New challenge" row (the soonest due); the rest are on the trail.
    if (starts++ > 0) return [];
    return [{
      id: `challenge-${c.id}`, icon, at: published, href: sheet, tier,
      lead: 'New challenge:', rest: title, detail: `Due ${shortDate(c.deadlineDate)} · +${leaves} leaves`,
      trailing: { kind: 'button' as const, label: 'Start', href: start },
    }];
  });
}

function streakRow(progress: ChallengeProgress, now: number): Row {
  const { weeks, safe } = streak(progress);
  if (safe) {
    return {
      id: `streak-${weeks}-safe`, icon: 'flame', at: now, href: '/', tier: 2,
      lead: `Your ${weeks}-week streak`, detail: 'Safe for this week',
      trailing: { kind: 'leaves', amount: weeks * 10 },
    };
  }
  const left = streakDaysLeft(now);
  return {
    id: `streak-${weeks}-risk`, icon: 'flame', at: now, href: '/', tier: left <= URGENT_DAYS ? 0 : 1,
    lead: `Your ${weeks}-week streak`, detail: 'Do a challenge to keep it',
    trailing: { kind: 'urgent', label: `${left} day${left === 1 ? '' : 's'} left` },
  };
}

/**
 * The ranking: anything about to lapse first (streak, near deadlines), then unread news, then
 * the rest; newest first within each tier. One row per report (its latest status), at most
 * BUDGET rows of each kind, MAX_ROWS in all. The newest real fix becomes the "New" hero card instead of a row.
 */
export function buildInbox(input: {
  reports: MyReport[];
  week: ChallengeWeek;
  progress: ChallengeProgress;
  seenAt: number;
  now?: number;
}): Inbox {
  const { reports, week, progress, seenAt } = input;
  const now = input.now ?? Date.now();
  const heroReport = pickHero(reports, now);

  const candidates = [
    streakRow(progress, now),
    ...challengeRows(week, progress, now),
    ...reports.filter((r) => r !== heroReport).map((r) => reportRow(r, seenAt, now)),
  ].filter((n): n is Row => n !== null);

  // A mixed inbox: each kind gets a budget, so a burst of report syncs can't push out the
  // challenge you could start right now.
  const used: Record<string, number> = {};
  const kindOf = (n: Row) => n.id.split('-')[0];
  const byRank = (a: Row, b: Row) => a.tier - b.tier || b.at - a.at;
  const rows = candidates
    .sort(byRank)
    .filter((n) => {
      const kind = kindOf(n);
      used[kind] = (used[kind] ?? 0) + 1;
      return used[kind] <= (BUDGET[kind] ?? MAX_ROWS);
    })
    .slice(0, MAX_ROWS)
    .map((n) => ({
      ...n,
      // The streak row is about now; it's never "news".
      unread: !n.id.startsWith('streak') && n.at > seenAt,
      ago: n.id.startsWith('streak') ? undefined : ago(n.at, now),
    }));

  const hero: FixedHero | null = heroReport
    ? {
        report: heroReport,
        headline: `Your ${noun(heroReport)} got fixed!`,
        fixedBy: teamName(heroReport),
        leaves: REPORT_LEAVES,
        unread: (heroReport.history.fixed ?? 0) > seenAt,
      }
    : null;

  return { hero, rows, unread: rows.filter((r) => r.unread).length + (hero?.unread ? 1 : 0) };
}

const SEEN_KEY = 'notificationsSeenAt';

/** When the user last looked at the inbox. First run: treat the last 2 days as new. */
export async function getSeenAt(now = Date.now()): Promise<number> {
  const raw = await Storage.getItem(SEEN_KEY);
  if (raw) return Number(raw);
  const initial = now - 2 * DAY;
  await Storage.setItem(SEEN_KEY, String(initial));
  return initial;
}

export async function markSeen(now = Date.now()) {
  await Storage.setItem(SEEN_KEY, String(now));
}
