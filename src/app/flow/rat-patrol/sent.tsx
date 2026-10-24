import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { SentScreen } from '@/components/challenge-flow/flow';
import { FALLBACK_SPOT, RAT_PATROL_ID } from '@/components/challenge-flow/rat-patrol';

export default function RatPatrolSent() {
  const params = useLocalSearchParams<{
    type: string;
    photo: string;
    street: string;
    neighborhood: string;
    ticket: string;
  }>();
  // Snapshot once: SentScreen credits the stop on first render.
  const [data] = useState(() => ({
    ticket: params.ticket,
    type: params.type,
    street: params.street || FALLBACK_SPOT.street,
    neighborhood: params.neighborhood || (params.street ? '' : FALLBACK_SPOT.neighborhood),
    photo: params.photo,
    reportedOn: 'Oct 26',
  }));

  return (
    <>
      {/* The report is filed: no swiping back to step 2. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <SentScreen
        challengeId={RAT_PATROL_ID}
        title="Reported. Back on Nov 2"
        body="We’ll remind you in 7 days to check the spot. Response times by neighborhood go to the City Services Committee."
        steps={[
          { label: 'Reported', date: 'Today' },
          { label: 'Your check-in', date: 'Nov 2' },
          { label: 'Committee', date: 'Nov 3' },
        ]}
        current={1}
        leaves={30}
        pendingCheckIn
        data={data}
        leavesSubtitle="+10 more at your 7-day check-in"
        link={{
          label: 'Preview the day-7 check-in',
          onPress: () => router.push({ pathname: '/flow/rat-patrol/check-in', params: { from: 'sent' } }),
        }}
      />
    </>
  );
}
