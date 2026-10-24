import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import FlagA from '../../../design/assets/mascots/flag-311-planted-a.svg';
import FlagB from '../../../design/assets/mascots/flag-311-planted-b.svg';
import GallopA from '../../../design/assets/mascots/revere-flag-gallop-a.svg';
import GallopB from '../../../design/assets/mascots/revere-flag-gallop-b.svg';
import Inspect from '../../../design/assets/mascots/revere-inspect.svg';
import { t } from '@/ui/theme';

const { revereCrossMs, gallopLegSwapMs, flagHoldMs, flagLowerMs, flagPop } = t.motion;

/** Swaps between two frames every `ms` while mounted. */
function useFrame(ms: number, running = true) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setFrame((f) => 1 - f), ms);
    return () => clearInterval(id);
  }, [ms, running]);
  return frame;
}

/** Paul standing still, peering through his magnifying glass, with a gentle 1s bob (DESIGN.md 6d, step 2). */
export function PaulInspecting({ width = 200 }: { width?: number }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withTiming(-3, { duration: 500, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const height = (width * 170) / 220;
  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={style}>
        <Inspect width={width} height={height} />
      </Animated.View>
      <View style={[styles.ground, { width: width * 0.8 }]} />
    </View>
  );
}

/**
 * "On its way to 311!" (DESIGN.md 6d, step 4): Paul gallops left→right across the top in ~3.3s,
 * legs alternating every 120ms with a ±3px bob. As he passes the middle, a big planted 311 flag
 * pops up (0 → 1.15 → 1 at 1.7×), waves for ~1s, then lowers into the ground over ~0.8s.
 */
export function PaulDelivers({ height = 190 }: { height?: number }) {
  const { width: screenWidth } = useWindowDimensions();
  const riderWidth = 150;
  const riderHeight = (riderWidth * 170) / 220;
  const flagWidth = 60 * flagPop.size;
  const flagHeight = (flagWidth * 130) / 140;

  const [riding, setRiding] = useState(true);
  const [flagUp, setFlagUp] = useState(false);
  const legFrame = useFrame(gallopLegSwapMs, riding);
  const flagFrame = useFrame(260, flagUp);

  const x = useSharedValue(-riderWidth);
  const bob = useSharedValue(0);
  const flagScale = useSharedValue(0);
  const flagDrop = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(screenWidth + 20, { duration: revereCrossMs, easing: Easing.inOut(Easing.quad) });
    bob.value = withRepeat(withTiming(-3, { duration: gallopLegSwapMs * 2 }), -1, true);
    const half = revereCrossMs / 2;
    flagScale.value = withDelay(
      half,
      withSequence(withTiming(1.15, { duration: 220, easing: Easing.out(Easing.back(2)) }), withTiming(1, { duration: 140 })),
    );
    flagDrop.value = withDelay(half + 360 + flagHoldMs, withTiming(1, { duration: flagLowerMs, easing: Easing.in(Easing.quad) }));
    const timers = [
      setTimeout(() => setFlagUp(true), half),
      setTimeout(() => setFlagUp(false), half + 360 + flagHoldMs),
      setTimeout(() => setRiding(false), revereCrossMs),
    ];
    return () => timers.forEach(clearTimeout);
  }, [bob, flagDrop, flagScale, screenWidth, x]);

  const riderStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: bob.value }] }));
  const flagStyle = useAnimatedStyle(() => ({
    opacity: 1 - flagDrop.value,
    transform: [{ translateY: flagDrop.value * flagHeight * 0.9 }, { scale: flagScale.value }],
  }));
  const Rider = legFrame === 0 ? GallopA : GallopB;
  const Flag = flagFrame === 0 ? FlagA : FlagB;

  return (
    <View style={[styles.stage, { height }]}>
      {/* The flag sinks behind the ground line, so clip it there. */}
      <View style={[styles.flagClip, { height: height - 18 }]}>
        <Animated.View style={[styles.flag, { width: flagWidth, height: flagHeight, bottom: 0 }, flagStyle]}>
          <Flag width={flagWidth} height={flagHeight} />
        </Animated.View>
      </View>
      {riding && (
        <Animated.View style={[styles.rider, { width: riderWidth, height: riderHeight }, riderStyle]}>
          <Rider width={riderWidth} height={riderHeight} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ground: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(30,42,58,0.07)',
    marginTop: -8,
  },
  stage: {
    width: '100%',
    overflow: 'hidden',
  },
  flagClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
    alignItems: 'center',
  },
  flag: {
    position: 'absolute',
  },
  rider: {
    position: 'absolute',
    left: 0,
    top: 10,
  },
});
