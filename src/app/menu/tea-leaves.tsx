import { StyleSheet, View } from 'react-native';

import { Group, InfoRow, InnerPage, SectionLabel } from '@/components/menu/menu-ui';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, t } from '@/ui/theme';

// design/screens/menu/how-tea-leaves-work.png. Crate sizes come from tokens.points.
const { crateThresholds, thenEvery, leavesPerPoint } = t.points;
const STREAK_EXAMPLE_WEEK = 5;

export default function TeaLeavesPage() {
  return (
    <InnerPage
      icon="leafy"
      iconSize={50}
      title="How tea leaves work"
      intro={'Earn them by helping your city.\nSpend them at local spots.'}>
      <SectionLabel first>Earn leaves</SectionLabel>
      <Group padBottom>
        <InfoRow icon="camera" title="Report an issue" body={'Leaves land once the city approves it,\nnot when you submit.'} />
        <InfoRow icon="flag" title="Finish a challenge" body="Every weekly challenge pays out." />
        <InfoRow
          icon="flame"
          title="Keep a streak"
          body={`Bonus = ${leavesPerPoint} × your streak week.\nWeek ${STREAK_EXAMPLE_WEEK} gets +${leavesPerPoint * STREAK_EXAMPLE_WEEK} on top.`}
          last
        />
      </Group>

      <SectionLabel>Unlock rewards</SectionLabel>
      <Group style={styles.trackCard}>
        <Txt style={styles.trackIntro}>Your crate fills at these totals:</Txt>
        <RewardTrack />
        <View style={styles.resetNote}>
          <Txt style={styles.resetText}>Each full crate resets your counter to 0.</Txt>
        </View>
      </Group>

      <SectionLabel>Good to know</SectionLabel>
      <Group padBottom>
        <InfoRow icon="flame" title="Streaks are weekly" body={'Miss a week and your streak\nstarts over at week 1.'} />
        <InfoRow icon="stopwatch" title="Codes last 7 days" body={'Use a reward’s QR code within a\nweek of claiming it.'} />
        <InfoRow icon="leafy" title="Never below zero" body="Your balance can’t go negative." last />
      </Group>
    </InnerPage>
  );
}

/** 50 → 100 → 150 → +150 each after. The fixed steps are teal; the repeating one is neutral. */
function RewardTrack() {
  const steps = [
    ...crateThresholds.map((n) => ({ label: String(n), repeat: false })),
    { label: `+${thenEvery}`, repeat: true },
  ];
  return (
    <View style={styles.track} accessible accessibilityLabel={`Crates fill at ${crateThresholds.join(', ')}, then every ${thenEvery} leaves`}>
      <View style={styles.trackLine}>
        <View style={[styles.lineSegment, styles.lineFixed, { flex: crateThresholds.length - 1 }]} />
        <View style={[styles.lineSegment, styles.lineRepeat]} />
      </View>
      <View style={styles.trackSteps}>
        {steps.map((step) => (
          <View key={step.label} style={styles.step}>
            <View style={[styles.stepDot, step.repeat && styles.stepDotRepeat]}>
              <Icon name="gift" size={24} />
            </View>
            <Txt style={[styles.stepLabel, step.repeat && styles.stepLabelRepeat]}>{step.label}</Txt>
            {step.repeat ? <Txt style={styles.stepNote}>each after</Txt> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const DOT = 34;
const TRACK_INSET = 11; // dot centers sit 28px in from the card's inner edges

const styles = StyleSheet.create({
  trackCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  trackIntro: {
    fontFamily: font.body,
    fontSize: 13.5,
    lineHeight: 18,
    color: color.slate,
  },
  track: {
    marginTop: 23,
    height: 77,
  },
  trackLine: {
    position: 'absolute',
    top: DOT / 2 - 1.5,
    left: TRACK_INSET + DOT / 2,
    right: TRACK_INSET + DOT / 2,
    flexDirection: 'row',
  },
  lineSegment: {
    height: 3,
    borderRadius: 1.5,
  },
  lineFixed: {
    backgroundColor: color.primary,
  },
  lineRepeat: {
    flex: 1,
    backgroundColor: color.border,
  },
  trackSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: TRACK_INSET,
  },
  step: {
    width: DOT,
    alignItems: 'center',
  },
  stepDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: '#E6F0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotRepeat: {
    backgroundColor: color.tile,
  },
  stepLabel: {
    width: 80,
    textAlign: 'center',
    fontFamily: font.heading,
    fontSize: 16,
    lineHeight: 20,
    color: color.ink,
    marginTop: 7,
  },
  stepLabelRepeat: {
    color: color.slate,
  },
  stepNote: {
    width: 80,
    textAlign: 'center',
    fontFamily: font.body,
    fontSize: 11.5,
    lineHeight: 15,
    color: color.mute,
    marginTop: 1,
  },
  resetNote: {
    height: 34,
    borderRadius: 10,
    backgroundColor: color.panel,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginHorizontal: -4,
  },
  resetText: {
    fontFamily: font.bodySemibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: color.slate,
  },
});
