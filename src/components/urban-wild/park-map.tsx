import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, useColors, useScheme, type Palette } from '@/ui/theme';

import Rocks from '../../../design/assets/trail/scenery/rocks.svg';
import TreeBirch from '../../../design/assets/trail/scenery/tree-birch.svg';
import TreeMaple from '../../../design/assets/trail/scenery/tree-maple.svg';
import TreeOak from '../../../design/assets/trail/scenery/tree-oak.svg';
import TreePine from '../../../design/assets/trail/scenery/tree-pine.svg';
import { changeInfo, type ChangeKind, type Placement, type Point, type Wild } from './store';

// The map is drawn in a 360×186 box and scaled to the card's width.
const VB_W = 360;
const VB_H = 186;

// Map colors per appearance. Dark leans on the color.map.* tokens, with lighter edges and labels
// so they still read on the dark ground.
function mapColors(color: Palette, dark: boolean) {
  return dark
    ? {
        ground: color.map.land,
        park: color.map.park,
        parkEdge: '#4F6B45',
        water: color.map.water,
        waterEdge: '#6FA8D0',
        ripple: 'rgba(255,255,255,0.35)',
        trail: '#8F7356',
        entrance: '#D3A574',
      }
    : {
        ground: '#EEF1E4',
        park: '#DEE7CB',
        parkEdge: '#9DB57E',
        water: '#A8D2EA',
        waterEdge: '#2E6E9E',
        ripple: '#FFFFFF',
        trail: '#D3B08A',
        entrance: '#8A5A2B',
      };
}

// Trees around the edge, in viewBox units (x, y is the tree's base center).
const TREES = [
  { C: TreeMaple, x: 60, y: 64, s: 38 },
  { C: TreePine, x: 92, y: 50, s: 30 },
  { C: TreeMaple, x: 266, y: 48, s: 30 },
  { C: TreeBirch, x: 328, y: 92, s: 28 },
  { C: TreeOak, x: 298, y: 126, s: 34 },
  { C: TreePine, x: 146, y: 140, s: 32 },
  { C: TreeOak, x: 40, y: 140, s: 26 },
];

// Dotted loop from the entrance (bottom left) around the feature.
const TRAIL_DOTS = (() => {
  const pts: [number, number][] = [];
  const add = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  add(10, 142, 70, 116, 6);
  add(70, 116, 120, 114, 5);
  add(120, 114, 158, 120, 4);
  add(158, 120, 172, 104, 3);
  add(172, 104, 172, 76, 4);
  add(172, 76, 196, 62, 3);
  add(196, 62, 230, 60, 4);
  add(230, 60, 296, 76, 7);
  return pts;
})();

/**
 * The illustrated park card: outline, feature (pond or cliff), dotted trail, trees, and the
 * entrance label. Placed changes sit on top as numbered pins; pass `onMove` to make them draggable.
 */
export function ParkMap({
  wild,
  placements,
  onMove,
  pinSize = 44,
}: {
  wild: Wild;
  placements: Placement[];
  onMove?: (kind: ChangeKind, at: Point) => void;
  pinSize?: number;
}) {
  const styles = useStyles();
  const map = mapColors(useColors(), useScheme() === 'dark');
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };
  const k = size.w / VB_W;

  return (
    <View
      style={styles.card}
      onLayout={onLayout}
      accessible={!onMove}
      accessibilityLabel={`Map of ${wild.name} with ${placements.length} changes`}>
      {size.w > 0 ? (
        <>
          <Svg width={size.w} height={size.h} viewBox={`0 0 ${VB_W} ${VB_H}`} style={StyleSheet.absoluteFill}>
            <Path
              d="M18 54 C 40 20, 150 4, 250 10 C 330 14, 352 60, 344 110 C 336 160, 270 182, 180 176 C 110 172, 40 178, 26 160 C 16 130, -4 90, 18 54 Z"
              fill={map.park}
              stroke={map.parkEdge}
              strokeWidth={1.5}
            />
            {TRAIL_DOTS.map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={2.6} fill={map.trail} />
            ))}
            {wild.feature.kind === 'pond' ? (
              <Ellipse cx={230} cy={96} rx={46} ry={23} fill={map.water} stroke={map.waterEdge} strokeWidth={1.5} />
            ) : null}
            {wild.feature.kind === 'pond' ? (
              <>
                <Path d="M212 92 q6 -4 12 0" stroke={map.ripple} strokeWidth={1.8} fill="none" strokeLinecap="round" />
                <Path d="M236 104 q6 -4 12 0" stroke={map.ripple} strokeWidth={1.8} fill="none" strokeLinecap="round" />
              </>
            ) : null}
          </Svg>
          {wild.feature.kind === 'cliff' ? (
            <View style={[styles.abs, { left: 196 * k, top: 64 * k }]}>
              <Rocks width={68 * k} height={52 * k} />
            </View>
          ) : null}
          {TREES.map(({ C, x, y, s }, i) => (
            <View key={i} style={[styles.abs, { left: (x - s / 2) * k, top: (y - s) * k }]}>
              <C width={s * k} height={s * k} />
            </View>
          ))}
          <Txt
            style={[
              styles.featureLabel,
              { left: 180 * k, top: 124 * k, width: 100 * k },
              wild.feature.kind === 'cliff' && { color: map.entrance },
            ]}>
            {wild.feature.label}
          </Txt>
          <Txt style={[styles.entranceLabel, { left: 10 * k, bottom: 2 }]}>{wild.entrance}</Txt>
          {placements.map((p, i) => (
            <MapPin
              key={p.kind}
              placement={p}
              number={i + 1}
              area={size}
              size={pinSize}
              onMove={onMove}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function MapPin({
  placement,
  number,
  area,
  size,
  onMove,
}: {
  placement: Placement;
  number: number;
  area: { w: number; h: number };
  size: number;
  onMove?: (kind: ChangeKind, at: Point) => void;
}) {
  const styles = useStyles();
  const { kind, at } = placement;
  const x =useSharedValue(at.x * area.w);
  const y = useSharedValue(at.y * area.h);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const lift = useSharedValue(1);

  // Follow the store (new layout, or a pin placed again) when not being dragged.
  useEffect(() => {
    x.set(at.x * area.w);
    y.set(at.y * area.h);
  }, [at.x, at.y, area.w, area.h, x, y]);

  const half = size / 2;
  const commit = (nx: number, ny: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onMove?.(kind, { x: nx / area.w, y: ny / area.h });
  };

  const pan = usePanGesture({
    enabled: !!onMove,
    minDistance: 2,
    onBegin: () => {
      'worklet';
      startX.set(x.get());
      startY.set(y.get());
      lift.set(withSpring(1.12, { duration: 220 }));
    },
    onUpdate: (e) => {
      'worklet';
      x.set(Math.min(Math.max(startX.get() + e.translationX, half * 0.6), area.w - half * 0.6));
      y.set(Math.min(Math.max(startY.get() + e.translationY, half * 0.6), area.h - half * 0.6));
    },
    onFinalize: () => {
      'worklet';
      lift.set(withSpring(1, { duration: 260 }));
      if (x.get() !== startX.get() || y.get() !== startY.get()) {
        scheduleOnRN(commit, x.get(), y.get());
      }
    },
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() - half }, { translateY: y.get() - half }, { scale: lift.get() }],
  }));

  const info = changeInfo(kind);
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessibilityLabel={`${number}. ${info.label}`}
        style={[styles.pin, { width: size, height: size, borderRadius: half }, style]}>
        <Icon name={info.icon} size={Math.round(size * 0.55)} />
        <View style={[styles.pinNumber, size < 40 && styles.pinNumberSm]}>
          <Txt style={[styles.pinNumberText, size < 40 && styles.pinNumberTextSm]}>{number}</Txt>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const useStyles = makeStyles((color, dark) => ({
  card: {
    width: '100%',
    aspectRatio: VB_W / VB_H,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: mapColors(color, dark).ground,
    overflow: 'hidden',
  },
  abs: {
    position: 'absolute',
  },
  featureLabel: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: mapColors(color, dark).waterEdge,
  },
  entranceLabel: {
    position: 'absolute',
    fontFamily: font.bodyBold,
    fontSize: 10.5,
    color: mapColors(color, dark).entrance,
  },
  pin: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: 2.5,
    borderColor: color.primary,
    boxShadow: dark ? '0 3px 0 rgba(0,0,0,0.55)' : '0 3px 0 #22545A',
  },
  pinNumber: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primary,
    borderWidth: 1.5,
    borderColor: color.surface,
  },
  pinNumberSm: {
    minWidth: 17,
    height: 17,
    top: -6,
    right: -6,
  },
  pinNumberText: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    color: color.onPrimary,
  },
  pinNumberTextSm: {
    fontSize: 10,
    lineHeight: 12,
  },
}));
