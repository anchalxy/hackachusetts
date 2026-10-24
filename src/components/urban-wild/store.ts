import { useSyncExternalStore } from 'react';

import type { IconName } from '@/ui/icon';

/** The three urban wilds closest to the seed user (placeholder distances, see the challenges README). */
export type WildId = 'nira-rock' | 'allandale-woods' | 'dunbarton-woods';

export type Wild = {
  id: WildId;
  name: string;
  distance: string;
  blurb: string;
  /** Where the check-in and the map's entrance label put you. */
  entrance: string;
  /** The landmark drawn in the middle of the map. */
  feature: { kind: 'pond' | 'cliff'; label: string; short: string };
};

export const WILDS: Wild[] = [
  {
    id: 'nira-rock',
    name: 'Nira Rock',
    distance: '0.4 mi',
    blurb: 'An old quarry with a puddingstone cliff, meadow and orchard',
    entrance: 'Nira Ave entrance',
    feature: { kind: 'cliff', label: 'Puddingstone cliff', short: 'the cliff' },
  },
  {
    id: 'allandale-woods',
    name: 'Allandale Woods',
    distance: '1.1 mi',
    blurb: 'Oak, maple and pine woods around Rock Pond',
    entrance: 'Centre St entrance',
    feature: { kind: 'pond', label: 'Rock Pond', short: 'the pond' },
  },
  {
    id: 'dunbarton-woods',
    name: 'Dunbarton Woods',
    distance: '2.3 mi',
    blurb: 'A small upland forest and wildlife corridor',
    entrance: 'Dunbarton Rd entrance',
    feature: { kind: 'pond', label: 'Vernal pool', short: 'the pool' },
  },
];

export function getWild(id: WildId): Wild {
  return WILDS.find((w) => w.id === id) ?? WILDS[1];
}

export type ChangeKind = 'trail' | 'signs' | 'seating' | 'lighting' | 'cleanup' | 'entrance' | 'wild';

export const CHANGES: { kind: ChangeKind; label: string; icon: IconName; at: Point }[] = [
  { kind: 'trail', label: 'Trail', icon: 'route', at: { x: 0.36, y: 0.6 } },
  { kind: 'signs', label: 'Signs', icon: 'signpost', at: { x: 0.12, y: 0.74 } },
  { kind: 'seating', label: 'Seating', icon: 'bench', at: { x: 0.63, y: 0.32 } },
  { kind: 'lighting', label: 'Lighting', icon: 'streetlight', at: { x: 0.84, y: 0.48 } },
  { kind: 'cleanup', label: 'Cleanup', icon: 'trash', at: { x: 0.5, y: 0.82 } },
  { kind: 'entrance', label: 'Easy entrance', icon: 'wheelchair', at: { x: 0.22, y: 0.86 } },
  { kind: 'wild', label: 'Leave it wild', icon: 'tree', at: { x: 0.24, y: 0.3 } },
];

export const MAX_CHANGES = 5;

export function changeInfo(kind: ChangeKind) {
  return CHANGES.find((c) => c.kind === kind)!;
}

/** Position on the park map, 0–1 on each axis, so it survives any map size. */
export type Point = { x: number; y: number };
export type Placement = { kind: ChangeKind; at: Point };

export type PhotoSlot = 'entrance' | 'best' | 'worst';
/** A real photo, or `sample` when the user skipped (we show the illustration). */
export type Photo = { uri: string } | 'sample';

type State = {
  wild: WildId;
  photos: Partial<Record<PhotoSlot, Photo>>;
  placements: Placement[];
  why: string;
};

const INITIAL: State = { wild: 'allandale-woods', photos: {}, placements: [], why: '' };

// Draft for the open flow only; finished designs go to the progress store via SentScreen.
let state: State = INITIAL;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUrbanWild(): State {
  return useSyncExternalStore(subscribe, () => state);
}

export function getUrbanWild(): State {
  return state;
}

export function startDesign(wild: WildId) {
  if (wild !== state.wild) set({ ...INITIAL, wild });
}

export function setPhoto(slot: PhotoSlot, photo: Photo) {
  set({ photos: { ...state.photos, [slot]: photo } });
}

/** Places a change at its default spot, or removes it if it's already on the map. */
export function toggleChange(kind: ChangeKind) {
  if (state.placements.some((p) => p.kind === kind)) {
    set({ placements: state.placements.filter((p) => p.kind !== kind) });
  } else if (state.placements.length < MAX_CHANGES) {
    set({ placements: [...state.placements, { kind, at: changeInfo(kind).at }] });
  }
}

export function movePlacement(kind: ChangeKind, at: Point) {
  set({ placements: state.placements.map((p) => (p.kind === kind ? { ...p, at } : p)) });
}

export function setWhy(why: string) {
  set({ why });
}
