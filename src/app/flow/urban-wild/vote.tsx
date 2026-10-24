import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FlowHeader, FlowHeading, FlowScreen } from '@/components/challenge-flow/flow';
import { ParkMap } from '@/components/urban-wild/park-map';
import { changeInfo, getWild, useUrbanWild, type Placement, type Wild } from '@/components/urban-wild/store';
import { addVote, MAX_VOTES, useChallengeProgress, VOTE_LEAVES } from '@/lib/challenge-progress';
import { Badge, TextLink } from '@/ui/components';
import { Txt } from '@/ui/text';
import { color } from '@/ui/theme';

type Design = { quote: string; from: string; placements: Placement[] };

/** Three neighbors' designs for the picked wild (demo content). */
function neighborDesigns(wild: Wild): Design[] {
  return [
    {
      quote: `A full loop trail with benches by ${wild.feature.short}, so older neighbors can walk it too.`,
      from: 'a neighbor in Roslindale',
      placements: [
        { kind: 'trail', at: { x: 0.4, y: 0.62 } },
        { kind: 'seating', at: { x: 0.56, y: 0.34 } },
        { kind: 'lighting', at: { x: 0.83, y: 0.5 } },
      ],
    },
    {
      quote: `Most people walk right past the ${wild.entrance}. A sign and a ramp would bring them in.`,
      from: 'a neighbor in West Roxbury',
      placements: [
        { kind: 'signs', at: { x: 0.13, y: 0.7 } },
        { kind: 'entrance', at: { x: 0.3, y: 0.84 } },
        { kind: 'cleanup', at: { x: 0.52, y: 0.8 } },
      ],
    },
    {
      quote: 'Pick up the trash and leave the rest alone. The quiet is the whole point.',
      from: 'a neighbor in Jamaica Plain',
      placements: [
        { kind: 'wild', at: { x: 0.26, y: 0.32 } },
        { kind: 'cleanup', at: { x: 0.74, y: 0.8 } },
      ],
    },
  ];
}

/** Vote on other neighbors' designs for the same wild: +2 leaves a vote, 10 a week. */
export default function Vote() {
  const wild = getWild(useUrbanWild().wild);
  const designs = neighborDesigns(wild);
  const { votes } = useChallengeProgress();
  const votesLeft = Math.max(MAX_VOTES - votes, 0);

  const [index, setIndex] = useState(0);
  const [voted, setVoted] = useState<number[]>([]);
  const design = designs[index];
  const allVoted = voted.length >= designs.length;

  const nextUnvoted = (from: number, done: number[]) => {
    for (let step = 1; step <= designs.length; step++) {
      const i = (from + step) % designs.length;
      if (!done.includes(i)) return i;
    }
    return from;
  };

  const vote = () => {
    if (!addVote()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const done = [...voted, index];
    setVoted(done);
    setIndex(nextUnvoted(index, done));
  };

  const label = allVoted
    ? 'You voted on every design'
    : votesLeft === 0
      ? 'No votes left this week'
      : voted.includes(index)
        ? 'You voted for this one'
        : 'Vote for this design';

  return (
    <FlowScreen
      footnote={`+${VOTE_LEAVES} tea leaves a vote · ${votesLeft} ${votesLeft === 1 ? 'vote' : 'votes'} left this week`}
      action={{
        label,
        onPress: vote,
        disabled: allVoted || votesLeft === 0 || voted.includes(index),
      }}>
      <FlowHeader title="Vote" />
      <FlowHeading
        title={`${wild.name} designs`}
        subtitle={`${designs.length} so far. Vote for the one you’d most want to visit.`}
      />

      <View style={styles.card}>
        <ParkMap key={index} wild={wild} placements={design.placements} pinSize={36} />
        <Txt variant="rowLead" style={styles.quote}>
          {`“${design.quote}”`}
        </Txt>
        <View style={styles.badges}>
          {design.placements.map((p) => (
            <Badge key={p.kind} label={changeInfo(p.kind).label} bg={color.tile} fg={color.slate} />
          ))}
        </View>
        <View style={styles.metaRow}>
          <Txt variant="meta" style={styles.meta}>
            {`Design ${index + 1} of ${designs.length} · ${design.from}`}
          </Txt>
          {voted.includes(index) ? (
            <Badge label="Voted" bg={color.badge.approved.bg} fg={color.badge.approved.fg} />
          ) : null}
        </View>
      </View>

      <View style={styles.next}>
        <TextLink label="Show the next design" onPress={() => setIndex((index + 1) % designs.length)} />
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  quote: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 26,
    paddingHorizontal: 2,
  },
  meta: {
    fontSize: 13,
  },
  next: {
    alignItems: 'center',
    paddingVertical: 6,
  },
});
