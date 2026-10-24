import fc from 'fast-check';

import { scorePoints, timePoints, type PointFactors } from '@/lib/challenges';

// Arbitraries -----------------------------------------------------------------

/** Any plausible "minutes to complete" value, including the boundary values. */
const minutes = () => fc.integer({ min: 0, max: 600 });

const factors = (): fc.Arbitrary<PointFactors> =>
  fc.record({
    minutes: minutes(),
    inPerson: fc.boolean(),
    cityAsked: fc.boolean(),
    proofRequired: fc.boolean(),
  });

// timePoints ------------------------------------------------------------------

describe('timePoints (property-based)', () => {
  it('always lands in the documented 1..5 band', () => {
    fc.assert(
      fc.property(minutes(), (m) => {
        const p = timePoints(m);
        expect(p).toBeGreaterThanOrEqual(1);
        expect(p).toBeLessThanOrEqual(5);
      }),
    );
  });

  it('is monotonically non-decreasing in minutes', () => {
    fc.assert(
      fc.property(minutes(), minutes(), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(timePoints(lo)).toBeLessThanOrEqual(timePoints(hi));
      }),
    );
  });

  it('matches the exact bucket boundaries from exampleChallenges.md', () => {
    // under 15 = 1, 15-30 = 2, 30-45 = 3, 45-60 = 4, over 60 = 5
    expect(timePoints(0)).toBe(1);
    expect(timePoints(14)).toBe(1);
    expect(timePoints(15)).toBe(2);
    expect(timePoints(30)).toBe(2);
    expect(timePoints(31)).toBe(3);
    expect(timePoints(45)).toBe(3);
    expect(timePoints(46)).toBe(4);
    expect(timePoints(60)).toBe(4);
    expect(timePoints(61)).toBe(5);
  });
});

// scorePoints -----------------------------------------------------------------

describe('scorePoints (property-based)', () => {
  it('equals the time band plus the flat bonuses (the documented formula)', () => {
    fc.assert(
      fc.property(factors(), (f) => {
        const expected =
          timePoints(f.minutes) +
          (f.inPerson ? 2 : 0) +
          (f.cityAsked ? 1 : 0) +
          (f.proofRequired ? 1 : 0);
        expect(scorePoints(f).points).toBe(expected);
      }),
    );
  });

  it('stays within the overall 1..10 scale', () => {
    fc.assert(
      fc.property(factors(), (f) => {
        const { points } = scorePoints(f);
        expect(points).toBeGreaterThanOrEqual(1); // min: <15min, no bonuses
        expect(points).toBeLessThanOrEqual(9); // max here: 5 + 2 + 1 + 1 (<=10 scale)
      }),
    );
  });

  it('turning any bonus on never lowers the score (monotonic in each flag)', () => {
    fc.assert(
      fc.property(factors(), (f) => {
        const base = scorePoints({ ...f, inPerson: false, cityAsked: false, proofRequired: false }).points;
        expect(scorePoints({ ...f, inPerson: true }).points).toBeGreaterThanOrEqual(
          scorePoints({ ...f, inPerson: false }).points,
        );
        expect(scorePoints({ ...f, cityAsked: true }).points).toBeGreaterThanOrEqual(base);
        expect(scorePoints({ ...f, proofRequired: true }).points).toBeGreaterThanOrEqual(base);
      }),
    );
  });

  it('breakdown arithmetic reconstructs the reported total', () => {
    fc.assert(
      fc.property(factors(), (f) => {
        const { points, breakdown } = scorePoints(f);
        // breakdown looks like "N = label (a) + label (b) + ...": the numbers in parens sum to N.
        const parenNumbers = [...breakdown.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1]));
        const sum = parenNumbers.reduce((a, b) => a + b, 0);
        expect(sum).toBe(points);
        expect(breakdown.startsWith(`${points} = `)).toBe(true);
      }),
    );
  });
});
