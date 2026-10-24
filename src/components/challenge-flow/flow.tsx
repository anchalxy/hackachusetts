import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Piece } from '@/components/trail/piece';
import { NEXT_STOP_DUE, TRAIL_STOPS } from '@/constants/trail';
import {
  completeStop,
  getChallengeProgress,
  streak,
  useChallengeProgress,
} from '@/lib/challenge-progress';
import { useLeafBalance } from '@/lib/rewards';
import { Button, StatusGlyph } from '@/ui/components';
import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, radius, space } from '@/ui/theme';

/**
 * Native stack for one challenge flow (presented as a modal from the root layout).
 * Every flow's `_layout.tsx` is just `export default FlowStack`.
 */
export function FlowStack() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: color.bg },
        headerTitleStyle: { fontFamily: font.bodyBold, fontSize: 17, color: color.ink },
        headerTintColor: color.ink,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: color.bg },
      }}
    />
  );
}

/**
 * Sets the native header for a flow step: centered title, "1 of 3" on the right, and a close
 * button on the first step (later steps get the native back chevron). `step` is omitted on Sent.
 */
export function FlowHeader({
  title,
  step,
  of,
  close,
}: {
  title?: string;
  step?: number;
  of?: number;
  /** First step and Sent: close the whole flow instead of going back. */
  close?: boolean;
}) {
  return (
    <Stack.Screen
      options={{
        title: title ?? '',
        headerBackVisible: !close,
        // Sent screens close the flow; swiping back would reopen a form that's already sent.
        gestureEnabled: !close,
        headerLeft: close ? () => <CloseButton /> : undefined,
        headerRight: step ? () => <Txt variant="meta">{`${step} of ${of}`}</Txt> : undefined,
      }}
    />
  );
}

/** Round xmark. By default it closes the flow modal and lands back on the trail. */
export function CloseButton({ onPress = backToTrail }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel="Close" style={styles.close}>
      <SymbolView name="xmark" size={14} weight="semibold" tintColor={color.slate} />
    </Pressable>
  );
}

export function backToTrail() {
  router.dismissTo('/');
}

/** Scrollable step body with the full-width action pinned to the bottom. */
export function FlowScreen({
  children,
  action,
  footnote,
}: {
  children: ReactNode;
  action?: { label: string; onPress: () => void; disabled?: boolean };
  /** Small centered text above the button ("2 more crossings after this one"). */
  footnote?: string;
}) {
  const insets = useSafeAreaInsets();
  // Keeps the bottom button above the keyboard on steps with text fields.
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
      {action || footnote ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {footnote ? (
            <Txt variant="meta" style={styles.footnote}>
              {footnote}
            </Txt>
          ) : null}
          {action ? <Button label={action.label} onPress={action.onPress} disabled={action.disabled} /> : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** "What did you find?" + one or two lines of slate under it. */
export function FlowHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <Txt variant="hero" style={styles.headingTitle}>
        {title}
      </Txt>
      {subtitle ? <Txt variant="secondary">{subtitle}</Txt> : null}
    </View>
  );
}

/** Small caps label above a group ("ANYTHING IN THE WAY?"). */
export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Txt variant="meta" style={styles.sectionLabel}>
        {children.toUpperCase()}
      </Txt>
      {right}
    </View>
  );
}

export function selectionHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

/** Teal check in a circle: the selected mark on tiles and radio rows. */
export function CheckDot({ size = 22 }: { size?: number }) {
  return (
    <View style={[styles.checkDot, { width: size, height: size, borderRadius: size / 2 }]}>
      <StatusGlyph status="fixed" size={size * 0.55} />
    </View>
  );
}

export function RadioMark({ selected }: { selected: boolean }) {
  return selected ? <CheckDot /> : <View style={styles.radioOpen} />;
}

/** 2-column grid of ChoiceTiles. */
export function TileGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/** Big square choice: icon tile, bold label, check in the corner when picked. */
export function ChoiceTile({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.tile, selected && [styles.selected, styles.tileSelected], pressed && styles.pressed]}>
      <View style={styles.tileIcon}>
        <Icon name={icon} size={30} />
      </View>
      <Txt variant="rowLead" style={styles.tileLabel}>
        {label}
      </Txt>
      {selected ? (
        <View style={styles.tileCheck}>
          <CheckDot />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * A white card row: optional icon tile, title + subtitle, and a radio on the right
 * (`control="radio"`), a radio on the left (`control="leading"`), or a custom trailing element.
 */
export function OptionRow({
  icon,
  title,
  subtitle,
  selected = false,
  onPress,
  control = 'radio',
  trailing,
}: {
  icon?: IconName;
  title: ReactNode;
  subtitle?: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  control?: 'radio' | 'leading' | 'none';
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              selectionHaptic();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.option, selected && [styles.selected, styles.optionSelected], pressed && styles.pressed]}>
      {control === 'leading' ? <RadioMark selected={selected} /> : null}
      {icon ? (
        <View style={styles.optionIcon}>
          <Icon name={icon} size={28} />
        </View>
      ) : null}
      <View style={styles.optionText}>
        {typeof title === 'string' ? <Txt variant="rowLead">{title}</Txt> : title}
        {typeof subtitle === 'string' ? <Txt variant="secondary">{subtitle}</Txt> : subtitle}
      </View>
      {trailing}
      {control === 'radio' ? <RadioMark selected={selected} /> : null}
    </Pressable>
  );
}

/** Soft panel with an icon: "We'll time the city's response", "Photos stay in your design"… */
export function InfoPanel({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={styles.infoPanel}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={26} />
      </View>
      <View style={styles.optionText}>
        <Txt variant="rowLead" style={styles.infoTitle}>
          {title}
        </Txt>
        <Txt variant="secondary">{body}</Txt>
      </View>
    </View>
  );
}

/**
 * "What happens next" dot timeline in a white card: steps before `current` are checked,
 * `current` gets an open ring, the rest are empty.
 */
export function StepTimeline({ steps, current }: { steps: { label: string; date: string }[]; current: number }) {
  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineTrack}>
        {steps.map((step, i) => (
          <View key={step.label} style={styles.timelineStep}>
            {i > 0 && <View style={[styles.timelineLine, styles.lineLeft, i <= current && styles.lineDone]} />}
            {i < steps.length - 1 && <View style={[styles.timelineLine, styles.lineRight, i < current && styles.lineDone]} />}
            {i < current ? (
              <CheckDot size={22} />
            ) : (
              <View style={[styles.dotOpen, i === current && styles.dotCurrent]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.timelineLabels}>
        {steps.map((step, i) => (
          <View key={step.label} style={styles.timelineLabel}>
            <Txt
              variant="badge"
              style={[styles.timelineText, { color: i <= current ? color.ink : color.slate }, i <= current && styles.bold]}>
              {step.label}
            </Txt>
            <Txt variant="meta" style={styles.timelineText}>
              {step.date}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A row on the Sent screen: icon tile, title + subtitle, optional trailing button. */
export function ResultRow({
  icon,
  title,
  subtitle,
  leaf,
  trailing,
  last,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  /** Green title, for tea leaves. */
  leaf?: boolean;
  trailing?: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={styles.resultRow}>
      <View style={styles.resultIcon}>
        <Icon name={icon} size={28} />
      </View>
      <View style={[styles.resultBody, !last && styles.resultDivider]}>
        <View style={styles.optionText}>
          <Txt variant="rowLead" style={[styles.resultTitle, leaf && styles.leafText]}>
            {title}
          </Txt>
          <Txt variant="secondary">{subtitle}</Txt>
        </View>
        {trailing}
      </View>
    </View>
  );
}

/**
 * The shared "Your X is in" screen: the stop's piece with a check, what happens next, the
 * leaves earned and the streak. Credits the stop once, when it first renders.
 */
export function SentScreen({
  challengeId,
  title,
  body,
  steps,
  current = 1,
  leaves,
  pendingCheckIn,
  data,
  leavesSubtitle,
  extraRows,
  link,
}: {
  challengeId: string;
  title: string;
  body: string;
  steps: { label: string; date: string }[];
  /** Index of the step the city is on now (default: the one after "Sent"). */
  current?: number;
  /** Leaves credited now. Defaults to the stop's full value. */
  leaves?: number;
  pendingCheckIn?: boolean;
  data?: Record<string, unknown>;
  /** Overrides "Your balance is …" (rat patrol: "+10 more at your 7-day check-in"). */
  leavesSubtitle?: string;
  /** Extra rows under the streak (e.g. "Vote on other designs"). */
  extraRows?: ReactNode;
  /** Teal text link under the rows ("Preview the day-7 check-in"). */
  link?: { label: string; onPress: () => void };
}) {
  const stop = TRAIL_STOPS[challengeId];
  const earned = leaves ?? stop?.leaves ?? 0;

  // Credit after render (writing the store mid-render would update the trail screen while this one
  // renders), and only if the stop isn't recorded yet, so remounts and StrictMode don't double-pay.
  useEffect(() => {
    if (challengeId in getChallengeProgress().stops) return;
    completeStop(challengeId, earned, { pendingCheckIn, data });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Runs once per Sent screen; later prop changes shouldn't credit again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useChallengeProgress();
  const balance = useLeafBalance();
  const summary = { balance, weeks: streak(progress).weeks };

  return (
    <FlowScreen action={{ label: 'Back to the trail', onPress: backToTrail }}>
      <FlowHeader close />
      <View style={styles.sentHero}>
        <View style={styles.glow} />
        {stop ? <Piece file={stop.landmark} width={150} /> : null}
        <View style={styles.sentCheck}>
          <View style={styles.sentCheckInner}>
            <StatusGlyph status="fixed" size={26} />
          </View>
        </View>
      </View>
      <Txt variant="display" style={styles.center}>
        {title}
      </Txt>
      <Txt variant="secondary" style={[styles.center, styles.sentBody]}>
        {body}
      </Txt>
      <StepTimeline steps={steps} current={current} />
      <View style={styles.resultList}>
        <ResultRow
          icon="leafy"
          leaf
          title={`+${earned} tea leaves`}
          subtitle={leavesSubtitle ?? `Your balance is ${summary.balance.toLocaleString()}`}
        />
        <ResultRow
          icon="flame"
          title={`Streak safe: ${summary.weeks} weeks`}
          subtitle={`Your next stop is due by ${NEXT_STOP_DUE}`}
          last={!extraRows}
        />
        {extraRows}
      </View>
      {link ? (
        <Pressable onPress={link.onPress} hitSlop={8} style={styles.link}>
          <Txt variant="rowLead" style={styles.linkText}>
            {link.label}
          </Txt>
        </Pressable>
      ) : null}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingHorizontal: space.gutter,
    paddingTop: 8,
    paddingBottom: 24,
    gap: space.cardGap,
  },
  footer: {
    paddingHorizontal: space.gutter,
    paddingTop: 10,
    gap: 10,
    backgroundColor: color.bg,
  },
  footnote: {
    textAlign: 'center',
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.tile,
  },
  heading: {
    gap: 4,
    marginBottom: 4,
  },
  headingTitle: {
    fontSize: 22,
    lineHeight: 27,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: font.bodySemibold,
    letterSpacing: 0.4,
    color: color.slate,
  },
  checkDot: {
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOpen: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C9CED6',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 104,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.border,
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.tile,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  tileCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  selected: {
    borderWidth: 2,
    borderColor: color.primary,
  },
  tileSelected: {
    padding: 13,
  },
  optionSelected: {
    padding: 13,
  },
  pressed: {
    opacity: 0.8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.border,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.tile,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  infoPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.panel,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.tile,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 14,
  },
  timelineCard: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  timelineTrack: {
    flexDirection: 'row',
  },
  timelineStep: {
    flex: 1,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    position: 'absolute',
    top: 10,
    height: 2,
    backgroundColor: '#E7DCC6',
  },
  lineLeft: {
    left: 0,
    right: '50%',
  },
  lineRight: {
    left: '50%',
    right: 0,
  },
  lineDone: {
    backgroundColor: color.primary,
  },
  dotOpen: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D5DADF',
    backgroundColor: color.surface,
  },
  dotCurrent: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderColor: color.primary,
    boxShadow: '0 0 0 4px #E3EFEC',
  },
  timelineLabels: {
    flexDirection: 'row',
    marginTop: 8,
  },
  timelineLabel: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 2,
  },
  timelineText: {
    textAlign: 'center',
    fontSize: 12,
  },
  bold: {
    fontFamily: font.bodyBold,
  },
  resultList: {
    marginTop: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.tile,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBody: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  resultTitle: {
    fontSize: 14,
  },
  leafText: {
    color: color.leaf.dark,
  },
  sentHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FBEFD2',
    opacity: 0.7,
    filter: 'blur(24px)',
  },
  sentCheck: {
    position: 'absolute',
    top: 24,
    right: '26%',
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 4,
    backgroundColor: '#E9C46A',
  },
  sentCheckInner: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: color.surface,
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  sentBody: {
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  linkText: {
    color: color.primary,
    fontSize: 14,
  },
});
