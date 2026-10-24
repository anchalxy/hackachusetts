import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import {
  FlowHeader,
  FlowScreen,
  OptionRow,
  SectionLabel,
} from '@/components/challenge-flow/flow';
import { AddToCalendarButton, CIVIC_EVENTS } from '@/components/challenge-flow/calendar';
import {
  DOCKETS,
  LIVESTREAM_URL,
  MODE_LEAVES,
  SegmentedPicker,
  type CouncilMode,
} from '@/components/challenge-flow/council-meeting';
import { useColors } from '@/ui/theme';

const MODES: { value: CouncilMode; label: string }[] = [
  { value: 'inPerson', label: `In person · +${MODE_LEAVES.inPerson}` },
  { value: 'livestream', label: `Livestream · +${MODE_LEAVES.livestream}` },
];

export default function PickDocket() {
  const color = useColors();
  const [mode, setMode] = useState<CouncilMode>('inPerson');
  const [docketId, setDocketId] = useState(DOCKETS[0].id);
  const docket = DOCKETS.find((d) => d.id === docketId) ?? DOCKETS[0];

  return (
    <FlowScreen
      footnote="The agenda packet posts before Wednesday. Every docket on it shows up here when it does."
      action={{
        label: `Follow ${docket.number}`,
        onPress: () =>
          router.push({ pathname: '/flow/council-meeting/notes', params: { mode, docket: docket.id } }),
      }}>
      <FlowHeader title="Council meeting" step={1} of={2} close />

      <OptionRow
        control="none"
        icon="cityhall"
        title="Wed, Oct 28 · 12 p.m."
        subtitle="Iannella Chamber, City Hall 5th floor"
        trailing={<AddToCalendarButton event={CIVIC_EVENTS.councilMeeting} />}
      />

      <SegmentedPicker label="How you'll attend" options={MODES} selection={mode} onChange={setMode} />

      {mode === 'livestream' ? (
        <OptionRow
          control="none"
          icon="livestream"
          title="Watch the livestream"
          subtitle="boston.gov · live at 12 p.m. Wednesday"
          onPress={() => WebBrowser.openBrowserAsync(LIVESTREAM_URL).catch(() => {})}
          trailing={<SymbolView name="arrow.up.right" size={14} weight="semibold" tintColor={color.primary} />}
        />
      ) : null}

      <SectionLabel>Pick one docket to follow</SectionLabel>
      {DOCKETS.map((d) => (
        <OptionRow
          key={d.id}
          icon={d.icon}
          title={`${d.number} · ${d.title}`}
          subtitle={`${d.summary} · ${d.sponsor}`}
          selected={d.id === docketId}
          onPress={() => setDocketId(d.id)}
        />
      ))}
    </FlowScreen>
  );
}
