import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { ResultRow } from '@/components/challenge-flow/flow';
import { COUNCIL_CHALLENGE_ID, LIVESTREAM_URL } from '@/components/challenge-flow/council-meeting';
import { CHECK_IN_DATE, FALLBACK_SPOT } from '@/components/challenge-flow/rat-patrol';
import type { StopProgress } from '@/lib/challenge-progress';
import type { Challenge } from '@/lib/challenges';
import { addToGoogleCalendar, eventWhen, useAddedToCalendar, type CalendarEvent } from '@/lib/google-calendar';
import { Button } from '@/ui/components';
import { useColors } from '@/ui/theme';

/**
 * Google Calendar for the week's challenges: the real meetings they point at
 * (data/challenges/demo-week.json, agendaItem) and the buttons that add them.
 */

export const CIVIC_EVENTS = {
  councilMeeting: {
    id: 'council-2026-10-28',
    title: 'Boston City Council meeting',
    start: '2026-10-28T12:00',
    end: '2026-10-28T15:00',
    location: 'Iannella Chamber, Boston City Hall, 5th floor, 1 City Hall Square, Boston, MA 02201',
    details: [
      'Regular meeting of the Boston City Council.',
      'Follow one docket from first mention to the vote, then send your notes by Fri, Oct 30.',
      `Livestream: ${LIVESTREAM_URL}`,
      'Agenda: https://www.boston.gov/departments/city-council',
    ].join('\n\n'),
  },
  draftingForum: {
    id: 'pb-drafting-forum-2026-11-05',
    title: 'Proposal Drafting Forum: Ideas in Action',
    start: '2026-11-05T17:30',
    end: '2026-11-05T19:30',
    location: '26 Court Street, Boston, MA 02108',
    details: [
      'Residents draft the official ballot for Boston’s $2 million participatory budget.',
      'https://www.boston.gov/departments/participatory-budgeting/proposal-development',
    ].join('\n\n'),
  },
  urbanWildsOpenHouse: {
    id: 'urban-wilds-open-house-2026-11-10',
    title: 'Urban Wilds Strategic Plan open house',
    start: '2026-11-10T18:00',
    end: '2026-11-10T20:00',
    location: 'Devine Golf Course Clubhouse, Franklin Park, Boston, MA',
    details: [
      'Boston Parks and Recreation’s open house for its first Urban Wilds Strategic Plan.',
      'https://www.boston.gov/departments/parks-and-recreation/urban-wilds-strategic-plan',
    ].join('\n\n'),
  },
} satisfies Record<string, CalendarEvent>;

/** Rat patrol's day-7 check-in, all day, at the spot that was reported (the Sent screen's data). */
export function ratCheckInEvent(report: Record<string, unknown>): CalendarEvent {
  const text = (key: string) => (typeof report[key] === 'string' ? (report[key] as string) : '');
  const street = text('street') || FALLBACK_SPOT.street;
  const ticket = text('ticket');
  return {
    id: `rat-check-in-${ticket || CHECK_IN_DATE}`,
    title: `Rat patrol check-in: ${street}`,
    start: CHECK_IN_DATE,
    location: [street, text('neighborhood'), 'Boston, MA'].filter(Boolean).join(', '),
    details: [
      'Go back to the spot and log what happened: no change, inspected, baited, or closed. +10 tea leaves.',
      ticket ? `311 case #${ticket}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}

/**
 * What a challenge's sheet offers to add: the meeting itself for the council challenge, the
 * day-7 check-in once rat patrol is reported, otherwise the due date as an all-day reminder.
 */
export function challengeEvent(
  challenge: Challenge,
  title: string,
  progress?: StopProgress,
): { label: string; event: CalendarEvent } {
  if (progress?.pendingCheckIn) return { label: 'Check-in', event: ratCheckInEvent(progress.data ?? {}) };
  if (challenge.id === COUNCIL_CHALLENGE_ID) return { label: 'Meeting', event: CIVIC_EVENTS.councilMeeting };
  return {
    label: 'Due',
    event: {
      id: `due-${challenge.id}`,
      title: `Due: ${title}`,
      start: challenge.deadlineDate,
      details: [challenge.summary, challenge.sourceUrl].join('\n\n'),
    },
  };
}

/** Small teal row button: "+ Add", then "✓ Added" (still tappable, to open it again). */
export function AddToCalendarButton({ event }: { event: CalendarEvent }) {
  const added = useAddedToCalendar(event.id);
  const color = useColors();
  return (
    <Button
      size="sm"
      label={added ? 'Added' : 'Add'}
      leading={
        <SymbolView name={added ? 'checkmark' : 'calendar.badge.plus'} size={14} weight="semibold" tintColor={color.onPrimary} />
      }
      onPress={() => addToGoogleCalendar(event).catch(() => {})}
      style={styles.button}
      accessibilityLabel={added ? `${event.title} is on Google Calendar. Open it again` : `Add ${event.title} to Google Calendar`}
    />
  );
}

/** Sent-screen row for what comes next: "Come to the open house · Tue, Nov 10 · 6–8 p.m." */
export function CalendarRow({ title, event, last }: { title: string; event: CalendarEvent; last?: boolean }) {
  const added = useAddedToCalendar(event.id);
  return (
    <ResultRow
      icon="calendar"
      title={title}
      subtitle={`${eventWhen(event)} · ${added ? 'on your Google Calendar' : 'add to Google Calendar'}`}
      last={last}
      trailing={<AddToCalendarButton event={event} />}
    />
  );
}

const styles = StyleSheet.create({
  // Tighter than the default icon gap: the label is one short word.
  button: {
    gap: 6,
    paddingHorizontal: 12,
  },
});
