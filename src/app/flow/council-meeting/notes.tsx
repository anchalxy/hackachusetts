import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import {
  FlowHeader,
  FlowScreen,
  InfoPanel,
  SectionLabel,
} from '@/components/challenge-flow/flow';
import {
  findDocket,
  NotesInput,
  OUTCOMES,
  SegmentedPicker,
  type Outcome,
} from '@/components/challenge-flow/council-meeting';

const OUTCOME_OPTIONS = OUTCOMES.map((o) => ({ value: o, label: o }));

export default function DocketNotes() {
  const params = useLocalSearchParams<{ mode?: string; docket?: string }>();
  const docket = findDocket(params.docket);
  const mode = params.mode === 'livestream' ? 'livestream' : 'inPerson';

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [speakers, setSpeakers] = useState('');
  const [take, setTake] = useState('');
  const ready = outcome != null && speakers.trim().length > 0 && take.trim().length > 0;

  return (
    <FlowScreen
      action={{
        label: 'Send notes',
        disabled: !ready,
        onPress: () =>
          router.push({
            pathname: '/flow/council-meeting/sent',
            params: { mode, docket: docket.id, outcome: outcome ?? '', speakers: speakers.trim(), take: take.trim() },
          }),
      }}>
      <FlowHeader title={`${docket.number} notes`} step={2} of={2} />

      <SectionLabel>What happened?</SectionLabel>
      <SegmentedPicker label="What happened?" options={OUTCOME_OPTIONS} selection={outcome} onChange={setOutcome} />

      <SectionLabel>Who spoke, and what they argued</SectionLabel>
      <NotesInput
        value={speakers}
        onChangeText={setSpeakers}
        placeholder={docket.argumentsPlaceholder}
        accessibilityLabel="Who spoke, and what they argued"
      />

      <SectionLabel>Your take</SectionLabel>
      <NotesInput
        value={take}
        onChangeText={setTake}
        placeholder={docket.takePlaceholder}
        accessibilityLabel="Your take"
      />

      <InfoPanel
        icon="livestream"
        title="We check against the recording"
        body="Notes that match the meeting get sent. Nothing is shared before that."
      />
    </FlowScreen>
  );
}
