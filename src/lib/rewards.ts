import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import type { IconName } from '@/ui/icon';
import { t } from '@/ui/theme';

// Rewards tab v2 (DESIGN.md 6e): leaves fill a crate at 50, 100, 150, then every 150. Each crate
// resets the counter, overflow carries over, and you open one crate at a time.
//
// This is the one leaf ledger. Everything that pays (trail stops, votes, the streak bonus, approved
// reports, the dev menu) calls creditLeaves; opening a crate is the only spend.

const DAY = 24 * 60 * 60 * 1000;
export const DEAL_DAYS = 7;

/** The seed user's counter before this week's trail (design/screens/rewards/1-rewards.png: 120 of 150). */
const SEED_LEAVES = 120;

export type Partner = {
  id: string;
  name: string;
  /** "Central Square": shown on the reveal card. */
  area: string;
  /** "Central Square, Cambridge": shown under the name and used for Google Maps. */
  address: string;
  offer: string;
  icon: IconName;
};

// Real local spots; the offers are placeholders until each business confirms (DESIGN.md 6e).
export const PARTNERS: Partner[] = [
  { id: 'flour', name: 'Flour Bakery + Café', area: 'Central Square', address: 'Central Square, Cambridge', offer: 'Free pastry with any coffee', icon: 'coffee' },
  { id: 'tatte', name: 'Tatte Bakery & Café', area: 'Harvard Square', address: 'Harvard Square, Cambridge', offer: '15% off your order', icon: 'gift' },
  { id: 'pavement', name: 'Pavement Coffeehouse', area: 'Allston', address: 'Allston, Boston', offer: 'Free drip coffee', icon: 'coffee' },
  { id: 'cafe-luna', name: 'Café Luna', area: 'Central Square', address: 'Central Square, Cambridge', offer: '$5 off brunch', icon: 'gift' },
  { id: 'bpm', name: 'Boston Public Market', area: 'Downtown', address: 'Boston Public Market, Boston', offer: '$5 off $20', icon: 'bag' },
  { id: 'diesel', name: 'Diesel Café', area: 'Davis Square', address: 'Davis Square, Somerville', offer: 'Free size upgrade', icon: 'coffee' },
];

export type Deal = {
  id: string;
  partnerId: string;
  /** Single-use code in the QR. */
  code: string;
  issuedAt: number;
  usedAt?: number;
};

export type RewardsState = {
  /** Crates opened so far (picks the next crate's size). */
  cratesOpened: number;
  /** Every leaf ever credited, seed included. */
  earned: number;
  /** Leaves that went into opened crates. */
  spent: number;
  /** Newest first. */
  deals: Deal[];
};

const KEY = 'rewards';

function newCode() {
  return `TP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Three past crates, matching the mockup: Flour (5 days left), Tatte (2 days left), Pavement (used). */
function seed(now = Date.now()): RewardsState {
  return {
    cratesOpened: 3,
    earned: SEED_LEAVES,
    spent: 0,
    deals: [
      { id: 'seed-flour', partnerId: 'flour', code: newCode(), issuedAt: now - 2 * DAY },
      { id: 'seed-tatte', partnerId: 'tatte', code: newCode(), issuedAt: now - 5 * DAY },
      { id: 'seed-pavement', partnerId: 'pavement', code: newCode(), issuedAt: now - 9 * DAY, usedAt: now - 6 * DAY },
    ],
  };
}

let state: RewardsState = load();
const listeners = new Set<() => void>();

/** Leaves already on this week's trail, read straight from its store (no import cycle). */
function trailLeavesSaved(): number {
  try {
    const raw = Storage.getItemSync('challengeProgress');
    if (!raw) return 0;
    const p = JSON.parse(raw) as { stops?: Record<string, { leaves?: number }>; votes?: number };
    const stops = Object.values(p.stops ?? {}).reduce((sum, stop) => sum + (stop.leaves ?? 0), 0);
    return stops + (p.votes ?? 0) * 2;
  } catch {
    return 0;
  }
}

function load(): RewardsState {
  try {
    const raw = Storage.getItemSync(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    // Valid JSON with a missing/wrong field would crash the Rewards tab on `deals.filter`.
    if (parsed && Array.isArray(parsed.deals)) {
      const saved: RewardsState = {
        cratesOpened: Number(parsed.cratesOpened) || 0,
        earned: Number(parsed.earned) || 0,
        spent: Number(parsed.spent) || 0,
        deals: parsed.deals,
      };
      // Before the ledger, the balance was derived from the trail plus a dev bonus: fold both in once.
      if (typeof parsed.earned !== 'number') {
        saved.earned = SEED_LEAVES + (Number(parsed.bonus) || 0) + trailLeavesSaved();
        Storage.setItemSync(KEY, JSON.stringify(saved));
      }
      return saved;
    }
  } catch {}
  const fresh = seed();
  try {
    Storage.setItemSync(KEY, JSON.stringify(fresh));
  } catch {}
  return fresh;
}

function set(next: RewardsState) {
  state = next;
  Storage.setItemSync(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRewards(): RewardsState {
  return state;
}

export function useRewards(): RewardsState {
  return useSyncExternalStore(subscribe, getRewards);
}

/** Size of crate number `index` (0-based): 50, 100, 150, then 150 each. */
export function crateSize(index: number): number {
  return t.points.crateThresholds[index] ?? t.points.thenEvery;
}

/** The counter every leaf pill shows: earned minus what went into crates, never below 0. */
export function leafCounter(rewards: RewardsState = state): number {
  return Math.max(0, rewards.earned - rewards.spent);
}

export function useLeafBalance(): number {
  return leafCounter(useRewards());
}

/** Adds leaves to the ledger. Ignores anything that isn't a positive number. */
export function creditLeaves(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  set({ ...state, earned: state.earned + Math.round(amount) });
}

export type CrateState = {
  balance: number;
  size: number;
  /** Leaves in the current crate (capped at its size). */
  filled: number;
  toGo: number;
  full: boolean;
  /** How many crates the balance covers, opened one after another. */
  ready: number;
};

export function crateState(balance: number, cratesOpened: number): CrateState {
  const size = crateSize(cratesOpened);
  let ready = 0;
  let left = balance;
  while (left >= crateSize(cratesOpened + ready)) {
    left -= crateSize(cratesOpened + ready);
    ready += 1;
  }
  return { balance, size, filled: Math.min(balance, size), toGo: Math.max(0, size - balance), full: balance >= size, ready };
}

export function useCrate(): CrateState {
  const rewards = useRewards();
  return crateState(leafCounter(rewards), rewards.cratesOpened);
}

export function currentCrate(): CrateState {
  return crateState(leafCounter(state), state.cratesOpened);
}

export function partner(id: string): Partner {
  return PARTNERS.find((p) => p.id === id) ?? PARTNERS[0];
}

/** A random partner, avoiding ones you already hold an unused deal for when possible. */
function pickPartner(deals: Deal[], now: number): Partner {
  const held = new Set(deals.filter((d) => dealStatus(d, now).kind === 'active').map((d) => d.partnerId));
  const pool = PARTNERS.filter((p) => !held.has(p.id));
  const from = pool.length ? pool : PARTNERS;
  return from[Math.floor(Math.random() * from.length)];
}

/**
 * Opens the full crate: spends its size and saves the deal right away (redemption is mandatory,
 * so closing the reveal can't lose it). Returns null if the crate isn't full.
 */
export function openCrate(now = Date.now()): Deal | null {
  const crate = currentCrate();
  if (!crate.full) return null;
  const deal: Deal = { id: String(now), partnerId: pickPartner(state.deals, now).id, code: newCode(), issuedAt: now };
  set({ ...state, cratesOpened: state.cratesOpened + 1, spent: state.spent + crate.size, deals: [deal, ...state.deals] });
  return deal;
}

export function markDealUsed(id: string, now = Date.now()) {
  set({ ...state, deals: state.deals.map((d) => (d.id === id && !d.usedAt ? { ...d, usedAt: now } : d)) });
}

/** Kept for callers from before the ledger (report-leaves, the dev menu). */
export const addBonusLeaves = creditLeaves;

export function resetRewards() {
  set(seed());
}

export type DealStatus =
  | { kind: 'active'; daysLeft: number }
  | { kind: 'used'; at: number }
  | { kind: 'expired'; at: number };

/** Codes are single-use and expire 7 days after they're issued. */
export function dealStatus(deal: Deal, now = Date.now()): DealStatus {
  if (deal.usedAt) return { kind: 'used', at: deal.usedAt };
  const expiresAt = deal.issuedAt + DEAL_DAYS * DAY;
  if (now >= expiresAt) return { kind: 'expired', at: expiresAt };
  // Clamp: a clock set backwards would otherwise show more days than a code can ever have.
  return { kind: 'active', daysLeft: Math.min(DEAL_DAYS, Math.ceil((expiresAt - now) / DAY)) };
}

const monthDay = (at: number) => new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Badge copy + tone: teal "5 days left", red at ≤2 days, gray "Used Oct 18" / "Expired Oct 18". */
export function dealBadge(status: DealStatus): { label: string; tone: 'ok' | 'urgent' | 'done' } {
  if (status.kind === 'used') return { label: `Used ${monthDay(status.at)}`, tone: 'done' };
  if (status.kind === 'expired') return { label: `Expired ${monthDay(status.at)}`, tone: 'done' };
  const label = `${status.daysLeft} ${status.daysLeft === 1 ? 'day' : 'days'} left`;
  return { label, tone: status.daysLeft <= 2 ? 'urgent' : 'ok' };
}

/** Active deals first (newest first), then used and expired ones. */
export function sortedDeals(deals: Deal[], now = Date.now()): Deal[] {
  const active = (d: Deal) => dealStatus(d, now).kind === 'active';
  return [...deals.filter(active), ...deals.filter((d) => !active(d))];
}

export function mapsUrl(p: Partner): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`;
}
