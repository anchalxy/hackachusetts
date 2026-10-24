import * as Haptics from 'expo-haptics';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles } from '@/ui/theme';

import type { Nameplate as Placement } from './layout';

/**
 * Drawn smaller than layout.json's 196×46 boxes so the trail feels less cluttered: same center
 * and same top edge (still overlapping the tile front), 90% as wide.
 */
const PLATE_W = 0.9;
const PLATE_H = 40;

type Props = {
  placement: Placement;
  k: number;
  icon: IconName;
  title: string;
  /** Current: "+70 · Due Nov 8". Done: "Done · +70 earned". */
  reward: number;
  due: string;
  done: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  onPressedChange: (pressed: boolean) => void;
};

/**
 * The nameplate under one of this week's stops (layout.json labelsAbout). It overlaps the front
 * of the tile so piece and name read as one object, opens the same sheet as the piece, and stays
 * still while the piece pulses. The box follows the map scale; the type doesn't.
 */
export const Nameplate = memo(function Nameplate({
  placement,
  k,
  icon,
  title,
  reward,
  due,
  done,
  accessibilityLabel,
  onPress,
  onPressedChange,
}: Props) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: done }}
      onPressIn={() => onPressedChange(true)}
      onPressOut={() => onPressedChange(false)}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.plate,
        done ? styles.plateDone : styles.plateCurrent,
        {
          left: (placement.left + (placement.w * (1 - PLATE_W)) / 2) * k,
          top: placement.top * k,
          width: placement.w * PLATE_W * k,
          minHeight: PLATE_H * k,
        },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.tile, done && styles.tileDone]}>
        <Icon name={icon} size={18} />
      </View>
      <View style={styles.text}>
        <Txt style={styles.title} numberOfLines={1}>
          {title}
        </Txt>
        {/* Spans are plain Text so they inherit the meta size instead of Txt's body size. */}
        {done ? (
          <Txt style={styles.meta} numberOfLines={1}>
            <Text style={styles.doneWord}>Done</Text>
            <Text style={styles.dot}> · </Text>
            <Text style={styles.leaves}>+{reward} earned</Text>
          </Txt>
        ) : (
          <View style={styles.metaRow}>
            <Icon name="leafySmall" size={12} />
            <Txt style={styles.meta} numberOfLines={1}>
              <Text style={styles.leaves}>+{reward}</Text>
              <Text style={styles.dot}> · </Text>
              {due}
            </Txt>
          </View>
        )}
      </View>
    </Pressable>
  );
});

const useStyles = makeStyles((color, dark) => ({
  plate: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: color.surface,
  },
  // Teal border + a 2px dark lip below: the tappable look.
  plateCurrent: {
    borderWidth: 1.5,
    borderColor: color.primary,
    boxShadow: [
      { offsetX: 0, offsetY: 2, blurRadius: 0, color: '#1F4E52' },
      { offsetX: 0, offsetY: 5, blurRadius: 10, color: dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(30, 42, 58, 0.12)' },
    ],
  },
  plateDone: {
    borderWidth: 1,
    borderColor: color.border,
    boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 8, color: dark ? 'rgba(0, 0, 0, 0.24)' : 'rgba(30, 42, 58, 0.08)' }],
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  tile: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileDone: {
    backgroundColor: color.badge.approved.bg,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: font.bodyBold,
    fontSize: 12.5,
    lineHeight: 15,
    color: color.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  meta: {
    fontFamily: font.body,
    fontSize: 11,
    lineHeight: 14,
    color: color.mute,
  },
  leaves: {
    fontFamily: font.bodyBold,
    color: color.leaf.dark,
  },
  doneWord: {
    fontFamily: font.bodyBold,
    color: color.primary,
  },
  dot: {
    color: color.mute,
  },
}));
