/**
 * Step 4 of the challenges pipeline: look for what the city did after each past challenge.
 *
 *   node scripts/agendas/track-updates.ts [--since 2026-10-01] [--dry-run]
 *
 * For every challenge we've published (data/challenges/demo-week.json and each generated week)
 * it checks, once a week:
 *   - Boston dockets the challenge mentions: status changes in Legistar (referred, hearing held, passed)
 *   - the same dockets showing up on a new agenda (data/agendas/items.json from this week's scrape)
 *   - the challenge's source page and project pages: when the text changes, Claude reads the
 *     change and writes one plain sentence if something actually happened
 *
 * Writes data/challenges/updates.json (read by the app) and data/challenges/watch-cache.json
 * (page snapshots, script only). Challenges stay open for TRACK_WEEKS weekly checks, then close
 * as "closed" or "noUpdateFound". Updates never claim the user's work caused anything.
 *
 * --since treats docket actions on or after that date as new (default: the challenge's week).
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import {
  CAUSAL_CLAIM,
  TRACK_WEEKS,
  type ChallengeUpdate,
  type ChallengeUpdatesFile,
  type TrackedChallenge,
  type UpdateSource,
} from '../../src/lib/challenge-updates.ts';
import type { Challenge, ChallengeWeek } from '../../src/lib/challenges.ts';
import { costSummary, mapLimit, structuredCall } from './claude.ts';
import { bostonDate, getJson, getText, htmlToText } from './http.ts';
import type { AgendaItem } from './types.ts';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data', 'challenges');
const UPDATES_FILE = path.join(DATA, 'updates.json');
const CACHE_FILE = path.join(DATA, 'watch-cache.json');
const ITEMS_FILE = path.join(ROOT, 'data', 'agendas', 'items.json');

/** Pages worth watching beyond a challenge's source link (project pages, ballots, plans). */
const EXTRA_PAGES: Record<string, { label: string; url: string; publisher: string }[]> = {
  'demo-cummins-walk-audit': [
    {
      label: 'Cummins Highway project page',
      url: 'https://www.boston.gov/departments/public-works/project/cummins-highway',
      publisher: 'Boston Public Works',
    },
  ],
  'demo-pb-2-million': [
    {
      label: 'Participatory Budgeting (draft ballot)',
      url: 'https://www.boston.gov/departments/participatory-budgeting',
      publisher: 'Office of Participatory Budgeting',
    },
  ],
};

type PageWatch = { label: string; url: string; publisher: string };
type DocketWatch = { number: string; file: string };
type Watches = { pages: PageWatch[]; dockets: DocketWatch[] };

type PageSnapshot = { hash: string; text: string; checkedAt: string };
type WatchCache = { pages: Record<string, PageSnapshot>; dockets: Record<string, { matterId: number; url: string }> };

/** Monday of the current week (Boston time), so re-runs in the same week count once. */
function thisWeek(now = new Date()): string {
  const today = new Date(`${bostonDate(now)}T12:00:00`);
  const day = today.getDay();
  today.setDate(today.getDate() - ((day + 6) % 7));
  return today.toLocaleDateString('en-CA');
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  return existsSync(file) ? (JSON.parse(await readFile(file, 'utf8')) as T) : fallback;
}

/** Every week we've published: the demo week plus each generated area file. */
async function publishedWeeks(): Promise<ChallengeWeek[]> {
  const weeks: ChallengeWeek[] = [await readJson(path.join(DATA, 'demo-week.json'), null as never)];
  for (const entry of await readdir(DATA, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) continue;
    for (const file of await readdir(path.join(DATA, entry.name))) {
      if (file.endsWith('.json')) weeks.push(await readJson(path.join(DATA, entry.name, file), null as never));
    }
  }
  return weeks.filter(Boolean);
}

/** Boston dockets ("#1804", "Docket #1958") mentioned anywhere in the challenge. */
function watchesFor(challenge: Challenge, week: ChallengeWeek): Watches {
  const text = [
    challenge.title,
    challenge.summary,
    challenge.agendaItem,
    challenge.whyNow,
    ...(challenge.extras ?? []).flatMap((e) => e.items),
  ].join('\n');
  const isBoston = /Boston$/.test(week.area);
  const year = week.weekOf.slice(0, 4);
  const numbers = isBoston ? [...new Set([...text.matchAll(/#(\d{3,4})\b/g)].map((m) => m[1]))] : [];
  const office = challenge.contacts[0]?.office ?? 'City of Boston';
  return {
    dockets: numbers.map((n) => ({ number: n, file: `${year}-${n.padStart(4, '0')}` })),
    pages: [{ label: 'Challenge source', url: challenge.sourceUrl, publisher: office }, ...(EXTRA_PAGES[challenge.id] ?? [])],
  };
}

// ---------- Dockets (Legistar) ----------

type LegistarMatter = { MatterId: number; MatterGuid: string; MatterFile: string };
type LegistarHistory = {
  MatterHistoryId: number;
  MatterHistoryActionDate: string;
  MatterHistoryActionName: string | null;
  MatterHistoryActionBodyName: string | null;
  MatterHistoryActionText: string | null;
};

async function findMatter(file: string, cache: WatchCache) {
  if (cache.dockets[file]) return cache.dockets[file];
  const filter = encodeURIComponent(`MatterFile eq '${file}'`);
  const [matter] = await getJson<LegistarMatter[]>(`https://webapi.legistar.com/v1/boston/matters?$filter=${filter}`);
  if (!matter) return null;
  const found = {
    matterId: matter.MatterId,
    url: `https://boston.legistar.com/LegislationDetail.aspx?ID=${matter.MatterId}&GUID=${matter.MatterGuid}`,
  };
  cache.dockets[file] = found;
  return found;
}

/** Legistar's action names, as one plain sentence. No claims about why. */
function docketSentence(number: string, h: LegistarHistory): string {
  const action = h.MatterHistoryActionName ?? '';
  const body = h.MatterHistoryActionBodyName ?? 'the City Council';
  const committee = h.MatterHistoryActionText?.match(/Referred to the (Committee on [^.\r\n]+)/i)?.[1];
  const docket = `Docket #${number}`;
  if (/refer/i.test(action)) return `${docket} was referred to ${committee ? `the ${committee}` : 'committee'}.`;
  if (/hearing/i.test(action)) return `The ${body} held a hearing on ${docket}.`;
  if (/report/i.test(action)) return `${docket} came back from committee with a report.`;
  if (/pass|adopt|enact|approv/i.test(action)) return `${docket} passed the ${body}.`;
  if (/placed on file/i.test(action)) return `${docket} was placed on file.`;
  if (/withdr/i.test(action)) return `${docket} was withdrawn.`;
  if (/sign/i.test(action)) return `${docket} was signed by the Mayor.`;
  return `${docket}: ${action.replace(/\.$/, '')} (${body}).`;
}

async function docketUpdates(watch: DocketWatch, since: string, cache: WatchCache): Promise<ChallengeUpdate[]> {
  const matter = await findMatter(watch.file, cache);
  if (!matter) return [];
  const histories = await getJson<LegistarHistory[]>(
    `https://webapi.legistar.com/v1/boston/matters/${matter.matterId}/histories`,
  );
  const now = new Date().toISOString();
  return histories
    .filter((h) => h.MatterHistoryActionDate.slice(0, 10) >= since && h.MatterHistoryActionName)
    .map((h) => ({
      id: `docket:${watch.file}:${h.MatterHistoryId}`,
      text: docketSentence(watch.number, h),
      source: 'cityRecords' as const,
      publisher: 'Boston City Council',
      url: matter.url,
      date: h.MatterHistoryActionDate.slice(0, 10),
      foundAt: now,
    }));
}

/** The docket on an upcoming agenda we scraped this week ("next agenda"). */
function agendaUpdates(watch: DocketWatch, items: AgendaItem[], since: string): ChallengeUpdate[] {
  const now = new Date().toISOString();
  const pattern = new RegExp(`#0*${watch.number}\\b`);
  return items
    .filter((i) => i.city === 'Boston' && pattern.test(i.docket) && i.meetingStart.slice(0, 10) >= since && i.sourceUrl)
    .map((i) => {
      const day = new Date(`${i.meetingStart.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return {
        id: `agenda:${watch.file}:${i.meetingId}`,
        text: `Docket #${watch.number} is on the ${i.body} agenda for ${day}.`,
        source: 'cityRecords' as const,
        publisher: i.body,
        url: i.sourceUrl!,
        date: bostonDate(new Date()),
        foundAt: now,
      };
    });
}

// ---------- Pages ----------

/** The page's main content: boston.gov marks it role="main" and it runs to the site footer. */
function mainText(html: string): string {
  const marker = html.indexOf('role="main"');
  const start = marker >= 0 ? html.indexOf('>', marker) + 1 : 0;
  const end = html.indexOf('<footer', start);
  const body = html.slice(start, end > start ? end : undefined);
  // Drop the back-to-top link and other bits that change on every deploy.
  return htmlToText(body.replace(/<img[^>]*>/gi, '')).slice(0, 30_000);
}

const hash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16);

/** Lines added and removed between two snapshots, which is all Claude needs to read. */
function lineDiff(before: string, after: string): { added: string[]; removed: string[] } {
  const a = new Set(before.split('\n').map((l) => l.trim()).filter(Boolean));
  const b = new Set(after.split('\n').map((l) => l.trim()).filter(Boolean));
  return { added: [...b].filter((l) => !a.has(l)), removed: [...a].filter((l) => !b.has(l)) };
}

const PAGE_SYSTEM = `You check city web pages for news about a civic challenge residents took part in.

You get the challenge, the page, and the lines that were added to and removed from the page since last week. Decide whether the change is a real update a participant would want to hear about: a decision, a new date or meeting, a posted draft, ballot, plan, report, materials, minutes, or a project milestone. Ignore layout and navigation changes, rotating news links, countdowns, "last updated" stamps and wording tweaks.

If there is an update, write one short sentence (under 120 characters) stating what the city did, as a plain fact taken from the page, e.g. "The draft ballot for Ideas in Action is posted." Rules:
- Never claim or suggest cause and effect with residents' input. Don't write "because of", "thanks to", "in response to", "after residents", or "your notes/feedback/design". The city rarely says why it acted.
- Use only facts on the page. No speculation, no adjectives about how good it is.
- source is "official" only if the city is directly answering public input (a "what we heard" summary, a reply to comments, a response document). Otherwise "cityRecords".
- date is when the city did it if the page says (YYYY-MM-DD), else "".`;

const PAGE_SCHEMA = {
  type: 'object',
  properties: {
    has_update: { type: 'boolean' },
    text: { type: 'string' },
    source: { type: 'string', enum: ['official', 'cityRecords'] },
    date: { type: 'string' },
  },
  required: ['has_update', 'text', 'source', 'date'],
  additionalProperties: false,
};

type PageVerdict = { has_update: boolean; text: string; source: UpdateSource; date: string };

async function pageUpdate(
  challenge: Challenge,
  page: PageWatch,
  diff: { added: string[]; removed: string[] },
): Promise<ChallengeUpdate | null> {
  const verdict = await structuredCall<PageVerdict>({
    system: PAGE_SYSTEM,
    schema: PAGE_SCHEMA,
    effort: 'low',
    maxTokens: 2000,
    content: [
      {
        type: 'text',
        text: [
          `<challenge>\n${challenge.title}\n${challenge.summary}\nAgenda item: ${challenge.agendaItem}\n</challenge>`,
          `<page label="${page.label}" url="${page.url}" publisher="${page.publisher}"/>`,
          `<added_lines>\n${diff.added.join('\n').slice(0, 12_000)}\n</added_lines>`,
          `<removed_lines>\n${diff.removed.join('\n').slice(0, 6_000)}\n</removed_lines>`,
          `Today is ${bostonDate(new Date())}.`,
        ].join('\n'),
      },
    ],
  });
  if (!verdict.has_update || !verdict.text.trim()) return null;
  if (CAUSAL_CLAIM.test(verdict.text)) {
    console.warn(`  ! dropped an update for "${challenge.title}" that claimed cause and effect: ${verdict.text}`);
    return null;
  }
  const today = bostonDate(new Date());
  return {
    id: `page:${hash(page.url)}:${hash(verdict.text)}`,
    text: verdict.text.trim(),
    source: verdict.source,
    publisher: page.publisher,
    url: page.url,
    date: /^\d{4}-\d{2}-\d{2}$/.test(verdict.date) && verdict.date <= today ? verdict.date : today,
    foundAt: new Date().toISOString(),
  };
}

// ---------- Main ----------

async function main() {
  const { values } = parseArgs({
    options: {
      since: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  if (values.since && !/^\d{4}-\d{2}-\d{2}$/.test(values.since)) throw new Error('--since must be YYYY-MM-DD');

  const week = thisWeek();
  const weeks = await publishedWeeks();
  const file = await readJson<ChallengeUpdatesFile>(UPDATES_FILE, { checkedAt: '', challenges: {} });
  const cache = await readJson<WatchCache>(CACHE_FILE, { pages: {}, dockets: {} });
  const { items } = await readJson<{ items: AgendaItem[] }>(ITEMS_FILE, { items: [] });

  // Fetch each watched page once, even if several challenges share it.
  const allChallenges = weeks.flatMap((w) => w.challenges.map((c) => ({ challenge: c, week: w, watches: watchesFor(c, w) })));
  const active = allChallenges.filter(({ challenge }) => (file.challenges[challenge.id]?.status ?? 'open') === 'open');
  const urls = [...new Set(active.flatMap((a) => a.watches.pages.map((p) => p.url)))];
  const pages = new Map<string, string>();
  await mapLimit(urls, 4, async (url) => {
    try {
      pages.set(url, mainText(await getText(url)));
    } catch (error) {
      console.warn(`  ! couldn't fetch ${url}: ${(error as Error).message}`);
    }
  });

  let found = 0;
  for (const { challenge, week: published, watches } of active) {
    const previous = file.challenges[challenge.id];
    const tracked: TrackedChallenge = previous ?? {
      challengeId: challenge.id,
      title: challenge.title,
      weekOf: published.weekOf,
      watching: [],
      status: 'open',
      weeksChecked: 0,
      lastCheckedWeek: '',
      updates: [],
    };
    const since = values.since ?? published.weekOf;
    const fresh: ChallengeUpdate[] = [];

    for (const docket of watches.dockets) {
      try {
        fresh.push(...(await docketUpdates(docket, since, cache)));
      } catch (error) {
        console.warn(`  ! Legistar lookup failed for #${docket.number}: ${(error as Error).message}`);
      }
      fresh.push(...agendaUpdates(docket, items, since));
    }

    for (const page of watches.pages) {
      const text = pages.get(page.url);
      if (text === undefined) continue;
      const before = cache.pages[page.url];
      // The first look is only a baseline: nothing has changed yet.
      if (!before || before.hash === hash(text)) continue;
      const diff = lineDiff(before.text, text);
      if (diff.added.length === 0 && diff.removed.length === 0) continue;
      try {
        const update = await pageUpdate(challenge, page, diff);
        if (update) fresh.push(update);
      } catch (error) {
        console.warn(`  ! couldn't read the change on ${page.url}: ${(error as Error).message}`);
      }
    }

    const known = new Set(tracked.updates.map((u) => u.id));
    const added = fresh.filter((u) => !known.has(u.id) && !CAUSAL_CLAIM.test(u.text));
    found += added.length;
    tracked.updates = [...tracked.updates, ...added].sort((a, b) => a.date.localeCompare(b.date));
    tracked.title = challenge.title;
    tracked.watching = [
      ...watches.dockets.map((d) => ({
        label: `Docket #${d.number}`,
        url: cache.dockets[d.file]?.url ?? 'https://boston.legistar.com/Legislation.aspx',
      })),
      ...watches.pages.map((p) => ({ label: p.label, url: p.url })),
    ];
    if (tracked.lastCheckedWeek !== week) {
      tracked.weeksChecked += 1;
      tracked.lastCheckedWeek = week;
    }
    if (tracked.weeksChecked >= TRACK_WEEKS) {
      tracked.status = tracked.updates.length > 0 ? 'closed' : 'noUpdateFound';
      tracked.closedAt = new Date().toISOString();
    }
    file.challenges[challenge.id] = tracked;

    const note = added.length > 0 ? added.map((u) => `\n      + ${u.text} (${u.date})`).join('') : '';
    console.log(`  ${challenge.title}: week ${tracked.weeksChecked}/${TRACK_WEEKS}, ${tracked.updates.length} updates${note}`);
  }

  for (const url of urls) {
    const text = pages.get(url);
    if (text !== undefined) cache.pages[url] = { hash: hash(text), text, checkedAt: new Date().toISOString() };
  }
  file.checkedAt = new Date().toISOString();

  if (!values['dry-run']) {
    await writeFile(UPDATES_FILE, JSON.stringify(file, null, 2));
    await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  }
  console.log(`Checked ${active.length} open challenges and ${urls.length} pages: ${found} new updates.`);
  console.log(`  ${costSummary()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
