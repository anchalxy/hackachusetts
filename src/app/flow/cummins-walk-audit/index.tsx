import { router } from 'expo-router';
import { useState } from 'react';

import {
  ChoiceTile,
  FlowHeader,
  FlowHeading,
  FlowScreen,
  OptionRow,
  TileGrid,
} from '@/components/challenge-flow/flow';
import { MODES, startAudit, type Mode } from '@/components/cummins-walk-audit/audit';

/** Walk audit 1 of 3: pick how you're getting around. */
export default function ModeStep() {
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <FlowScreen
      action={{
        label: 'Start at Fairway St',
        disabled: !mode,
        onPress: () => {
          if (!mode) return;
          startAudit(mode);
          router.push({ pathname: '/flow/cummins-walk-audit/crossing', params: { n: '1' } });
        },
      }}>
      <FlowHeader title="Walk audit" step={1} of={3} close />
      <FlowHeading
        title="How are you getting around?"
        subtitle="Stroller and wheelchair audits are reported on their own. They’re the hardest for the city to collect."
      />
      <TileGrid>
        {MODES.map((m) => (
          <ChoiceTile
            key={m.id}
            icon={m.icon}
            label={m.label}
            selected={mode === m.id}
            onPress={() => setMode(m.id)}
          />
        ))}
      </TileGrid>
      <OptionRow
        icon="pin"
        control="none"
        title="Start at Fairway St"
        subtitle="Cummins Hwy, Mattapan · cover at least 3 crossings"
      />
    </FlowScreen>
  );
}
