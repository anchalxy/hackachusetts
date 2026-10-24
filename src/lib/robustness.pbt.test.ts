/**
 * Property-based tests for logic not covered by the other suites:
 * - persisted state must survive corrupt/foreign storage values (no permanent crash)
 * - 311 SQL string quoting must never let a value escape its literal (injection)
 * - $2M ballot rules, report-row formatters, profile validation, 311 ticket ids
 */
import fc from 'fast-check';

import Storage from 'expo-sqlite/kv-store';

import { ballotRules, PROJECTS, BUDGET, MIN_PROJECTS } from '@/components/challenge-flow/spend-2-million/ballot';
import { formatSeconds } from '@/components/cummins-walk-audit/audit';
import { isBoston311Ticket } from '@/components/challenge-flow/rat-patrol';
import { ago, day, dayNumber } from '@/components/report/format';
import { getCasesById } from '@/lib/boston-311';
import { getMyReports } from '@/lib/my-reports';
import { getProfile, validateProfile, SEED_PROFILE } from '@/lib/profile';

jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-location', () => ({}));

const kv = Storage as unknown as { setItem(k: string, v: string): Promise<void>; __clear(): void };

// Any string a previous app version, a bug, or disk corruption could have left behind.
const storedValue = fc.oneof(fc.string(), fc.json(), fc.constantFrom('null', '{}', '[null]', '[1,2]', '"x"', '{'));

// Persisted state -------------------------------------------------------------

describe('persisted state tolerates corrupt storage (property-based)', () => {
  beforeEach(() => kv.__clear());

  it('getMyReports never rejects and always returns an array', async () => {
    await fc.assert(
      fc.asyncProperty(storedValue, async (raw) => {
        await kv.setItem('myReports', raw);
        const reports = await getMyReports();
        expect(Array.isArray(reports)).toBe(true);
      }),
    );
  });

  it('getProfile never rejects and always has every seed field', async () => {
    await fc.assert(
      fc.asyncProperty(storedValue, async (raw) => {
        await kv.setItem('profile', raw);
        const profile = await getProfile();
        for (const key of Object.keys(SEED_PROFILE)) expect(profile).toHaveProperty(key);
      }),
    );
  });
});

// 311 SQL quoting --------------------------------------------------------------

/** Pulls the single-quoted literals out of `IN (...)`, undoing '' escaping. */
function parseInList(sql: string): string[] | null {
  const start = sql.indexOf('IN (');
  if (start < 0) return null;
  const out: string[] = [];
  let i = start + 4;
  while (i < sql.length) {
    while (sql[i] === ' ' || sql[i] === ',') i++;
    if (sql[i] === ')') return out;
    if (sql[i] !== "'") return null; // something outside a literal: injection
    i++;
    let value = '';
    for (;;) {
      if (i >= sql.length) return null;
      if (sql[i] === "'") {
        if (sql[i + 1] === "'") {
          value += "'";
          i += 2;
          continue;
        }
        i++;
        break;
      }
      value += sql[i++];
    }
    out.push(value);
  }
  return null;
}

describe('311 SQL quoting (property-based)', () => {
  const realFetch = global.fetch;
  let lastSql = '';
  beforeAll(() => {
    global.fetch = (async (url: string) => {
      lastSql = decodeURIComponent(String(url).split('sql=')[1]);
      return { ok: true, json: async () => ({ success: true, result: { records: [] } }) };
    }) as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  it('every case id stays inside its own string literal, whatever it contains', async () => {
    const hostile = fc.oneof(fc.string(), fc.constantFrom("' OR '1'='1", "x'); DROP TABLE t; --", "''", "\\'"));
    await fc.assert(
      fc.asyncProperty(fc.array(hostile, { minLength: 1, maxLength: 5 }), async (ids) => {
        await getCasesById(ids);
        expect(parseInList(lastSql)).toEqual(ids);
      }),
    );
  });
});

// Ballot ------------------------------------------------------------------------

describe('ballotRules (property-based)', () => {
  const ballot = fc.subarray(PROJECTS.map((p) => p.id));

  it('total is the sum of picked amounts and ok means every rule is met', () => {
    fc.assert(
      fc.property(ballot, (ids) => {
        const { total, rules, ok } = ballotRules(ids);
        expect(total).toBe(ids.reduce((s, id) => s + PROJECTS.find((p) => p.id === id)!.amount, 0));
        expect(ok).toBe(rules.every((r) => r.met));
        if (ok) {
          expect(total).toBeLessThanOrEqual(BUDGET);
          expect(ids.length).toBeGreaterThanOrEqual(MIN_PROJECTS);
        }
      }),
    );
  });

  it('does not depend on pick order', () => {
    fc.assert(
      fc.property(ballot, fc.integer(), (ids, seed) => {
        const shuffled = [...ids].sort((a, b) => ((a.charCodeAt(0) * seed) % 7) - ((b.charCodeAt(0) * seed) % 7));
        expect(ballotRules(shuffled)).toEqual(ballotRules(ids));
      }),
    );
  });

  it('a valid ballot exists', () => {
    // If the seed data ever changes so no combo passes, the challenge is unwinnable.
    const ids = PROJECTS.map((p) => p.id);
    let found = false;
    for (let mask = 1; mask < 1 << ids.length && !found; mask++) {
      found = ballotRules(ids.filter((_, i) => mask & (1 << i))).ok;
    }
    expect(found).toBe(true);
  });
});

// Formatters --------------------------------------------------------------------

describe('report formatters (property-based)', () => {
  const now = Date.UTC(2026, 9, 24, 15);
  const past = fc.integer({ min: now - 400 * 24 * 3600_000, max: now });

  it('ago is always a positive number with an m/h/d unit', () => {
    fc.assert(
      fc.property(fc.integer({ min: now - 400 * 24 * 3600_000, max: now + 3600_000 }), (ts) => {
        expect(ago(ts, now)).toMatch(/^[1-9]\d*[mhd]$/);
      }),
    );
  });

  it('dayNumber is at least 1 for anything in the past and day() says Today on day 1', () => {
    fc.assert(
      fc.property(past, (ts) => {
        const n = dayNumber(ts, now);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(day(ts, now) === 'Today').toBe(n === 1);
      }),
    );
  });

  it('formatSeconds round-trips to whole seconds', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100_000, noNaN: true }), (secs) => {
        const [m, s] = formatSeconds(secs).split(':').map(Number);
        expect(s).toBeLessThan(60);
        expect(m * 60 + s).toBe(Math.floor(secs));
      }),
    );
  });
});

// Validation ---------------------------------------------------------------------

describe('validateProfile (property-based)', () => {
  it('accepts exactly 2-40 char trimmed names with 3-20 char [a-z0-9._] usernames', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 50 }), fc.string({ maxLength: 25 }), (name, username) => {
        const valid = name.trim().length >= 2 && name.trim().length <= 40 && /^[a-z0-9._]{3,20}$/.test(username);
        expect(validateProfile(name, username) === null).toBe(valid);
      }),
    );
  });
});

describe('isBoston311Ticket (property-based)', () => {
  it('accepts every 1010 + 8 digit id and rejects other lengths', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{8}$/), fc.stringMatching(/^\d{0,7}$|^\d{9,12}$/), (eight, other) => {
        expect(isBoston311Ticket(`1010${eight}`)).toBe(true);
        expect(isBoston311Ticket(`1010${other}`)).toBe(false);
      }),
    );
  });
});
