/**
 * Step 5 helper: a DETERMINISTIC, PSEUDONYMIZED cohort of citizen submissions per challenge.
 *
 * This stands in for the real app's submission store during the demo. Everything here is
 * seeded off challenge.id, so the same challenge always yields the same cohort across runs
 * (stable resident ids, neighborhoods, age buckets and payloads). Nothing is random at call
 * time; re-running send-digests produces byte-identical reports.
 *
 * Cohorts are sized like a real citywide push (hundreds to ~1,200 per challenge, scaled by
 * challenge type) and the generators carry believable structure — e.g. wheelchair users rate
 * crossings lower, some neighborhoods wait longer on 311, age groups fund different budget
 * projects — so the reports have real patterns to surface. The report code never knows about
 * these tilts; it finds them from the data like it would with live submissions.
 *
 * PRIVACY — the single hard rule of this file:
 *   A submission keeps ONLY a stable hashed resident id (sha256(residentKey + challengeId),
 *   sliced), a neighborhood, and an age bucket. We NEVER store names, emails, or raw ages.
 *   The hashed id is one-way and challenge-scoped, so the same person is uncorrelatable across
 *   challenges and nothing here can be reversed into an identity.
 *
 * No `@/` imports: this is imported by plain-Node pipeline scripts.
 */
import { createHash } from 'node:crypto';

import { BOSTON_NEIGHBORHOODS } from '../../src/constants/areas.ts';
import type { Challenge, ChallengeType } from '../../src/lib/challenges.ts';

/** The only age granularity we ever keep. Raw ages are never stored. */
export const AGE_BUCKETS = ['18–24', '25–34', '35–44', '45–64', '65+'] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

/** What every submission carries, regardless of challenge type. No PII, ever. */
export type SubmissionBase = {
  /** sha256(residentKey + challengeId) sliced. One-way, challenge-scoped. */
  residentId: string;
  neighborhood: string;
  ageBucket: AgeBucket;
  /** A short free-text note. Never contains identifying details. */
  comment: string;
};

// ---- Shared reference data (the report reads labels from here) --------------

export const PB_PROJECTS = [
  { id: 'fresh-food-access', label: 'Neighborhood Fresh Food Access', dollars: 500_000 },
  { id: 'immigrant-legal-defense', label: 'Immigrant Legal Defense Fund', dollars: 400_000 },
  { id: 'trades-workforce-training', label: 'Workforce Training in the Trades', dollars: 300_000 },
  { id: 'youth-financial-literacy', label: 'Youth Financial Literacy', dollars: 250_000 },
  { id: 'small-business-development', label: 'Small Business Development', dollars: 250_000 },
  { id: 'community-litter-reduction', label: 'Community Litter Reduction', dollars: 200_000 },
  { id: 'green-my-block', label: 'Green My Block', dollars: 100_000 },
] as const;
export type PbProjectId = (typeof PB_PROJECTS)[number]['id'];

export type WalkMode = 'walking' | 'bike' | 'stroller' | 'wheelchair';
export const WALK_MODES: readonly WalkMode[] = ['walking', 'bike', 'stroller', 'wheelchair'];
export const CUMMINS_MEASURES = ['sidewalk', 'crossing', 'busStop', 'lighting'] as const;
export type CumminsMeasure = (typeof CUMMINS_MEASURES)[number];
/** In corridor order, starting at the walkthrough's meeting point. */
export const CROSSINGS = ['Fairway St', 'Rockdale St', 'Harmon St', 'Itasca St', 'Woodhaven St'] as const;
export const CUMMINS_ISSUES = [
  'Missing or broken curb ramp',
  'Car parked on sidewalk or crosswalk',
  'Uneven or cracked pavement',
  'Construction signs or barriers in path',
  'No clear landing area at bus stop',
  'Standing water at crossing',
  'Overgrown vegetation',
] as const;
export type CumminsIssue = (typeof CUMMINS_ISSUES)[number];

export const COUNCIL_DOCKETS = [
  { id: '#1958', label: 'Bad Landlords List ordinance' },
  { id: '#1968', label: 'MBTA GM summons on Blue Hill Ave bus lanes' },
] as const;
export type CouncilDocket = (typeof COUNCIL_DOCKETS)[number]['id'];
export const COUNCIL_OUTCOMES = ['referred to committee', 'passed', 'amended', 'tabled'] as const;
export type CouncilOutcome = (typeof COUNCIL_OUTCOMES)[number];
export type CouncilLean = 'support' | 'mixed' | 'oppose';

export const URBAN_WILDS = ['Chandler Pond', 'Allandale Woods', 'Roslindale Wetlands', 'Sherrin Woods'] as const;
export type UrbanWild = (typeof URBAN_WILDS)[number];
export const WILD_CHANGES = ['cleanup', 'signage', 'trail', 'entrance', 'lighting', 'seating', 'wild'] as const;
export type WildChange = (typeof WILD_CHANGES)[number];
export const WILD_CHANGE_LABELS: Record<WildChange, string> = {
  cleanup: 'Litter and dumping cleanup',
  signage: 'Signage and wayfinding',
  trail: 'Trail repair',
  entrance: 'Accessible entrance',
  lighting: 'Lighting',
  seating: 'Seating',
  wild: 'Leave it wild',
};

export const RAT_SIGNS = ['Overflowing or open trash', 'Burrows', 'Droppings', 'Live rat sighting'] as const;
export type RatSign = (typeof RAT_SIGNS)[number];
export const RAT_OUTCOMES = ['baited', 'inspected', 'closed, no visible action', 'still open, no change'] as const;
export type RatOutcome = (typeof RAT_OUTCOMES)[number];

/** What the 1–5 question means for challenges without a dedicated instrument. */
export function genericRatingLabel(type: ChallengeType): string {
  switch (type) {
    case 'design':
      return 'Support for the proposal';
    case 'service-test':
      return 'Overall experience';
    case 'meeting':
      return 'Clarity and transparency';
    case '311-test':
      return 'Satisfaction with the response';
    default:
      return 'Overall rating';
  }
}

// ---- Per-type payloads -------------------------------------------------------

/** demo-pb-2-million: a full priority ranking, the projects funded, and the one ranked last. */
export type PbSubmission = SubmissionBase & {
  kind: 'pb';
  /** Every project, most important first. */
  ranking: PbProjectId[];
  /** The projects actually funded on the ballot (a top slice of the ranking). */
  ballot: { projectId: PbProjectId; dollars: number }[];
  /** The project ranked last: the first thing this resident would cut. */
  firstCut: PbProjectId;
};

/** demo-cummins-walk-audit: travel mode, 1–5 ratings, per-crossing walk-signal seconds, obstructions. */
export type CumminsSubmission = SubmissionBase & {
  kind: 'cummins';
  mode: WalkMode;
  ratings: Record<CumminsMeasure, number>;
  crossingSeconds: { crossing: string; seconds: number }[];
  issues: CumminsIssue[];
};

/** demo-council-oct-28: the docket followed, what happened, where the resident lands. */
export type CouncilSubmission = SubmissionBase & {
  kind: 'council';
  docket: CouncilDocket;
  outcome: CouncilOutcome;
  lean: CouncilLean;
  attended: 'in person' | 'livestream';
  concern: string;
};

/** demo-urban-wild: the wild they visited, up to 5 requested changes, who it's for. */
export type UrbanWildSubmission = SubmissionBase & {
  kind: 'urbanWild';
  wild: UrbanWild;
  changes: WildChange[];
  whoFor: string;
};

/** demo-rat-patrol: what they saw, how long 311 took, what happened after 7 days. */
export type RatPatrolSubmission = SubmissionBase & {
  kind: 'ratPatrol';
  hotspot: string;
  sign: RatSign;
  responseHours: number;
  outcome: RatOutcome;
  closedWithVisibleAction: boolean;
};

/** Any other challenge: a 1–5 rating plus one or two coded themes from the notes. */
export type GenericSubmission = SubmissionBase & {
  kind: 'generic';
  rating: number;
  themes: string[];
};

export type Submission =
  | PbSubmission
  | CumminsSubmission
  | CouncilSubmission
  | UrbanWildSubmission
  | RatPatrolSubmission
  | GenericSubmission;

export type Cohort = {
  challengeId: string;
  submissions: Submission[];
};

// ---- Deterministic seeded PRNG ----------------------------------------------

/** 32-bit hash of a string → a seed. Pure, no crypto needed for the PRNG seed. */
function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: a tiny deterministic PRNG. Same seed → same sequence, every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];
const intBetween = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Standard normal via Box–Muller, driven by the seeded PRNG. */
function gaussian(rng: Rng): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Weighted pick from [item, weight] pairs. */
function weighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

/** Stable, one-way, challenge-scoped resident id. This is the ONLY identifier we keep. */
function residentId(residentKey: string, challengeId: string): string {
  return createHash('sha256').update(`${residentKey}:${challengeId}`).digest('hex').slice(0, 12);
}

// ---- Who takes part ---------------------------------------------------------

/** Cohort size by challenge type: online tasks draw more people than in-person meetings. */
const COHORT_RANGE: Record<ChallengeType, [number, number]> = {
  budget: [780, 1240],
  design: [310, 620],
  'service-test': [260, 540],
  meeting: [170, 360],
  '311-test': [340, 680],
};

/** Rough relative size of each neighborhood, so the citywide spread isn't uniform. */
const NEIGHBORHOOD_WEIGHT: Partial<Record<(typeof BOSTON_NEIGHBORHOODS)[number], number>> = {
  Dorchester: 4,
  'Jamaica Plain': 2.2,
  Roxbury: 2.2,
  'East Boston': 2,
  Brighton: 2,
  'South Boston': 1.8,
  'South End': 1.5,
  'Hyde Park': 1.5,
  Roslindale: 1.5,
  'West Roxbury': 1.4,
  Mattapan: 1.3,
  Allston: 1.3,
  Fenway: 1.3,
  'Back Bay': 1.2,
  Charlestown: 1.1,
  'Mission Hill': 0.8,
  'Beacon Hill': 0.7,
  'North End': 0.6,
  'South Boston Waterfront': 0.6,
  Chinatown: 0.5,
  Downtown: 0.4,
  'West End': 0.4,
  'Bay Village': 0.15,
  Longwood: 0.15,
  'Leather District': 0.1,
};
const HOOD_TABLE = BOSTON_NEIGHBORHOODS.map((n) => [n as string, NEIGHBORHOOD_WEIGHT[n] ?? 1] as const);

/** Leans local (~38% from the challenge's home neighborhood), the rest weighted citywide. */
function neighborhoodFor(rng: Rng, home: string): string {
  if (rng() < 0.38) return home;
  return weighted(rng, HOOD_TABLE);
}

/** Age buckets skew young (the app's audience) but cover the whole range. */
function ageBucketFor(rng: Rng): AgeBucket {
  return weighted(rng, [
    ['18–24', 0.31],
    ['25–34', 0.32],
    ['35–44', 0.17],
    ['45–64', 0.13],
    ['65+', 0.07],
  ] as const);
}

type Ctx = { challenge: Challenge; ratingMean: number };
type BaseNoComment = Omit<SubmissionBase, 'comment'>;
type Builder = (rng: Rng, base: BaseNoComment, ctx: Ctx) => Submission;

// ---- Participatory budget ----------------------------------------------------

const PB_WEIGHT: Record<PbProjectId, number> = {
  'fresh-food-access': 1.0,
  'immigrant-legal-defense': 0.92,
  'trades-workforce-training': 0.74,
  'green-my-block': 0.7,
  'youth-financial-literacy': 0.66,
  'community-litter-reduction': 0.6,
  'small-business-development': 0.58,
};

const PB_AGE_TILT: Record<AgeBucket, Partial<Record<PbProjectId, number>>> = {
  '18–24': { 'youth-financial-literacy': 0.38, 'trades-workforce-training': 0.25, 'community-litter-reduction': -0.2 },
  '25–34': { 'immigrant-legal-defense': 0.2, 'small-business-development': 0.15 },
  '35–44': { 'youth-financial-literacy': 0.15, 'green-my-block': 0.1 },
  '45–64': { 'small-business-development': 0.22, 'community-litter-reduction': 0.18 },
  '65+': {
    'fresh-food-access': 0.3,
    'community-litter-reduction': 0.45,
    'youth-financial-literacy': -0.25,
    'trades-workforce-training': -0.15,
  },
};

const PB_REASONS: Record<PbProjectId, string[]> = {
  'fresh-food-access': [
    'The closest full grocery store is two bus rides away for a lot of my neighbors.',
    'Food access touches every other need on this list.',
  ],
  'immigrant-legal-defense': [
    'Legal help keeps families in their homes and kids in school.',
    'People in my building are afraid to go to court without a lawyer.',
  ],
  'trades-workforce-training': [
    'Trades training is a real path to a union wage without debt.',
    'Half my friends would take an apprenticeship if they knew where to start.',
  ],
  'youth-financial-literacy': [
    'Nobody taught me about credit until I was already in trouble.',
    'Youth programs pay off for years after the money is spent.',
  ],
  'small-business-development': [
    'The storefronts on my block keep turning over. Owners need help early.',
    'Small businesses keep money in the neighborhood.',
  ],
  'community-litter-reduction': [
    'Clean blocks change how a street feels to walk down.',
    'Trash on our corner has been a problem for years.',
  ],
  'green-my-block': [
    'More trees on my street would make summers bearable.',
    'Cheap, visible, and every block can use it.',
  ],
};

const buildPb: Builder = (rng, base) => {
  const tilt = PB_AGE_TILT[base.ageBucket];
  const ranking = PB_PROJECTS.map((p) => ({
    id: p.id,
    score: PB_WEIGHT[p.id] + (tilt[p.id] ?? 0) + gaussian(rng) * 0.45,
  }))
    .sort((a, b) => b.score - a.score)
    .map((p) => p.id);
  const k = weighted(rng, [
    [4, 0.25],
    [5, 0.45],
    [6, 0.3],
  ] as const);
  const ballot = ranking.slice(0, k).map((id) => ({
    projectId: id,
    dollars: PB_PROJECTS.find((p) => p.id === id)!.dollars,
  }));
  return {
    ...base,
    kind: 'pb',
    ranking,
    ballot,
    firstCut: ranking[ranking.length - 1],
    comment: pick(rng, PB_REASONS[ranking[0]]),
  };
};

// ---- Cummins Highway walk audit ---------------------------------------------

const CUMMINS_BASE: Record<CumminsMeasure, number> = { sidewalk: 3.8, crossing: 3.4, busStop: 3.5, lighting: 2.7 };
const CUMMINS_SHIFT: Record<WalkMode, Partial<Record<CumminsMeasure, number>>> = {
  walking: {},
  bike: { crossing: -0.3, sidewalk: 0.1 },
  stroller: { sidewalk: -0.6, crossing: -0.5, busStop: -0.4 },
  wheelchair: { sidewalk: -1.0, crossing: -1.4, busStop: -1.2, lighting: -0.2 },
};
const CROSSING_SECONDS: Record<(typeof CROSSINGS)[number], number> = {
  'Fairway St': 27,
  'Rockdale St': 24,
  'Harmon St': 21,
  'Itasca St': 15,
  'Woodhaven St': 23,
};
const ISSUE_P: Record<CumminsIssue, Record<WalkMode, number>> = {
  'Missing or broken curb ramp': { walking: 0.08, bike: 0.05, stroller: 0.42, wheelchair: 0.61 },
  'Car parked on sidewalk or crosswalk': { walking: 0.24, bike: 0.31, stroller: 0.29, wheelchair: 0.33 },
  'Uneven or cracked pavement': { walking: 0.15, bike: 0.22, stroller: 0.34, wheelchair: 0.44 },
  'Construction signs or barriers in path': { walking: 0.17, bike: 0.2, stroller: 0.21, wheelchair: 0.26 },
  'No clear landing area at bus stop': { walking: 0.05, bike: 0.02, stroller: 0.18, wheelchair: 0.39 },
  'Standing water at crossing': { walking: 0.09, bike: 0.07, stroller: 0.1, wheelchair: 0.12 },
  'Overgrown vegetation': { walking: 0.06, bike: 0.05, stroller: 0.07, wheelchair: 0.08 },
};
const CUMMINS_COMMENTS: Record<WalkMode, string[]> = {
  walking: [
    'The new sidewalks are a big improvement, but it gets very dark past the bus stop.',
    'Drivers still turn right on red across the crosswalk.',
    'Much easier to walk than before the project.',
  ],
  bike: [
    'The bike lane ends abruptly before the intersection.',
    'Cars were parked in the separated lane twice on my ride.',
  ],
  stroller: [
    'Had to go into the street where a construction sign blocked the sidewalk.',
    'The curb cuts are fine until you reach the older corners.',
  ],
  wheelchair: [
    'The walk signal ran out before I made it across.',
    'I could not reach the bus stop from the landing pad without going into the street.',
    'One curb ramp points straight into traffic instead of the crosswalk.',
  ],
};

const buildCummins: Builder = (rng, base) => {
  const mode = weighted(rng, [
    ['walking', 0.56],
    ['bike', 0.17],
    ['stroller', 0.15],
    ['wheelchair', 0.12],
  ] as const);
  const shift = CUMMINS_SHIFT[mode];
  const rate = (k: CumminsMeasure) =>
    clamp(Math.round(CUMMINS_BASE[k] + (shift[k] ?? 0) + gaussian(rng) * 0.85), 1, 5);
  const count = weighted(rng, [
    [3, 0.5],
    [4, 0.3],
    [5, 0.2],
  ] as const);
  const crossingSeconds = CROSSINGS.slice(0, count).map((crossing) => ({
    crossing,
    seconds: clamp(Math.round(CROSSING_SECONDS[crossing] + gaussian(rng) * 2.2), 7, 45),
  }));
  const issues = CUMMINS_ISSUES.filter((issue) => rng() < ISSUE_P[issue][mode]);
  return {
    ...base,
    kind: 'cummins',
    mode,
    ratings: { sidewalk: rate('sidewalk'), crossing: rate('crossing'), busStop: rate('busStop'), lighting: rate('lighting') },
    crossingSeconds,
    issues,
    comment: pick(rng, CUMMINS_COMMENTS[mode]),
  };
};

// ---- City Council meeting coverage ------------------------------------------

const COUNCIL_LEAN: Record<CouncilDocket, Record<CouncilLean, number>> = {
  '#1958': { support: 0.64, mixed: 0.23, oppose: 0.13 },
  '#1968': { support: 0.51, mixed: 0.27, oppose: 0.22 },
};
const COUNCIL_OUTCOME_P: Record<CouncilDocket, Record<CouncilOutcome, number>> = {
  '#1958': { 'referred to committee': 0.72, passed: 0.09, amended: 0.11, tabled: 0.08 },
  '#1968': { 'referred to committee': 0.64, passed: 0.21, amended: 0.05, tabled: 0.1 },
};
const COUNCIL_CONCERNS: Record<CouncilDocket, (readonly [string, number])[]> = {
  '#1958': [
    ['Penalties need to be strong enough to change behavior', 0.34],
    ['Tenants fear retaliation for reporting', 0.27],
    ['List should show open violations, not just past ones', 0.21],
    ['Small owner-occupants could be swept in', 0.18],
  ],
  '#1968': [
    ['Bus reliability on Blue Hill Ave', 0.38],
    ['Loss of curbside parking for businesses', 0.24],
    ['Want ridership data before and after', 0.22],
    ['Construction impacts on abutters', 0.16],
  ],
};
const COUNCIL_COMMENTS: Record<CouncilLean, string[]> = {
  support: [
    'Renters need a way to know who they are dealing with before they sign.',
    'Good to see the Council pushing for answers instead of waiting.',
  ],
  mixed: [
    'I agree with the goal but the details were hard to follow.',
    'Most of the discussion was procedural; I left unsure what changes.',
  ],
  oppose: [
    'This feels like a headline, not a fix.',
    'I worry the cost falls on small landlords who already follow the rules.',
  ],
};

const buildCouncil: Builder = (rng, base) => {
  const docket = weighted(rng, [
    ['#1958', 0.58],
    ['#1968', 0.42],
  ] as const);
  const young = base.ageBucket === '18–24' || base.ageBucket === '25–34';
  const old = base.ageBucket === '65+';
  const lp = COUNCIL_LEAN[docket];
  const lean = weighted(rng, [
    ['support', lp.support + (young ? 0.08 : 0) - (old ? 0.08 : 0)],
    ['mixed', lp.mixed - (young ? 0.04 : 0)],
    ['oppose', lp.oppose - (young ? 0.04 : 0) + (old ? 0.08 : 0)],
  ] as const);
  const op = COUNCIL_OUTCOME_P[docket];
  const outcome = weighted(
    rng,
    COUNCIL_OUTCOMES.map((o) => [o, op[o]] as const),
  );
  return {
    ...base,
    kind: 'council',
    docket,
    outcome,
    lean,
    attended: rng() < 0.32 ? 'in person' : 'livestream',
    concern: weighted(rng, COUNCIL_CONCERNS[docket]),
    comment: pick(rng, COUNCIL_COMMENTS[lean]),
  };
};

// ---- Urban wild redesign ----------------------------------------------------

const WILD_BASE_P: Record<WildChange, number> = {
  cleanup: 0.58,
  signage: 0.45,
  trail: 0.43,
  entrance: 0.33,
  lighting: 0.3,
  seating: 0.28,
  wild: 0.25,
};
const WILD_TILT: Record<UrbanWild, Partial<Record<WildChange, number>>> = {
  'Chandler Pond': { seating: 0.2, lighting: 0.12, wild: -0.12 },
  'Allandale Woods': { wild: 0.28, trail: 0.12, lighting: -0.18, seating: -0.1 },
  'Roslindale Wetlands': { trail: 0.15, entrance: 0.14, signage: 0.08 },
  'Sherrin Woods': { cleanup: 0.18, signage: 0.12 },
};
const WHO_FOR: (readonly [string, number])[] = [
  ['Neighbors out for a daily walk', 0.27],
  ['Kids and families', 0.22],
  ['Dog owners', 0.16],
  ['Birders and nature lovers', 0.13],
  ['Older residents who need a flat, safe path', 0.12],
  ['Runners', 0.1],
];
const WILD_COMMENTS = [
  'Most people in the neighborhood do not know this place exists.',
  'The entrance is hard to find and feels closed off.',
  'Please keep it natural. A few benches and a cleanup would do a lot.',
  'There is dumping near the back trail that has been there for months.',
  'It would be a great spot for school field trips with a better path.',
];

const buildUrbanWild: Builder = (rng, base) => {
  const wild = weighted(rng, [
    ['Chandler Pond', 0.36],
    ['Allandale Woods', 0.3],
    ['Roslindale Wetlands', 0.18],
    ['Sherrin Woods', 0.16],
  ] as const);
  const tilt = WILD_TILT[wild];
  let changes = WILD_CHANGES.filter((c) => rng() < WILD_BASE_P[c] + (tilt[c] ?? 0));
  if (changes.length === 0) changes = [weighted(rng, WILD_CHANGES.map((c) => [c, WILD_BASE_P[c]] as const))];
  return {
    ...base,
    kind: 'urbanWild',
    wild,
    changes: changes.slice(0, 5),
    whoFor: weighted(rng, WHO_FOR),
    comment: pick(rng, WILD_COMMENTS),
  };
};

// ---- Rat patrol 311 test ----------------------------------------------------

/** Relative median response by neighborhood. Unlisted = 1.0. */
const RAT_SPEED: Record<string, number> = {
  Mattapan: 1.75,
  Dorchester: 1.6,
  Roxbury: 1.5,
  'East Boston': 1.35,
  'Hyde Park': 1.3,
  Allston: 1.2,
  Brighton: 1.1,
  'South End': 0.85,
  'Back Bay': 0.7,
  'Beacon Hill': 0.65,
  'North End': 0.75,
};
const RAT_COMMENTS = [
  'The ticket closed the same day but nothing changed on the block.',
  'Someone came by and put down bait boxes within two days.',
  'This alley has had burrows all summer.',
  'The restaurant dumpster lid is always open at night.',
  'I got a closure notice that said "no issue found" but the burrows are still there.',
];

const buildRatPatrol: Builder = (rng, base) => {
  const median = 26 * (RAT_SPEED[base.neighborhood] ?? 1);
  const responseHours = clamp(Math.round(median * Math.exp(gaussian(rng) * 0.8)), 1, 240);
  const slow = responseHours > 120;
  const outcome = weighted(rng, [
    ['baited', slow ? 0.12 : 0.3],
    ['inspected', 0.24],
    ['closed, no visible action', 0.33],
    ['still open, no change', slow ? 0.4 : 0.1],
  ] as const);
  return {
    ...base,
    kind: 'ratPatrol',
    hotspot: base.neighborhood,
    sign: weighted(rng, [
      ['Overflowing or open trash', 0.38],
      ['Burrows', 0.27],
      ['Droppings', 0.19],
      ['Live rat sighting', 0.16],
    ] as const),
    responseHours,
    outcome,
    closedWithVisibleAction: outcome === 'baited' || outcome === 'inspected',
    comment: pick(rng, RAT_COMMENTS),
  };
};

// ---- Generic (generated challenges without a dedicated instrument) ----------

const GENERIC_THEMES: Record<ChallengeType, (readonly [string, number])[]> = {
  design: [
    ['Evening and weekend hours', 0.24],
    ['Free or low-cost programming', 0.22],
    ['Youth programs', 0.17],
    ['Local artists and groups first', 0.15],
    ['Accessibility', 0.12],
    ['Lighting and safety outside', 0.1],
  ],
  'service-test': [
    ['Hard to find; signage missing', 0.26],
    ['Accessibility barriers', 0.2],
    ['Spaces closed or locked', 0.18],
    ['Staff were helpful', 0.16],
    ['Worked as expected', 0.12],
    ['Building condition', 0.08],
  ],
  meeting: [
    ['Hard to see or hear the process', 0.24],
    ['Process was explained well', 0.2],
    ['Wanted more time for public comment', 0.18],
    ['Materials not posted in advance', 0.15],
    ['Questions went unanswered', 0.13],
    ['Left confident in the process', 0.1],
  ],
  budget: [
    ['Housing costs', 0.3],
    ['Street safety', 0.25],
    ['Youth programs', 0.25],
    ['Parks and open space', 0.2],
  ],
  '311-test': [
    ['Slow response', 0.35],
    ['Closed without action', 0.3],
    ['Fixed quickly', 0.2],
    ['Hard to report', 0.15],
  ],
};
const GENERIC_COMMENTS: Record<string, string[]> = {
  'Evening and weekend hours': ['Most people who would use this work during the day.'],
  'Free or low-cost programming': ['If it costs money, the people who need it most will not come.'],
  'Youth programs': ['Teens in the area have nowhere to go after school.'],
  'Local artists and groups first': ['There are groups nearby already looking for space.'],
  Accessibility: ['Make sure the entrance works for wheelchairs from day one.'],
  'Lighting and safety outside': ['The block is dark at night; that will decide who shows up.'],
  'Hard to find; signage missing': ['I walked past the entrance twice before finding it.'],
  'Accessibility barriers': ['The accessible route was not marked anywhere.'],
  'Spaces closed or locked': ['The space on the sign was locked when I got there.'],
  'Staff were helpful': ['A staff member walked me over and explained everything.'],
  'Worked as expected': ['It was easier than I expected.'],
  'Building condition': ['Parts of the building need repair before anything else.'],
  'Hard to see or hear the process': ['From the observer area it was hard to see what was happening.'],
  'Process was explained well': ['Someone explained each step, which helped a lot.'],
  'Wanted more time for public comment': ['Two minutes was not enough for people who came a long way.'],
  'Materials not posted in advance': ['I could not find the slides or agenda ahead of time.'],
  'Questions went unanswered': ['Several questions from the chat were never addressed.'],
  'Left confident in the process': ['I left feeling more confident than when I came in.'],
  'Housing costs': ['Rent is the issue behind every other issue here.'],
  'Street safety': ['Crossing the main road with kids is stressful.'],
  'Parks and open space': ['We need more shade and benches in the park.'],
  'Slow response': ['It took days before anyone looked at it.'],
  'Closed without action': ['The case closed but nothing changed.'],
  'Fixed quickly': ['Fixed within a day. Impressive.'],
  'Hard to report': ['The app kept asking for details I did not have.'],
};

const buildGeneric: Builder = (rng, base, ctx) => {
  const themesTable = GENERIC_THEMES[ctx.challenge.type] ?? GENERIC_THEMES.budget;
  const first = weighted(rng, themesTable);
  const themes = [first];
  if (rng() < 0.4) {
    const second = weighted(rng, themesTable);
    if (second !== first) themes.push(second);
  }
  // Themes nudge the rating: positive themes score higher.
  const positive = /helpful|as expected|explained well|confident|quickly/i.test(first);
  const negative = /missing|barriers|locked|unanswered|hard to|slow|without action/i.test(first);
  const shift = positive ? 0.9 : negative ? -0.6 : 0;
  const rating = clamp(Math.round(ctx.ratingMean + shift + gaussian(rng) * 0.9), 1, 5);
  return {
    ...base,
    kind: 'generic',
    rating,
    themes,
    comment: pick(rng, GENERIC_COMMENTS[first] ?? ['Glad the city is asking before deciding.']),
  };
};

// ---- Assembly -----------------------------------------------------------------

/** The home neighborhood for a challenge, parsed from its text fields, with a safe default. */
function homeNeighborhood(challenge: Challenge): string {
  const hit = BOSTON_NEIGHBORHOODS.find((n) =>
    [challenge.title, challenge.summary, challenge.agendaItem].some((t) => t.includes(n)),
  );
  return hit ?? 'Allston';
}

/** Which payload builder each known challenge id uses. Anything else falls back to generic. */
const BUILDERS: Record<string, Builder> = {
  'demo-pb-2-million': buildPb,
  'demo-cummins-walk-audit': buildCummins,
  'demo-council-oct-28': buildCouncil,
  'demo-urban-wild': buildUrbanWild,
  'demo-rat-patrol': buildRatPatrol,
};

/**
 * The deterministic cohort for a given challenge, keyed by challenge.id with a generic fallback.
 * Stable across runs: same challenge id → same submissions, every time.
 */
export function cohortFor(challenge: Challenge): Cohort {
  const rng = mulberry32(hashSeed(challenge.id));
  const home = homeNeighborhood(challenge);
  const build = BUILDERS[challenge.id] ?? buildGeneric;
  const [min, max] = COHORT_RANGE[challenge.type] ?? [250, 500];
  const size = intBetween(rng, min, max);
  const ctx: Ctx = { challenge, ratingMean: 2.7 + rng() * 1.2 };

  const submissions: Submission[] = [];
  for (let i = 0; i < size; i++) {
    // residentKey is a synthetic per-slot key; the stored id is its one-way hash only.
    const base: BaseNoComment = {
      residentId: residentId(`resident-${i}`, challenge.id),
      neighborhood: neighborhoodFor(rng, home),
      ageBucket: ageBucketFor(rng),
    };
    submissions.push(build(rng, base, ctx));
  }
  return { challengeId: challenge.id, submissions };
}
