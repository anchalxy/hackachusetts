import fc from 'fast-check';

import {
  leafBalance,
  streak,
  isStopDone,
  VOTE_LEAVES,
  MAX_VOTES,
  type ChallengeProgress,
  type StopProgress,
} from '@/lib/challenge-progress';

// Arbitraries -----------------------------------------------------------------

const stopProgress = (): fc.Arbitrary<StopProgress> =>
  fc.record({
    leaves: fc.integer({ min: 0, max: 500 }),
    at: fc.integer({ min: 0, max: 2_000_000_000_000 }),
    pendingCheckIn: fc.option(fc.boolean(), { nil: undefined }),
    data: fc.constant(undefined),
  });

const progress = (): fc.Arbitrary<ChallengeProgress> =>
  fc.record({
    stops: fc.dictionary(fc.string({ minLength: 1, maxLength: 12 }), stopProgress()),
    votes: fc.integer({ min: 0, max: MAX_VOTES }),
  });

// leafBalance -----------------------------------------------------------------

describe('leafBalance (property-based)', () => {
  it('equals base + earned stop leaves + vote leaves', () => {
    fc.assert(
      fc.property(progress(), fc.integer({ min: 0, max: 10000 }), (p, base) => {
        const earned = Object.values(p.stops).reduce((s, x) => s + x.leaves, 0);
        expect(leafBalance(p, base)).toBe(base + earned + p.votes * VOTE_LEAVES);
      }),
    );
  });

  it('is never below the base (leaves and votes only add)', () => {
    fc.assert(
      fc.property(progress(), fc.integer({ min: 0, max: 10000 }), (p, base) => {
        expect(leafBalance(p, base)).toBeGreaterThanOrEqual(base);
      }),
    );
  });

  it('is monotonic in the base offset', () => {
    fc.assert(
      fc.property(progress(), fc.nat(5000), fc.nat(5000), (p, a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(leafBalance(p, lo)).toBeLessThanOrEqual(leafBalance(p, hi));
      }),
    );
  });
});

// streak ----------------------------------------------------------------------

describe('streak (property-based)', () => {
  it('safe iff at least one stop is recorded; +1 week when safe', () => {
    fc.assert(
      fc.property(progress(), (p) => {
        const hasStop = Object.keys(p.stops).length > 0;
        const s = streak(p);
        expect(s.safe).toBe(hasStop);
        expect(s.weeks).toBe(5 + (hasStop ? 1 : 0));
      }),
    );
  });
});

// isStopDone ------------------------------------------------------------------

describe('isStopDone (property-based)', () => {
  it('is true exactly for ids present in stops', () => {
    fc.assert(
      fc.property(progress(), fc.string({ minLength: 1, maxLength: 12 }), (p, id) => {
        expect(isStopDone(p, id)).toBe(id in p.stops);
      }),
    );
  });

  it('every recorded stop id reports done', () => {
    fc.assert(
      fc.property(progress(), (p) => {
        for (const id of Object.keys(p.stops)) {
          expect(isStopDone(p, id)).toBe(true);
        }
      }),
    );
  });
});
