import { Stack, useLocalSearchParams } from 'expo-router';

import { SentScreen } from '@/components/challenge-flow/flow';
import {
  COUNCIL_CHALLENGE_ID,
  findDocket,
  MODE_LEAVES,
} from '@/components/challenge-flow/council-meeting';

export default function NotesSent() {
  const params = useLocalSearchParams<{
    mode?: string;
    docket?: string;
    outcome?: string;
    speakers?: string;
    take?: string;
  }>();
  const docket = findDocket(params.docket);
  const mode = params.mode === 'livestream' ? 'livestream' : 'inPerson';

  return (
    <>
      {/* Notes are already sent: no swiping back into the form. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <SentScreen
        challengeId={COUNCIL_CHALLENGE_ID}
        title="Your notes are in"
        body={`Once they match the recording, they go to ${docket.sponsorShort}’s office and your district councilor.`}
        leaves={MODE_LEAVES[mode]}
        steps={[
          { label: 'Sent', date: 'Today' },
          { label: 'Checked', date: 'Oct 29' },
          { label: 'Councilors', date: 'Oct 30' },
          { label: 'Committee', date: 'To be set' },
        ]}
        data={{
          mode,
          docket: docket.number,
          docketTitle: docket.title,
          sponsor: docket.sponsor,
          outcome: params.outcome,
          speakers: params.speakers,
          take: params.take,
        }}
      />
    </>
  );
}
