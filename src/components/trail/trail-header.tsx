import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resetChallengeProgress } from '@/lib/challenge-progress';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, space } from '@/ui/theme';

/** Hidden dev menu (DESIGN.md 6c "Decisions"): long-press the teacup. */
function openDevMenu() {
  Alert.alert('Demo tools', undefined, [
    { text: 'Reset this week’s trail', style: 'destructive', onPress: resetChallengeProgress },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

/** Fixed header above the trail: teacup, title, leaf balance, then the streak line. */
export function TrailHeader({ balance, streak }: { balance: number; streak: { weeks: number; safe: boolean } }) {
  const insets = useSafeAreaInsets();
  const streakText = streak.safe
    ? `Streak safe: ${streak.weeks} weeks`
    : `Your ${streak.weeks}-week streak expires Sunday`;

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          onLongPress={openDevMenu}
          delayLongPress={600}
          accessibilityRole="image"
          accessibilityLabel="Tea Party"
          hitSlop={8}
          style={styles.side}>
          <Icon name="teacup" size={36} />
        </Pressable>
        <Txt style={styles.title} accessibilityRole="header">
          Freedom Trail
        </Txt>
        <View style={[styles.side, styles.sideRight]}>
          <Pressable
            onPress={() => router.navigate('/rewards')}
            accessibilityRole="button"
            accessibilityLabel={`${balance.toLocaleString()} tea leaves`}
            style={({ pressed }) => [styles.leafPill, pressed && styles.pressed]}>
            <Icon name="leafy" size={22} />
            <Txt variant="rowLead" style={styles.leafAmount}>
              {balance.toLocaleString()}
            </Txt>
          </Pressable>
        </View>
      </View>
      <View style={styles.streak}>
        <Icon name="flame" size={20} />
        <Txt variant="rowLead">
          {streakText}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: color.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    paddingHorizontal: space.gutter,
    paddingBottom: 10,
    zIndex: 1,
  },
  topBar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: 104,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.bodyBold,
    fontSize: 20,
    lineHeight: 25,
    color: color.ink,
  },
  leafPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: color.leaf.tint,
  },
  leafAmount: {
    color: color.leaf.dark,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.7,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
  },
});
