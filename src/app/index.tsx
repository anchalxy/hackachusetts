import { StyleSheet, View } from 'react-native';

import { Card, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Challenge = {
  id: string;
  monument: string;
  title: string;
  points: number;
  done: boolean;
};

// Mocked until agenda scraping is seeded.
const MOCK_CHALLENGES: Challenge[] = [
  { id: '1', monument: 'Boston Common', title: 'Redesign Peters Park', points: 8, done: true },
  { id: '2', monument: 'State House', title: 'Cut 5% without closing a library', points: 10, done: false },
  { id: '3', monument: 'Old South Meeting House', title: 'Attend the Council hearing on bike lanes', points: 12, done: false },
  { id: '4', monument: 'Faneuil Hall', title: 'Time a 311 pothole response', points: 6, done: false },
  { id: '5', monument: 'Paul Revere House', title: 'Navigate Downtown with a stroller', points: 7, done: false },
];

export default function ChallengesScreen() {
  const completed = MOCK_CHALLENGES.filter((c) => c.done).length;

  return (
    <Screen title="This Week" subtitle="Walk the Freedom Trail, one challenge at a time">
      <Card style={styles.streakCard}>
        <View>
          <ThemedText type="smallBold">🔥 3-week streak</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Finish 1 challenge this week to keep it
          </ThemedText>
        </View>
        <ThemedText type="smallBold">
          {completed}/{MOCK_CHALLENGES.length}
        </ThemedText>
      </Card>

      <View>
        {MOCK_CHALLENGES.map((challenge, index) => (
          <View key={challenge.id} style={styles.stop}>
            <View style={styles.trail}>
              <ThemedView
                type={challenge.done ? 'text' : 'backgroundSelected'}
                style={styles.marker}
              />
              {index < MOCK_CHALLENGES.length - 1 && (
                <ThemedView type="backgroundSelected" style={styles.line} />
              )}
            </View>
            <Card style={styles.stopCard}>
              <ThemedText type="small" themeColor="textSecondary">
                {challenge.monument}
              </ThemedText>
              <ThemedText style={challenge.done && styles.doneText}>{challenge.title}</ThemedText>
              <ThemedText type="smallBold">+{challenge.points} pts</ThemedText>
            </Card>
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
  },
  stop: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  trail: {
    alignItems: 'center',
    width: 20,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: Spacing.three,
  },
  line: {
    flex: 1,
    width: 3,
  },
  stopCard: {
    flex: 1,
    gap: Spacing.half,
    marginBottom: Spacing.three,
  },
  doneText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});
