import * as Haptics from 'expo-haptics';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import { Piece } from '@/components/trail/piece';
import type { LandmarkFile } from '@/constants/trail';

import DoneBadge from '../../../design/assets/trail/ui/done-badge.svg';
import DoneGlow from '../../../design/assets/trail/ui/done-glow.svg';
import Sparkle from '../../../design/assets/trail/ui/sparkle.svg';
import {
  bandOf,
  GROW_ORIGIN,
  GROW_SCALE,
  GROW_SECONDS,
  GROW_STAGGER_SECONDS,
  LAYOUT,
  PIECE_H,
  PIECE_TOP,
  PIECE_W,
  PRESSED_SCALE,
} from './layout';
import { useLoop, useReducedTrailMotion } from './motion';

export type TrailStopState = 'current' | 'done' | 'missed';

type Props = {
  file: LandmarkFile;
  state: TrailStopState;
  /** Map-space position of the piece's top face. */
  x: number;
  y: number;
  k: number;
  /** Position on the trail, for the 0.7 s stagger. */
  order: number;
  accessibilityLabel?: string;
  onPress?: () => void;
  /** The stop or its nameplate is held down: the piece settles to 0.97. */
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** The screen is visible: a stop that just became done pops in only when it can be seen. */
  focused?: boolean;
};

/** Current stop: expands and contracts in place, 1 → 1.07 → 1 (layout.json motion.currentStop). */
const GROW = css.keyframes({
  '0%': { transform: [{ scale: 1 }] },
  '50%': { transform: [{ scale: GROW_SCALE }] },
  '100%': { transform: [{ scale: 1 }] },
});

/** Done stop pops in: 0.6 → 1.12 → 1, 0.5 s. */
const POP = css.keyframes({
  '0%': { transform: [{ scale: 0.6 }] },
  '60%': { transform: [{ scale: 1.12 }] },
  '100%': { transform: [{ scale: 1 }] },
});

/** Twinkles fade in and out over 4 s (doneStop.sparkleKeyframes). */
const TWINKLE = css.keyframes({
  '0%': { opacity: 0, transform: [{ scale: 0.4 }] },
  '45%': { opacity: 1, transform: [{ scale: 1 }] },
  '70%': { opacity: 0.3, transform: [{ scale: 0.6 }] },
  '100%': { opacity: 0, transform: [{ scale: 0.4 }] },
});

const { glow, badge, sparkles, sparkleSeconds } = LAYOUT.doneStop;

export const TrailStop = memo(function TrailStop({
  file,
  state,
  x,
  y,
  k,
  order,
  accessibilityLabel,
  onPress,
  pressed = false,
  onPressedChange,
  focused = true,
}: Props) {
  const band = bandOf(y);
  const current = state === 'current';
  const done = state === 'done';
  const reduced = useReducedTrailMotion();

  const grow = useLoop(band, GROW, {
    animationDuration: `${GROW_SECONDS}s`,
    animationTimingFunction: 'ease-in-out',
    animationDelay: `${order * GROW_STAGGER_SECONDS}s`,
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

  // Everything below is placed relative to the piece's top-left at 150 wide (layout.json doneStop).
  const left = (x - PIECE_W / 2) * k;
  const top = (y - PIECE_TOP) * k;
  const at = (dx: number, dy: number, w: number, h = w) => ({ left: left + dx * k, top: top + dy * k, width: w * k, height: h * k });

  const content = (
    <>
      {done && (
        <View style={[styles.abs, at(glow.left, glow.top, glow.w, glow.h)]}>
          <DoneGlow width="100%" height="100%" />
        </View>
      )}
      {/* Pressed scale wraps the looping grow so the two transforms don't fight. */}
      <Animated.View
        style={[
          styles.abs,
          at(0, 0, PIECE_W, PIECE_H),
          styles.pieceOrigin,
          { transform: [{ scale: pressed ? PRESSED_SCALE : 1 }] },
          styles.pressTransition,
        ]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.pieceOrigin, current && grow, pop]}>
          <Piece file={file} width={PIECE_W * k} muted={state === 'missed'} />
        </Animated.View>
      </Animated.View>
      {done && (
        <>
          {sparkles.map((s, i) => (
            <Twinkle key={i} style={at(s.left, s.top, s.size)} band={band} delay={s.delay - order * 0.9} />
          ))}
          <Animated.View style={[styles.abs, styles.badge, at(badge.left, badge.top, badge.size), pop]}>
            <DoneBadge width="100%" height="100%" />
          </Animated.View>
        </>
      )}
    </>
  );

  return (
    <>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {content}
      </View>
      {onPress && (
        // The target is the piece's footprint (its tile and building), not the empty artboard corners.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ selected: done }}
          onPressIn={() => onPressedChange?.(true)}
          onPressOut={() => onPressedChange?.(false)}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }}
          style={[styles.abs, at(0, PIECE_H * 0.18, PIECE_W, PIECE_H * 0.8)]}
        />
      )}
    </>
  );
});

function Twinkle({ style, band, delay }: { style: object; band: number; delay: number }) {
  const anim = useLoop(band, TWINKLE, {
    animationDuration: `${sparkleSeconds}s`,
    animationTimingFunction: 'ease-in-out',
    animationDelay: `${delay}s`,
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, style, anim]}>
      <Sparkle width="100%" height="100%" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  // Grow, press and pop all scale from the front of the tile, so the piece stays planted.
  pieceOrigin: { transformOrigin: GROW_ORIGIN },
  pressTransition: { transitionProperty: 'transform', transitionDuration: 120 },
  badge: {
    borderRadius: 999,
    boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 14, color: 'rgba(31, 78, 82, 0.35)' }],
  },
});
