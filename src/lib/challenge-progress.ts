import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { creditLeaves } from '@/lib/rewards';
import { t } from '@/ui/theme';

/** One finished (or half-finished, for rat patrol) stop on this week's trail. */
export type StopProgress = {
  /** Leaves earned so far for this stop. */
  leaves: number;
  at: number;
  /** Rat patrol: reported, waiting on the day-7 check-in. */
  pendingCheckIn?: boolean;
  /** Streak bonus paid with this stop (only the week's first stop pays it). */
  streakBonus?: number;
  /** Whatever the flow wants to remember (ballot, ticket number, picked wild…). */
  data?: Record<string, unknown>;
};

export type ChallengeProgress = {
  stops: Record<string, StopProgress>;
  /** Votes on other people's submissions this week (+2 each, max 10). */
  votes: number;
};

/** Seed user's streak before this week (DESIGN.md: "Your 5-week streak"). */
const STREAK_BEFORE_THIS_WEEK = 5;
export const VOTE_LEAVES = 2;
export const MAX_VOTES = 10;

const KEY = 'challengeProgress';
const EMPTY: ChallengeProgress = { stops: {}, votes: 0 };

let state: ChallengeProgress = load();
const listeners = new Set<() => void>();

function load(): ChallengeProgress {
  try {
    const raw = Storage.getItemSync(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function set(next: ChallengeProgress) {
  state = next;
  Storage.setItemSync(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getChallengeProgress(): ChallengeProgress {
  return state;
}

/** Live progress; re-renders when any flow finishes a stop. */
export function useChallengeProgress(): ChallengeProgress {
  return useSyncExternalStore(subscribe, getChallengeProgress);
}

/**
 * Records a stop and credits its leaves. Calling it again for the same stop adds `leaves`
 * on top (rat patrol pays 30 on the report and 10 at the check-in). The week's first stop also
 * pays the streak bonus: 10 × the streak week it keeps alive (DESIGN.md 6e).
 */
export function completeStop(
  challengeId: string,
  leaves: number,
  options: { pendingCheckIn?: boolean; data?: Record<string, unknown> } = {},
) {
  const prev = state.stops[challengeId];
  const firstThisWeek = Object.keys(state.stops).length === 0;
  const streakBonus = firstThisWeek ? t.points.leavesPerPoint * (STREAK_BEFORE_THIS_WEEK + 1) : 0;
  set({
    ...state,
    stops: {
      ...state.stops,
      [challengeId]: {
        leaves: (prev?.leaves ?? 0) + leaves,
        at: Date.now(),
        pendingCheckIn: options.pendingCheckIn,
        streakBonus: prev?.streakBonus ?? (streakBonus || undefined),
        data: { ...prev?.data, ...options.data },
      },
    },
  });
  creditLeaves(leaves + streakBonus);
}

/** Returns false once the weekly cap is hit. */
export function addVote(): boolean {
  if (state.votes >= MAX_VOTES) return false;
  set({ ...state, votes: state.votes + 1 });
  creditLeaves(VOTE_LEAVES);
  return true;
}

/** Starts the week over. Leaves already earned stay in the ledger (lib/rewards). */
export function resetChallengeProgress() {
  set(EMPTY);
}

export function isStopDone(progress: ChallengeProgress, challengeId: string): boolean {
  return challengeId in progress.stops;
}

/** One stop a week keeps the streak: 5 weeks until the first stop, then 6. */
export function streak(progress: ChallengeProgress): { weeks: number; safe: boolean } {
  const safe = Object.keys(progress.stops).length > 0;
  return { weeks: STREAK_BEFORE_THIS_WEEK + (safe ? 1 : 0), safe };
}
