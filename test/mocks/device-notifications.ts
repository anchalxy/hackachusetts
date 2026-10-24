// Device notifications need the native expo-notifications module; Node tests only need no-ops.
export const notificationsSupported = false;
export async function alertReportChange(): Promise<void> {}
export async function syncScheduledNotifications(): Promise<void> {}
export async function sendTestNotification(): Promise<boolean> {
  return false;
}
