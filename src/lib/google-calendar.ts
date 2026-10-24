import * as Haptics from 'expo-haptics';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { Linking } from 'react-native';

/**
 * "Add to Google Calendar" without sign-in: Google's event template link opens the Calendar app
 * (or calendar.google.com) with the event filled in, and the user taps Save there.
 */

/** Every event is a Boston event, so times are Boston wall-clock times. */
const TIME_ZONE = 'America/New_York';

export type CalendarEvent = {
  /** Stable id, so the button remembers it's been added. */
  id: string;
  title: string;
  /** "2026-10-28T12:00" (Boston time), or "2026-11-02" for an all-day event. */
  start: string;
  /** Same form as `start`. All-day events may leave it out for a single day. */
  end?: string;
  location?: string;
  details?: string;
};

function isAllDay(event: CalendarEvent) {
  return !event.start.includes('T');
}

/** "2026-10-28T12:00" → "20261028T120000"; "2026-11-02" → "20261102". */
function stamp(value: string) {
  const [date, time] = value.split('T');
  return date.replaceAll('-', '') + (time ? `T${time.replace(':', '').padEnd(6, '0')}` : '');
}

/** The day after an ISO date: Google's all-day end date is exclusive. */
function nextDay(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const end = isAllDay(event) ? nextDay(event.end ?? event.start) : (event.end ?? event.start);
  // Built by hand: React Native's URLSearchParams has been incomplete across versions.
  const params: [string, string | undefined][] = [
    ['action', 'TEMPLATE'],
    ['text', event.title],
    ['dates', `${stamp(event.start)}/${stamp(end)}`],
    ['ctz', TIME_ZONE],
    ['location', event.location],
    ['details', event.details],
  ];
  const query = params
    .filter((param): param is [string, string] => !!param[1])
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `https://calendar.google.com/calendar/render?${query}`;
}

/** "12 p.m.", "5:30 p.m." */
function clock(time: string, meridiem = true) {
  const [h, m] = time.split(':').map(Number);
  const hour = h % 12 || 12;
  const base = m ? `${hour}:${String(m).padStart(2, '0')}` : `${hour}`;
  return meridiem ? `${base} ${h < 12 ? 'a.m.' : 'p.m.'}` : base;
}

/** "Wed, Oct 28 · 12–3 p.m.", "Thu, Nov 5 · 5:30–7:30 p.m.", or "Mon, Nov 2" for all-day. */
export function eventWhen(event: CalendarEvent): string {
  const [date, startTime] = event.start.split('T');
  const day = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  if (!startTime) return day;
  const endTime = event.end?.split('T')[1];
  if (!endTime) return `${day} · ${clock(startTime)}`;
  // One "p.m." when both ends share it, like the rest of the app ("6–8 p.m.").
  const sameHalf = Number(startTime.slice(0, 2)) < 12 === Number(endTime.slice(0, 2)) < 12;
  return `${day} · ${clock(startTime, !sameHalf)}–${clock(endTime)}`;
}

// Which events the user has sent to Google Calendar. We can't see whether they tapped Save, so
// this only means "opened in Calendar"; the button stays tappable to open it again.
const KEY = 'calendarAdded';

let added: Record<string, number> = load();
const listeners = new Set<() => void>();

function load(): Record<string, number> {
  try {
    const raw = Storage.getItemSync(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAddedToCalendar(id: string): boolean {
  return useSyncExternalStore(subscribe, () => id in added);
}

export async function addToGoogleCalendar(event: CalendarEvent): Promise<void> {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  await Linking.openURL(googleCalendarUrl(event));
  added = { ...added, [event.id]: Date.now() };
  Storage.setItemSync(KEY, JSON.stringify(added));
  listeners.forEach((l) => l());
}
