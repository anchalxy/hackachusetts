import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { FlowHeader, FlowHeading, SectionLabel } from '@/components/challenge-flow/flow';
import { fullMoney, getBallotDraft, PROJECT_BY_ID, setBallotDraft } from '@/components/challenge-flow/spend-2-million/ballot';
import { BallotScreen } from '@/components/challenge-flow/spend-2-million/parts';
import { RankList } from '@/components/challenge-flow/spend-2-million/rank-list';
import { color, font, radius } from '@/ui/theme';

/** Step 2 of 2: rank the ballot by dragging, and say why the top pick matters. */
export default function ReviewBallot() {
  const [draft] = useState(getBallotDraft);
  const [order, setOrder] = useState(draft.ids);
  const [reason, setReason] = useState('');
  const [dragging, setDragging] = useState(false);
  const total = order.reduce((sum, id) => sum + PROJECT_BY_ID[id].amount, 0);

  const send = () => {
    setBallotDraft({ ...draft, ids: order, reason: reason.trim() });
    router.push('/flow/spend-2-million/sent');
  };

  return (
    <>
      <FlowHeader title="Review" step={2} of={2} />
      <BallotScreen
        scrollEnabled={!dragging}
        action={{ label: 'Send ballot', onPress: send, disabled: reason.trim().length === 0 }}>
        <FlowHeading
          title={`Your ${fullMoney(total)} ballot`}
          subtitle="Drag to rank. Your top pick counts most when ballots are compared."
        />
        <RankList order={order} onChange={setOrder} onDragChange={setDragging} />
        <SectionLabel>Why does your top pick matter?</SectionLabel>
        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="The corner stores near me don’t sell fresh produce, and the closest grocery store is two buses away."
          placeholderTextColor={color.mute}
          selectionColor={color.primary}
          style={styles.input}
          accessibilityLabel="Why does your top pick matter?"
        />
      </BallotScreen>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 84,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 21,
    color: color.ink,
    textAlignVertical: 'top',
  },
});
