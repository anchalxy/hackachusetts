import fc from 'fast-check';

import { crateSize, crateState, dealStatus, dealBadge, sortedDeals, type Deal } from '@/lib/rewards';

// crateThresholds = [50, 100, 150], thenEvery = 150 (see test/mocks/theme.ts).
const THRESHOLDS = [50, 100, 150];
const THEN_EVERY = 150;

const crateIndex = () => fc.integer({ min: 0, max: 50 });
const balance = () => fc.integer({ min: 0, max: 5000 });
const cratesOpened = () => fc.integer({ min: 0, max: 20 });

// crateSize -------------------------------------------------------------------

describe('crateSize (property-based)', () => {
  it('is always a positive crate size', () => {
    fc.assert(
      fc.property(crateIndex(), (i) => {
        expect(crateSize(i)).toBeGreaterThan(0);
      }),
    );
  });

  it('follows the thresholds then flattens to thenEvery', () => {
    fc.assert(
      fc.property(crateIndex(), (i) => {
        const expected = i < THRESHOLDS.length ? THRESHOLDS[i] : THEN_EVERY;
        expect(crateSize(i)).toBe(expected);
      }),
    );
  });
});

// crateState ------------------------------------------------------------------

describe('crateState (property-based)', () => {
  it('conservation: leaves in ready crates + leftover == balance', () => {
    fc.assert(
      fc.property(balance(), cratesOpened(), (bal, opened) => {
        const { ready } = crateState(bal, opened);
        let consumed = 0;
        for (let k = 0; k < ready; k++) consumed += crateSize(opened + k);
        const leftover = bal - consumed;
        // ready crates were each fully payable, and the leftover can't open one more.
        expect(leftover).toBeGreaterThanOrEqual(0);
        expect(leftover).toBeLessThan(crateSize(opened + ready));
        expect(consumed + leftover).toBe(bal);
      }),
    );
  });

  it('filled is the balance capped at the current crate size', () => {
    fc.assert(
      fc.property(balance(), cratesOpened(), (bal, opened) => {
        const s = crateState(bal, opened);
        expect(s.filled).toBe(Math.min(bal, s.size));
        expect(s.filled).toBeGreaterThanOrEqual(0);
        expect(s.filled).toBeLessThanOrEqual(s.size);
      }),
    );
  });

  it('full, toGo and ready agree with each other', () => {
    fc.assert(
      fc.property(balance(), cratesOpened(), (bal, opened) => {
        const s = crateState(bal, opened);
        expect(s.full).toBe(bal >= s.size);
        expect(s.toGo).toBe(Math.max(0, s.size - bal));
        // full <=> at least one crate is ready to open.
        expect(s.full).toBe(s.ready >= 1);
        expect(s.ready).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('balance below the first crate size is never full', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 49 }), (bal) => {
        const s = crateState(bal, 0);
        expect(s.full).toBe(false);
        expect(s.ready).toBe(0);
        expect(s.toGo).toBe(50 - bal);
      }),
    );
  });
});

// dealStatus / dealBadge ------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;
const DEAL_DAYS = 7;

const dealArb = (now: number): fc.Arbitrary<Deal> =>
  fc.record({
    id: fc.hexaString({ minLength: 1, maxLength: 8 }),
    partnerId: fc.constantFrom('flour', 'tatte', 'pavement', 'cafe-luna', 'bpm', 'diesel'),
    code: fc.string(),
    // issued anywhere from 30 days ago to 5 days in the future
    issuedAt: fc.integer({ min: now - 30 * DAY, max: now + 5 * DAY }),
    usedAt: fc.option(fc.integer({ min: now - 30 * DAY, max: now }), { nil: undefined }),
  });

describe('dealStatus (property-based)', () => {
  const now = Date.UTC(2026, 9, 24); // fixed clock for determinism

  it('is exactly one of used / expired / active, used taking priority', () => {
    fc.assert(
      fc.property(dealArb(now), (deal) => {
        const status = dealStatus(deal, now);
        if (deal.usedAt) {
          expect(status.kind).toBe('used');
          return;
        }
        const expiresAt = deal.issuedAt + DEAL_DAYS * DAY;
        expect(status.kind).toBe(now >= expiresAt ? 'expired' : 'active');
      }),
    );
  });

  it('active deals always report a positive whole number of days left', () => {
    fc.assert(
      fc.property(dealArb(now), (deal) => {
        const status = dealStatus(deal, now);
        if (status.kind === 'active') {
          expect(Number.isInteger(status.daysLeft)).toBe(true);
          expect(status.daysLeft).toBeGreaterThan(0);
          expect(status.daysLeft).toBeLessThanOrEqual(DEAL_DAYS);
        }
      }),
    );
  });

  it('badge tone turns urgent only within the final 2 days', () => {
    fc.assert(
      fc.property(dealArb(now), (deal) => {
        const status = dealStatus(deal, now);
        const badge = dealBadge(status);
        if (status.kind === 'active') {
          expect(badge.tone).toBe(status.daysLeft <= 2 ? 'urgent' : 'ok');
        } else {
          expect(badge.tone).toBe('done');
        }
      }),
    );
  });
});

// sortedDeals -----------------------------------------------------------------

describe('sortedDeals (property-based)', () => {
  const now = Date.UTC(2026, 9, 24);

  it('is a permutation of its input (same multiset of ids)', () => {
    fc.assert(
      fc.property(fc.array(dealArb(now)), (deals) => {
        const sorted = sortedDeals(deals, now);
        expect(sorted.length).toBe(deals.length);
        expect(sorted.map((d) => d.id).sort()).toEqual(deals.map((d) => d.id).sort());
      }),
    );
  });

  it('places every active deal before every non-active one', () => {
    fc.assert(
      fc.property(fc.array(dealArb(now)), (deals) => {
        const sorted = sortedDeals(deals, now);
        const isActive = (d: Deal) => dealStatus(d, now).kind === 'active';
        const lastActive = sorted.reduce((idx, d, i) => (isActive(d) ? i : idx), -1);
        const firstInactive = sorted.findIndex((d) => !isActive(d));
        if (lastActive !== -1 && firstInactive !== -1) {
          expect(lastActive).toBeLessThan(firstInactive);
        }
      }),
    );
  });
});
