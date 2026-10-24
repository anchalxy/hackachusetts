import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getChallenge, shortDate } from '@/lib/challenge-week';

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = getChallenge(id);

  if (!challenge) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Challenge' }} />
        <ThemedText style={styles.missing}>This challenge isn’t in this week’s set.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `Challenge ${challenge.number}` }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {challenge.title}
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.pointsPill}>
            <ThemedText type="smallBold">{challenge.pointsLabel ?? `${challenge.points} points`}</ThemedText>
          </ThemedView>
          <ThemedText>{challenge.summary}</ThemedText>
        </View>

        <Section heading="The task">
          {challenge.task.intro && <ThemedText>{challenge.task.intro}</ThemedText>}
          {challenge.task.steps.map((step, i) => (
            <ThemedText key={i}>
              {i + 1}. {step}
            </ThemedText>
          ))}
        </Section>

        {challenge.extras?.map((extra) => (
          <Section key={extra.heading} heading={extra.heading}>
            {extra.intro && <ThemedText themeColor="textSecondary">{extra.intro}</ThemedText>}
            {extra.items.map((item, i) => (
              <ThemedText key={i}>• {item}</ThemedText>
            ))}
          </Section>
        ))}

        <Section heading="Agenda item">
          <ThemedText>{challenge.agendaItem}</ThemedText>
        </Section>
        <Section heading="Why now">
          <ThemedText>{challenge.whyNow}</ThemedText>
        </Section>
        <Section heading="Submission deadline">
          <ThemedText>{challenge.deadline}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Due {shortDate(challenge.deadlineDate)}
          </ThemedText>
        </Section>
        <Section heading="Points">
          <ThemedText>{challenge.pointsBreakdown}</ThemedText>
        </Section>
        {challenge.voting && (
          <Section heading="Voting">
            <ThemedText>{challenge.voting}</ThemedText>
          </Section>
        )}
        {challenge.verification && (
          <Section heading="Verification">
            <ThemedText>{challenge.verification}</ThemedText>
          </Section>
        )}
        <Section heading="Government POC">
          <ThemedText>{challenge.poc}</ThemedText>
        </Section>
        <Section heading="What the POC receives">
          <ThemedText>{challenge.pocReceives}</ThemedText>
        </Section>

        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(challenge.sourceUrl)}
          style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold">View the source on {hostname(challenge.sourceUrl)} ↗</ThemedText>
        </Pressable>

        <Pressable disabled style={[styles.startButton, styles.pressed]}>
          <ThemedText type="smallBold" style={styles.startText}>
            Start challenge (coming soon)
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

/** "https://www.boston.gov/…" → "boston.gov". */
function hostname(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeading}>
        {heading}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  missing: {
    padding: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  pointsPill: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  section: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  sectionHeading: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  startButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    backgroundColor: '#208AEF',
  },
  startText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.6,
  },
});
