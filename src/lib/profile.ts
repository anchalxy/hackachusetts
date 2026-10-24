import Storage from 'expo-sqlite/kv-store';

import { SEED_PROFILE, type Profile } from '@/constants/seed-profile';

export { areaLabel, areaSlug, SEED_PROFILE, type Profile } from '@/constants/seed-profile';

const KEY = 'profile';

export async function getProfile(): Promise<Profile> {
  const raw = await Storage.getItem(KEY);
  return raw ? JSON.parse(raw) : SEED_PROFILE;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await Storage.setItem(KEY, JSON.stringify(profile));
}
