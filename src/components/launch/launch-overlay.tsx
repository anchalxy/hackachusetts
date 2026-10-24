import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { getProfile, SEED_PROFILE } from '@/lib/profile';
import { Txt } from '@/ui/text';
import { font, makeStyles } from '@/ui/theme';

import RideA from '../../../design/assets/launch/revere-lantern-ride-a.svg';
import RideB from '../../../design/assets/launch/revere-lantern-ride-b.svg';
import TeaLeaf from '../../../design/assets/mascots/leafy-small.svg';
import LeafGinkgo from '../../../design/assets/trail/wind/leaf-ginkgo.svg';
import LeafMaple from '../../../design/assets/trail/wind/leaf-maple.svg';
import LeafOak from '../../../design/assets/trail/wind/leaf-oak.svg';

// Opening the app (design/screens/launch/README.md): no sign-in, a 2.5 s moment where Paul Revere
// gallops across with a gust and leaves behind him, then the overlay fades onto the Challenges
// tab. Cold starts only: it lives in the root layout, which mounts once per launch.
// Coordinates are in the mockups' 402 × 874 frame, scaled to the screen width and centered.

const FRAME = { w: 402, h: 874 };
const RIDER = { w: 220, h: 170, top: 522, from: -240, to: 442 };

const GUST_D =
  'M-260 612 C -150 600, -60 624, 40 608 S 200 592, 300 606 c 16 8 6 30 -10 26 c -12 -4 -8 -18 6 -15 C 330 612, 420 600, 520 604';
/** Evenly spaced points along GUST_D (sampled from the curve), for the leaves riding it. */
const GUST_POINTS = [
  [-260, 612], [-233.3, 609.7], [-206.6, 608.6], [-179.8, 608.6], [-153, 609.3], [-126.3, 610.5],
  [-99.6, 611.8], [-72.8, 613], [-46.1, 613.7], [-19.3, 613.4], [7.4, 611.9], [34, 608.9],
  [60.5, 604.9], [87, 601.3], [113.7, 598.5], [140.4, 596.6], [167.1, 595.8], [193.9, 596],
  [220.6, 597.4], [247.3, 599.6], [273.9, 602.6], [300.4, 606.2], [303.5, 628.6], [282.9, 623.2],
  [306.4, 615.5], [333, 612.1], [359.6, 609.2], [386.3, 606.9], [413, 605.1], [439.7, 603.9],
  [466.5, 603.3], [493.2, 603.3], [520, 604],
];
/** The gust's dash, in the README's units: the path normalized to 1000 long. */
const DASH = 260;
/** GUST_D's real length. react-native-svg has no pathLength, so dash values are scaled by this. */
const GUST_SCALE = 856.7 / 1000;

/** Seconds on the README's timeline. */
const T = { ride: 0.15, rideFor: 1.9, gustFor: 2.2, greeting: 0.45, textOut: 1.8, overlayOut: 2.05, done: 2.5 };
const ms = (s: number) => s * 1000;
const RIDE_EASE = Easing.bezier(0.35, 0, 0.6, 1);
const LEG_SWAP_MS = 120;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LEAVES = [LeafMaple, TeaLeaf, LeafGinkgo, LeafOak];

/** Plays once per launch; fast refresh or remounting the root won't replay it. */
let played = false;

export function LaunchOverlay() {
  const [visible, setVisible] = useState(!played);
  if (!visible) return null;
  return <Welcome onDone={() => setVisible(false)} />;
}

function Welcome({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const styles = useStyles();
  const [firstName, setFirstName] = useState(SEED_PROFILE.name.split(' ')[0]);
  const [leg, setLeg] = useState(0);
  const started = useRef(false);

  // Scale the 402-wide frame to the screen and center it, so the wordmark sits mid-screen like the splash.
  const k = width / FRAME.w;
  const offsetY = height / 2 - (FRAME.h / 2) * k;

  const overlay = useSharedValue(1);
  const text = useSharedValue(1);
  const greeting = useSharedValue(0);
  const ride = useSharedValue(0);
  const gust = useSharedValue(0);

  useEffect(() => {
    getProfile()
      .then((p) => setFirstName(p.name.split(' ')[0] || SEED_PROFILE.name.split(' ')[0]))
      .catch(() => {});
  }, []);

  // Legs swap every 120 ms while he rides (he bobs on the same beat).
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setLeg((f) => 1 - f), LEG_SWAP_MS);
    const stop = setTimeout(() => clearInterval(id), ms(T.ride + T.rideFor));
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [reduced]);

  const finish = () => {
    played = true;
    onDone();
  };

  function start() {
    if (started.current) return;
    started.current = true;
    SplashScreen.hideAsync().catch(() => {});

    // Reduce Motion: hold the splash frame for 300 ms, then cross-fade to the tab.
    if (reduced) {
      overlay.value = withDelay(300, withTiming(0, { duration: 300 }, (ok) => ok && scheduleOnRN(finish)));
      return;
    }

    ride.value = withDelay(ms(T.ride), withTiming(1, { duration: ms(T.rideFor), easing: RIDE_EASE }));
    gust.value = withDelay(ms(T.ride), withTiming(1, { duration: ms(T.gustFor), easing: RIDE_EASE }));
    greeting.value = withDelay(ms(T.greeting), withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    text.value = withDelay(ms(T.textOut), withTiming(0, { duration: 300 }));
    overlay.value = withDelay(
      ms(T.overlayOut),
      withTiming(0, { duration: ms(T.done - T.overlayOut) }, (ok) => ok && scheduleOnRN(finish)),
    );
  }

  /** A tap anywhere skips straight to the end. */
  function skip() {
    [ride, gust, greeting, text, overlay].forEach(cancelAnimation);
    text.value = withTiming(0, { duration: 120 });
    overlay.value = withTiming(0, { duration: 180 }, (ok) => ok && scheduleOnRN(finish));
  }

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const wordmarkStyle = useAnimatedStyle(() => ({ opacity: text.value }));
  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greeting.value * text.value,
    transform: [{ translateY: 8 * (1 - greeting.value) }],
  }));
  const riderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(ride.value, [0, 1], [RIDER.from, RIDER.to]) }, { translateY: leg ? -3 : 0 }],
  }));
  const Rider = leg === 0 ? RideA : RideB;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]} onLayout={start}>
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityLabel="Skip welcome">
        <View
          style={[styles.frame, { transform: [{ translateY: offsetY }, { scale: k }] }]}
          pointerEvents="none">
          {/* The gust trails him (soft blue under white), with four leaves riding it. */}
          <Svg style={StyleSheet.absoluteFill} width={FRAME.w} height={FRAME.h} viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}>
            <GustLine progress={gust} stroke="#A9BBC8" width={7} />
            <GustLine progress={gust} stroke="#FFFFFF" width={3.4} />
          </Svg>
          {LEAVES.map((Leaf, i) => (
            <GustLeaf key={i} progress={gust} behind={30 + 70 * i} size={i === 1 ? 18 : 20 - i} Leaf={Leaf} />
          ))}
          <Animated.View style={[styles.rider, riderStyle]}>
            <Rider width={RIDER.w} height={RIDER.h} />
          </Animated.View>
        </View>

        {/* Same size and place as the native splash's wordmark, so the hand-off is invisible. */}
        <View style={[styles.center, { top: height / 2 - 25 }]} pointerEvents="none">
          <Animated.View style={wordmarkStyle}>
            <Txt style={styles.wordmark}>Tea Party</Txt>
          </Animated.View>
          <Animated.View style={greetingStyle}>
            <Txt style={styles.greeting}>Welcome back, {firstName}</Txt>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** One stroke of the gust: a 260-long dash sweeps along the path (offset 260 → −1000). */
function GustLine({ progress, stroke, width }: { progress: SharedValue<number>; stroke: string; width: number }) {
  const props = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [DASH, -1000]) * GUST_SCALE,
  }));
  return (
    <AnimatedPath
      d={GUST_D}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={[DASH * GUST_SCALE, 2000 * GUST_SCALE]}
      animatedProps={props}
    />
  );
}

/**
 * A leaf riding the gust `behind` units (of 1000) back from the dash's head, spinning as it goes
 * and fading out near the end. Spaced 70 apart, they leave about 0.12 s apart.
 */
function GustLeaf({
  progress,
  behind,
  size,
  Leaf,
}: {
  progress: SharedValue<number>;
  behind: number;
  size: number;
  Leaf: typeof LeafMaple;
}) {
  const styles = useStyles();
  const steps = GUST_POINTS.map((_, i) => i / (GUST_POINTS.length - 1));
  const xs = GUST_POINTS.map(([x]) => x);
  const ys = GUST_POINTS.map(([, y]) => y);
  const style = useAnimatedStyle(() => {
    // The head moves 0 → 1260 as the dash offset goes 260 → −1000.
    const s = (progress.value * (1000 + DASH) - behind) / 1000;
    const t = Math.min(1, Math.max(0, s));
    return {
      opacity: s <= 0 ? 0 : interpolate(t, [0, 0.05, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(t, steps, xs) - size / 2 },
        { translateY: interpolate(t, steps, ys) - size / 2 },
        { rotate: `${t * 720}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.abs, { width: size, height: size }, style]}>
      <Leaf width={size} height={size} />
    </Animated.View>
  );
}

// The overlay takes over from the native splash (app.json): #FCFBF8 in light, #13171D with a
// light-ink wordmark in dark, which are color.bg and color.ink of each palette.
const useStyles = makeStyles((color) => ({
  overlay: {
    backgroundColor: color.bg,
    zIndex: 1000,
    elevation: 1000,
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FRAME.w,
    height: FRAME.h,
    transformOrigin: 'top left',
  },
  abs: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  rider: {
    position: 'absolute',
    left: 0,
    top: RIDER.top,
    width: RIDER.w,
    height: RIDER.h,
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: font.headingHeavy,
    fontSize: 40,
    lineHeight: 50,
    letterSpacing: -0.6,
    color: color.ink,
  },
  greeting: {
    marginTop: 6,
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 20,
    color: color.slate,
  },
}));
