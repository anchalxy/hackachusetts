import fc from 'fast-check';

import { trailOrder } from '@/lib/challenge-week';
import type { Challenge, ChallengeWeek } from '@/lib/challenges';

// A challenge stub carrying only the fields trailOrder sorts on.
const challenge = (): fc.Arbitrary<Challenge> =>
  fc
    .record({
      id: fc.hexaString({ minLength: 1, maxLength: 8 }),
      number: fc.integer({ min: 1, max: 5 }),
      // ISO dates spanning a few weeks so ties on date actually happen.
      deadlineDate: fc.constantFrom(
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-10-30',
        '2026-11-02',
      ),
    })
    .map((partial) => partial as unknown as Challenge);

const week = (): fc.Arbitrary<ChallengeWeek> =>
  fc.record({ challenges: fc.array(challenge(), { maxLength: 12 }) }).map((w) => w as unknown as ChallengeWeek);

describe('trailOrder (property-based)', () => {
  it('returns a permutation of the input (same ids, same count)', () => {
    fc.assert(
      fc.property(week(), (w) => {
        const out = trailOrder(w);
        expect(out.length).toBe(w.challenges.length);
        expect(out.map((c) => c.id).sort()).toEqual(w.challenges.map((c) => c.id).sort());
      }),
    );
  });

  it('is sorted by deadlineDate, then challenge number', () => {
    fc.assert(
      fc.property(week(), (w) => {
        const out = trailOrder(w);
        for (let i = 1; i < out.length; i++) {
          const prev = out[i - 1];
          const cur = out[i];
          const byDate = prev.deadlineDate.localeCompare(cur.deadlineDate);
          // non-increasing violation would mean byDate > 0
          expect(byDate).toBeLessThanOrEqual(0);
          if (byDate === 0) expect(prev.number).toBeLessThanOrEqual(cur.number);
        }
      }),
    );
  });

  it('does not mutate the input week', () => {
    fc.assert(
      fc.property(week(), (w) => {
        const snapshot = w.challenges.map((c) => c.id);
        trailOrder(w);
        expect(w.challenges.map((c) => c.id)).toEqual(snapshot);
      }),
    );
  });
});
