import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { landmarkName, trailStop, type LandmarkFile } from '@/constants/trail';
import { isStopDone, type ChallengeProgress } from '@/lib/challenge-progress';
import type { Challenge } from '@/lib/challenges';
import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font } from '@/ui/theme';

import { AmbientProp, FallingLeaf, RiverBoat, RiverBridge, SwanBoat, WaterMark } from './ambient';
import { BAND_H, LAYOUT, MAP_H, MAP_W, type LayoutStop, type WeekCard } from './layout';
import { TrailStop } from './trail-stop';

// The static scene (design/assets/trail/freedom-trail-map.svg, 371 KB, ~2,000 nodes) rasterized
// at 3× into three 402×1010 WebP tiles. Drawing it live with react-native-svg means parsing it on
// mount and a single 1206×9090 px layer; the tiles decode off the JS thread and stay sharp.
const TILES = [
  require('@/assets/images/trail/map-0.webp'),
  require('@/assets/images/trail/map-1.webp'),
  require('@/assets/images/trail/map-2.webp'),
];

type PlacedStop = { challenge: Challenge; slot: LayoutStop; file: LandmarkFile; icon: IconName };

/**
 * This week's challenges on layout.json weeks[0]. The trail runs bottom → top with the soonest
 * deadline lowest. Hand-made demo stops already name their landmark (TRAIL_STOPS), which wins
 * so the trail matches the mockups; generated weeks fill the slots from the bottom in trail order.
 */
export function placeThisWeek(challenges: Challenge[]): PlacedStop[] {
  const slots = LAYOUT.weeks[0].stops;
  const list = challenges.slice(0, slots.length);
  const byLandmark = list.map((c) => slots.find((s) => s.file === trailStop(c.id)?.landmark));
  const distinct = new Set(byLandmark.filter(Boolean)).size === list.length;
  return list.map((challenge, i) => {
    const slot = distinct ? byLandmark[i]! : slots[slots.length - 1 - i];
    const stop = trailStop(challenge.id);
    return { challenge, slot, file: stop?.landmark ?? slot.file, icon: stop?.icon ?? 'flag' };
  });
}

type Props = {
  k: number;
  challenges: Challenge[];
  progress: ChallengeProgress;
  focused: boolean;
};

export function TrailMap({ k, challenges, progress, focused }: Props) {
  const placed = useMemo(() => placeThisWeek(challenges), [challenges]);
  const slots = LAYOUT.weeks[0].stops;

  return (
    <View style={{ width: MAP_W * k, height: MAP_H * k }}>
      {TILES.map((source, i) => (
        <Image
          key={i}
          source={source}
          style={[styles.abs, { left: 0, top: i * BAND_H * k, width: MAP_W * k, height: Math.min(BAND_H, MAP_H - i * BAND_H) * k }]}
          contentFit="fill"
          transition={0}
          allowDownscaling={false}
        />
      ))}

      <Scenery k={k} />

      {/* Past weeks, drawn as they were. */}
      {LAYOUT.weeks.slice(1).map((week, w) =>
        week.stops.map((stop, i) => (
          <TrailStop
            key={`${w}-${stop.file}`}
            file={stop.file}
            state={stop.state === 'missed' ? 'missed' : 'done'}
            x={stop.x}
            y={stop.y}
            k={k}
            order={i}
          />
        )),
      )}

      {/* This week. */}
      {placed.map(({ challenge, slot, file, icon }) => {
        const done = isStopDone(progress, challenge.id);
        const order = slots.length - 1 - slots.indexOf(slot);
        return (
          <TrailStop
            key={challenge.id}
            file={file}
            state={done ? 'done' : 'current'}
            x={slot.x}
            y={slot.y}
            k={k}
            order={order}
            icon={icon}
            focused={focused}
            accessibilityLabel={`${landmarkName(file)}: ${trailStop(challenge.id)?.title ?? challenge.title}${done ? ', done' : ''}`}
            onPress={() => router.push(`/challenge/${challenge.id}`)}
          />
        );
      })}

      {LAYOUT.cards.map((card) => (
        <WeekCardView key={card.label[0]} card={card} k={k} />
      ))}

      <FallingLeaves k={k} />
    </View>
  );
}

/** Water, boats, bridges and props. Memoized: none of it depends on progress. */
const Scenery = memo(function Scenery({ k }: { k: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {LAYOUT.rivers.map((river, r) =>
        river.ripples.map(([x, y], i) => <WaterMark key={`w${r}-${i}`} x={x} y={y} index={r * 10 + i} k={k} />),
      )}
      {LAYOUT.rivers.map((river, r) => river.boats.map((boat, i) => <RiverBoat key={`b${r}-${i}`} boat={boat} k={k} />))}
      <SwanBoat k={k} />
      {/* Bridges sit above the boats. */}
      {LAYOUT.rivers.map((river, r) => (
        <RiverBridge key={`br${r}`} bridge={river.bridge} k={k} />
      ))}
      {LAYOUT.props.map((prop, i) => (
        <AmbientProp key={`p${i}`} prop={prop} index={i} k={k} />
      ))}
    </View>
  );
});

const FallingLeaves = memo(function FallingLeaves({ k }: { k: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {LAYOUT.falls.map((fall, i) => (
        <FallingLeaf key={i} fall={fall} index={i} k={k} />
      ))}
    </View>
  );
});

/** "Week 5 · 4 of 5 done · Oct 19–25" under each bridge. */
function WeekCardView({ card, k }: { card: WeekCard; k: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`${card.label[0]}, ${card.label[1]}`}
      style={[styles.abs, styles.card, { left: card.left * k, top: card.top * k, width: card.w * k, minHeight: card.h * k }]}>
      <View style={styles.cardIcon}>
        <Icon name="flame" size={18} />
      </View>
      <View style={styles.cardText}>
        <Txt style={styles.cardTitle}>{card.label[0]}</Txt>
        <Txt style={styles.cardMeta} numberOfLines={1} adjustsFontSizeToFit>
          {card.label[1]}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: color.surface,
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: 'rgba(30, 42, 58, 0.08)' }],
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.badge.urgent.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    lineHeight: 19,
    color: color.ink,
  },
  cardMeta: {
    fontFamily: font.body,
    fontSize: 12.5,
    lineHeight: 16,
    color: color.slate,
  },
});
