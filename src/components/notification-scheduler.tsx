import { useEffect } from 'react';

import { useChallengeProgress } from '@/lib/challenge-progress';
import { syncScheduledNotifications, useNotificationTaps } from '@/lib/device-notifications';

/**
 * Mounted once at the root: keeps the streak reminder and Monday's trail alert in step with
 * challenge progress (finishing a stop cancels tonight's reminder), and routes notification taps.
 */
export function NotificationScheduler() {
  const progress = useChallengeProgress();
  useNotificationTaps();
  useEffect(() => {
    syncScheduledNotifications(progress).catch(() => {});
  }, [progress]);
  return null;
}
