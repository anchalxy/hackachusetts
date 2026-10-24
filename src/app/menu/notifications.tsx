import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Caption, Group, InfoRow, InnerPage, SectionLabel } from '@/components/menu/menu-ui';
import {
  DEFAULT_NOTIFICATION_PREFS,
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/settings';
import type { IconName } from '@/ui/icon';
import { color } from '@/ui/theme';

const ROWS: { key: keyof NotificationPrefs; icon: IconName; title: string; body: string }[] = [
  { key: 'reportUpdates', icon: 'pothole', title: 'Report updates', body: 'When a report is in review,\napproved or fixed.' },
  { key: 'streakReminder', icon: 'flame', title: 'Streak reminder', body: 'The day before your streak ends.' },
  { key: 'weeklyChallenges', icon: 'flag', title: 'New weekly challenges', body: 'Monday mornings.' },
  { key: 'citySurveys', icon: 'ballot', title: 'City surveys', body: 'When the city wants to hear\nfrom people like you.' },
];

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    getNotificationPrefs().then(setPrefs);
  }, []);

  const toggle = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveNotificationPrefs(next);
  };

  return (
    <InnerPage icon="bell" title="Notifications" intro={'Pick what’s worth a ping.\nWe keep it to a few a week.'}>
      <SectionLabel first>Tell me about</SectionLabel>
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
                  onValueChange={(v) => toggle(row.key, v)}
                  trackColor={{ false: '#E7E1D5', true: color.primary }}
                  ios_backgroundColor="#E7E1D5"
                  thumbColor={color.surface}
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
    </InnerPage>
  );
}

const styles = StyleSheet.create({
  switch: {
    // Sit the toggle on the title line, not the middle of a 3-line row.
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  footnote: {
    marginTop: 7,
  },
});
