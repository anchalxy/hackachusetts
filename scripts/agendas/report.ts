/**
 * Step 5 helper: turn a Challenge + its pseudonymized cohort into a BLUF-style resident input
 * brief (memo header → bottom line → key findings → figures → methodology), as plain text and
 * email-safe HTML.
 *
 * GUARDRAILS honored here:
 *   - Every number and every finding sentence is computed by this code from the cohort. We NEVER
 *     ask the model for a count, an average, a share or a ranking.
 *   - Claude is used ONLY, and only optionally, to phrase an extra neutral context paragraph from
 *     numbers we already computed. Its text is screened against CAUSAL_CLAIM and dropped if it
 *     implies the residents' work caused an outcome.
 *   - No contacts or emails are invented; recipients come straight off the Challenge.
 *   - Every brief states plainly that the data is opt-in, aggregated and pseudonymized.
 *
 * HTML is table-based with inline styles only (no <style>, no SVG, no scripts) so it renders the
 * same in Gmail, Outlook and Apple Mail.
 *
 * No `@/` imports: imported by the plain-Node send-digests script.
 */
import { CAUSAL_CLAIM } from '../../src/lib/challenge-updates.ts';
import type { Challenge } from '../../src/lib/challenges.ts';
import {
    AGE_BUCKETS,
    COUNCIL_DOCKETS,
    COUNCIL_OUTCOMES,
    CROSSINGS,
    CUMMINS_ISSUES,
    CUMMINS_MEASURES,
    PB_PROJECTS,
    RAT_OUTCOMES,
    RAT_SIGNS,
    URBAN_WILDS,
    WALK_MODES,
    WILD_CHANGES,
    WILD_CHANGE_LABELS,
    genericRatingLabel,
    type AgeBucket,
    type Cohort,
    type CouncilSubmission,
    type CumminsMeasure,
    type CumminsSubmission,
    type GenericSubmission,
    type PbSubmission,
    type RatPatrolSubmission,
    type Submission,
    type UrbanWildSubmission,
    type WalkMode,
} from './submissions.ts';

const PRIVACY_NOTE =
  'Aggregated and pseudonymized. No names, emails, addresses or individual identities are included. ' +
  'Quotes are attributed by neighborhood, and by age group only when that group has 10 or more participants.';

// ---- Report model ------------------------------------------------------------

type Row = { label: string; value: number; display: string; sub?: string; emphasis?: boolean };
type Segment = { label: string; value: number; color?: string };

export type Figure = { title: string; note?: string } & (
  | { kind: 'ranked'; rows: Row[] }
  | { kind: 'columns'; bars: Row[] }
  | { kind: 'stacked'; groups: { label?: string; segments: Segment[] }[] }
  | { kind: 'heatmap'; scale: 'rating' | 'pct'; columns: string[]; rows: { label: string; cells: (number | null)[] }[] }
  | { kind: 'diverging'; leftLabel: string; rightLabel: string; rows: { label: string; left: number; right: number }[] }
  | { kind: 'table'; columns: string[]; rows: { cells: string[]; bar?: number }[] }
);

export type Report = {
  challengeId: string;
  challengeTitle: string;
  intendedPoc: string;
  to: string;
  cc: string[];
  date: string;
  re: string;
  sourceUrl: string;
  totalParticipants: number;
  byNeighborhood: { label: string; count: number }[];
  byAgeBucket: { label: AgeBucket; count: number }[];
  headline: string;
  bottomLine: string;
  keyFindings: string[];
  kpis: { value: string; label: string }[];
  figures: Figure[];
  quotes: { text: string; who: string }[];
  method: string;
  coverage: string;
  /** Optional extra context paragraph (Claude, from our numbers). Empty when off. */
  summary: string;
  privacyNote: string;
};

type Analysis = Pick<Report, 'headline' | 'bottomLine' | 'keyFindings' | 'kpis' | 'figures'>;

// ---- Math + formatting ------------------------------------------------------

const sum = (n: number[]): number => n.reduce((a, b) => a + b, 0);
const mean = (n: number[]): number => (n.length ? sum(n) / n.length : 0);
const median = (n: number[]): number => {
  if (!n.length) return 0;
  const s = [...n].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (count: number, total: number): number => (total ? Math.round((count / total) * 100) : 0);
const f1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
const int = (n: number): string => Math.round(n).toLocaleString('en-US');
const usdM = (n: number): string => `$${(n / 1e6).toFixed(2)}M`;
const usdK = (n: number): string => (n >= 1e6 ? usdM(n) : `$${Math.round(n / 1000)}K`);
const hours = (h: number): string => (h < 48 ? `${Math.round(h)} hrs` : `${f1(h / 24)} days`);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const minBy = <T>(xs: T[], f: (x: T) => number): T => xs.reduce((a, b) => (f(b) < f(a) ? b : a));
const maxBy = <T>(xs: T[], f: (x: T) => number): T => xs.reduce((a, b) => (f(b) > f(a) ? b : a));

function countBy<T>(items: T[], key: (item: T) => string): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function formatDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  return new Date(`${ymd}T12:00:00-05:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

// Boston.gov palette: Charles Blue, Optimistic Blue, Freedom Trail Red, plus neutrals.
const NAVY = '#091f2f';
const BLUE = '#1871bd';
const BLUE_MID = '#6fa3d8';
const BLUE_LT = '#c5dbf0';
const GOLD = '#e0a526';
const RED = '#c8102e';
const GRAY = '#b8bec5';
const INK = '#1f1f1f';
const SUB = '#5a5a5a';
const RULE = '#d6d6d6';
const SEQ = [NAVY, BLUE, BLUE_MID, BLUE_LT, GOLD, GRAY];

// ---- Per-challenge analyses -------------------------------------------------

const MEASURE_LABEL: Record<CumminsMeasure, string> = {
  sidewalk: 'Sidewalk condition',
  crossing: 'Crossing safety',
  busStop: 'Bus stop access',
  lighting: 'Lighting',
};
const MODE_LABEL: Record<WalkMode, string> = {
  walking: 'Walking',
  bike: 'Bike',
  stroller: 'Stroller',
  wheelchair: 'Wheelchair / mobility aid',
};
const MODE_PEOPLE: Record<WalkMode, string> = {
  walking: 'people walking',
  bike: 'cyclists',
  stroller: 'stroller users',
  wheelchair: 'wheelchair and mobility-aid users',
};

function cummins(subs: CumminsSubmission[]): Analysis {
  const N = subs.length;
  const modes = WALK_MODES.map((mode) => {
    const m = subs.filter((s) => s.mode === mode);
    return { mode, n: m.length, avg: CUMMINS_MEASURES.map((k) => mean(m.map((s) => s.ratings[k]))) };
  }).filter((m) => m.n > 0);
  const overall = CUMMINS_MEASURES.map((k) => mean(subs.map((s) => s.ratings[k])));
  const lowI = overall.indexOf(Math.min(...overall));

  const cells = modes.filter((m) => m.n >= 20).flatMap((m) => m.avg.map((v, i) => ({ m, i, v })));
  const worst = minBy(cells, (c) => c.v);
  const walking = modes.find((m) => m.mode === 'walking');

  const crossings = CROSSINGS.map((c) => {
    const secs = subs.flatMap((s) => s.crossingSeconds.filter((x) => x.crossing === c).map((x) => x.seconds));
    return { c, n: secs.length, avg: mean(secs) };
  }).filter((c) => c.n > 0);
  const shortest = minBy(crossings, (c) => c.avg);
  const longest = maxBy(crossings, (c) => c.avg);
  const timings = sum(crossings.map((c) => c.n));

  const mobility = subs.filter((s) => s.mode === 'wheelchair' || s.mode === 'stroller');
  const issues = CUMMINS_ISSUES.map((i) => ({
    i,
    all: subs.filter((s) => s.issues.includes(i)).length,
    mob: mobility.filter((s) => s.issues.includes(i)).length,
  })).sort((a, b) => b.all - a.all);
  const topIssue = issues[0];
  const topMob = maxBy(issues, (x) => x.mob);
  const worstLabel = MEASURE_LABEL[CUMMINS_MEASURES[worst.i]].toLowerCase();
  const gap = walking ? walking.avg[worst.i] - worst.v : 0;

  return {
    headline: `${cap(MODE_PEOPLE[worst.m.mode])} rate ${worstLabel} ${f1(worst.v)}/5; ${shortest.c} signal averages ${f1(shortest.avg)}s`,
    bottomLine:
      `${int(N)} residents audited the redesigned Cummins Highway. ` +
      `${MEASURE_LABEL[CUMMINS_MEASURES[lowI]]} was the lowest-rated measure overall (${f1(overall[lowI])} out of 5). ` +
      `${cap(MODE_PEOPLE[worst.m.mode])} gave the lowest score of any group: ${f1(worst.v)} for ${worstLabel}` +
      (walking && worst.m.mode !== 'walking' ? `, versus ${f1(walking.avg[worst.i])} for people walking. ` : '. ') +
      `The walk signal at ${shortest.c} averaged ${f1(shortest.avg)} seconds, the shortest of the ${crossings.length} crossings timed.`,
    keyFindings: [
      `${MEASURE_LABEL[CUMMINS_MEASURES[lowI]]} averaged ${f1(overall[lowI])}/5 across all ${int(N)} audits, the lowest of the four measures.`,
      walking && worst.m.mode !== 'walking'
        ? `${cap(MODE_PEOPLE[worst.m.mode])} (n = ${int(worst.m.n)}) rated ${worstLabel} ${f1(gap)} points lower than people walking.`
        : `${cap(MODE_PEOPLE[worst.m.mode])} (n = ${int(worst.m.n)}) gave the lowest score of any group.`,
      `${shortest.c} averaged ${f1(shortest.avg)}s of walk signal over ${int(shortest.n)} timings, ${f1(longest.avg - shortest.avg)}s less than ${longest.c}.`,
      `${topIssue.i} was the most-reported obstruction (${pct(topIssue.all, N)}% of audits). Among wheelchair and stroller users the top problem was ${topMob.i.toLowerCase()} (${pct(topMob.mob, mobility.length)}%).`,
    ],
    kpis: [
      { value: int(N), label: 'audits completed' },
      { value: int(timings), label: 'walk signals timed' },
      { value: int(mobility.length), label: 'wheelchair and stroller audits' },
      { value: `${f1(mean(subs.map((s) => mean(CUMMINS_MEASURES.map((k) => s.ratings[k])))))}/5`, label: 'average rating' },
    ],
    figures: [
      {
        kind: 'heatmap',
        title: 'Average rating by travel mode',
        note: '1 = poor, 5 = good. Red cells are below 2.5; blue cells are above 3.5.',
        scale: 'rating',
        columns: CUMMINS_MEASURES.map((k) => MEASURE_LABEL[k]),
        rows: [
          ...modes.map((m) => ({ label: `${MODE_LABEL[m.mode]} (${int(m.n)})`, cells: m.avg })),
          { label: `All audits (${int(N)})`, cells: overall },
        ],
      },
      {
        kind: 'columns',
        title: 'Average walk-signal time by crossing, in seconds',
        note: `${int(timings)} timings taken with the in-app timer. Crossings shown in corridor order from Fairway St.`,
        bars: crossings.map((c) => ({ label: c.c, value: c.avg, display: `${f1(c.avg)}s`, emphasis: c === shortest })),
      },
      {
        kind: 'ranked',
        title: 'Obstructions reported, share of audits',
        note: 'Second line: share among wheelchair and stroller audits.',
        rows: issues.map((x, i) => ({
          label: x.i,
          value: pct(x.all, N),
          display: `${pct(x.all, N)}%`,
          sub: `${pct(x.mob, mobility.length)}% wheelchair/stroller`,
          emphasis: i === 0,
        })),
      },
      {
        kind: 'stacked',
        title: 'How residents traveled the corridor',
        groups: [{ segments: modes.map((m, i) => ({ label: MODE_LABEL[m.mode], value: m.n, color: SEQ[i] })) }],
      },
    ],
  };
}

function pb(subs: PbSubmission[]): Analysis {
  const N = subs.length;
  const projects = PB_PROJECTS.map((p) => ({
    ...p,
    funded: subs.filter((s) => s.ballot.some((b) => b.projectId === p.id)).length,
    first: subs.filter((s) => s.ranking[0] === p.id).length,
    last: subs.filter((s) => s.firstCut === p.id).length,
  })).sort((a, b) => b.funded - a.funded);
  const [top, second, third] = projects;
  const mostFirst = maxBy(projects, (p) => p.first);
  const mostLast = maxBy(projects, (p) => p.last);
  const ages = AGE_BUCKETS.map((b) => ({ b, s: subs.filter((x) => x.ageBucket === b) })).filter((a) => a.s.length > 0);
  const share = (group: PbSubmission[], id: string) => pct(group.filter((s) => s.ballot.some((b) => b.projectId === id)).length, group.length);
  const young = subs.filter((s) => s.ageBucket === '18–24');
  const old = subs.filter((s) => s.ageBucket === '65+');
  const gap = maxBy(projects, (p) => Math.abs(share(young, p.id) - share(old, p.id)));
  const avgSpend = mean(subs.map((s) => sum(s.ballot.map((b) => b.dollars))));

  return {
    headline: `${top.label} funded on ${pct(top.funded, N)}% of ${int(N)} resident ballots`,
    bottomLine:
      `${int(N)} residents built their own $2 million ballot from the seven priced projects. ` +
      `${top.label} was funded most often (${pct(top.funded, N)}% of ballots), followed by ${second.label} (${pct(second.funded, N)}%). ` +
      `${mostLast.label} was ranked last most often (${pct(mostLast.last, N)}%). ` +
      `Residents 18–24 and 65+ split most on ${gap.label}: ${share(young, gap.id)}% vs. ${share(old, gap.id)}%.`,
    keyFindings: [
      `Funded most often: ${top.label} (${pct(top.funded, N)}%), ${second.label} (${pct(second.funded, N)}%), ${third.label} (${pct(third.funded, N)}%).`,
      `Ranked #1 most often: ${mostFirst.label} (${pct(mostFirst.first, N)}% of ballots).`,
      `Ranked last most often: ${mostLast.label} (${pct(mostLast.last, N)}%).`,
      `Largest age gap: ${share(young, gap.id)}% of residents 18–24 funded ${gap.label}, vs. ${share(old, gap.id)}% of residents 65+.`,
    ],
    kpis: [
      { value: int(N), label: 'ballots submitted' },
      { value: f1(mean(subs.map((s) => s.ballot.length))), label: 'projects funded per ballot' },
      { value: usdM(avgSpend), label: 'average ballot' },
      { value: String(new Set(subs.map((s) => s.neighborhood)).size), label: 'neighborhoods' },
    ],
    figures: [
      {
        kind: 'ranked',
        title: 'Share of ballots funding each project',
        note: 'Price tags from last cycle’s ballot.',
        rows: projects.map((p, i) => ({ label: p.label, value: pct(p.funded, N), display: `${pct(p.funded, N)}%`, sub: usdK(p.dollars), emphasis: i === 0 })),
      },
      {
        kind: 'diverging',
        title: 'Ranked last vs. ranked first',
        note: 'Share of all ballots.',
        leftLabel: 'Ranked last',
        rightLabel: 'Ranked #1',
        rows: [...projects].sort((a, b) => b.first - a.first).map((p) => ({ label: p.label, left: pct(p.last, N), right: pct(p.first, N) })),
      },
      {
        kind: 'heatmap',
        title: 'Share of ballots funding each project, by age',
        note: 'Darker = funded on more ballots in that age group.',
        scale: 'pct',
        columns: ages.map((a) => `${a.b} (${int(a.s.length)})`),
        rows: projects.map((p) => ({ label: p.label, cells: ages.map((a) => share(a.s, p.id)) })),
      },
    ],
  };
}

function council(subs: CouncilSubmission[]): Analysis {
  const N = subs.length;
  const live = subs.filter((s) => s.attended === 'livestream').length;
  const dockets = COUNCIL_DOCKETS.map((d) => {
    const s = subs.filter((x) => x.docket === d.id);
    const lean = (l: string) => pct(s.filter((x) => x.lean === l).length, s.length);
    const outcomes = COUNCIL_OUTCOMES.map((o) => ({ o, p: pct(s.filter((x) => x.outcome === o).length, s.length) }));
    const concerns = countBy(s, (x) => x.concern);
    return { ...d, s, n: s.length, support: lean('support'), mixed: lean('mixed'), oppose: lean('oppose'), outcomes, concerns };
  }).filter((d) => d.n > 0);
  const lead = dockets[0];
  const topOutcome = maxBy(lead.outcomes, (o) => o.p);

  return {
    headline: `${lead.id}: ${lead.support}% support, ${lead.oppose}% oppose among ${int(lead.n)} residents`,
    bottomLine:
      `${int(N)} residents covered the City Council meeting (${pct(live, N)}% by livestream). ` +
      dockets.map((d) => `On ${d.id} (${d.label}), ${d.support}% landed in support, ${d.oppose}% opposed and ${d.mixed}% were mixed (n = ${int(d.n)}).`).join(' ') +
      ` ${topOutcome.p}% recorded ${lead.id} as "${topOutcome.o}"; ${100 - topOutcome.p}% recorded a different outcome.`,
    keyFindings: [
      ...dockets.map((d) => `${d.id}: top concern was "${d.concerns[0].label}" (${pct(d.concerns[0].count, d.n)}% of notes).`),
      `${100 - topOutcome.p}% of residents following ${lead.id} recorded an outcome other than "${topOutcome.o}".`,
    ],
    kpis: [
      { value: int(N), label: 'meeting notes filed' },
      { value: int(N - live), label: 'attended in person' },
      { value: int(live), label: 'watched the livestream' },
      { value: String(dockets.length), label: 'dockets followed' },
    ],
    figures: [
      {
        kind: 'stacked',
        title: 'Where residents landed, by docket',
        groups: dockets.map((d) => ({
          label: `${d.id} (${int(d.n)})`,
          segments: [
            { label: 'Support', value: d.support, color: BLUE },
            { label: 'Mixed', value: d.mixed, color: GRAY },
            { label: 'Oppose', value: d.oppose, color: GOLD },
          ],
        })),
      },
      ...dockets.map(
        (d): Figure => ({
          kind: 'ranked',
          title: `Top concerns raised: ${d.id} ${d.label}`,
          rows: d.concerns.map((c, i) => ({ label: c.label, value: pct(c.count, d.n), display: `${pct(c.count, d.n)}%`, emphasis: i === 0 })),
        }),
      ),
      {
        kind: 'table',
        title: 'Outcome residents recorded',
        columns: ['Outcome', ...dockets.map((d) => d.id)],
        rows: COUNCIL_OUTCOMES.map((o) => ({ cells: [cap(o), ...dockets.map((d) => `${d.outcomes.find((x) => x.o === o)!.p}%`)] })),
      },
    ],
  };
}

function urbanWild(subs: UrbanWildSubmission[]): Analysis {
  const N = subs.length;
  const changes = WILD_CHANGES.map((c) => ({ c, n: subs.filter((s) => s.changes.includes(c)).length })).sort((a, b) => b.n - a.n);
  const sites = URBAN_WILDS.map((w) => ({ w, s: subs.filter((x) => x.wild === w) })).filter((x) => x.s.length > 0);
  const siteShare = (s: UrbanWildSubmission[], c: string) => pct(s.filter((x) => x.changes.includes(c as never)).length, s.length);
  const mostWild = maxBy(sites, (x) => siteShare(x.s, 'wild'));
  const who = countBy(subs, (s) => s.whoFor);
  const [a, b, c] = changes;
  const L = (x: { c: string }) => WILD_CHANGE_LABELS[x.c as keyof typeof WILD_CHANGE_LABELS];

  return {
    headline: `${L(a)} tops requests at ${sites.length} urban wilds (${pct(a.n, N)}% of ${int(N)} designs)`,
    bottomLine:
      `${int(N)} residents visited one of ${sites.length} urban wilds and proposed changes. ` +
      `${L(a)} was the most-requested change (${pct(a.n, N)}% of designs), followed by ${L(b).toLowerCase()} (${pct(b.n, N)}%) and ${L(c).toLowerCase()} (${pct(c.n, N)}%). ` +
      `${mostWild.w} had the highest share asking to leave it wild (${siteShare(mostWild.s, 'wild')}%).`,
    keyFindings: [
      ...sites.map((x) => {
        const t = maxBy(WILD_CHANGES.slice(), (c) => siteShare(x.s, c));
        return `${x.w} (${int(x.s.length)} visits): top request was ${WILD_CHANGE_LABELS[t].toLowerCase()} (${siteShare(x.s, t)}%).`;
      }),
      `Most common answer to "who is this space for": ${who[0].label.toLowerCase()} (${pct(who[0].count, N)}%).`,
    ],
    kpis: [
      { value: int(N), label: 'site visits and designs' },
      { value: String(sites.length), label: 'urban wilds covered' },
      { value: f1(mean(subs.map((s) => s.changes.length))), label: 'changes per design' },
      { value: String(new Set(subs.map((s) => s.neighborhood)).size), label: 'neighborhoods' },
    ],
    figures: [
      { kind: 'ranked', title: 'Most-requested changes, share of designs', rows: changes.map((x, i) => ({ label: L(x), value: pct(x.n, N), display: `${pct(x.n, N)}%`, emphasis: i === 0 })) },
      {
        kind: 'heatmap',
        title: 'Requested changes by site',
        note: 'Share of designs at each site. Darker = requested more often.',
        scale: 'pct',
        columns: sites.map((x) => `${x.w} (${int(x.s.length)})`),
        rows: changes.map((x) => ({ label: L(x), cells: sites.map((s) => siteShare(s.s, x.c)) })),
      },
      { kind: 'columns', title: 'Visits by site', bars: sites.map((x) => ({ label: x.w, value: x.s.length, display: int(x.s.length) })) },
      { kind: 'ranked', title: 'Who residents say the space is for', rows: who.map((w) => ({ label: w.label, value: pct(w.count, N), display: `${pct(w.count, N)}%` })) },
    ],
  };
}

function ratPatrol(subs: RatPatrolSubmission[]): Analysis {
  const N = subs.length;
  const med = median(subs.map((s) => s.responseHours));
  const outcome = (o: string) => pct(subs.filter((s) => s.outcome === o).length, N);
  const hoods = countBy(subs, (s) => s.hotspot)
    .filter((h) => h.count >= 15)
    .map((h) => {
      const s = subs.filter((x) => x.hotspot === h.label);
      return { hood: h.label, n: h.count, med: median(s.map((x) => x.responseHours)), noAction: pct(s.filter((x) => x.outcome === 'closed, no visible action').length, s.length) };
    })
    .sort((a, b) => b.med - a.med);
  const slow = hoods[0];
  const fast = hoods[hoods.length - 1];
  const buckets = [
    ['Under 12 hrs', 0, 12],
    ['12–24 hrs', 12, 24],
    ['1–3 days', 24, 72],
    ['3–7 days', 72, 168],
    ['Over 7 days', 168, Infinity],
  ] as const;
  const signs = RAT_SIGNS.map((g) => ({ g, n: subs.filter((s) => s.sign === g).length })).sort((a, b) => b.n - a.n);
  const over3 = pct(subs.filter((s) => s.responseHours > 72).length, N);
  const maxMed = Math.max(...hoods.map((h) => h.med), 1);

  return {
    headline: `Median 311 response ${hours(med)}; ${outcome('closed, no visible action')}% closed with no visible action`,
    bottomLine:
      `${int(N)} residents reported rodent activity through BOS:311 and checked back after 7 days. ` +
      `The median time to a first city response was ${hours(med)}. ` +
      `${outcome('closed, no visible action')}% of tickets were closed with no visible action, and ${outcome('still open, no change')}% were still open with no change after a week. ` +
      (slow && fast && slow !== fast ? `${slow.hood} had the slowest median response (${hours(slow.med)}, n = ${slow.n}); ${fast.hood} had the fastest (${hours(fast.med)}).` : ''),
    keyFindings: [
      `${over3}% of reports waited more than 3 days for a first response.`,
      `After 7 days: ${outcome('baited')}% baited, ${outcome('inspected')}% inspected, ${outcome('closed, no visible action')}% closed with no visible action, ${outcome('still open, no change')}% still open.`,
      slow && fast ? `Median response in ${slow.hood} was ${f1(slow.med / Math.max(fast.med, 1))}x the median in ${fast.hood}.` : `Median response: ${hours(med)}.`,
      `Most common sign reported: ${signs[0].g.toLowerCase()} (${pct(signs[0].n, N)}%).`,
    ],
    kpis: [
      { value: int(N), label: '311 tickets tracked' },
      { value: hours(med), label: 'median first response' },
      { value: `${outcome('closed, no visible action')}%`, label: 'closed, no visible action' },
      { value: String(hoods.length), label: 'neighborhoods with 15+ reports' },
    ],
    figures: [
      {
        kind: 'columns',
        title: 'Time to first 311 response',
        note: 'Share of tickets. Response time is as recorded by the resident.',
        bars: buckets.map(([label, lo, hi]) => {
          const p = pct(subs.filter((s) => s.responseHours >= lo && s.responseHours < hi).length, N);
          return { label, value: p, display: `${p}%`, emphasis: lo >= 72 };
        }),
      },
      {
        kind: 'table',
        title: 'Response by neighborhood, slowest first',
        note: 'Neighborhoods with 15 or more reports.',
        columns: ['Neighborhood', 'Reports', 'Median response', 'Closed, no action'],
        rows: hoods.map((h) => ({ cells: [h.hood, int(h.n), hours(h.med), `${h.noAction}%`], bar: h.med / maxMed })),
      },
      {
        kind: 'stacked',
        title: 'What happened after 7 days',
        groups: [
          {
            segments: RAT_OUTCOMES.map((o) => ({
              label: cap(o),
              value: outcome(o),
              color: { baited: NAVY, inspected: BLUE_MID, 'closed, no visible action': GOLD, 'still open, no change': GRAY }[o],
            })),
          },
        ],
      },
      { kind: 'ranked', title: 'Signs of rodents reported', rows: signs.map((s, i) => ({ label: s.g, value: pct(s.n, N), display: `${pct(s.n, N)}%`, emphasis: i === 0 })) },
    ],
  };
}

function generic(subs: GenericSubmission[], challenge: Challenge): Analysis {
  const N = subs.length;
  const label = genericRatingLabel(challenge.type);
  const avg = mean(subs.map((s) => s.rating));
  const hi = pct(subs.filter((s) => s.rating >= 4).length, N);
  const lo = pct(subs.filter((s) => s.rating <= 2).length, N);
  const themes = countBy(subs.flatMap((s) => s.themes.map((t) => ({ t }))), (x) => x.t);
  const ages = AGE_BUCKETS.map((b) => ({ b, s: subs.filter((x) => x.ageBucket === b) })).filter((a) => a.s.length >= 20);
  const lowAge = ages.length ? minBy(ages, (a) => mean(a.s.map((x) => x.rating))) : null;
  const [t1, t2] = themes;

  return {
    headline: `${label} ${f1(avg)}/5; top theme "${t1.label}" (${pct(t1.count, N)}%)`,
    bottomLine:
      `${int(N)} residents took part. ${label} averaged ${f1(avg)} out of 5: ${hi}% gave a 4 or 5 and ${lo}% gave a 1 or 2. ` +
      `The most common theme in their notes was "${t1.label}" (${pct(t1.count, N)}%)` +
      (t2 ? `, followed by "${t2.label}" (${pct(t2.count, N)}%).` : '.'),
    keyFindings: [
      `${hi}% rated ${label.toLowerCase()} 4 or 5; ${lo}% rated it 1 or 2.`,
      `Top themes: ${themes.slice(0, 3).map((t) => `${t.label} (${pct(t.count, N)}%)`).join('; ')}.`,
      ...(lowAge ? [`Residents ${lowAge.b} gave the lowest average (${f1(mean(lowAge.s.map((x) => x.rating)))}/5, n = ${int(lowAge.s.length)}).`] : []),
    ],
    kpis: [
      { value: int(N), label: 'residents took part' },
      { value: `${f1(avg)}/5`, label: label.toLowerCase() },
      { value: `${hi}%`, label: 'rated 4 or 5' },
      { value: String(new Set(subs.map((s) => s.neighborhood)).size), label: 'neighborhoods' },
    ],
    figures: [
      {
        kind: 'columns',
        title: `${label}, 1 to 5`,
        note: '1 = lowest, 5 = highest. Share of responses.',
        bars: [1, 2, 3, 4, 5].map((r) => {
          const p = pct(subs.filter((s) => s.rating === r).length, N);
          return { label: String(r), value: p, display: `${p}%` };
        }),
      },
      { kind: 'ranked', title: 'Themes in residents’ notes', note: 'A note can carry up to two themes.', rows: themes.map((t, i) => ({ label: t.label, value: pct(t.count, N), display: `${pct(t.count, N)}%`, emphasis: i === 0 })) },
      {
        kind: 'table',
        title: `${label} by age group`,
        columns: ['Age', 'Responses', 'Average', 'Rated 4–5'],
        rows: ages.map((a) => ({ cells: [a.b, int(a.s.length), f1(mean(a.s.map((x) => x.rating))), `${pct(a.s.filter((x) => x.rating >= 4).length, a.s.length)}%`] })),
      },
    ],
  };
}

// ---- Shared sections -----------------------------------------------------------

function participationFigures(subs: Submission[]): Figure[] {
  const N = subs.length;
  const hoods = countBy(subs, (s) => s.neighborhood);
  const top = hoods.slice(0, 8);
  const rest = hoods.slice(8);
  const max = top[0]?.count ?? 1;
  return [
    {
      kind: 'table',
      title: 'Who took part, by neighborhood',
      columns: ['Neighborhood', 'Responses', 'Share'],
      rows: [
        ...top.map((h) => ({ cells: [h.label, int(h.count), `${pct(h.count, N)}%`], bar: h.count / max })),
        ...(rest.length
          ? [{ cells: [`All other (${rest.length} neighborhoods)`, int(sum(rest.map((r) => r.count))), `${pct(sum(rest.map((r) => r.count)), N)}%`] }]
          : []),
      ],
    },
    {
      kind: 'stacked',
      title: 'Who took part, by age',
      groups: [
        {
          segments: AGE_BUCKETS.map((b, i) => ({ label: b, value: subs.filter((s) => s.ageBucket === b).length, color: [NAVY, BLUE, BLUE_MID, BLUE_LT, GOLD][i] })),
        },
      ],
    },
  ];
}

function pickQuotes(subs: Submission[]): { text: string; who: string }[] {
  const comboCount = new Map<string, number>();
  for (const s of subs) comboCount.set(`${s.neighborhood}|${s.ageBucket}`, (comboCount.get(`${s.neighborhood}|${s.ageBucket}`) ?? 0) + 1);
  const seen = new Set<string>();
  const out: { text: string; who: string }[] = [];
  const step = Math.max(1, Math.floor(subs.length / 23));
  for (let i = 0; i < subs.length && out.length < 3; i += step) {
    const s = subs[i];
    if (!s.comment || seen.has(s.comment)) continue;
    seen.add(s.comment);
    const ok = (comboCount.get(`${s.neighborhood}|${s.ageBucket}`) ?? 0) >= 10;
    out.push({ text: s.comment, who: ok ? `${s.neighborhood} resident, ${s.ageBucket}` : `${s.neighborhood} resident` });
  }
  return out;
}

function coverageNote(subs: Submission[], byHood: { label: string; count: number }[]): string {
  const N = subs.length;
  const young = pct(subs.filter((s) => s.ageBucket === '18–24' || s.ageBucket === '25–34').length, N);
  const old = pct(subs.filter((s) => s.ageBucket === '65+').length, N);
  return (
    `Opt-in sample, not a random survey. Residents 18–34 are ${young}% of responses and residents 65+ are ${old}%; ` +
    `${byHood[0]?.label ?? 'the top neighborhood'} residents are ${pct(byHood[0]?.count ?? 0, N)}%. Figures describe participants, not all residents.`
  );
}

async function claudeSummary(r: Omit<Report, 'summary'>): Promise<string> {
  try {
    // Lazy import: claude.ts throws at load without an API key, and the default path doesn't need it.
    const { structuredCall } = await import('./claude.ts');
    const { summary } = await structuredCall<{ summary: string }>({
      system:
        'Write two neutral sentences of context for a city official from numbers ALREADY COMPUTED. Do not invent, change or add any numbers, names, places or dates. Never suggest cause and effect between residents and city action.',
      schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false },
      effort: 'low',
      maxTokens: 800,
      content: [{ type: 'text', text: JSON.stringify({ bottomLine: r.bottomLine, keyFindings: r.keyFindings }) }],
    });
    const text = summary.trim();
    return text && !CAUSAL_CLAIM.test(text) ? text : '';
  } catch {
    return '';
  }
}

// ---- Public API --------------------------------------------------------------

export async function buildReport(
  challenge: Challenge,
  cohort: Cohort,
  useClaude = false,
  opts: { sendOn?: string } = {},
): Promise<Report> {
  const subs = cohort.submissions;
  const of = <K extends Submission['kind']>(k: K) => subs.filter((s): s is Extract<Submission, { kind: K }> => s.kind === k);
  let analysis: Analysis;
  switch (challenge.id) {
    case 'demo-pb-2-million':
      analysis = pb(of('pb'));
      break;
    case 'demo-cummins-walk-audit':
      analysis = cummins(of('cummins'));
      break;
    case 'demo-council-oct-28':
      analysis = council(of('council'));
      break;
    case 'demo-urban-wild':
      analysis = urbanWild(of('urbanWild'));
      break;
    case 'demo-rat-patrol':
      analysis = ratPatrol(of('ratPatrol'));
      break;
    default:
      analysis = generic(of('generic'), challenge);
  }

  const byNeighborhood = countBy(subs, (s) => s.neighborhood);
  const [primary, ...others] = challenge.contacts;
  const who = (c: (typeof challenge.contacts)[number]) => (c.name ? `${c.name}, ${c.office}` : c.office);
  const steps = challenge.task.steps.length ? challenge.task.steps : [challenge.task.intro ?? challenge.summary];

  const partial: Omit<Report, 'summary'> = {
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    intendedPoc: challenge.poc,
    to: primary ? who(primary) : challenge.digestTo,
    cc: others.map(who),
    date: formatDate(opts.sendOn ?? challenge.deadlineDate),
    re: challenge.agendaItem,
    sourceUrl: challenge.sourceUrl,
    totalParticipants: subs.length,
    byNeighborhood,
    byAgeBucket: AGE_BUCKETS.map((b) => ({ label: b, count: subs.filter((s) => s.ageBucket === b).length })).filter((b) => b.count > 0),
    ...analysis,
    figures: [...analysis.figures, ...participationFigures(subs)],
    quotes: pickQuotes(subs),
    method: `Residents were asked to: ${steps.map((s) => s.replace(/\.$/, '')).join('; ')}.`,
    coverage: coverageNote(subs, byNeighborhood),
    privacyNote: PRIVACY_NOTE,
  };
  return { ...partial, summary: useClaude ? await claudeSummary(partial) : '' };
}

export function renderSubject(r: Report): string {
  return `Resident input: ${r.challengeTitle}: ${r.headline}`;
}

// ---- Plain text ----------------------------------------------------------------

function figureText(f: Figure, n: number): string[] {
  const out = [`FIGURE ${n}. ${f.title.toUpperCase()}`];
  const line = (label: string, value: string) => `  ${label.padEnd(44, '.')} ${value}`;
  switch (f.kind) {
    case 'ranked':
      for (const r of f.rows) out.push(line(r.label, r.display + (r.sub ? `  (${r.sub})` : '')));
      break;
    case 'columns':
      for (const b of f.bars) out.push(line(b.label, b.display));
      break;
    case 'stacked':
      for (const g of f.groups) {
        const total = sum(g.segments.map((s) => s.value)) || 1;
        out.push(`  ${g.label ? `${g.label}: ` : ''}${g.segments.map((s) => `${s.label} ${pct(s.value, total)}%`).join(' | ')}`);
      }
      break;
    case 'heatmap':
      out.push(`  ${''.padEnd(28)}${f.columns.map((c) => c.slice(0, 18).padStart(20)).join('')}`);
      for (const r of f.rows)
        out.push(`  ${r.label.slice(0, 28).padEnd(28)}${r.cells.map((c) => (c === null ? '–' : f.scale === 'rating' ? f1(c) : `${c}%`).padStart(20)).join('')}`);
      break;
    case 'diverging':
      for (const r of f.rows) out.push(line(r.label, `${f.leftLabel} ${r.left}% | ${f.rightLabel} ${r.right}%`));
      break;
    case 'table':
      out.push(`  ${f.columns.join(' | ')}`);
      for (const r of f.rows) out.push(`  ${r.cells.join(' | ')}`);
      break;
  }
  if (f.note) out.push(`  Note: ${f.note}`);
  return [...out, ''];
}

export function renderText(r: Report): string {
  const lines = [
    `TO:   ${r.to}`,
    ...(r.cc.length ? [`CC:   ${r.cc.join('; ')}`] : []),
    'FROM: Tea Party resident input program',
    `DATE: ${r.date}`,
    `RE:   ${r.re}`,
    '',
    'BOTTOM LINE',
    r.bottomLine,
    '',
    'KEY FINDINGS',
    ...r.keyFindings.map((k, i) => `${i + 1}. ${k}`),
    '',
    ...(r.summary ? [r.summary, ''] : []),
    'AT A GLANCE',
    r.kpis.map((k) => `${k.value} ${k.label}`).join(' | '),
    '',
    ...r.figures.flatMap((f, i) => figureText(f, i + 1)),
    ...(r.quotes.length ? ['IN RESIDENTS’ WORDS', ...r.quotes.map((q) => `"${q.text}" (${q.who})`), ''] : []),
    'ABOUT THIS DATA',
    r.method,
    r.coverage,
    r.privacyNote,
    `Agenda item: ${r.sourceUrl}`,
    '',
    'Questions about this data? Reply to this email.',
  ];
  return lines.join('\n');
}

// ---- HTML ----------------------------------------------------------------------

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FONT = 'Arial,Helvetica,sans-serif';
const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse"';

/** A solid bar as a table cell pair: works in Outlook, where div widths don't. */
function bar(pctWidth: number, color: string, height = 12): string {
  const w = Math.max(1, Math.min(100, Math.round(pctWidth)));
  return (
    `<table ${TABLE}><tr>` +
    `<td width="${w}%" style="background:${color};height:${height}px;font-size:0;line-height:0">&nbsp;</td>` +
    (w < 100 ? `<td style="font-size:0;line-height:0">&nbsp;</td>` : '') +
    `</tr></table>`
  );
}

function ratingColor(v: number): string {
  if (v < 2.5) return '#f2c4c4';
  if (v < 3) return '#f8e1d5';
  if (v <= 3.5) return '#f1f1f1';
  if (v <= 4) return '#d6e5f4';
  return '#b3cfeb';
}
function pctColor(v: number, max: number): [string, string] {
  const t = max ? v / max : 0;
  if (t > 0.8) return [NAVY, '#fff'];
  if (t > 0.6) return [BLUE, '#fff'];
  if (t > 0.4) return [BLUE_MID, '#fff'];
  if (t > 0.2) return [BLUE_LT, INK];
  return ['#eef4fa', INK];
}

function legend(segments: Segment[], total: number): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px"><tr>` +
    segments
      .map(
        (s, i) =>
          `<td style="padding:0 14px 0 0;font:12px ${FONT};color:${SUB};white-space:nowrap">` +
          `<span style="display:inline-block;width:10px;height:10px;background:${s.color ?? SEQ[i % SEQ.length]};vertical-align:middle"></span>` +
          ` ${esc(s.label)} <b style="color:${INK}">${pct(s.value, total)}%</b></td>`,
      )
      .join('') +
    `</tr></table>`
  );
}

function figureHtml(f: Figure, n: number): string {
  let body = '';
  switch (f.kind) {
    case 'ranked': {
      const max = Math.max(...f.rows.map((r) => r.value), 1);
      body =
        `<table ${TABLE}>` +
        f.rows
          .map(
            (r) =>
              `<tr><td width="42%" style="padding:6px 12px 6px 0;font:13px ${FONT};color:${INK};vertical-align:middle">${esc(r.label)}` +
              (r.sub ? `<br><span style="font-size:11px;color:${SUB}">${esc(r.sub)}</span>` : '') +
              `</td><td style="padding:6px 0;vertical-align:middle">${bar((r.value / max) * 100, r.emphasis ? NAVY : BLUE_MID)}</td>` +
              `<td width="52" align="right" style="padding:6px 0 6px 10px;font:bold 13px ${FONT};color:${INK};vertical-align:middle">${esc(r.display)}</td></tr>`,
          )
          .join('') +
        `</table>`;
      break;
    }
    case 'columns': {
      const max = Math.max(...f.bars.map((b) => b.value), 1);
      const H = 140;
      body =
        `<table ${TABLE}><tr>` +
        f.bars
          .map(
            (b) =>
              `<td align="center" valign="bottom" style="height:${H + 22}px;padding:0 6px;vertical-align:bottom">` +
              `<div style="font:bold 12px ${FONT};color:${b.emphasis ? RED : INK};padding-bottom:4px">${esc(b.display)}</div>` +
              `<div style="height:${Math.max(2, Math.round((b.value / max) * H))}px;background:${b.emphasis ? RED : BLUE};width:70%;margin:0 auto;font-size:0;line-height:0">&nbsp;</div></td>`,
          )
          .join('') +
        `</tr><tr>` +
        f.bars
          .map((b) => `<td align="center" style="border-top:1px solid ${SUB};padding:6px 4px 0;font:12px ${FONT};color:${SUB}">${esc(b.label)}</td>`)
          .join('') +
        `</tr></table>`;
      break;
    }
    case 'stacked': {
      body = f.groups
        .map((g) => {
          const total = sum(g.segments.map((s) => s.value)) || 1;
          const strip =
            `<table ${TABLE}><tr>` +
            g.segments
              .filter((s) => s.value > 0)
              .map((s, i) => {
                const p = pct(s.value, total);
                const color = s.color ?? SEQ[i % SEQ.length];
                const dark = [NAVY, BLUE, RED].includes(color);
                return `<td width="${Math.max(1, (s.value / total) * 100).toFixed(1)}%" align="center" style="background:${color};height:26px;font:bold 11px ${FONT};color:${dark ? '#fff' : INK}">${p >= 7 ? `${p}%` : ''}</td>`;
              })
              .join('') +
            `</tr></table>`;
          return (
            (g.label ? `<div style="font:bold 13px ${FONT};color:${INK};margin:10px 0 4px">${esc(g.label)}</div>` : '') +
            strip +
            (f.groups.length === 1 || g === f.groups[f.groups.length - 1] ? legend(g.segments, total) : '')
          );
        })
        .join('');
      break;
    }
    case 'heatmap': {
      const max = Math.max(...f.rows.flatMap((r) => r.cells.map((c) => c ?? 0)), 1);
      body =
        `<table ${TABLE}><tr><td></td>` +
        f.columns.map((c) => `<td align="center" style="padding:4px 4px 6px;font:bold 11px ${FONT};color:${SUB};border-bottom:1px solid ${RULE}">${esc(c)}</td>`).join('') +
        `</tr>` +
        f.rows
          .map((r, ri) => {
            const isTotal = f.scale === 'rating' && ri === f.rows.length - 1;
            return (
              `<tr><td style="padding:7px 10px 7px 0;font:${isTotal ? 'bold ' : ''}13px ${FONT};color:${INK};white-space:nowrap;${isTotal ? `border-top:2px solid ${NAVY}` : ''}">${esc(r.label)}</td>` +
              r.cells
                .map((c) => {
                  if (c === null) return `<td align="center" style="font:13px ${FONT};color:${SUB}">–</td>`;
                  const [bg, fg] = f.scale === 'rating' ? [ratingColor(c), INK] : pctColor(c, max);
                  return `<td align="center" style="background:${bg};color:${fg};font:${isTotal ? 'bold ' : ''}13px ${FONT};padding:7px 4px;border:2px solid #fff">${f.scale === 'rating' ? f1(c) : `${c}%`}</td>`;
                })
                .join('') +
              `</tr>`
            );
          })
          .join('') +
        `</table>`;
      break;
    }
    case 'diverging': {
      const max = Math.max(...f.rows.flatMap((r) => [r.left, r.right]), 1);
      const side = (v: number, color: string, right: boolean) => {
        const w = Math.max(1, Math.round((v / max) * 100));
        const filled = `<td width="${w}%" style="background:${color};height:14px;font-size:0;line-height:0">&nbsp;</td>`;
        const empty = w < 100 ? `<td style="font-size:0;line-height:0">&nbsp;</td>` : '';
        return `<table ${TABLE}><tr>${right ? filled + empty : empty + filled}</tr></table>`;
      };
      body =
        `<table ${TABLE}><tr>` +
        `<td width="34%" align="right" style="font:bold 12px ${FONT};color:${GOLD};padding-bottom:6px">◀ ${esc(f.leftLabel)}</td><td></td>` +
        `<td width="34%" style="font:bold 12px ${FONT};color:${BLUE};padding-bottom:6px">${esc(f.rightLabel)} ▶</td></tr>` +
        f.rows
          .map(
            (r) =>
              `<tr><td style="padding:4px 0"><table ${TABLE}><tr><td width="36" align="right" style="font:12px ${FONT};color:${SUB};padding-right:6px">${r.left}%</td><td>${side(r.left, GOLD, false)}</td></tr></table></td>` +
              `<td align="center" style="padding:4px 10px;font:12px ${FONT};color:${INK}">${esc(r.label)}</td>` +
              `<td style="padding:4px 0"><table ${TABLE}><tr><td>${side(r.right, BLUE, true)}</td><td width="36" style="font:12px ${FONT};color:${SUB};padding-left:6px">${r.right}%</td></tr></table></td></tr>`,
          )
          .join('') +
        `</table>`;
      break;
    }
    case 'table': {
      const hasBar = f.rows.some((r) => r.bar !== undefined);
      body =
        `<table ${TABLE}><tr>` +
        f.columns.map((c, i) => `<td ${i ? 'align="right"' : ''} style="font:bold 12px ${FONT};color:${NAVY};padding:6px 8px;border-bottom:2px solid ${NAVY}">${esc(c)}</td>`).join('') +
        (hasBar ? `<td style="border-bottom:2px solid ${NAVY}"></td>` : '') +
        `</tr>` +
        f.rows
          .map(
            (r, ri) =>
              `<tr style="background:${ri % 2 ? '#f6f7f8' : '#fff'}">` +
              r.cells.map((c, i) => `<td ${i ? 'align="right"' : ''} style="font:13px ${FONT};color:${INK};padding:6px 8px">${esc(c)}</td>`).join('') +
              (hasBar ? `<td width="30%" style="padding:6px 8px">${r.bar !== undefined ? bar(r.bar * 100, BLUE_MID, 8) : ''}</td>` : '') +
              `</tr>`,
          )
          .join('') +
        `</table>`;
      break;
    }
  }
  return (
    `<tr><td style="padding:22px 0 0">` +
    `<div style="font:bold 14px ${FONT};color:${NAVY};margin-bottom:10px">Figure ${n}. ${esc(f.title)}</div>` +
    body +
    (f.note ? `<div style="font:italic 12px ${FONT};color:${SUB};margin-top:8px">${esc(f.note)}</div>` : '') +
    `</td></tr>`
  );
}

export function renderHtml(r: Report): string {
  const memoRow = (k: string, v: string) =>
    `<tr><td width="56" valign="top" style="font:bold 12px ${FONT};color:${SUB};padding:3px 0">${k}</td><td style="font:13px ${FONT};color:${INK};padding:3px 0">${v}</td></tr>`;
  const h2 = (t: string) =>
    `<tr><td style="padding:24px 0 0"><div style="font:bold 13px ${FONT};color:${NAVY};border-bottom:1px solid ${RULE};padding-bottom:5px;letter-spacing:.5px">${t}</div></td></tr>`;

  const rows = [
    // Masthead
    `<tr><td style="padding:0 0 10px;border-bottom:4px solid ${NAVY}"><table ${TABLE}><tr>` +
      `<td style="font:bold 20px Georgia,'Times New Roman',serif;color:${NAVY}">Resident Input Brief</td>` +
      `<td align="right" style="font:12px ${FONT};color:${SUB}">${esc(r.date)}</td></tr></table></td></tr>`,
    // Memo header
    `<tr><td style="padding:12px 0;border-bottom:1px solid ${RULE}"><table ${TABLE}>` +
      memoRow('TO', esc(r.to)) +
      (r.cc.length ? memoRow('CC', esc(r.cc.join('; '))) : '') +
      memoRow('FROM', 'Tea Party resident input program') +
      memoRow('RE', `${esc(r.re)} <a href="${esc(r.sourceUrl)}" style="color:${BLUE}">(agenda)</a>`) +
      `</table></td></tr>`,
    // BLUF
    `<tr><td style="padding:18px 0 0"><table ${TABLE}><tr><td style="border-left:5px solid ${BLUE};background:#f2f7fc;padding:14px 16px">` +
      `<div style="font:bold 12px ${FONT};color:${BLUE};letter-spacing:.5px;margin-bottom:6px">BOTTOM LINE</div>` +
      `<div style="font:15px/1.5 ${FONT};color:${INK}">${esc(r.bottomLine)}</div></td></tr></table></td></tr>`,
    h2('KEY FINDINGS'),
    `<tr><td style="padding:8px 0 0"><ol style="margin:0;padding-left:20px">` +
      r.keyFindings.map((k) => `<li style="font:14px/1.5 ${FONT};color:${INK};margin:0 0 6px">${esc(k)}</li>`).join('') +
      `</ol>${r.summary ? `<p style="font:14px/1.5 ${FONT};color:${INK};margin:8px 0 0">${esc(r.summary)}</p>` : ''}</td></tr>`,
    // KPI strip
    `<tr><td style="padding:18px 0 0"><table ${TABLE}><tr>` +
      r.kpis
        .map(
          (k, i) =>
            `<td width="25%" valign="top" style="border-top:3px solid ${NAVY};padding:10px ${i < r.kpis.length - 1 ? '12px' : '0'} 0 0">` +
            `<div style="font:bold 22px ${FONT};color:${NAVY}">${esc(k.value)}</div><div style="font:12px ${FONT};color:${SUB};margin-top:2px">${esc(k.label)}</div></td>`,
        )
        .join('') +
      `</tr></table></td></tr>`,
    h2('THE DATA'),
    ...r.figures.map((f, i) => figureHtml(f, i + 1)),
    ...(r.quotes.length
      ? [
          h2('IN RESIDENTS’ WORDS'),
          `<tr><td style="padding:6px 0 0">` +
            r.quotes
              .map(
                (q) =>
                  `<p style="margin:10px 0;font:italic 14px/1.5 Georgia,'Times New Roman',serif;color:${INK}">&ldquo;${esc(q.text)}&rdquo;` +
                  `<br><span style="font:normal 12px ${FONT};color:${SUB}">${esc(q.who)}</span></p>`,
              )
              .join('') +
            `</td></tr>`,
        ]
      : []),
    h2('ABOUT THIS DATA'),
    `<tr><td style="padding:8px 0 0;font:12px/1.55 ${FONT};color:${SUB}">` +
      `<p style="margin:0 0 6px">${esc(r.method)}</p><p style="margin:0 0 6px">${esc(r.coverage)}</p><p style="margin:0 0 6px">${esc(r.privacyNote)}</p>` +
      `<p style="margin:12px 0 0;color:${INK}">Questions about this data? Reply to this email.</p></td></tr>`,
  ];

  return (
    `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff">` +
    `<table ${TABLE}><tr><td align="center" style="padding:24px 16px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" style="width:100%;max-width:680px;border-collapse:collapse">` +
    rows.join('') +
    `</table></td></tr></table></body></html>`
  );
}
