import Storage from 'expo-sqlite/kv-store';

import { SEED_PROFILE, type Profile } from '@/constants/seed-profile';

export { areaLabel, areaSlug, neighborhoodLabel, SEED_PROFILE, type Profile } from '@/constants/seed-profile';

const KEY = 'profile';

export async function getProfile(): Promise<Profile> {
  const raw = await Storage.getItem(KEY);
  // Merge so profiles saved before a field existed still get its default.
  return raw ? { ...SEED_PROFILE, ...JSON.parse(raw) } : SEED_PROFILE;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await Storage.setItem(KEY, JSON.stringify(profile));
}

const USERNAME = /^[a-z0-9._]{3,20}$/;

/** What's wrong with an Edit profile form, or null when it can be saved. */
export function validateProfile(name: string, username: string): { name?: string; username?: string } | null {
  const errors: { name?: string; username?: string } = {};
  if (name.trim().length < 2) errors.name = 'Add your name.';
  else if (name.trim().length > 40) errors.name = 'Keep it under 40 characters.';
  if (!USERNAME.test(username)) {
    errors.username =
      username.length < 3 || username.length > 20
        ? 'Use 3 to 20 characters.'
        : 'Only lowercase letters, numbers, dots and underscores.';
  }
  return errors.name || errors.username ? errors : null;
}

/** Neighborhood can change once every 30 days (DESIGN.md 6b). */
export const NEIGHBORHOOD_LOCK_DAYS = 30;

/** When the neighborhood can next change, or null if it can change now. */
export function neighborhoodLockedUntil(profile: Pick<Profile, 'neighborhoodChangedAt'>, now = Date.now()): Date | null {
  if (!profile.neighborhoodChangedAt) return null;
  const until = profile.neighborhoodChangedAt + NEIGHBORHOOD_LOCK_DAYS * 24 * 60 * 60 * 1000;
  return until > now ? new Date(until) : null;
}

export const MIN_AGE = 13;
export const MAX_AGE = 100;

/** What's wrong with an age entry, or null when it can be saved. */
export function validateAge(text: string): string | null {
  if (!/^\d{1,3}$/.test(text.trim())) return 'Enter your age in years.';
  const age = Number(text);
  if (age < MIN_AGE) return `You need to be ${MIN_AGE} or older to use Tea Party.`;
  if (age > MAX_AGE) return 'Check that number.';
  return null;
}
