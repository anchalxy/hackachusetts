import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { currentCrate, openCrate, partner, type Deal } from '@/lib/rewards';
import { Button } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, t, useColors } from '@/ui/theme';

import CrateClosed from '../../design/assets/rewards/crate-closed.svg';
import CrateFull from '../../design/assets/rewards/crate-fill-100.svg';
import FishBlue from '../../design/assets/rewards/fish-blue.svg';
import FishCoral from '../../design/assets/rewards/fish-coral.svg';
import FishGold from '../../design/assets/rewards/fish-gold.svg';
import FishMint from '../../design/assets/rewards/fish-mint.svg';
import PaulLift from '../../design/assets/rewards/paul-standing-lift.svg';
import PaulThrow from '../../design/assets/rewards/paul-standing-throw.svg';
import Ship from '../../design/assets/rewards/ship-beaver.svg';
// Harbor top to sea floor, cut from design/screens/rewards/3-heave-ho.svg (402 × 1874 design units).
import World from '@/components/rewards/art/world.svg';

const { crateToss: toss, crateOpen: open } = t.motion;
/** Opening timeline in ms from the tap (see tapCrate). */
const FAST_OPEN = { rise: 520, lidAt: 480, lidMs: 380, cardAt: 700, cardMs: 520, buttonAt: 1050 };

const haptic = {
  impact: (style: keyof typeof Haptics.ImpactFeedbackStyle) => Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};
const WORLD_H = 1874;
const cubic = Easing.inOut(Easing.cubic);
const outCubic = Easing.out(Easing.cubic);

type Phase = 'lift' | 'throw' | 'dive' | 'landed' | 'opening' | 'revealed';

/**
 * Rewards steps 3–6 (DESIGN.md 6e, animations/crate-reward.gif): Paul heaves the crate, throws it,
 * the camera dives after it, it hovers on the sand, and one tap opens it. Everything plays by itself
 * except that tap and the Save button. All positions are in the mockups' 402-wide design units.
 */
export default function CrateScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const color = useColors();
  const k = W / 402;
  const cameraEnd = -(WORLD_H * k - H);
  // Where things sit on the sea floor and at the reveal, in screen px.
  const floorY = 1620 * k + cameraEnd;
  const revealY = Math.min(360 * k, H * 0.4);

  const [phase, setPhase] = useState<Phase>('lift');
  const [deal, setDeal] = useState<Deal | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const camera = useSharedValue(0);
  // Crate centre in world units while it's on the ship and sinking; screen px once it has landed.
  const crateX = useSharedValue(141);
  const crateY = useSharedValue(368);
  const crateRot = useSharedValue(-3);
  const crateScale = useSharedValue(0.376);
  const caption = useSharedValue(0);
  const splash = useSharedValue(0);
  const under = useSharedValue(0);
  // Landed / reveal (screen space).
  const landed = useSharedValue(0);
  const bob = useSharedValue(0);
  const bobAmp = useSharedValue(0);
  const glow = useSharedValue(0);
  const sparkles = useSharedValue(0);
  const title = useSharedValue(0);
  const squash = useSharedValue(1);
  const pop = useSharedValue(1);
  const flash = useSharedValue(0);
  const lift = useSharedValue(0);
  const bloom = useSharedValue(0);
  const burst = useSharedValue(0);
  const dim = useSharedValue(0);
  const lid = useSharedValue(0);
  const rays = useSharedValue(0);
  const spin = useSharedValue(0);
  const card = useSharedValue(0);
  const button = useSharedValue(0);

  // A deep link with no full crate has nothing to toss.
  useEffect(() => {
    if (!currentCrate().full) router.back();
  }, []);

  useEffect(() => {
    caption.value = withTiming(1, { duration: 400 });
    // Heave ho: Paul lifts the crate, then holds it up (a gentle strain) until you tap to throw.
    crateY.value = withSequence(
      withTiming(360, { duration: toss.liftMs, easing: cubic }),
      withRepeat(withTiming(365, { duration: 650, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    const list = timers.current;
    return () => list.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startThrow() {
    if (phase !== 'lift') return;
    setPhase('throw');
    haptic.impact('Medium');
    // Arc up and right off the bow, then down into the water just past it.
    crateX.set(withTiming(320, { duration: toss.arcMs, easing: Easing.linear }));
    crateY.set(withSequence(
      withTiming(280, { duration: toss.arcMs * 0.45, easing: Easing.out(Easing.quad) }),
      withTiming(590, { duration: toss.arcMs * 0.55, easing: Easing.in(Easing.quad) }),
    ));
    crateRot.set(withTiming(200, { duration: toss.arcMs, easing: Easing.linear }));
    crateScale.set(withTiming(0.42, { duration: toss.arcMs }));
    later(toss.arcMs, startDive);
  }

  function startDive() {
    setPhase('dive');
    haptic.impact('Rigid');
    splash.set(withTiming(1, { duration: toss.splashMs, easing: outCubic }));
    caption.set(withTiming(0, { duration: 300 }));
    under.set(withDelay(toss.splashMs, withTiming(1, { duration: 600 })));
    // The camera eases down with the crate; it tilts as it sinks and comes to rest at the bottom.
    const sink = { duration: toss.diveMs, easing: cubic };
    camera.set(withDelay(toss.splashMs * 0.5, withTiming(cameraEnd, sink)));
    crateX.set(withDelay(toss.splashMs * 0.5, withTiming(201, sink)));
    crateY.set(withDelay(toss.splashMs * 0.5, withTiming(1620, sink)));
    crateRot.set(withDelay(toss.splashMs * 0.5, withSequence(withTiming(348, { duration: toss.diveMs * 0.6 }), withTiming(358, { duration: toss.diveMs * 0.4 }))));
    crateScale.set(withDelay(toss.splashMs * 0.5, withTiming(0.66, sink)));
    later(toss.splashMs * 0.5 + toss.diveMs, land);
  }

  /** Settles on the sand at the end of the dive. */
  function land() {
    timers.current = [];
    setPhase('landed');
    haptic.impact('Soft');
    landed.value = 1;
    // Nothing pops in: bob, glow and sparkles ease in after it settles, then the title.
    bob.value = withRepeat(withTiming(1, { duration: toss.hoverBobMs / 2, easing: Easing.inOut(Easing.sin) }), -1, true);
    bobAmp.value = withDelay(toss.settleMs * 0.4, withTiming(1, { duration: toss.settleMs }));
    glow.value = withDelay(toss.settleMs * 0.4, withTiming(1, { duration: toss.glowFadeInMs }));
    sparkles.value = withDelay(toss.settleMs * 0.4 + toss.sparkleDelayMs, withTiming(1, { duration: 800 }));
    title.value = withDelay(toss.titleDelayMs, withTiming(1, { duration: toss.titleFadeMs, easing: outCubic }));
  }

  function tapCrate() {
    if (phase !== 'landed') return;
    const opened = openCrate();
    if (!opened) return router.back();
    setDeal(opened);
    setPhase('opening');
    haptic.impact('Heavy');

    // Faster than the handoff's crateOpen timings (~1.3s to the card instead of ~3s) so the tap
    // pays off right away. A haptic beat rides each step: thud, rising ticks, the pop, the card.
    const { rise, lidAt, lidMs, cardAt, cardMs, buttonAt } = FAST_OPEN;
    squash.value = withSequence(withTiming(open.tapSquash, { duration: 90 }), withSpring(1, { duration: 320, dampingRatio: 0.4 }));
    flash.value = withSequence(withTiming(0.55, { duration: 70 }), withTiming(0, { duration: 380 }));
    bloom.value = withSequence(withTiming(1, { duration: 160 }), withTiming(0.55, { duration: 400 }));
    burst.value = withTiming(1, { duration: 900, easing: outCubic });
    title.value = withTiming(0, { duration: 200 });
    sparkles.value = withTiming(0, { duration: 200 });
    bobAmp.value = withTiming(0, { duration: 250 });
    dim.value = withTiming(1, { duration: 600 });
    lift.value = withDelay(80, withTiming(1, { duration: rise, easing: outCubic }));
    lid.value = withDelay(lidAt, withTiming(1, { duration: lidMs, easing: outCubic }));
    pop.value = withDelay(lidAt, withSequence(withTiming(1.12, { duration: 110, easing: outCubic }), withSpring(1, { duration: 380, dampingRatio: 0.45 })));
    rays.value = withDelay(lidAt, withTiming(1, { duration: 500 }));
    spin.value = withRepeat(withTiming(360, { duration: (360 / open.raysRotateDegPerSec) * 1000, easing: Easing.linear }), -1, false);
    card.value = withDelay(cardAt, withSpring(1, { duration: cardMs, dampingRatio: 0.75 }));
    button.value = withDelay(buttonAt, withTiming(1, { duration: 350, easing: outCubic }));

    [160, 280, 380].forEach((at) => later(at, () => haptic.impact('Rigid')));
    later(lidAt, () => {
      haptic.impact('Heavy');
      haptic.success();
    });
    later(cardAt + 120, () => haptic.impact('Soft'));
    later(buttonAt, () => setPhase('revealed'));
  }

  const p = deal ? partner(deal.partnerId) : null;
  const preOpen = phase === 'lift' || phase === 'throw' || phase === 'dive';

  // ---- styles -------------------------------------------------------------------------
  const worldStyle = useAnimatedStyle(() => ({ transform: [{ translateY: camera.value }] }));
  const crateW = 200 * k;
  const crateH = 170 * k;
  const flyingStyle = useAnimatedStyle(() => ({
    opacity: 1 - landed.value,
    transform: [
      { translateX: crateX.value * k - crateW / 2 },
      { translateY: crateY.value * k + camera.value - crateH * (92 / 170) },
      { rotate: `${crateRot.value}deg` },
      { scale: crateScale.value },
    ],
  }));
  const hoverCrateW = 132 * k;
  const landedStyle = useAnimatedStyle(() => {
    const y = floorY - 14 * k + (revealY - floorY + 14 * k) * lift.value;
    const scale = (1 + (150 / 132 - 1) * lift.value) * squash.value * pop.value;
    return {
      opacity: landed.value,
      transform: [
        { translateY: y - 80 * k + (bob.value - 0.5) * 2 * toss.hoverBobPx * bobAmp.value },
        { rotate: `${(bob.value - 0.5) * 3 * bobAmp.value}deg` },
        { scale },
      ],
    };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: landed.value * (1 - lift.value) * (0.9 - 0.3 * bob.value * bobAmp.value),
    transform: [{ scaleX: 1 - 0.18 * bob.value * bobAmp.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: Math.max(glow.value * 0.8, bloom.value) * (1 - lift.value * 0.2),
    transform: [{ translateY: (revealY - floorY) * lift.value }, { scale: 1 + bloom.value * 0.5 }],
  }));
  const raysStyle = useAnimatedStyle(() => ({ opacity: rays.value, transform: [{ rotate: `${spin.value}deg` }] }));
  const lidStyle = useAnimatedStyle(() => ({
    opacity: lid.value > 0 ? 1 - lid.value : 0,
    transform: [{ translateY: -60 * k * lid.value }, { translateX: -30 * k * lid.value }, { rotate: `${-28 * lid.value}deg` }],
  }));
  const closedStyle = useAnimatedStyle(() => ({ opacity: lid.value > 0.05 ? 0 : 1 }));
  const fullStyle = useAnimatedStyle(() => ({ opacity: lid.value > 0.05 ? 1 : 0 }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value * 0.45 }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const captionStyle = useAnimatedStyle(() => ({ opacity: caption.value }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.value, transform: [{ translateY: 8 * (1 - title.value) }] }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: card.value, transform: [{ translateY: 40 * (1 - card.value) }, { scale: 0.96 + 0.04 * card.value }] }));
  const buttonStyle = useAnimatedStyle(() => ({ opacity: button.value, transform: [{ translateY: open.buttonRisePx * (1 - button.value) }] }));

  return (
    <Pressable style={styles.root} onPress={startThrow} disabled={phase !== 'lift'} accessibilityLabel="Throw the crate into the harbor">
      <Animated.View style={[{ width: W, height: WORLD_H * k }, worldStyle]}>
        <World width={W} height={WORLD_H * k} />
        <ShipAndPaul k={k} throwing={phase !== 'lift'} />
        <Fish k={k} />
      </Animated.View>

      <Bubbles visible={under} W={W} H={H} />

      {/* Splash where the crate hits the water. */}
      <Splash progress={splash} x={320 * k} y={570 * k} k={k} camera={camera} />

      {/* World dims for the reveal. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} />

      {/* A quick white flash on the tap. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

      {/* Rays from the open crate. */}
      <Animated.View pointerEvents="none" style={[styles.abs, { left: W / 2 - 600, top: revealY - 600 }, raysStyle]}>
        <Rays />
      </Animated.View>

      {/* Glow under / around the landed crate. */}
      <Animated.View pointerEvents="none" style={[styles.abs, { left: W / 2 - 150 * k, top: floorY - 150 * k }, glowStyle]}>
        <Glow size={300 * k} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.shadow, { left: W / 2 - 46 * k, top: floorY + 62 * k, width: 92 * k }, shadowStyle]} />
      <Sparkles visible={sparkles} cx={W / 2} cy={floorY} k={k} />
      <Burst progress={burst} cx={W / 2} cy={floorY - 10 * k} k={k} />

      {preOpen && (
        <Animated.View pointerEvents="none" style={[styles.abs, { width: crateW, height: crateH }, flyingStyle]}>
          <CrateClosed width={crateW} height={crateH} />
        </Animated.View>
      )}

      {/* The one tap: a generous hit box around the hovering crate. */}
      <Animated.View style={[styles.abs, { left: W / 2 - 80 * k, width: 160 * k, top: 0 }, landedStyle]} pointerEvents={phase === 'landed' ? 'auto' : 'none'}>
        <Pressable onPress={tapCrate} accessibilityRole="button" accessibilityLabel="Open the crate" style={{ width: 160 * k, height: 160 * k, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: hoverCrateW, height: (hoverCrateW * 170) / 200 }}>
            <Animated.View style={[StyleSheet.absoluteFill, closedStyle]}>
              <CrateClosed width={hoverCrateW} height={(hoverCrateW * 170) / 200} />
            </Animated.View>
            <Animated.View style={[styles.abs, { top: -hoverCrateW * 0.12 }, fullStyle]}>
              <CrateFull width={hoverCrateW} height={(hoverCrateW * 190) / 200} />
            </Animated.View>
            <Animated.View style={[styles.lid, { left: hoverCrateW * 0.07, width: hoverCrateW * 0.86, height: 10 * k, top: hoverCrateW * 0.12 }, lidStyle]} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Step 3 caption. */}
      <Animated.View pointerEvents="none" style={[styles.caption, { bottom: Math.max(insets.bottom, 20) + 52 * k }, captionStyle]}>
        <Txt style={styles.captionTitle}>Heave ho!</Txt>
        <Txt variant="secondary" style={styles.center}>
          Tap to throw it into the harbor
        </Txt>
      </Animated.View>

      {/* Step 5 title. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.landedTitle, { top: 140 * k }, titleStyle]}>
        <Txt style={styles.bigTitle}>It landed!</Txt>
        <Txt style={styles.landedHint}>Tap the crate to open it</Txt>
      </Animated.View>

      {/* Step 6 deal card + Save. */}
      {p && (
        <>
          <Animated.View
            style={[styles.card, { top: revealY + 44 * k }, cardStyle]}>
            <View style={styles.found}>
              <Txt style={styles.foundText}>You found a deal!</Txt>
            </View>
            <View style={styles.dealIcon}>
              <Icon name={p.icon} size={44} />
            </View>
            <Txt style={styles.place}>{p.name}</Txt>
            <Txt style={styles.offer}>{p.offer}</Txt>
            <Txt variant="secondary" style={styles.center}>
              {p.area} · Use within 7 days
            </Txt>
          </Animated.View>
          <Animated.View
            pointerEvents={phase === 'revealed' ? 'auto' : 'none'}
            style={[styles.save, { bottom: Math.max(insets.bottom, 20) + 24 }, buttonStyle]}>
            <Button
              label="Save to My Deals"
              onPress={() => {
                haptic.impact('Light');
                router.back();
              }}
            />
          </Animated.View>
        </>
      )}

      {/* Close: nothing is spent until the crate is opened. */}
      {(preOpen || phase === 'landed') && (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[styles.close, { top: insets.top + 12 }, phase === 'landed' || phase === 'dive' ? styles.closeDark : null]}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M6 6l12 12M18 6L6 18" stroke={phase === 'landed' || phase === 'dive' ? '#FFFFFF' : color.slate} strokeWidth={2.6} strokeLinecap="round" />
          </Svg>
        </Pressable>
      )}
    </Pressable>
  );
}

/** The Beaver at the waterline with Paul on deck (3-heave-ho.svg positions). */
function ShipAndPaul({ k, throwing }: { k: number; throwing: boolean }) {
  const Paul = throwing ? PaulThrow : PaulLift;
  const styles = useStyles();
  return (
    <>
      {/* Paul stands on deck in front of the sails, so he's drawn after the ship. */}
      <View style={[styles.abs, { left: 20 * k, top: 408 * k }]}>
        <Ship width={400 * 0.86 * k} height={240 * 0.86 * k} />
      </View>
      <View style={[styles.abs, { left: 92.24 * k, top: 381.04 * k }]}>
        <Paul width={120 * 0.817 * k} height={200 * 0.817 * k} />
      </View>
    </>
  );
}

const FISH = [
  { Art: FishGold, y: 1290, w: 56, dur: 13000, delay: 0, right: true },
  { Art: FishCoral, y: 1340, w: 46, dur: 16000, delay: 2500, right: false },
  { Art: FishMint, y: 1490, w: 40, dur: 14000, delay: 1200, right: true },
  { Art: FishBlue, y: 1180, w: 38, dur: 18000, delay: 5000, right: false },
];

/** Fish swim slowly across, always head-first (the art faces left, so mirror it going right). */
function Fish({ k }: { k: number }) {
  return (
    <>
      {FISH.map((f, i) => (
        <OneFish key={i} {...f} k={k} />
      ))}
    </>
  );
}

function OneFish({ Art, y, w, dur, delay, right, k }: (typeof FISH)[number] & { k: number }) {
  const styles = useStyles();
  const x = useSharedValue(0);
  const wag = useSharedValue(0);
  useEffect(() => {
    x.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false));
    wag.value = withRepeat(withTiming(1, { duration: 380, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [delay, dur, wag, x]);
  const from = right ? -80 : 480;
  const to = right ? 480 : -80;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (from + (to - from) * x.value) * k },
      { translateY: (wag.value - 0.5) * 4 * k },
      { scaleX: right ? -1 : 1 },
      { rotate: `${(wag.value - 0.5) * 6}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.abs, { top: y * k, left: 0 }, style]}>
      <Art width={w * k} height={(w * 120) / 160 * k} />
    </Animated.View>
  );
}

const BUBBLES = [
  { x: 0.12, r: 5, dur: 7000, delay: 0 },
  { x: 0.3, r: 3, dur: 9000, delay: 1800 },
  { x: 0.48, r: 6, dur: 6500, delay: 600 },
  { x: 0.62, r: 3.5, dur: 8000, delay: 3000 },
  { x: 0.8, r: 5, dur: 7500, delay: 1200 },
  { x: 0.9, r: 3, dur: 10000, delay: 4000 },
];

function Bubbles({ visible, W, H }: { visible: SharedValue<number>; W: number; H: number }) {
  const style = useAnimatedStyle(() => ({ opacity: visible.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {BUBBLES.map((b, i) => (
        <Bubble key={i} {...b} W={W} H={H} />
      ))}
    </Animated.View>
  );
}

function Bubble({ x, r, dur, delay, W, H }: (typeof BUBBLES)[number] & { W: number; H: number }) {
  const styles = useStyles();
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false));
  }, [delay, dur, rise]);
  const style = useAnimatedStyle(() => ({
    opacity: rise.value < 0.1 ? rise.value * 10 : 1 - Math.max(0, rise.value - 0.8) * 5,
    transform: [{ translateY: H * (0.85 - rise.value * 0.85) }, { translateX: Math.sin(rise.value * 12) * 6 }],
  }));
  return (
    <Animated.View style={[styles.abs, { left: x * W }, style]}>
      <Svg width={r * 2 + 4} height={r * 2 + 4}>
        <Circle cx={r + 2} cy={r + 2} r={r} stroke="#D3EDF0" strokeOpacity={0.7} strokeWidth={1.4} fill="none" />
        <Circle cx={r + 2 - r * 0.35} cy={r + 2 - r * 0.35} r={r * 0.22} fill="#FFFFFF" opacity={0.7} />
      </Svg>
    </Animated.View>
  );
}

function Splash({ progress, x, y, k, camera }: { progress: SharedValue<number>; x: number; y: number; k: number; camera: SharedValue<number> }) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => ({
    opacity: progress.value > 0 ? 1 - progress.value : 0,
    transform: [{ translateY: camera.value }, { scale: 0.6 + progress.value * 0.8 }],
  }));
  const s = 70 * k;
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: x - s / 2, top: y - s / 2, width: s, height: s }, style]}>
      <Svg width={s} height={s} viewBox="0 0 70 70">
        {[-60, -35, -12, 12, 35, 60].map((a) => (
          <Path key={a} d="M35 50 L35 22" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" transform={`rotate(${a} 35 50)`} />
        ))}
      </Svg>
    </Animated.View>
  );
}

function Glow({ size }: { size: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="crateGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFE9A8" stopOpacity={0.75} />
          <Stop offset="0.45" stopColor="#FFE08A" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#FFE08A" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#crateGlow)" />
    </Svg>
  );
}

/** Light rays: wedges under a radial fade so they never end on a hard circle. */
function Rays() {
  const wedges = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);
  return (
    <Svg width={1200} height={1200}>
      <Defs>
        <RadialGradient id="rayFade" cx="600" cy="600" r="600" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFF3C4" stopOpacity={0.7} />
          <Stop offset="0.35" stopColor="#FFF3C4" stopOpacity={0.28} />
          <Stop offset="0.75" stopColor="#FFF3C4" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {wedges.map((a) => (
        <Path key={a} d="M600 600 L570 0 L630 0 Z" transform={`rotate(${a} 600 600) scale(1)`} fill="url(#rayFade)" />
      ))}
    </Svg>
  );
}

function Star({ size, fill }: { size: number; fill: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 0C11 7 13 9 20 10 13 11 11 13 10 20 9 13 7 11 0 10 7 9 9 7 10 0Z" fill={fill} />
    </Svg>
  );
}

const SPARKLES = [
  { dx: -84, dy: -42, s: 22, fill: '#FFE08A', dur: 1400 },
  { dx: 78, dy: -60, s: 14, fill: '#FFE08A', dur: 1800 },
  { dx: 66, dy: 34, s: 16, fill: '#D3EDF0', dur: 1600 },
  { dx: -60, dy: 30, s: 12, fill: '#FFFFFF', dur: 2000 },
];

function Sparkles({ visible, cx, cy, k }: { visible: SharedValue<number>; cx: number; cy: number; k: number }) {
  return (
    <>
      {SPARKLES.map((s, i) => (
        <Twinkle key={i} {...s} visible={visible} cx={cx} cy={cy} k={k} />
      ))}
    </>
  );
}

function Twinkle({ dx, dy, s, fill, dur, visible, cx, cy, k }: (typeof SPARKLES)[number] & { visible: SharedValue<number>; cx: number; cy: number; k: number }) {
  const styles = useStyles();
  const tw = useSharedValue(0);
  useEffect(() => {
    tw.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [dur, tw]);
  const style = useAnimatedStyle(() => ({ opacity: visible.value * (0.3 + 0.7 * tw.value), transform: [{ scale: 0.7 + 0.3 * tw.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: cx + dx * k - s / 2, top: cy + dy * k - s / 2 }, style]}>
      <Star size={s} fill={fill} />
    </Animated.View>
  );
}

const BURST = Array.from({ length: 10 }, (_, i) => ({ angle: (i / 10) * Math.PI * 2 + 0.3, gold: i % 2 === 0, size: 10 + (i % 3) * 4 }));

/** 10 gold/white sparkles burst outward once on the tap. */
function Burst({ progress, cx, cy, k }: { progress: SharedValue<number>; cx: number; cy: number; k: number }) {
  return (
    <>
      {BURST.map((b, i) => (
        <BurstSpark key={i} {...b} progress={progress} cx={cx} cy={cy} k={k} />
      ))}
    </>
  );
}

function BurstSpark({ angle, gold, size, progress, cx, cy, k }: (typeof BURST)[number] & { progress: SharedValue<number>; cx: number; cy: number; k: number }) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const d = 120 * k * progress.value;
    return {
      opacity: progress.value > 0 ? 1 - progress.value : 0,
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: 1 - 0.4 * progress.value }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: cx - size / 2, top: cy - size / 2 }, style]}>
      <Star size={size} fill={gold ? '#FFE08A' : '#FFFFFF'} />
    </Animated.View>
  );
}

const useStyles = makeStyles((color, dark) => ({
  root: {
    flex: 1,
    backgroundColor: '#163C46',
    overflow: 'hidden',
  },
  abs: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  dim: {
    backgroundColor: '#0E2A32',
  },
  flash: {
    backgroundColor: '#FFF6D6',
  },
  shadow: {
    position: 'absolute',
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(14,42,50,0.28)',
  },
  lid: {
    position: 'absolute',
    borderRadius: 3,
    backgroundColor: '#C98B5A',
    borderWidth: 2,
    borderColor: '#7E5233',
  },
  caption: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 24,
    backgroundColor: dark ? 'rgba(27,33,41,0.95)' : 'rgba(255,255,255,0.95)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  captionTitle: {
    fontFamily: font.heading,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: color.ink,
  },
  center: {
    textAlign: 'center',
  },
  landedTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bigTitle: {
    fontFamily: font.heading,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textShadowColor: 'rgba(14,42,50,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  landedHint: {
    fontFamily: font.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    color: '#D3EDF0',
    marginTop: 8,
  },
  card: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 26,
    backgroundColor: color.surface,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: dark ? 0.4 : 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  found: {
    height: 24,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: color.leaf.tint,
    justifyContent: 'center',
  },
  foundText: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: color.leaf.dark,
  },
  dealIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  place: {
    fontFamily: font.heading,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.3,
    color: color.ink,
    textAlign: 'center',
  },
  offer: {
    fontFamily: font.bodySemibold,
    fontSize: 15.5,
    lineHeight: 21,
    color: color.primary,
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
  save: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  close: {
    position: 'absolute',
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: dark ? 'rgba(37,44,54,0.9)' : 'rgba(243,239,230,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeDark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
}));
