import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { FlowHeader, FlowScreen, SectionLabel, StepTimeline } from '@/components/challenge-flow/flow';
import { CROSSINGS, saveCrossing, type Obstacle } from '@/components/cummins-walk-audit/audit';
import { ObstacleGrid, WalkSignalTimer } from '@/components/cummins-walk-audit/parts';
import { TextLink } from '@/ui/components';

/** Walk audit 2 of 3: time the walk signal at one crossing and note what's in the way. */
export default function CrossingStep() {
  const { n } = useLocalSearchParams<{ n?: string }>();
  const index = Math.min(Math.max(Number(n ?? 1) - 1, 0), CROSSINGS.length - 1) || 0;
  const isLast = index === CROSSINGS.length - 1;
  const left = CROSSINGS.length - 1 - index;

  const [seconds, setSeconds] = useState<number | null>(null);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const next = (skipped: boolean) => {
    saveCrossing(index, {
      name: CROSSINGS[index],
      walkSeconds: skipped ? null : seconds,
      skipped,
      obstacles,
    });
    if (isLast) router.push('/flow/cummins-walk-audit/rate');
    else router.push({ pathname: '/flow/cummins-walk-audit/crossing', params: { n: String(index + 2) } });
  };

  const skip = () =>
    Alert.alert('Skip this crossing?', 'Use this if the walk signal isn’t working. We’ll tell Public Works it was out.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip crossing', style: 'destructive', onPress: () => next(true) },
    ]);

  return (
    <FlowScreen
      footnote={
        isLast ? 'Last crossing' : `${left} more crossing${left === 1 ? '' : 's'} after this one`
      }
      action={{
        label: isLast ? 'Rate it' : 'Next crossing',
        disabled: seconds == null,
        onPress: () => next(false),
      }}>
      <FlowHeader title={`Crossing ${index + 1}`} step={2} of={3} />
      <StepTimeline
        current={index}
        steps={CROSSINGS.map((name, i) => ({ label: name, date: i === index ? 'Now' : i < index ? 'Done' : '' }))}
      />
      <WalkSignalTimer onTimed={setSeconds} />
      <View style={styles.skip}>
        <TextLink label="Signal not working? Skip this crossing" onPress={skip} />
      </View>
      <SectionLabel>Anything in the way?</SectionLabel>
      <ObstacleGrid value={obstacles} onChange={setObstacles} />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  skip: {
    alignItems: 'flex-start',
    marginTop: -4,
    paddingHorizontal: 4,
  },
});
