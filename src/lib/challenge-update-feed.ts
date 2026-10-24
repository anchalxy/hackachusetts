import updatesFile from '../../data/challenges/updates.json';

import { trailStop } from '@/constants/trail';
import type { ChallengeProgress } from '@/lib/challenge-progress';
import {
    SOURCE_LABEL,
    TRACK_WEEKS,
    type ChallengeUpdatesFile,
    type TrackedChallenge,
    type UpdateSource,
} from '@/lib/challenge-updates';
import type { IconName } from '@/ui/icon';

// Written weekly by scripts/agendas/track-updates.ts and bundled with the app.
const file = updatesFile as ChallengeUpdatesFile;

/** One row in the Profile's activity list about a challenge the user did. */
export type ChallengeUpdateItem = {
  id: string;
  challengeId: string;
  icon: IconName;
  /** "Update on Rat patrol:" */
  lead: string;
  /** The city's action, as a plain fact. */
  text: string;
  /** "Found in city records · Boston City Council", or the "no update" note. */
  detail: string;
  source?: UpdateSource;
  /** YYYY-MM-DD, for sorting and "2d". */
  date: string;
  url: string;
};

function shortTitle(tracked: TrackedChallenge): string {
  return trailStop(tracked.challengeId)?.title ?? tracked.title;
}

/**
 * Updates for challenges the user finished, newest first. Challenges that closed with nothing
 * after TRACK_WEEKS weeks get one honest "no update found" row instead.
 */
export function challengeUpdateFeed(progress: ChallengeProgress): ChallengeUpdateItem[] {
  const items: ChallengeUpdateItem[] = [];
  // Participation gate: only surface updates for challenges the user participated in — never show
  // updates for challenges the user didn't do. progress.stops holds exactly the challenges the user
  // completed, so iterating its keys is what enforces this. Keep this the single entry point.
  for (const id of Object.keys(progress.stops)) {
    const tracked = file.challenges[id];
    if (!tracked) continue;
    const icon = trailStop(id)?.icon ?? 'flag';
    const title = shortTitle(tracked);
    for (const update of tracked.updates) {
      items.push({
        id: update.id,
        challengeId: id,
        icon,
        lead: `Update on ${title}:`,
        text: update.text,
        detail: `${SOURCE_LABEL[update.source]} · ${update.publisher}`,
        source: update.source,
        date: update.date,
        url: update.url,
      });
    }
    if (tracked.status === 'noUpdateFound') {
      items.push({
        id: `${id}:none`,
        challengeId: id,
        icon,
        lead: `No update on ${title}`,
        text: '',
        detail: `We checked city records for ${TRACK_WEEKS} weeks`,
        date: (tracked.closedAt ?? file.checkedAt).slice(0, 10),
        url: tracked.watching[0]?.url ?? '',
      });
    }
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

/** "2026-10-21" → "3d" this week, else "Oct 21". */
export function updateAgo(date: string, now: number): string {
  const then = new Date(`${date}T12:00:00`).getTime();
  const days = Math.floor((now - then) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days < 7) return `${days}d`;
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
