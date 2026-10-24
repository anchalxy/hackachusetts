import type { MyReport } from '@/lib/my-reports';
import { LIFECYCLE } from '@/ui/theme';

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "4:12 pm" */
export function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

/** "Today", "Yesterday" or "Oct 23". */
export function day(ts: number, now = Date.now()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Row suffix: "2h", "1d", "Today" (DESIGN.md list rows). */
export function ago(ts: number, now = Date.now()): string {
  const minutes = Math.max(1, Math.round((now - ts) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** "Sent yesterday, 4:12 pm" */
export function sentLabel(ts: number): string {
  const d = day(ts);
  return `Sent ${d === 'Today' || d === 'Yesterday' ? d.toLowerCase() : d}, ${clock(ts)}`;
}

/** "Oct 23, 4:12 pm" or "Today, 9:30 am" */
export function stamp(ts: number): string {
  return `${day(ts)}, ${clock(ts)}`;
}

/** Whole days since `ts`, counting today as day 1. */
export function dayNumber(ts: number, now = Date.now()): number {
  return Math.floor((startOfDay(now) - startOfDay(ts)) / DAY) + 1;
}

/** One date label per lifecycle step for <Timeline>, '' where we don't know it. */
export function timelineDates(report: MyReport): string[] {
  return LIFECYCLE.map((step) => (report.history[step] ? day(report.history[step]!) : ''));
}
