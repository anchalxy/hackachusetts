import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { topicInfo } from '@/constants/report-topics';
import { streak, type ChallengeProgress } from '@/lib/challenge-progress';
import type { MyReport } from '@/lib/my-reports';
import { getNotificationPrefs, type NotificationPrefs, type Permission } from '@/lib/settings';

// Real, on-device notifications for the toggles in Menu → Notifications. All local (they work in
// Expo Go): report status changes from the 311 sync, a streak reminder, and Monday's new trail.

/** expo-notifications is iOS/Android only. */
export const notificationsSupported = Platform.OS !== 'web';

if (notificationsSupported) {
  // Show alerts even while the app is open (a 311 sync can land while you're on the map).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type NotificationPermission = { status: Permission; canAskAgain: boolean };

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported) return { status: 'denied', canAskAgain: false };
  const p = await Notifications.getPermissionsAsync();
  return { status: p.status as Permission, canAskAgain: p.canAskAgain };
}

/** Asks iOS once; afterwards the only fix is Settings. Returns whether we may notify. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return asked.granted;
}

/** Permission, kept fresh on focus and when returning from iOS Settings. */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const refresh = useCallback(() => {
    getNotificationPermission()
      .then(setPermission)
      .catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  return { permission, refresh };
}

async function canNotify(pref: keyof NotificationPrefs): Promise<boolean> {
  if (!notificationsSupported) return false;
  const [prefs, permission] = await Promise.all([getNotificationPrefs(), Notifications.getPermissionsAsync()]);
  return prefs[pref] && permission.granted;
}

// ── Report updates ──────────────────────────────────────────────────────────────────────────

const noun = (r: MyReport) => r.title.toLowerCase();
const team = (r: MyReport) => r.team?.replace(/\s*\([^)]*\)\s*$/, '').trim() || topicInfo(r.topic).shortDepartment;

function reportAlert(r: MyReport): { title: string; body: string } | null {
  const latest = r.updates.at(-1)?.text;
  switch (r.status) {
    case 'inReview':
      return { title: `The city is reviewing your ${noun(r)}`, body: `${r.address} · ${team(r)}` };
    case 'approved':
      return { title: `${team(r)} approved your ${noun(r)} report`, body: 'Your tea leaves just landed.' };
    case 'fixed':
      return { title: `Your ${noun(r)} got fixed!`, body: latest ? `${team(r)}: “${latest}”` : `Fixed by ${team(r)}.` };
    case 'notApproved':
      return { title: `Not approved: your ${noun(r)}`, body: r.reason ?? 'Tap to see why. No leaves lost.' };
    default:
      return null; // no alert for Submitted: the user just did that
  }
}

/** Tells the user about a report that just moved, if they want report updates. */
export async function alertReportChange(r: MyReport) {
  const alert = reportAlert(r);
  if (!alert || !(await canNotify('reportUpdates'))) return;
  await Notifications.scheduleNotificationAsync({
    content: { ...alert, data: { url: `/report/${r.id}` } },
    trigger: null,
  });
}

// ── Scheduled reminders ─────────────────────────────────────────────────────────────────────

const SCHEDULED_KEY = 'scheduledNotificationIds';

/** Sunday 10am this week, or null if that's already passed. */
function streakReminderDate(now: number): Date | null {
  const d = new Date(now);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  d.setHours(10, 0, 0, 0);
  return d.getTime() > now ? d : null;
}

/**
 * Re-plans the reminders from the current prefs and streak: cancels what we scheduled before and
 * schedules what's wanted now. Cheap; call it whenever prefs or challenge progress change.
 */
export async function syncScheduledNotifications(progress: ChallengeProgress, now = Date.now()) {
  if (!notificationsSupported) return;
  const previous: string[] = JSON.parse((await Storage.getItem(SCHEDULED_KEY)) ?? '[]');
  await Promise.all(previous.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));

  const ids: string[] = [];
  const [prefs, permission] = await Promise.all([getNotificationPrefs(), Notifications.getPermissionsAsync()]);
  if (permission.granted) {
    if (prefs.weeklyChallenges) {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { title: 'New challenges are on the trail', body: 'This week’s stops come from real city agendas.', data: { url: '/' } },
          // 1 = Sunday, so 2 = Monday.
          trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 9, minute: 0 },
        }),
      );
    }
    const { weeks, safe } = streak(progress);
    const date = streakReminderDate(now);
    if (prefs.streakReminder && !safe && date) {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { title: `Your ${weeks}-week streak ends tonight`, body: 'Finish one challenge to keep it going.', data: { url: '/' } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        }),
      );
    }
  }
  await Storage.setItem(SCHEDULED_KEY, JSON.stringify(ids));
}

/** One-off check from Menu → Notifications that alerts really arrive. */
export async function sendTestNotification(): Promise<boolean> {
  if (!(await ensureNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Tea Party notifications are on', body: 'You’ll hear when the city moves on your reports.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
  return true;
}

/** Tapping a notification opens what it's about (a report, or the trail). */
export function useNotificationTaps() {
  useEffect(() => {
    if (!notificationsSupported) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    // Cold start: the app was launched by tapping one.
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
