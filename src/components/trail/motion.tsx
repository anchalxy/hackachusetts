import { createContext, useContext } from 'react';
import type { CSSAnimationProperties, CSSAnimationSettings, CSSKeyframesRule } from 'react-native-reanimated';

// All trail motion is Reanimated 4 CSS animations: declared once, run on the UI thread, and
// paused (animationPlayState) when their band of the map is off screen or the tab isn't focused.

export type TrailMotion = {
  /** Reduce Motion is on: render everything still. */
  reduced: boolean;
  /** Which map bands (layout.ts BAND_H) are near the viewport. */
  activeBands: readonly boolean[];
};

export const TrailMotionContext = createContext<TrailMotion>({ reduced: false, activeBands: [] });

/**
 * Style for one looping animation in `band`. Returns `{}` under Reduce Motion so the element
 * sits at its resting pose. Pass `band = -1` for things outside the map (always on).
 */
export function useLoop(
  band: number,
  keyframes: CSSKeyframesRule,
  settings: CSSAnimationSettings,
): Partial<CSSAnimationProperties> {
  const { reduced, activeBands } = useContext(TrailMotionContext);
  if (reduced) return {};
  const running = band < 0 ? activeBands.some(Boolean) : Boolean(activeBands[band]);
  return {
    animationName: keyframes,
    animationIterationCount: 'infinite',
    ...settings,
    animationPlayState: running ? 'running' : 'paused',
  };
}

export function useReducedTrailMotion(): boolean {
  return useContext(TrailMotionContext).reduced;
}

/** Deterministic pseudo-random in [0, 1) so layouts don't reshuffle between renders. */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
