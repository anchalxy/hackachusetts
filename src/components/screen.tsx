import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView, type ThemedViewProps } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Rendered on top of the scroll content, e.g. a floating action button. */
  overlay?: ReactNode;
};

export function Screen({ title, subtitle, children, overlay }: ScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
          </View>
          {children}
        </ScrollView>
        {overlay}
      </SafeAreaView>
    </ThemedView>
  );
}

export function Card({ style, ...props }: ThemedViewProps) {
  return <ThemedView type="backgroundElement" style={[styles.card, style]} {...props} />;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
      {children}
    </ThemedText>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.two,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
