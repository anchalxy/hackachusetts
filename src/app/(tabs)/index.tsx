import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getCurrentWeek, loadCurrentWeek, shortDate, trailOrder } from '@/lib/challenge-week';
import { areaSlug, getProfile } from '@/lib/profile';

// Freedom Trail stops, in trail order. A week has 4–5 challenges, so 5 stops is enough.
const MONUMENTS = [
  'Boston Common',
  'Massachusetts State House',
  'Old South Meeting House',
  'Faneuil Hall',
  'Paul Revere House',
];

const IN_PERSON_LABEL = { yes: 'In person', no: 'From home', optional: 'In person or online' } as const;

export default function ChallengesScreen() {
  const [week, setWeek] = useState(getCurrentWeek);

  // Live mode swaps in the latest generated week for the user's area; demo mode keeps the seed.
  useEffect(() => {
    let active = true;
    getProfile()
      .then((profile) => loadCurrentWeek(areaSlug(profile)))
      .then((loaded) => active && setWeek(loaded))
      .catch(() => {}); // keep showing what we have
    return () => {
      active = false;
    };
  }, []);
  const challenges = trailOrder(week);
  const totalPoints = challenges.reduce((sum, c) => sum + c.points, 0);

  return (
    <Screen title="This Week" subtitle={`Week of ${shortDate(week.weekOf)} · ${week.area}`}>
      <Card style={styles.streakCard}>
        <View style={styles.streakText}>
          <ThemedText type="smallBold">🔥 3-week streak</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Finish 1 challenge this week to keep it
          </ThemedText>
        </View>
        <ThemedText type="smallBold">{totalPoints} pts up for grabs</ThemedText>
      </Card>

      <View>
        {challenges.map((challenge, index) => (
          <View key={challenge.id} style={styles.stop}>
            <View style={styles.trail}>
              <ThemedView type="backgroundSelected" style={styles.marker}>
                <ThemedText type="smallBold">{index + 1}</ThemedText>
              </ThemedView>
              {index < challenges.length - 1 && <ThemedView type="backgroundSelected" style={styles.line} />}
            </View>
            <Pressable
              style={({ pressed }) => [styles.stopPressable, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } })}>
              <Card style={styles.stopCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  {MONUMENTS[index % MONUMENTS.length]}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.title}>
                  {challenge.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {challenge.summary}
                </ThemedText>
                <View style={styles.meta}>
                  <ThemedText type="smallBold">+{challenge.points} pts</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Due {shortDate(challenge.deadlineDate)} · {IN_PERSON_LABEL[challenge.inPerson]}
                  </ThemedText>
                </View>
              </Card>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  streakCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  streakText: {
    flex: 1,
  },
  stop: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  trail: {
    alignItems: 'center',
    width: 28,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginTop: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    width: 3,
  },
  stopPressable: {
    flex: 1,
    marginBottom: Spacing.three,
  },
  stopCard: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 16,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
