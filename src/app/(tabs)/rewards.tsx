import { StyleSheet, View } from 'react-native';

import { Card, Screen, SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const POINTS = 7;
const NEXT_THRESHOLD = 10;

const MOCK_CRATES = [
  { id: '1', business: 'Tatte Bakery', offer: '10% off any drink', redeemed: true },
  { id: '2', business: 'Boston Public Market', offer: '$5 off $20', redeemed: false },
];

export default function RewardsScreen() {
  const progress = Math.min(POINTS / NEXT_THRESHOLD, 1);

  return (
    <Screen title="Rewards" subtitle="Throw the tea, raise the tide">
      <Card style={styles.ship}>
        <ThemedText themeColor="textSecondary">⛵️ Ship on the harbor</ThemedText>
      </Card>

      <Card>
        <View style={styles.progressHeader}>
          <ThemedText type="smallBold">Next crate</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {POINTS} / {NEXT_THRESHOLD} pts
          </ThemedText>
        </View>
        <ThemedView type="backgroundSelected" style={styles.track}>
          <ThemedView type="text" style={[styles.fill, { width: `${progress * 100}%` }]} />
        </ThemedView>
      </Card>

      <SectionTitle>Crates</SectionTitle>
      {MOCK_CRATES.map((crate) => (
        <Card key={crate.id} style={[styles.row, crate.redeemed && styles.redeemed]}>
          <ThemedText style={styles.crateIcon}>📦</ThemedText>
          <View style={styles.crateText}>
            <ThemedText>{crate.business}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {crate.offer}
            </ThemedText>
          </View>
          <ThemedText type="smallBold">{crate.redeemed ? 'Redeemed' : 'Redeem'}</ThemedText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ship: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  crateIcon: {
    fontSize: 28,
    lineHeight: 34,
  },
  crateText: {
    flex: 1,
  },
  redeemed: {
    opacity: 0.5,
  },
});
