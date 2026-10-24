import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card, Screen, SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { areaLabel, getProfile, SEED_PROFILE, type Profile } from '@/lib/profile';

const STATS = [
  { label: 'Friends', value: '12' },
  { label: 'Streak', value: '3 wks' },
  { label: 'Reports', value: '5' },
];

const MOCK_NOTIFICATIONS = [
  { id: '1', text: 'New reward available: Boston Public Market' },
  { id: '2', text: 'Your pothole report on Mass Ave was fixed by Public Works' },
  { id: '3', text: '@sam hit a 5-week streak' },
];

export default function AccountScreen() {
  const theme = useTheme();
  const [profile, setProfile] = useState<Profile>(SEED_PROFILE);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);
  const [friend, setFriend] = useState('');

  return (
    <Screen title="Account">
      <Card style={styles.profile}>
        <ThemedView type="backgroundSelected" style={styles.avatar} />
        <View>
          <ThemedText type="smallBold">{profile.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile.username} · {areaLabel(profile)} · {profile.age}
          </ThemedText>
        </View>
      </Card>

      <View style={styles.stats}>
        {STATS.map((stat) => (
          <Card key={stat.label} style={styles.stat}>
            <ThemedText type="smallBold">{stat.value}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {stat.label}
            </ThemedText>
          </Card>
        ))}
      </View>

      <SectionTitle>Add a friend</SectionTitle>
      <Card style={styles.addFriend}>
        <TextInput
          value={friend}
          onChangeText={setFriend}
          placeholder="Username"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text }]}
        />
        <Pressable onPress={() => setFriend('')} disabled={!friend}>
          <ThemedText type="smallBold" themeColor={friend ? 'text' : 'textSecondary'}>
            Add
          </ThemedText>
        </Pressable>
      </Card>

      <SectionTitle>Notifications</SectionTitle>
      {MOCK_NOTIFICATIONS.map((notification) => (
        <Card key={notification.id}>
          <ThemedText type="small">{notification.text}</ThemedText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 0,
  },
  addFriend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
});
