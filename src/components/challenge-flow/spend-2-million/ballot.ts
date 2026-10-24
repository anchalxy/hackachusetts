import type { IconName } from '@/ui/icon';

/**
 * Seed projects for "Spend Boston's $2 million" (data/challenges/demo-week.json,
 * demo-pb-2-million extras): last cycle's ballot prices, plus "Safer crossings near schools"
 * (a design placeholder added so the streets rule can be met).
 */
export type Project = {
  id: string;
  name: string;
  category: string;
  amount: number;
  /** `pumpkin` is the trail scenery pumpkin, used as the food icon in the mockup. */
  icon: IconName | 'pumpkin';
  /** Counts toward "A streets or parks project". */
  streetsOrParks?: boolean;
};

export const PROJECTS: Project[] = [
  { id: 'fresh-food', name: 'Neighborhood fresh food access', category: 'Health and Wellbeing', amount: 500_000, icon: 'pumpkin' },
  { id: 'legal-defense', name: 'Immigrant legal defense fund', category: 'Community Resources', amount: 400_000, icon: 'cityhall' },
  { id: 'workforce', name: 'Workforce training in the trades', category: 'Local Economy', amount: 300_000, icon: 'bolt' },
  {
    id: 'safer-crossings',
    name: 'Safer crossings near schools',
    category: 'Streets and Sidewalks',
    amount: 300_000,
    icon: 'crosswalk',
    streetsOrParks: true,
  },
  { id: 'financial-literacy', name: 'Youth financial literacy', category: 'Education, Youth and Families', amount: 250_000, icon: 'budget' },
  { id: 'small-business', name: 'Small business development', category: 'Local Economy', amount: 250_000, icon: 'bag' },
  { id: 'litter', name: 'Community litter reduction', category: 'Environment and Food Access', amount: 200_000, icon: 'trash' },
  { id: 'green-my-block', name: 'Green My Block', category: 'Environment and Food Access', amount: 100_000, icon: 'tree' },
];

export const PROJECT_BY_ID: Record<string, Project> = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));

export const BUDGET = 2_000_000;
export const MIN_PROJECTS = 4;
export const MAX_PROJECT = 500_000;

export type Rule = { label: string; met: boolean; /** Broken (not just not yet met): shown in brick. */ broken?: boolean };

export function ballotRules(ids: string[]): { total: number; rules: Rule[]; ok: boolean } {
  const projects = ids.map((id) => PROJECT_BY_ID[id]);
  const total = projects.reduce((sum, p) => sum + p.amount, 0);
  const rules: Rule[] = [
    { label: 'Under $2 million', met: total <= BUDGET, broken: total > BUDGET },
    { label: 'At least 4 projects', met: projects.length >= MIN_PROJECTS },
    { label: 'None over $500K', met: projects.every((p) => p.amount <= MAX_PROJECT) },
    { label: 'A streets or parks project', met: projects.some((p) => p.streetsOrParks) },
  ];
  return { total, rules, ok: rules.every((r) => r.met) };
}

/** "$500K", "$2M" */
export function shortMoney(n: number) {
  return n >= 1_000_000 ? `$${+(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
}

/** "$2,000,000" */
export function fullMoney(n: number) {
  return `$${n.toLocaleString('en-US')}`;
}

/** A project taken off the ballot, in the order it happened. */
export type Cut = { id: string; name: string; amount: number; /** Total was over $2M when it was cut. */ overBudget: boolean; at: number };

/** Hand-off between the build and review steps (one flow at a time). */
let draft: { ids: string[]; cuts: Cut[]; reason?: string } = { ids: [], cuts: [] };

export function setBallotDraft(next: typeof draft) {
  draft = next;
}

export function getBallotDraft() {
  return draft;
}
