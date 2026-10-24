import { Stack } from 'expo-router';
import { useState } from 'react';

import { ResultRow, SentScreen } from '@/components/challenge-flow/flow';
import { getBallotDraft, PROJECT_BY_ID } from '@/components/challenge-flow/spend-2-million/ballot';
import { VOTE_LEAVES } from '@/lib/challenge-progress';

const STEPS = [
  { label: 'Sent', date: 'Today' },
  { label: 'Ballot votes', date: 'Until Nov 4' },
  { label: 'Drafting forum', date: 'Nov 5' },
  { label: 'Citywide vote', date: 'Jan–Feb' },
];

export default function BallotSent() {
  const [data] = useState(() => {
    const { ids, cuts, reason } = getBallotDraft();
    return {
      ranking: ids.map((id, i) => ({ rank: i + 1, id, name: PROJECT_BY_ID[id].name, amount: PROJECT_BY_ID[id].amount })),
      total: ids.reduce((sum, id) => sum + PROJECT_BY_ID[id].amount, 0),
      cuts,
      reason: reason ?? '',
    };
  });

  return (
    <>
      {/* Sent is final: no swiping back into the ballot. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <SentScreen
        challengeId="demo-pb-2-million"
        title="Your ballot is in"
        body="The Office of Participatory Budgeting reads every ballot before residents draft the official one."
        steps={STEPS}
        data={data}
        extraRows={
          <ResultRow icon="ballot" title="Vote on neighbors’ ballots" subtitle={`+${VOTE_LEAVES} tea leaves a vote`} last />
        }
      />
    </>
  );
}
