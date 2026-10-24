import type { IconName } from '@/ui/icon';

/** Walk-audit Cummins Highway: one in-progress audit, shared by the flow's screens. */
export const CHALLENGE_ID = 'demo-cummins-walk-audit';

export type Mode = 'walking' | 'stroller' | 'wheelchair' | 'bike';

export const MODES: { id: Mode; label: string; icon: IconName; rateQuestion: string }[] = [
  { id: 'walking', label: 'Walking', icon: 'walk', rateQuestion: 'How does it work on foot?' },
  { id: 'stroller', label: 'Stroller', icon: 'stroller', rateQuestion: 'How does it work with a stroller?' },
  {
    id: 'wheelchair',
    label: 'Wheelchair or mobility aid',
    icon: 'wheelchair',
    rateQuestion: 'How does it work with a wheelchair or mobility aid?',
  },
  { id: 'bike', label: 'Bike', icon: 'bike', rateQuestion: 'How does it work on a bike?' },
];

/** The two later crossings are placeholders until Public Works names them (README). */
export const CROSSINGS = ['Fairway St', 'Crossing 2', 'Crossing 3'] as const;

export type Obstacle = 'parkedCar' | 'construction' | 'puddle' | 'nothing';

export const OBSTACLES: { id: Obstacle; label: string }[] = [
  { id: 'parkedCar', label: 'Parked car' },
  { id: 'construction', label: 'Construction' },
  { id: 'puddle', label: 'Puddle or ice' },
  { id: 'nothing', label: 'Nothing' },
];

export type CrossingResult = {
  name: string;
  /** Walk-signal length in seconds, or null when the signal wasn't working and it was skipped. */
  walkSeconds: number | null;
  skipped: boolean;
  obstacles: Obstacle[];
};

export type RatingKey = 'sidewalk' | 'crossing' | 'busStop' | 'lighting';

export const RATINGS: { id: RatingKey; label: string; icon: IconName }[] = [
  { id: 'sidewalk', label: 'Sidewalk condition', icon: 'sidewalk' },
  { id: 'crossing', label: 'Crossing safety', icon: 'crosswalk' },
  { id: 'busStop', label: 'Bus stop access', icon: 'bus' },
  { id: 'lighting', label: 'Lighting', icon: 'streetlight' },
];

export type AuditPhotos = { best: string | null; worst: string | null };

type Draft = {
  mode: Mode | null;
  crossings: (CrossingResult | undefined)[];
  ratings: Partial<Record<RatingKey, number>>;
  photos: AuditPhotos;
};

const draft: Draft = { mode: null, crossings: [], ratings: {}, photos: { best: null, worst: null } };

export function startAudit(mode: Mode) {
  draft.mode = mode;
  draft.crossings = [];
  draft.ratings = {};
  draft.photos = { best: null, worst: null };
}

export function auditMode(): Mode {
  return draft.mode ?? 'walking';
}

export function saveCrossing(index: number, result: CrossingResult) {
  draft.crossings[index] = result;
}

export function auditCrossings(): CrossingResult[] {
  return draft.crossings.filter((c): c is CrossingResult => !!c);
}

export function saveRatings(ratings: Partial<Record<RatingKey, number>>, photos: AuditPhotos) {
  draft.ratings = ratings;
  draft.photos = photos;
}

/** What Public Works gets (stored with the stop as `data`). */
export function auditSummary() {
  return {
    mode: auditMode(),
    crossings: auditCrossings(),
    ratings: draft.ratings,
    photos: draft.photos,
  };
}

export function formatSeconds(seconds: number) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
