import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openLeafDevMenu } from '@/components/rewards/leaf-dev-menu';
import { resetChallengeProgress } from '@/lib/challenge-progress';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, space } from '@/ui/theme';

/** Hidden dev menu for the demo: long-press the streak pill. */
function openDevMenu() {
  Alert.alert('Demo tools', undefined, [
    { text: 'Reset this week’s trail', style: 'destructive', onPress: resetChallengeProgress },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

/**
 * No header bar: the trail runs to the top of the screen, and two pills float over it at the
 * top right. The streak (weeks in a row, flame) sits left of the leaf balance. The streak pill
 * is informational, so it isn't a button; reminders to keep it going come as notifications.
 */
export function TrailHeader({ balance, streakWeeks }: { balance: number; streakWeeks: number }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  return (
    <View pointerEvents="box-none" style={[styles.bar, { top: insets.top + 8 }]}>
      <Pressable
        onLongPress={openDevMenu}
        delayLongPress={600}
        accessible
        accessibilityLabel={`${streakWeeks}-week streak`}
        style={[styles.pill, styles.streakPill]}>
        <Icon name="flame" size={20} />
        <Txt variant="rowLead" style={[styles.amount, styles.streakAmount]}>
          {streakWeeks}
        </Txt>
      </Pressable>
      <Pressable
        onPress={() => router.navigate('/rewards')}
        onLongPress={openLeafDevMenu}
        delayLongPress={600}
        accessibilityRole="button"
        accessibilityLabel={`${balance.toLocaleString()} tea leaves`}
        style={({ pressed }) => [styles.pill, styles.leafPill, pressed && styles.pressed]}>
        <Icon name="leafy" size={22} />
        <Txt variant="rowLead" style={[styles.amount, styles.leafAmount]}>
          {balance.toLocaleString()}
        </Txt>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((color, dark) => ({
  bar: {
    position: 'absolute',
    right: space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  // Floating over the map, so a white rim and a soft shadow keep the pills legible on the trees.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: color.surface,
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: dark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(30, 42, 58, 0.14)' }],
  },
  leafPill: {
    backgroundColor: color.leaf.tint,
  },
  streakPill: {
    paddingLeft: 7,
    backgroundColor: color.badge.urgent.bg,
  },
  amount: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  leafAmount: {
    color: color.leaf.dark,
  },
  streakAmount: {
    color: color.badge.urgent.fg,
  },
  pressed: {
    opacity: 0.7,
  },
}));
