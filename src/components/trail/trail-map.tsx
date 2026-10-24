import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { landmarkName, trailStop, type LandmarkFile } from '@/constants/trail';
import { isStopDone, type ChallengeProgress } from '@/lib/challenge-progress';
import { shortDate } from '@/lib/challenge-week';
import { scorePoints, type Challenge } from '@/lib/challenges';
import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles } from '@/ui/theme';

import { AmbientProp, FallingLeaf, RiverBoat, RiverBridge, SwanBoat, WaterMark } from './ambient';
import { BAND_H, FOREST_BOTTOM, LAYOUT, MAP_H, MAP_W, TRAIL_H, type LayoutStop, type WeekCard } from './layout';
import { Nameplate } from './nameplate';
import { TrailStop } from './trail-stop';

// The static scene (design/assets/trail/freedom-trail-map.svg, 371 KB, ~2,000 nodes) rasterized
// at 3× into three 402×1010 WebP tiles. Drawing it live with react-native-svg means parsing it on
// mount and a single 1206×9090 px layer; the tiles decode off the JS thread and stay sharp.
const TILES = [
  require('@/assets/images/trail/map-0.webp'),
  require('@/assets/images/trail/map-1.webp'),
  require('@/assets/images/trail/map-2.webp'),
];
const FOREST = require('@/assets/images/trail/forest-bottom.webp');

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
  // The stop held down, so its piece settles whether the finger is on the piece or the nameplate.
  const [pressedId, setPressedId] = useState<string | null>(null);
  const styles = useStyles();

  return (
    <View style={{ width: MAP_W * k, height: TRAIL_H * k }}>
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

      <Image
        source={FOREST}
        style={[styles.abs, { left: 0, top: FOREST_BOTTOM.top * k, width: MAP_W * k, height: FOREST_BOTTOM.h * k }]}
        contentFit="fill"
        transition={0}
        allowDownscaling={false}
      />

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

      {/* This week: pieces first, then their nameplates on top of the tile fronts. */}
      {placed.map(({ challenge, slot, file }) => (
        <TrailStop
          key={challenge.id}
          file={file}
          state={isStopDone(progress, challenge.id) ? 'done' : 'current'}
          x={slot.x}
          y={slot.y}
          k={k}
          order={slots.length - 1 - slots.indexOf(slot)}
          focused={focused}
          accessibilityLabel={stopLabel(challenge, file, progress)}
          onPress={() => openStop(challenge)}
          pressed={pressedId === challenge.id}
          onPressedChange={(down) => setPressedId(down ? challenge.id : null)}
        />
      ))}
      {placed.map(({ challenge, slot, file, icon }) => {
        const placement = LAYOUT.labels[slots.indexOf(slot)];
        if (!placement) return null;
        const stop = trailStop(challenge.id);
        const earned = progress.stops[challenge.id]?.leaves;
        return (
          <Nameplate
            key={`plate-${challenge.id}`}
            placement={placement}
            k={k}
            icon={icon}
            title={stop?.plate.title ?? challenge.title}
            due={stop?.plate.due ?? `Due ${shortDate(challenge.deadlineDate)}`}
            reward={earned ?? stop?.leaves ?? scorePoints(challenge.factors).points * 10}
            done={earned !== undefined}
            accessibilityLabel={stopLabel(challenge, file, progress)}
            onPress={() => openStop(challenge)}
            onPressedChange={(down) => setPressedId(down ? challenge.id : null)}
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

/** The piece and its nameplate open the same sheet. */
function openStop(challenge: Challenge) {
  router.push(`/challenge/${challenge.id}`);
}

function stopLabel(challenge: Challenge, file: LandmarkFile, progress: ChallengeProgress): string {
  const done = isStopDone(progress, challenge.id);
  return `${landmarkName(file)}: ${trailStop(challenge.id)?.title ?? challenge.title}${done ? ', done' : ''}`;
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
  const styles = useStyles();
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

const useStyles = makeStyles((color, dark) => ({
  abs: { position: 'absolute' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: color.surface,
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: dark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(30, 42, 58, 0.08)' }],
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
}));
