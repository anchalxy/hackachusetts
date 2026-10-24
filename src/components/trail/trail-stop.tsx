import * as Haptics from 'expo-haptics';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { Piece } from '@/components/trail/piece';
import type { LandmarkFile } from '@/constants/trail';
import { Icon, type IconName } from '@/ui/icon';
import { color } from '@/ui/theme';

import { bandOf, CHIP_DX, CHIP_DY, PIECE_H, PIECE_TOP, PIECE_W } from './layout';
import { useLoop, useReducedTrailMotion } from './motion';

export type TrailStopState = 'current' | 'done' | 'missed';

type Props = {
  file: LandmarkFile;
  state: TrailStopState;
  /** Map-space position of the piece's top face. */
  x: number;
  y: number;
  k: number;
  /** Position on the trail, for the 0.8 s stagger. */
  order: number;
  /** Floating chip icon for current stops. */
  icon?: IconName;
  accessibilityLabel?: string;
  onPress?: () => void;
  /** The screen is visible: a stop that just became done pops in only when it can be seen. */
  focused?: boolean;
};

/** Current piece: scale 1 → 1.04 → 1, 3.2 s ease-in-out, origin at the base. */
const BREATHE = css.keyframes({
  '0%': { transform: [{ scale: 1 }] },
  '50%': { transform: [{ scale: 1.04 }] },
  '100%': { transform: [{ scale: 1 }] },
});

/** Icon chip: translateY 0 → −7 → 0 on the same timing. */
const BOB = css.keyframes({
  '0%': { transform: [{ translateY: 0 }] },
  '50%': { transform: [{ translateY: -7 }] },
  '100%': { transform: [{ translateY: 0 }] },
});

/** Done stop pops in: 0.6 → 1.12 → 1, 0.5 s. */
const POP = css.keyframes({
  '0%': { transform: [{ scale: 0.6 }] },
  '60%': { transform: [{ scale: 1.12 }] },
  '100%': { transform: [{ scale: 1 }] },
});

/** Twinkles: scale 0.4 → 1, 2.6 s. */
const TWINKLE = css.keyframes({
  '0%': { opacity: 0.35, transform: [{ scale: 0.4 }] },
  '50%': { opacity: 1, transform: [{ scale: 1 }] },
  '100%': { opacity: 0.35, transform: [{ scale: 0.4 }] },
});

const CHIP = 44;
const BADGE = 46;

export const TrailStop = memo(function TrailStop({
  file,
  state,
  x,
  y,
  k,
  order,
  icon,
  accessibilityLabel,
  onPress,
  focused = true,
}: Props) {
  const band = bandOf(y);
  const delay = order * 800;
  const current = state === 'current';
  const done = state === 'done';
  const reduced = useReducedTrailMotion();

  const breathe = useLoop(band, BREATHE, {
    animationDuration: '3.2s',
    animationTimingFunction: 'ease-in-out',
    animationDelay: delay,
  });
  const bob = useLoop(band, BOB, {
    animationDuration: '3.2s',
    animationTimingFunction: 'ease-in-out',
    animationDelay: delay,
  });

  // Pop in once when a stop becomes done while the trail is on screen (not on first load).
  // A stop finished inside a flow waits until the tab is visible again to pop.
  const [shownDone, setShownDone] = useState(done);
  const [popping, setPopping] = useState(false);
  if (done !== shownDone && (focused || !done)) {
    setShownDone(done);
    if (done && !reduced) setPopping(true);
  }
  useEffect(() => {
    if (!popping) return;
    const timer = setTimeout(() => setPopping(false), 700);
    return () => clearTimeout(timer);
  }, [popping]);
  const pop = popping
    ? { animationName: POP, animationDuration: '0.5s', animationTimingFunction: 'ease-out' as const, animationFillMode: 'both' as const }
    : null;

  const pieceW = PIECE_W * k;
  const pieceH = PIECE_H * k;
  const left = (x - PIECE_W / 2) * k;
  const top = (y - PIECE_TOP) * k;
  const chipX = (x + CHIP_DX) * k;
  const chipY = (y + CHIP_DY) * k;

  const content = (
    <>
      {done && <Glow x={x * k} y={(y + 20) * k} k={k} />}
      <Animated.View
        style={[
          styles.abs,
          { left, top, width: pieceW, height: pieceH },
          styles.pieceOrigin,
          current && breathe,
          pop,
        ]}>
        <Piece file={file} width={pieceW} muted={state === 'missed'} />
      </Animated.View>
      {current && icon && (
        <Animated.View
          style={[styles.abs, styles.chip, { left: chipX - CHIP / 2, top: chipY - CHIP / 2 }, bob]}>
          <Icon name={icon} size={26} />
        </Animated.View>
      )}
      {done && (
        <>
          <Twinkle x={chipX + 24 * k} y={chipY - 30 * k} size={13} band={band} delay={-order * 0.9} />
          <Twinkle x={chipX - 118 * k} y={chipY - 44 * k} size={10} band={band} delay={-order * 0.9 - 1.3} />
          <Animated.View style={[styles.abs, styles.badge, { left: chipX - BADGE / 2, top: chipY - BADGE / 2 }, pop]}>
            <View style={styles.badgeInner}>
              <Check />
            </View>
          </Animated.View>
        </>
      )}
    </>
  );

  if (!onPress) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {content}
      </View>
    );
  }

  return (
    <>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {content}
      </View>
      {/* The whole stop is the target: the piece's footprint plus the chip. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: done }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={[
          styles.abs,
          {
            left,
            top: top + pieceH * 0.18,
            width: Math.max(pieceW, chipX + CHIP / 2 - left),
            height: pieceH * 0.8,
          },
        ]}
      />
    </>
  );
});

/** Warm glow under a finished stop. */
function Glow({ x, y, k }: { x: number; y: number; k: number }) {
  const w = 220 * k;
  const h = 150 * k;
  return (
    <View pointerEvents="none" style={[styles.abs, { left: x - w / 2, top: y - h / 2, width: w, height: h }]}>
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#FFE7A3" stopOpacity="0.75" />
            <Stop offset="0.55" stopColor="#FFEFC2" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#FFF6DD" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

function Twinkle({ x, y, size, band, delay }: { x: number; y: number; size: number; band: number; delay: number }) {
  const anim = useLoop(band, TWINKLE, {
    animationDuration: '2.6s',
    animationTimingFunction: 'ease-in-out',
    animationDelay: delay * 1000,
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.abs, { left: x - size / 2, top: y - size / 2, width: size, height: size }, anim]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 1.5c.7 5.6 4.9 9.8 10.5 10.5-5.6.7-9.8 4.9-10.5 10.5C11.3 16.9 7.1 12.7 1.5 12 7.1 11.3 11.3 7.1 12 1.5z"
          fill="#F3D88E"
          stroke="#D9B562"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

function Check() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M5.5 12.5l4.2 4.2 8.8-9.2" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  // Breathe and pop scale from the base of the piece, not its middle.
  pieceOrigin: { transformOrigin: '50% 92%' },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: CHIP / 2,
    backgroundColor: color.surface,
    borderWidth: 3,
    borderColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: [
      { offsetX: 0, offsetY: 4, blurRadius: 0, color: 'rgba(31, 78, 82, 0.35)' },
      { offsetX: 0, offsetY: 6, blurRadius: 10, color: 'rgba(30, 42, 58, 0.12)' },
    ],
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: '#E9C46A',
    padding: 3,
    boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 8, color: 'rgba(30, 42, 58, 0.16)' }],
  },
  badgeInner: {
    flex: 1,
    borderRadius: BADGE / 2,
    backgroundColor: color.primary,
    borderWidth: 2.5,
    borderColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
