// Shared by the app and scripts/agendas/track-updates.ts (run directly by Node), so no `@/` imports here.

/**
 * Where an update came from. "official" = the city answered residents directly (a reply to the
 * digest, a "what we heard" summary). "cityRecords" = we found it ourselves: docket status,
 * agendas, minutes, project pages.
 */
export type UpdateSource = 'official' | 'cityRecords';

export const SOURCE_LABEL: Record<UpdateSource, string> = {
  official: 'Official response',
  cityRecords: 'Found in city records',
};

/** One thing the city did after a challenge. Worded as a plain fact, never as a result of the user's work. */
export type ChallengeUpdate = {
  id: string;
  /** "Update: Docket #1804 was referred to committee." without the "Update:" prefix. */
  text: string;
  source: UpdateSource;
  /** Who published it ("Boston City Council", "Boston Public Works"). */
  publisher: string;
  url: string;
  /** When the city did it, YYYY-MM-DD. */
  date: string;
  /** When the weekly run found it, ISO. */
  foundAt: string;
};

export type TrackStatus =
  /** Still checking every week. */
  | 'open'
  /** Checked for TRACK_WEEKS weeks and found something. */
  | 'closed'
  /** Checked for TRACK_WEEKS weeks and found nothing. */
  | 'noUpdateFound';

export type TrackedChallenge = {
  challengeId: string;
  title: string;
  weekOf: string;
  /** What we check each week, for the "Watching" line. */
  watching: { label: string; url: string }[];
  status: TrackStatus;
  /** Distinct weeks checked so far (re-runs in the same week don't count twice). */
  weeksChecked: number;
  lastCheckedWeek: string;
  /** Set when status leaves "open". */
  closedAt?: string;
  /** Oldest first. */
  updates: ChallengeUpdate[];
};

export type ChallengeUpdatesFile = {
  checkedAt: string;
  challenges: Record<string, TrackedChallenge>;
};

/** Updates come slowly: keep a challenge open this many weekly checks before giving up. */
export const TRACK_WEEKS = 8;

/** Phrases that claim the user's work caused the city's action. The city rarely says why it acted. */
export const CAUSAL_CLAIM = /\b(because of|thanks to|in response to|as a result of|after (you|residents|users)|your (notes|input|feedback|digest|design|report))\b/i;
