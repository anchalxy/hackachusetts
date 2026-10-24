import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import {
  bandOf,
  LAYOUT,
  parseAnchor,
  parsePolyline,
  type Boat,
  type Bridge,
  type Fall,
  type MapProp,
  type PropAnim,
} from './layout';
import { hash01, useLoop } from './motion';

// Ambient motion from design/screens/challenges/README.md → Motion. Every element is placed in
// map space (402 wide) and scaled by `k`.

const box = (svg: string) => `<svg viewBox="0 0 24 24" fill="none">${svg}</svg>`;

// ---------- Props: trees, hay, leaf piles, ducks, squirrels, cattails ----------

/** Trees: short rustle (±2.5°) twice per 10 s. */
const TREE = css.keyframes({
  '0%': { transform: [{ rotate: '0deg' }] },
  '3%': { transform: [{ rotate: '2.5deg' }] },
  '6%': { transform: [{ rotate: '-1.8deg' }] },
  '9%': { transform: [{ rotate: '1deg' }] },
  '12%': { transform: [{ rotate: '0deg' }] },
  '50%': { transform: [{ rotate: '0deg' }] },
  '53%': { transform: [{ rotate: '-2.2deg' }] },
  '56%': { transform: [{ rotate: '1.6deg' }] },
  '59%': { transform: [{ rotate: '-0.6deg' }] },
  '62%': { transform: [{ rotate: '0deg' }] },
  '100%': { transform: [{ rotate: '0deg' }] },
});

/** Hay and leaf piles: the same rustle, smaller (±1.5°). */
const RUSTLE = css.keyframes({
  '0%': { transform: [{ rotate: '0deg' }] },
  '3%': { transform: [{ rotate: '1.5deg' }] },
  '6%': { transform: [{ rotate: '-1.2deg' }] },
  '9%': { transform: [{ rotate: '0deg' }] },
  '50%': { transform: [{ rotate: '0deg' }] },
  '53%': { transform: [{ rotate: '-1.5deg' }] },
  '56%': { transform: [{ rotate: '1deg' }] },
  '59%': { transform: [{ rotate: '0deg' }] },
  '100%': { transform: [{ rotate: '0deg' }] },
});

/** Cattails: sway ±4°, 3.8 s. */
const SWAY = css.keyframes({
  '0%': { transform: [{ rotate: '-4deg' }] },
  '50%': { transform: [{ rotate: '4deg' }] },
  '100%': { transform: [{ rotate: '-4deg' }] },
});

/** Squirrel: hops twice every 5 s. */
const HOP = css.keyframes({
  '0%': { transform: [{ translateY: 0 }, { scaleY: 1 }] },
  '3%': { transform: [{ translateY: 0 }, { scaleY: 0.92 }] },
  '7%': { transform: [{ translateY: -7 }, { scaleY: 1.04 }] },
  '11%': { transform: [{ translateY: 0 }, { scaleY: 0.94 }] },
  '15%': { transform: [{ translateY: -6 }, { scaleY: 1.04 }] },
  '19%': { transform: [{ translateY: 0 }, { scaleY: 1 }] },
  '100%': { transform: [{ translateY: 0 }, { scaleY: 1 }] },
});

/** Ducks: waddle, 1.3 s. */
const WADDLE = css.keyframes({
  '0%': { transform: [{ translateY: 0 }, { rotate: '-4deg' }] },
  '25%': { transform: [{ translateY: -1 }, { rotate: '0deg' }] },
  '50%': { transform: [{ translateY: 0 }, { rotate: '4deg' }] },
  '75%': { transform: [{ translateY: -1 }, { rotate: '0deg' }] },
  '100%': { transform: [{ translateY: 0 }, { rotate: '-4deg' }] },
});

const PROP_MOTION: Record<PropAnim, { keyframes: ReturnType<typeof css.keyframes>; dur: number; easing: 'linear' | 'ease-in-out' }> = {
  tree: { keyframes: TREE, dur: 10, easing: 'ease-in-out' },
  rustle: { keyframes: RUSTLE, dur: 10, easing: 'ease-in-out' },
  sway: { keyframes: SWAY, dur: 3.8, easing: 'ease-in-out' },
  hop: { keyframes: HOP, dur: 5, easing: 'ease-in-out' },
  bob: { keyframes: WADDLE, dur: 1.3, easing: 'linear' },
};

export const AmbientProp = memo(function AmbientProp({ prop, index, k }: { prop: MapProp; index: number; k: number }) {
  const size = 24 * prop.s * k;
  const motion = PROP_MOTION[prop.anim];
  const anim = useLoop(bandOf(prop.y), motion.keyframes, {
    animationDuration: `${motion.dur}s`,
    animationTimingFunction: motion.easing,
    animationDelay: `${-(hash01(index) * motion.dur).toFixed(2)}s`,
  });
  return (
    <View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: (prop.x - 12 * prop.s) * k,
          top: (prop.y - 21.4 * prop.s) * k,
          width: size,
          height: size,
        },
        prop.flip && styles.flip,
      ]}>
      {/* Origin at the base (y 21.4 of 24) so things rock on the ground. */}
      <Animated.View style={[styles.fill, styles.originBase, anim]}>
        <SvgXml xml={box(prop.svg)} width={size} height={size} />
      </Animated.View>
    </View>
  );
});

// ---------- Falling leaves ----------

export const FallingLeaf = memo(function FallingLeaf({ fall, index, k }: { fall: Fall; index: number; k: number }) {
  const size = 17 * k;
  const dur = 9 + Math.round(hash01(index + 40) * 5); // 9–14 s
  const keyframes = useMemo(() => {
    const dir = hash01(index + 80) > 0.5 ? 1 : -1;
    const drop = 50 * k;
    const sway = 9 * k * dir;
    return css.keyframes({
      '0%': { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: '0deg' }] },
      '8%': { opacity: 1, transform: [{ translateX: sway * 0.3 }, { translateY: drop * 0.06 }, { rotate: `${dir * 15}deg` }] },
      '30%': { opacity: 1, transform: [{ translateX: sway }, { translateY: drop * 0.3 }, { rotate: `${dir * 50}deg` }] },
      '55%': { opacity: 1, transform: [{ translateX: -sway * 0.7 }, { translateY: drop * 0.55 }, { rotate: `${-dir * 10}deg` }] },
      '80%': { opacity: 0.9, transform: [{ translateX: sway * 0.6 }, { translateY: drop * 0.8 }, { rotate: `${dir * 60}deg` }] },
      '100%': { opacity: 0, transform: [{ translateX: 0 }, { translateY: drop }, { rotate: `${dir * 90}deg` }] },
    });
  }, [index, k]);
  const anim = useLoop(bandOf(fall.y), keyframes, {
    animationDuration: `${dur}s`,
    animationTimingFunction: 'ease-in-out',
    animationDelay: `${-(hash01(index + 120) * dur).toFixed(2)}s`,
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.abs, { left: fall.x * k - size / 2, top: fall.y * k, width: size, height: size }, anim]}>
      <SvgXml xml={box(LAYOUT.leaves[fall.kind])} width={size} height={size} />
    </Animated.View>
  );
});

// ---------- Water marks ----------

const RIPPLE = css.keyframes({
  '0%': { opacity: 0, transform: [{ translateX: 0 }] },
  '25%': { opacity: 0.9 },
  '70%': { opacity: 0.6 },
  '100%': { opacity: 0, transform: [{ translateX: 22 }] },
});

const RIPPLE_XML = `<svg viewBox="0 0 16 6" fill="none"><path d="M1 4.2c1.2-1.6 2.6-1.6 3.8 0s2.6 1.6 3.8 0 2.6-1.6 3.8 0" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/></svg>`;

export const WaterMark = memo(function WaterMark({ x, y, index, k }: { x: number; y: number; index: number; k: number }) {
  const w = 16 * k;
  const h = 6 * k;
  const anim = useLoop(bandOf(y), RIPPLE, {
    animationDuration: '4.6s',
    animationTimingFunction: 'ease-in-out',
    animationDelay: `${-(hash01(index + 200) * 4.6).toFixed(2)}s`,
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.abs, { left: x * k - w / 2, top: y * k - h / 2, width: w, height: h, opacity: 0.7 }, anim]}>
      <SvgXml xml={RIPPLE_XML} width={w} height={h} />
    </Animated.View>
  );
});

// ---------- Boats along the rivers ----------

/** Turns a boat's polyline into keyframes at even speed, leaning gently with the river's curve. */
function boatKeyframes(boat: Boat, k: number) {
  const points = parsePolyline(boat.path);
  const [ax, ay] = parseAnchor(boat.anchor);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    lengths.push(lengths[i - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = lengths[lengths.length - 1] || 1;
  const frames: Record<string, { transform: ({ translateX: number } | { translateY: number } | { rotate: string })[] }> = {};
  points.forEach(([x, y], i) => {
    const [px, py] = points[Math.max(0, i - 1)];
    const [nx, ny] = points[Math.min(points.length - 1, i + 1)];
    const angle = (Math.atan2(ny - py, nx - px) * 180) / Math.PI;
    const pct = i === points.length - 1 ? 100 : (lengths[i] / total) * 100;
    frames[`${pct.toFixed(3)}%`] = {
      transform: [
        { translateX: x * k - ax * boat.w * k },
        { translateY: y * k - ay * boat.h * k },
        { rotate: `${(angle * 0.7).toFixed(2)}deg` },
      ],
    };
  });
  return css.keyframes(frames);
}

export const RiverBoat = memo(function RiverBoat({ boat, k }: { boat: Boat; k: number }) {
  const keyframes = useMemo(() => boatKeyframes(boat, k), [boat, k]);
  const [ax, ay] = parseAnchor(boat.anchor);
  const points = parsePolyline(boat.path);
  const anim = useLoop(bandOf(points[0]?.[1] ?? 0), keyframes, {
    animationDuration: `${boat.dur}s`,
    animationTimingFunction: 'linear',
    animationDelay: `${boat.delay}s`,
  });
  // Reduce Motion: park the boat where it would be at t = 0 (its negative delay into the loop).
  const restIndex = Math.round(((-boat.delay % boat.dur) / boat.dur) * (points.length - 1));
  const [rx, ry] = points[restIndex] ?? [0, 0];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: 0,
          top: 0,
          width: boat.w * k,
          height: boat.h * k,
          transformOrigin: `${ax * 100}% ${ay * 100}%`,
          transform: [{ translateX: rx * k - ax * boat.w * k }, { translateY: ry * k - ay * boat.h * k }],
        },
        anim,
      ]}>
      <SvgXml xml={boat.svg} width={boat.w * k} height={boat.h * k} />
    </Animated.View>
  );
});

// ---------- Swan boat on the pond ----------

const SWAN = css.keyframes({
  '0%': { transform: [{ translateX: -46 }, { translateY: 0 }, { scaleX: 1 }] },
  '24%': { transform: [{ translateX: 0 }, { translateY: 4 }, { scaleX: 1 }] },
  '48%': { transform: [{ translateX: 46 }, { translateY: 0 }, { scaleX: 1 }] },
  '50%': { transform: [{ translateX: 46 }, { translateY: 0 }, { scaleX: -1 }] },
  '74%': { transform: [{ translateX: 0 }, { translateY: -3 }, { scaleX: -1 }] },
  '98%': { transform: [{ translateX: -46 }, { translateY: 0 }, { scaleX: -1 }] },
  '100%': { transform: [{ translateX: -46 }, { translateY: 0 }, { scaleX: 1 }] },
});

export function SwanBoat({ k }: { k: number }) {
  const { cx, cy } = LAYOUT.pond;
  const size = 56 * k;
  const anim = useLoop(bandOf(cy), SWAN, {
    animationDuration: '30s',
    animationTimingFunction: 'ease-in-out',
    animationDelay: '-4s',
  });
  return (
    <View
      pointerEvents="none"
      style={[styles.abs, { left: cx * k - size / 2, top: (cy + 6) * k - size * 0.86, width: size, height: size }]}>
      <Animated.View style={[styles.fill, anim]}>
        <SvgXml xml={LAYOUT.swan} width={size} height={size} />
      </Animated.View>
    </View>
  );
}

// ---------- Bridges (static, drawn above the boats) ----------

export const RiverBridge = memo(function RiverBridge({ bridge, k }: { bridge: Bridge; k: number }) {
  const size = 200 * k;
  // layout.json's `a` has the opposite sign to SVG's clockwise rotate(). rotate(-a) puts the deck
  // along the trail (123° and 54°, matching the trail's tangent at each crossing); rotate(a)
  // mirrored both bridges onto the wrong diagonal.
  const xml = `<svg viewBox="-100 -100 200 200" fill="none"><g transform="rotate(${-bridge.a})">${bridge.g}</g></svg>`;
  return (
    <View
      pointerEvents="none"
      style={[styles.abs, { left: (bridge.mx - 100) * k, top: (bridge.my - 100) * k, width: size, height: size }]}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
});

// ---------- Drifting leaves (fixed over the viewport, not the map) ----------

type Drift = { kind: keyof typeof LAYOUT.leaves; y: number; dur: number; delay: number; spin: boolean; rtl: boolean };

// Leaves drifting across the map, at fixed map heights (map units) so they scroll with the trail.
const DRIFTS: Drift[] = [
  { kind: 'leaf-maple', y: 160, dur: 19, delay: -2, spin: true, rtl: false },
  { kind: 'leaf-oak', y: 520, dur: 23, delay: -13, spin: false, rtl: true },
  { kind: 'leaf-ginkgo', y: 860, dur: 17, delay: -7, spin: true, rtl: true },
  { kind: 'leaf-maple', y: 1240, dur: 21, delay: -17, spin: false, rtl: false },
  { kind: 'leaf-oak', y: 1600, dur: 20, delay: -5, spin: true, rtl: true },
  { kind: 'leaf-ginkgo', y: 1980, dur: 22, delay: -11, spin: false, rtl: false },
  { kind: 'leaf-maple', y: 2380, dur: 18, delay: -15, spin: true, rtl: true },
  { kind: 'leaf-oak', y: 2760, dur: 23, delay: -3, spin: false, rtl: false },
];

/** How far a leaf sinks while crossing, in map units. */
const DRIFT_FALL = 90;

function driftKeyframes(width: number, k: number, drift: Drift) {
  const from = drift.rtl ? width + 30 : -30;
  const to = drift.rtl ? -30 : width + 30;
  const at = (t: number) => from + (to - from) * t;
  const fall = DRIFT_FALL * k;
  const turn = (t: number) => (drift.spin ? { rotate: `${Math.round(t * 540)}deg` } : { rotateY: `${Math.round(t * 720)}deg` });
  return css.keyframes({
    '0%': { transform: [{ translateX: at(0) }, { translateY: 0 }, turn(0)] },
    '25%': { transform: [{ translateX: at(0.25) }, { translateY: -fall * 0.3 }, turn(0.25)] },
    '50%': { transform: [{ translateX: at(0.5) }, { translateY: fall * 0.4 }, turn(0.5)] },
    '75%': { transform: [{ translateX: at(0.75) }, { translateY: fall * 0.2 }, turn(0.75)] },
    '100%': { transform: [{ translateX: at(1) }, { translateY: fall }, turn(1)] },
  });
}

function DriftingLeaf({ drift, width, k }: { drift: Drift; width: number; k: number }) {
  const keyframes = useMemo(() => driftKeyframes(width, k, drift), [width, k, drift]);
  // Tied to its map band, so it only animates near the viewport like the rest of the scenery.
  const anim = useLoop(bandOf(drift.y), keyframes, {
    animationDuration: `${drift.dur}s`,
    animationTimingFunction: 'linear',
    animationDelay: `${drift.delay}s`,
  });
  return (
    <Animated.View style={[styles.abs, styles.drift, { top: drift.y * k }, anim]}>
      <SvgXml xml={box(LAYOUT.leaves[drift.kind])} width={18} height={18} />
    </Animated.View>
  );
}

/**
 * Leaves crossing the map in 17–23 s. Rendered inside the scroll content (map coordinates), so
 * they move with the trail instead of hovering over the screen. Hidden under Reduce Motion.
 */
export function DriftingLeaves({ width, k, reduced }: { width: number; k: number; reduced: boolean }) {
  if (reduced || width === 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {DRIFTS.map((drift, i) => (
        <DriftingLeaf key={i} drift={drift} width={width} k={k} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  fill: { width: '100%', height: '100%' },
  flip: { transform: [{ scaleX: -1 }] },
  originBase: { transformOrigin: '50% 89%' },
  drift: { left: 0, width: 18, height: 18, transform: [{ translateX: -40 }] },
});
