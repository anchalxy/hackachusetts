import { useState } from 'react';

import { SentScreen } from '@/components/challenge-flow/flow';
import { auditSummary, CHALLENGE_ID } from '@/components/cummins-walk-audit/audit';

/** Sent: credits the Paul Revere House stop with the audit attached. */
export default function Sent() {
  const [data] = useState(auditSummary);

  return (
    <SentScreen
      challengeId={CHALLENGE_ID}
      title="Your audit is in"
      body="Public Works gets scores by mode, crossing times and a map of problem spots."
      steps={[
        { label: 'Sent', date: 'Today' },
        { label: 'Checked', date: 'Photos + timings' },
        { label: 'Public Works', date: 'Nov 2' },
        { label: 'Team reviews', date: 'November' },
      ]}
      data={data}
    />
  );
}
