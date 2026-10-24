// Shared by the app and scripts/agendas (run directly by Node), so no `@/` imports here.

export type ChallengeType = 'design' | 'budget' | 'service-test' | 'meeting' | '311-test';

/** What the AI estimates; the points come from `scorePoints`, never from the model. */
export type PointFactors = {
  /** Typical minutes to complete, all in. */
  minutes: number;
  /** User must physically go somewhere. */
  inPerson: boolean;
  /** A named office is actively collecting this input right now. */
  cityAsked: boolean;
  /** Submission needs photos, timings or notes the AI must check. */
  proofRequired: boolean;
};

export type Contact = {
  name?: string;
  office: string;
  email?: string;
  phone?: string;
};

export type Challenge = {
  id: string;
  /** Position in the week's write-up (1–5). */
  number: number;
  type: ChallengeType;
  title: string;
  points: number;
  /** Shown instead of just the number when there's a variant, e.g. "8 in person, 6 via livestream". */
  pointsLabel?: string;
  /** e.g. "6 = 45–60 min (3) + in person (2) + city asked (1)". */
  pointsBreakdown: string;
  factors: PointFactors;
  summary: string;
  agendaItem: string;
  whyNow: string;
  /** Free text exactly as written, plus structured contacts for the digest. */
  poc: string;
  contacts: Contact[];
  deadline: string;
  /** YYYY-MM-DD, for sorting and countdowns. */
  deadlineDate: string;
  inPerson: 'yes' | 'no' | 'optional';
  digestTo: string;
  task: { intro?: string; steps: string[] };
  /** Extra labeled sections (constraints, seed data, featured dockets…), in display order. */
  extras?: { heading: string; intro?: string; items: string[] }[];
  voting?: string;
  verification?: string;
  pocReceives: string;
  sourceUrl: string;
};

export type ChallengeWeek = {
  /** Monday of the week, YYYY-MM-DD. */
  weekOf: string;
  /** e.g. "Allston, Boston". */
  area: string;
  generatedAt: string;
  /** "demo" = exampleChallenges.md word for word; "generated" = weekly AI run. */
  origin: 'demo' | 'generated';
  overview: string;
  sources: string;
  challenges: Challenge[];
  notes?: string[];
};

/** Voting on another user's submission. */
export const VOTE_POINTS = 1;

/**
 * Points scale (1–10) from exampleChallenges.md:
 * time (under 15 min = 1, 15–30 = 2, 30–45 = 3, 45–60 = 4, over 60 = 5)
 * + 2 in person + 1 city asked + 1 proof required.
 */
export function timePoints(minutes: number): number {
  if (minutes < 15) return 1;
  if (minutes <= 30) return 2;
  if (minutes <= 45) return 3;
  if (minutes <= 60) return 4;
  return 5;
}

export function scorePoints(factors: PointFactors): { points: number; breakdown: string } {
  const parts: [string, number][] = [[timeLabel(factors.minutes), timePoints(factors.minutes)]];
  if (factors.inPerson) parts.push(['in person', 2]);
  if (factors.cityAsked) parts.push(['city asked', 1]);
  if (factors.proofRequired) parts.push(['proof required', 1]);
  const points = parts.reduce((sum, [, value]) => sum + value, 0);
  return { points, breakdown: `${points} = ${parts.map(([label, value]) => `${label} (${value})`).join(' + ')}` };
}

function timeLabel(minutes: number): string {
  if (minutes < 15) return 'under 15 min';
  if (minutes <= 30) return '15–30 min';
  if (minutes <= 45) return '30–45 min';
  if (minutes <= 60) return '45–60 min';
  return 'over 60 min';
}
