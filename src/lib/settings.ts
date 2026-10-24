import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Notification preferences (DESIGN.md 6b). Delivered by src/lib/device-notifications.ts.
export type NotificationPrefs = {
  reportUpdates: boolean;
  streakReminder: boolean;
  weeklyChallenges: boolean;
};

const PREFS_KEY = 'notificationPrefs';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  reportUpdates: true,
  streakReminder: true,
  weeklyChallenges: true,
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const raw = await Storage.getItem(PREFS_KEY);
  if (!raw) return DEFAULT_NOTIFICATION_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {}
  return DEFAULT_NOTIFICATION_PREFS;
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await Storage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export type Permission = 'granted' | 'denied' | 'undetermined';

export type DevicePermissions = {
  camera: Permission;
  location: Permission;
  /** False once iOS stops showing the prompt; the fix is then in Settings. */
  canAskCamera: boolean;
  canAskLocation: boolean;
};

async function readPermissions(): Promise<DevicePermissions> {
  const [camera, location] = await Promise.all([
    Camera.getCameraPermissionsAsync(),
    Location.getForegroundPermissionsAsync(),
  ]);
  return {
    camera: camera.status as Permission,
    location: location.status as Permission,
    canAskCamera: camera.canAskAgain,
    canAskLocation: location.canAskAgain,
  };
}

/**
 * Camera and location permission, kept fresh: re-read on focus and whenever the app comes back
 * to the foreground (the user may have just flipped it in Settings).
 */
export function useDevicePermissions() {
  const [permissions, setPermissions] = useState<DevicePermissions | null>(null);

  const refresh = useCallback(() => {
    readPermissions()
      .then(setPermissions)
      .catch(() => {});
  }, []);

  useFocusEffect(refresh);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  return { permissions, refresh };
}

/** The menu row's subtitle: only a problem, in brick (DESIGN.md 6b). */
export function permissionProblem(p: DevicePermissions | null): string | undefined {
  if (!p) return undefined;
  const camera = p.camera === 'denied';
  const location = p.location === 'denied';
  if (camera && location) return 'Camera and location are off';
  if (camera) return 'Camera access is off';
  if (location) return 'Location access is off';
  return undefined;
}
