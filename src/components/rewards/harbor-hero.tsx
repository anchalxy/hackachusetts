import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Txt } from '@/ui/text';
import { color, font } from '@/ui/theme';

import Crate0 from '../../../design/assets/rewards/crate-fill-0.svg';
import Crate100 from '../../../design/assets/rewards/crate-fill-100.svg';
import Crate25 from '../../../design/assets/rewards/crate-fill-25.svg';
import Crate50 from '../../../design/assets/rewards/crate-fill-50.svg';
import Crate75 from '../../../design/assets/rewards/crate-fill-75.svg';
// The mockup's harbor (sky, sun, clouds, skyline, waves, past crates, the Beaver, Paul, dock),
// cut from design/screens/rewards/1-rewards.svg without the crate, which we draw per fill level.
import Scene from './art/hero.svg';

/** Scene units (design/screens/rewards/1-rewards.svg): 362 wide; the panel covers it below 244. */
export const SCENE_W = 362;
const SCENE_H = 264;
export const SCENE_VISIBLE_H = 244;

const CRATES = [Crate0, Crate25, Crate50, Crate75] as const;

/** crate-fill-0/25/50/75 by how full it is; 100 (leaves heaped, Leafy on top) only when full. */
export function CrateArt({ filled, size, width }: { filled: number; size: number; width: number }) {
  const Art = filled >= size ? Crate100 : CRATES[Math.min(3, Math.floor((filled / size) * 4))];
  return <Art width={width} height={(width * 190) / 200} />;
}

export function HarborHero({
  width,
  filled,
  size,
  moreReady,
}: {
  width: number;
  filled: number;
  size: number;
  /** Crates ready after this one ("1 more ready" chip). */
  moreReady: number;
}) {
  const k = width / SCENE_W;
  const full = filled >= size;

  // A full crate breathes a little so it reads as "ready".
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = full ? withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true) : withTiming(0);
  }, [full, pulse]);
  const crateStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -2 * pulse.value }, { scale: 1 + 0.015 * pulse.value }] }));

  return (
    <View style={{ width, height: SCENE_VISIBLE_H * k, overflow: 'hidden' }}>
      <Scene width={width} height={SCENE_H * k} />
      <Animated.View style={[styles.abs, { left: 33 * k, top: 144.75 * k }, crateStyle]}>
        <CrateArt filled={filled} size={size} width={150 * k} />
      </Animated.View>
      {moreReady > 0 && (
        <View style={[styles.chip, { left: 59.5 * k, top: 86 * k }]}>
          <Txt style={styles.chipText}>{moreReady} more ready</Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  chip: {
    position: 'absolute',
    height: 26,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: color.primary,
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    color: color.surface,
  },
});
