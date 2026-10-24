import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { Txt } from '@/ui/text';
import { font, makeStyles } from '@/ui/theme';

import Crate100 from '../../../design/assets/rewards/crate-fill-100.svg';
import { CRATE_PREFIX, CRATE_SUFFIX, LEAF_GLYPHS, LEAVES } from './crate-art';
// The mockup's harbor (sky, sun, clouds, skyline, waves, past crates, the Beaver, Paul, dock),
// cut from design/screens/rewards/1-rewards.svg without the crate, which we draw per fill level.
import Scene from './art/hero.svg';

/** Scene units (design/screens/rewards/1-rewards.svg): 362 wide; the panel covers it below 244. */
export const SCENE_W = 362;
const SCENE_H = 264;
export const SCENE_VISIBLE_H = 244;

// The crate's inside runs y 34–150, but slats cover most of it: leaves only show through three
// gaps. So the surface is placed by how much green shows through the gaps, not by raw height,
// and 50 of 150 reads as a third full. Bottom gap first.
const GAPS: [number, number][] = [
  [118.2, 131.8],
  [85.6, 99.2],
  [53, 66.6],
];
const GAP_TOTAL = GAPS.reduce((sum, [top, bottom]) => sum + bottom - top, 0);

/** Leaf surface y for a fill fraction in [0, 1). */
function surfaceY(fraction: number): number {
  let left = Math.max(0, Math.min(1, fraction)) * GAP_TOTAL;
  if (left <= 0) return 150;
  for (const [top, bottom] of GAPS) {
    const h = bottom - top;
    if (left <= h) return bottom - left;
    left -= h;
  }
  return GAPS[GAPS.length - 1][0];
}

/** The crate's SVG with its leaf surface at `pct` percent (0–99). */
function crateXml(pct: number): string {
  const t = surfaceY(pct / 100);
  const id = `in_c${pct}`;
  const leaves = LEAVES.map(([x, dy, rest, g]) => `<g transform="translate(${x} ${(t + dy).toFixed(2)}) ${rest}">${LEAF_GLYPHS[g]}</g>`).join('');
  const green = `<rect x="14" y="${t.toFixed(2)}" width="172" height="${(150 - t).toFixed(2)}" fill="#4E9F65"/>`;
  return (CRATE_PREFIX + green + (pct > 0 ? leaves : '') + CRATE_SUFFIX).replace(/in_x0/g, id);
}

/** The crate filled to the exact percentage (1% steps); the heaped, Leafy-topped art when full. */
export function CrateArt({ filled, size, width }: { filled: number; size: number; width: number }) {
  const full = filled >= size;
  const pct = full ? 100 : Math.min(99, Math.round((filled / size) * 100));
  const xml = useMemo(() => (pct < 100 ? crateXml(pct) : ''), [pct]);
  const height = (width * 190) / 200;
  return full ? <Crate100 width={width} height={height} /> : <SvgXml xml={xml} width={width} height={height} />;
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
  const styles = useStyles();
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

const useStyles = makeStyles((color) => ({
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
    color: color.onPrimary,
  },
}));
