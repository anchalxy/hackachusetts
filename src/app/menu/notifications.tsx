import { useEffect, useState } from 'react';
import { Linking, Switch, View } from 'react-native';

import { Caption, Group, InfoRow, InnerPage, SectionLabel } from '@/components/menu/menu-ui';
import { getChallengeProgress } from '@/lib/challenge-progress';
import {
  ensureNotificationPermission,
  notificationsSupported,
  sendTestNotification,
  syncScheduledNotifications,
  useNotificationPermission,
} from '@/lib/device-notifications';
import {
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/settings';
import { Button, TextLink } from '@/ui/components';
import type { IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, useColors, useScheme } from '@/ui/theme';

const ROWS: { key: keyof NotificationPrefs; icon: IconName; title: string; body: string }[] = [
  { key: 'reportUpdates', icon: 'pothole', title: 'Report updates', body: 'When a report is in review,\napproved or fixed.' },
  { key: 'streakReminder', icon: 'flame', title: 'Streak reminder', body: 'Sunday morning, if you haven’t\ndone a challenge yet.' },
  { key: 'weeklyChallenges', icon: 'flag', title: 'New weekly challenges', body: 'Monday mornings at 9.' },
];

export default function NotificationsPage() {
  const styles = useStyles();
  const color = useColors();
  const dark = useScheme() === 'dark';
  // Off track: warm cream in light, a lifted slate in dark so it reads on the card.
  const trackOff = dark ? '#3A424D' : '#E7E1D5';
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [testSent, setTestSent] = useState<'sent' | 'blocked' | null>(null);
  const { permission, refresh } = useNotificationPermission();
  const blocked = permission?.status === 'denied';

  useEffect(() => {
    getNotificationPrefs().then((p) => {
      setPrefs(p);
      setLoaded(true);
    });
  }, []);

  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    // Turning one on is when we ask iOS (never on first open of the page).
    if (value) await ensureNotificationPermission();
    const next = { ...(await getNotificationPrefs()), [key]: value };
    setPrefs(next);
    await saveNotificationPrefs(next);
    await syncScheduledNotifications(getChallengeProgress());
    refresh();
  };

  const test = async () => {
    setTestSent((await sendTestNotification()) ? 'sent' : 'blocked');
    refresh();
  };

  return (
    <InnerPage icon="bell" title="Notifications" intro={'Pick what’s worth a ping.\nWe keep it to a few a week.'}>
      {!notificationsSupported ? (
        <View style={styles.note}>
          <Txt style={styles.noteText}>Notifications only work in the iPhone app.</Txt>
        </View>
      ) : blocked ? (
        <View style={[styles.note, styles.noteProblem]} testID="notif-blocked">
          <Txt style={[styles.noteText, styles.noteTextProblem]}>Notifications are off for Tea Party in iOS Settings.</Txt>
          <Button size="sm" label="Open Settings" onPress={() => Linking.openSettings()} style={styles.noteButton} />
        </View>
      ) : null}

      <SectionLabel>Tell me about</SectionLabel>
      <Group padBottom>
        {ROWS.map((row, i) => (
          <InfoRow
            key={row.key}
            icon={row.icon}
            title={row.title}
            body={row.body}
            last={i === ROWS.length - 1}
            trailing={
              <View style={styles.switch}>
                <Switch
                  value={prefs[row.key]}
                  disabled={!loaded}
                  onValueChange={(v) => toggle(row.key, v)}
                  trackColor={{ false: trackOff, true: color.primary }}
                  ios_backgroundColor={trackOff}
                  thumbColor={dark ? '#FFFFFF' : color.surface}
                  accessibilityLabel={row.title}
                  testID={`notif-${row.key}`}
                />
              </View>
            }
          />
        ))}
      </Group>
      <View style={styles.footnote}>
        <Caption>{'No alert when you send a report, since you\njust did that yourself.'}</Caption>
      </View>
      {notificationsSupported ? (
        <View style={styles.test}>
          <TextLink label={testSent === 'sent' ? 'Sent! It arrives in 2 seconds.' : 'Send a test notification'} onPress={test} />
          {testSent === 'blocked' ? <Caption>Allow notifications in iOS Settings first.</Caption> : null}
        </View>
      ) : null}
    </InnerPage>
  );
}

const useStyles = makeStyles((color) => ({
  switch: {
    // Sit the toggle on the title line, not the middle of a 3-line row.
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  note: {
    marginTop: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: color.panel,
  },
  noteProblem: {
    backgroundColor: color.badge.urgent.bg,
    gap: 8,
  },
  noteText: {
    fontFamily: font.bodySemibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: color.slate,
  },
  noteTextProblem: {
    color: color.badge.urgent.fg,
  },
  noteButton: {
    alignSelf: 'flex-start',
  },
  footnote: {
    marginTop: 7,
  },
  test: {
    marginTop: 20,
    alignItems: 'center',
  },
}));
