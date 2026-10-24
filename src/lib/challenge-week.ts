import demoWeek from '../../data/challenges/demo-week.json';

import type { Challenge, ChallengeWeek } from '@/lib/challenges';

/**
 * "demo" (default) shows exampleChallenges.md word for word without a network call.
 * "live" loads the latest generated week for the user's area from /api/challenges.
 * Set EXPO_PUBLIC_CHALLENGES_MODE in .env.
 */
const MODE = process.env.EXPO_PUBLIC_CHALLENGES_MODE === 'live' ? 'live' : 'demo';

let current = demoWeek as ChallengeWeek;

/** The last loaded week (the demo until `loadCurrentWeek` finishes). */
export function getCurrentWeek(): ChallengeWeek {
  return current;
}

export async function loadCurrentWeek(area: string): Promise<ChallengeWeek> {
  if (MODE === 'demo') return current;
  const response = await fetch(`/api/challenges?mode=live&area=${encodeURIComponent(area)}`);
  if (!response.ok) throw new Error(`Couldn't load challenges (${response.status})`);
  const { week } = (await response.json()) as { week: ChallengeWeek };
  current = week;
  return week;
}

export function getChallenge(id: string): Challenge | undefined {
  return current.challenges.find((c) => c.id === id);
}

/** Trail order: soonest deadline first, so the next stop is always the most urgent. */
export function trailOrder(week: ChallengeWeek): Challenge[] {
  return [...week.challenges].sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate) || a.number - b.number);
}

/** "2026-10-30" → "Fri, Oct 30". */
export function shortDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
