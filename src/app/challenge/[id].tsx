import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToCalendarButton, challengeEvent } from '@/components/challenge-flow/calendar';
import { CloseButton } from '@/components/challenge-flow/flow';
import { landmarkName, trailStop, type StopChip } from '@/constants/trail';
import { getChallenge, shortDate } from '@/lib/challenge-week';
import { useChallengeProgress } from '@/lib/challenge-progress';
import { eventWhen, useAddedToCalendar } from '@/lib/google-calendar';
import { Badge, Button, IconTile } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, radius, space, useColors, type Palette } from '@/ui/theme';

function chipColors(color: Palette): Record<StopChip['tone'], { bg: string; fg: string }> {
  return {
    leaf: color.badge.reward,
    due: color.badge.inReview,
    urgent: color.badge.urgent,
    plain: { bg: color.tile, fg: color.slate },
  };
}

/** The detail sheet after tapping a stop (design/screens/challenges/<flow>/0-sheet.png). */
export default function ChallengeSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const progress = useChallengeProgress();
  const styles = useStyles();
  const color = useColors();
  const CHIP_COLORS = chipColors(color);
  const challenge = getChallenge(id);
  const stop = trailStop(id);

  if (!challenge) {
    return (
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Txt variant="secondary">This challenge isn’t in this week’s set.</Txt>
      </View>
    );
  }

  // Generated weeks don't have hand-made stops yet, so build a plain version from the data.
  const title = stop?.title ?? challenge.title;
  const body = stop?.body ?? challenge.summary;
  const chips: StopChip[] = stop?.chips ?? [
    { label: `+${challenge.points * 10} tea leaves`, tone: 'leaf' },
    { label: `Due ${shortDate(challenge.deadlineDate)}`, tone: 'due' },
  ];
  const contact = challenge.contacts[0];
  const askedBy = stop?.askedBy ?? { name: contact?.name ?? contact?.office ?? '', office: contact?.name ? contact.office : '' };
  const sourceLabel = stop?.sourceLabel ?? new URL(challenge.sourceUrl).hostname.replace(/^www\./, '');
  const done = progress.stops[id];

  const start = () => {
    if (!stop) return WebBrowser.openBrowserAsync(challenge.sourceUrl);
    // Swap the sheet for the flow, so closing the flow lands on the trail.
    router.replace(done?.pendingCheckIn ? '/flow/rat-patrol/check-in' : stop.flow);
  };

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.head}>
        <IconTile icon={stop?.icon ?? 'doc'} size={64} />
        <View style={styles.headText}>
          {stop ? <Txt variant="meta">{landmarkName(stop.landmark)}</Txt> : null}
          <Txt variant="hero">{title}</Txt>
        </View>
        {/* Opened from a Profile notification or a link, there's nothing behind it: go to the trail. */}
        <CloseButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>

      <Txt variant="body" style={styles.body}>
        {body}
      </Txt>

      <View style={styles.chips}>
        {chips.map((chip) =>
          chip.tone === 'leaf' ? (
            <View key={chip.label} style={[styles.leafChip, { backgroundColor: CHIP_COLORS.leaf.bg }]}>
              <Icon name="leafySmall" size={14} />
              <Txt variant="badge" style={{ color: CHIP_COLORS.leaf.fg }}>
                {chip.label}
              </Txt>
            </View>
          ) : (
            <Badge key={chip.label} label={chip.label} {...CHIP_COLORS[chip.tone]} />
          ),
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.asked}>
        <IconTile icon="cityhall" />
        <View style={styles.headText}>
          <Txt variant="meta">Asked by</Txt>
          <Txt variant="rowLead" style={styles.askedName}>
            {askedBy.name}
          </Txt>
          {askedBy.office ? <Txt variant="secondary">{askedBy.office}</Txt> : null}
        </View>
      </View>

      {done && !done.pendingCheckIn ? null : <CalendarLine {...challengeEvent(challenge, title, done)} />}

      <Pressable
        onPress={() => WebBrowser.openBrowserAsync(challenge.sourceUrl)}
        accessibilityRole="link"
        style={({ pressed }) => [styles.source, pressed && styles.pressed]}>
        <Txt variant="secondary" style={styles.sourceLabel}>
          Source
        </Txt>
        <Txt variant="rowLead" numberOfLines={1} style={styles.sourceLink}>
          {sourceLabel}
        </Txt>
        <SymbolView name="chevron.right" size={12} weight="semibold" tintColor={color.primary} />
      </Pressable>

      {done && !done.pendingCheckIn ? (
        <View style={styles.doneRow}>
          <Badge label={`Done · +${done.leaves} tea leaves`} {...color.badge.reward} />
        </View>
      ) : (
        <Button label={done?.pendingCheckIn ? 'Do the day-7 check-in' : 'Start challenge'} onPress={start} />
      )}
    </View>
  );
}

/** "Meeting · Wed, Oct 28 · 12–3 p.m." or "Due · Sun, Nov 8", with Google Calendar's Add button. */
function CalendarLine({ label, event }: ReturnType<typeof challengeEvent>) {
  const added = useAddedToCalendar(event.id);
  const styles = useStyles();
  return (
    <View style={styles.asked}>
      <IconTile icon="calendar" />
      <View style={styles.headText}>
        <Txt variant="meta">{label}</Txt>
        <Txt variant="rowLead" style={styles.askedName}>
          {eventWhen(event)}
        </Txt>
        <Txt variant="secondary">{added ? 'On your Google Calendar' : 'Add it to Google Calendar'}</Txt>
      </View>
      <AddToCalendarButton event={event} />
    </View>
  );
}

const useStyles = makeStyles((color) => ({
  sheet: {
    paddingHorizontal: space.gutter,
    paddingTop: 28,
    gap: 14,
    backgroundColor: color.surface,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headText: {
    flex: 1,
    gap: 1,
  },
  body: {
    color: color.slate,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  leafChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: radius.badge,
  },
  divider: {
    height: 1,
    backgroundColor: color.border,
  },
  asked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  askedName: {
    fontSize: 14,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  sourceLabel: {
    fontFamily: font.bodyMedium,
  },
  sourceLink: {
    flex: 1,
    fontSize: 13.5,
    color: color.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  doneRow: {
    alignItems: 'center',
    paddingVertical: 14,
  },
}));
