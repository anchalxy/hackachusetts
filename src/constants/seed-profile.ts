// Dependency-free so scripts/agendas (plain Node) can import it too.
import type { BostonNeighborhood, City } from './areas.ts';

export type Profile = {
  name: string;
  username: string;
  city: City;
  /** Boston only; the other cities are treated as one area each for now. */
  neighborhood: BostonNeighborhood | null;
  /** Used for dynamic rewards (Plan.md: boosts by neighborhood and age). */
  age: number;
  /** Tea leaves (the in-app currency). Mocked until points are built. */
  leaves: number;
  /** Lifetime counts for the profile header. Mocked until reports and challenges are tracked. */
  reportCount: number;
  challengeCount: number;
};

/** The demo user until we have sign-up: Ishaan from the design handoff (design/DESIGN.md §6). */
export const SEED_PROFILE: Profile = {
  name: 'Ishaan Tewari',
  username: 'ishaan.t',
  city: 'Cambridge',
  neighborhood: null,
  age: 20,
  leaves: 1240,
  reportCount: 12,
  challengeCount: 9,
};

/** "Allston, Boston" or just "Cambridge". */
export function areaLabel(profile: Pick<Profile, 'city' | 'neighborhood'>): string {
  return profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city;
}

/** "boston-allston" / "cambridge": file names and API keys for an area. */
export function areaSlug(profile: Pick<Profile, 'city' | 'neighborhood'>): string {
  return [profile.city, profile.neighborhood]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}
