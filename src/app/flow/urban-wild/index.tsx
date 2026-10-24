import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { FlowHeader, FlowHeading, FlowScreen, OptionRow } from '@/components/challenge-flow/flow';
import { getUrbanWild, startDesign, WILDS, type WildId } from '@/components/urban-wild/store';
import { Txt } from '@/ui/text';
import { font, makeStyles, radius } from '@/ui/theme';

const STEPS = ['Visit and take 3 photos', 'Place up to 5 changes on a map', 'Say why you’d make each change'];

/** Urban wild 1 of 3: pick one of the three closest wilds. */
export default function PickWild() {
  const styles = useStyles();
  const [picked, setPicked] = useState<WildId>(() => getUrbanWild().wild);
  const wild = WILDS.find((w) => w.id === picked)!;

  return (
    <FlowScreen
      action={{
        label: `I’m going to ${wild.name}`,
        onPress: () => {
          startDesign(picked);
          router.push('/flow/urban-wild/visit');
        },
      }}>
      <FlowHeader title="Urban wild" step={1} of={3} close />
      <FlowHeading
        title="Pick a wild near you"
        subtitle="Parks looks after 31 urban wilds. These are the three closest to you."
      />
      {WILDS.map((w) => (
        <OptionRow
          key={w.id}
          icon="tree"
          title={w.name}
          subtitle={`${w.distance} · ${w.blurb}`}
          selected={picked === w.id}
          onPress={() => setPicked(w.id)}
        />
      ))}
      <View style={styles.panel}>
        <Txt variant="meta" style={styles.label}>
          WHAT YOU’LL DO
        </Txt>
        {STEPS.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={styles.number}>
              <Txt variant="badge" style={styles.numberText}>
                {i + 1}
              </Txt>
            </View>
            <Txt variant="row">{step}</Txt>
          </View>
        ))}
      </View>
    </FlowScreen>
  );
}

const useStyles = makeStyles((color) => ({
  panel: {
    marginTop: 4,
    padding: 16,
    gap: 12,
    borderRadius: 16,
    backgroundColor: color.panel,
  },
  label: {
    fontFamily: font.bodySemibold,
    letterSpacing: 0.4,
    color: color.slate,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  number: {
    width: 24,
    height: 24,
    borderRadius: radius.badge,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: color.slate,
  },
}));
