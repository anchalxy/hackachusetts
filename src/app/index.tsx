import { useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type Item = { id: string; title: string; subtitle: string };

const MOCK_ITEMS: Item[] = [
  { id: '1', title: 'Team kickoff', subtitle: 'Saturday · 10:00 AM' },
  { id: '2', title: 'Pick a project idea', subtitle: 'Brainstorm with the team' },
  { id: '3', title: 'Build the MVP', subtitle: 'Ship something that works' },
  { id: '4', title: 'Demo prep', subtitle: 'Sunday · 2:00 PM' },
  { id: '5', title: 'Submit to judges', subtitle: 'Sunday · 4:00 PM' },
];

export default function HomeScreen() {
  const [done, setDone] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={MOCK_ITEMS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">Hackachusetts</ThemedText>
              <ThemedText themeColor="textSecondary">
                {done.size} of {MOCK_ITEMS.length} done
              </ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => {
            const isDone = done.has(item.id);
            return (
              <Pressable onPress={() => toggle(item.id)}>
                {({ pressed }) => (
                  <ThemedView
                    type={pressed ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.card}>
                    <ThemedView
                      type={isDone ? 'text' : 'backgroundSelected'}
                      style={styles.check}
                    />
                    <ThemedView type={pressed ? 'backgroundSelected' : 'backgroundElement'}>
                      <ThemedText style={isDone && styles.doneText}>{item.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.subtitle}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                )}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  header: {
    paddingVertical: Spacing.four,
    gap: Spacing.one,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  doneText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});
