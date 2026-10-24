import { router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';

import { CalendarRow, CIVIC_EVENTS } from '@/components/challenge-flow/calendar';
import { ResultRow, SentScreen } from '@/components/challenge-flow/flow';
import { getUrbanWild, getWild } from '@/components/urban-wild/store';
import { Button } from '@/ui/components';
import { VOTE_LEAVES } from '@/lib/challenge-progress';

const STEPS = [
  { label: 'Sent', date: 'Today' },
  { label: 'Voting', date: 'Until Nov 8' },
  { label: 'Parks gets it', date: 'Nov 9' },
  { label: 'Open house', date: 'Nov 10' },
];

/** Sent: the design is in; neighbors vote until Nov 8. */
export default function Sent() {
  const navigation = useNavigation();
  // Snapshot the draft once: this is what gets credited and remembered.
  const [design] = useState(() => {
    const { wild, placements, why, photos } = getUrbanWild();
    return {
      wild: getWild(wild).name,
      changes: placements.map((p) => ({ kind: p.kind, x: p.at.x, y: p.at.y })),
      why: why.trim(),
      photos: Object.keys(photos).length,
    };
  });

  // The design is sent: no swiping back into the builder.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  return (
    <SentScreen
      challengeId="demo-urban-wild"
      title="Your design is in"
      body={`Neighbors vote on ${design.wild} designs until Nov 8. The top one goes to Parks before the open house.`}
      steps={STEPS}
      data={design}
      extraRows={
        <>
          <ResultRow
            icon="ballot"
            title="Vote on other designs"
            subtitle={`+${VOTE_LEAVES} tea leaves a vote`}
            trailing={<Button size="sm" label="Vote" onPress={() => router.push('/flow/urban-wild/vote')} />}
          />
          <CalendarRow title="Come to the open house" event={CIVIC_EVENTS.urbanWildsOpenHouse} last />
        </>
      }
    />
  );
}
