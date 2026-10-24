/**
 * Step 3 of the challenges pipeline: turn extracted agenda items into this week's 4–5
 * challenges for one resident, calibrated on exampleChallenges.md.
 *
 *   node scripts/agendas/generate-challenges.ts [--city Boston] [--neighborhood Allston] [--age 25] [--dry-run]
 *
 * Defaults to the seed user. Writes data/challenges/<week>/<area>.json (for the app) and
 * .md (the readable write-up), and points data/challenges/index.json at them.
 * Claude picks items and writes the challenges; points always come from scorePoints().
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { BOSTON_NEIGHBORHOODS, CITIES, type BostonNeighborhood, type City } from '../../src/constants/areas.ts';
import { areaLabel, areaSlug, SEED_PROFILE, type Profile } from '../../src/constants/seed-profile.ts';
import {
  scorePoints,
  VOTE_POINTS,
  type Challenge,
  type ChallengeType,
  type ChallengeWeek,
  type Contact,
  type PointFactors,
} from '../../src/lib/challenges.ts';
import { costSummary, structuredCall } from './claude.ts';
import type { AgendaItem } from './types.ts';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'data', 'challenges');
const MAX_CANDIDATES = 40;

/** Neighborhoods close enough that their items still feel local. */
const NEARBY: Partial<Record<BostonNeighborhood, BostonNeighborhood[]>> = {
  Allston: ['Brighton', 'Fenway'],
  Brighton: ['Allston'],
  Fenway: ['Longwood', 'Mission Hill', 'Back Bay'],
  'Jamaica Plain': ['Roxbury', 'Roslindale', 'Mission Hill'],
  Dorchester: ['Mattapan', 'South Boston', 'Roxbury'],
  Roxbury: ['Dorchester', 'Jamaica Plain', 'Mission Hill'],
};

/** Monday of the week the challenges are for. Weekend runs plan the coming week. */
function weekOf(now = new Date()): string {
  const day = now.getDay(); // 0 Sun … 6 Sat
  const offset = day === 0 ? 1 : day === 6 ? 2 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offset);
  return monday.toLocaleDateString('en-CA');
}

function relevance(item: AgendaItem, profile: Profile): number {
  if (!profile.neighborhood) return 1;
  if (item.neighborhoods.includes(profile.neighborhood)) return 3;
  if (item.neighborhoods.some((n) => NEARBY[profile.neighborhood!]?.includes(n as BostonNeighborhood))) return 2;
  if (item.citywide || item.neighborhoods.length === 0) return 1;
  return 0;
}

function candidates(items: AgendaItem[], profile: Profile, week: string): (AgendaItem & { relevance: number })[] {
  return items
    .filter((i) => i.include && i.city === profile.city)
    .filter((i) => !i.deadline || i.deadline >= week)
    .map((i) => ({ ...i, relevance: relevance(i, profile) }))
    .sort((a, b) => b.relevance - a.relevance || (a.deadline || '9999').localeCompare(b.deadline || '9999'))
    .slice(0, MAX_CANDIDATES);
}

const SYSTEM = `You design this week's civic challenges for a points-based app that gets young residents of Greater Boston involved in local government.

You will get: the resident's profile, the week, a list of candidate agenda items (each with an id), and a document of five example challenges. The examples are the gold standard for tone, structure, level of detail, task design and how contacts are named. Match them closely.

Pick 5 challenges (4 only if there aren't 5 good items) and write each one in full.

Choosing items:
- Personalize for the resident. Prefer items with relevance 3 (their neighborhood), then 2 (nearby), then 1 (citywide). Use a farther-away item only if it's a strong challenge and say why it's worth the trip.
- Mix challenge types across the set: design, budget, service-test, meeting, 311-test. Don't use the same type more than twice.
- Skip items the examples' sources note would skip: too narrow (single-address abutters meetings, individual licenses) or too heavy for a points app (deaths in custody, criminal matters, the crime lab). Don't use two items about the same thing.
- Each challenge must be grounded in exactly one candidate item: set source_item_id to its id.

Writing each challenge:
- Use only facts from the item: names, emails, phone numbers, dates, dockets and places. Never invent a contact. If the item names no person, name the office (as the examples do with generic inboxes).
- The task is something the resident does and submits in the app; the digest goes to the item's contact before their meeting or deadline. Set the submission deadline a day or more before the meeting so the digest arrives in time.
- Write for the resident (age and neighborhood given) but in the same neutral voice as the examples ("Users visit…").
- Estimate the point factors honestly; the app computes the points:
  minutes = typical total time to complete; in_person = must physically go somewhere; city_asked = a named office is actively collecting this input now; proof_required = submission needs photos, timings or notes the AI must check.
- extras holds any extra labeled sections the examples use (Constraints, Dockets worth featuring, seed data…). Use an empty list if none.
- Use "" for voting or verification when they don't apply.
- deadline_date is YYYY-MM-DD.

Never write point values anywhere (not in titles, the overview or the text); the app computes and adds them.

Also write the week's overview and sources paragraphs in the style of the examples' Overview, minus the opening sentence about how many challenges and points (the app writes that).`;

const CHALLENGE_TYPES: ChallengeType[] = ['design', 'budget', 'service-test', 'meeting', '311-test'];

const SCHEMA = {
  type: 'object',
  properties: {
    overview: { type: 'string' },
    sources: { type: 'string' },
    challenges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source_item_id: { type: 'string' },
          type: { type: 'string', enum: CHALLENGE_TYPES },
          title: { type: 'string' },
          summary: { type: 'string' },
          agenda_item: { type: 'string' },
          why_now: { type: 'string' },
          poc: { type: 'string' },
          deadline: { type: 'string' },
          deadline_date: { type: 'string' },
          in_person: { type: 'string', enum: ['yes', 'no', 'optional'] },
          digest_to: { type: 'string' },
          task_intro: { type: 'string' },
          task_steps: { type: 'array', items: { type: 'string' } },
          extras: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                heading: { type: 'string' },
                items: { type: 'array', items: { type: 'string' } },
              },
              required: ['heading', 'items'],
              additionalProperties: false,
            },
          },
          voting: { type: 'string' },
          verification: { type: 'string' },
          poc_receives: { type: 'string' },
          factors: {
            type: 'object',
            properties: {
              minutes: { type: 'integer' },
              in_person: { type: 'boolean' },
              city_asked: { type: 'boolean' },
              proof_required: { type: 'boolean' },
            },
            required: ['minutes', 'in_person', 'city_asked', 'proof_required'],
            additionalProperties: false,
          },
        },
        required: [
          'source_item_id', 'type', 'title', 'summary', 'agenda_item', 'why_now', 'poc', 'deadline',
          'deadline_date', 'in_person', 'digest_to', 'task_intro', 'task_steps', 'extras', 'voting',
          'verification', 'poc_receives', 'factors',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['overview', 'sources', 'challenges'],
  additionalProperties: false,
};

type Generated = {
  overview: string;
  sources: string;
  challenges: {
    source_item_id: string;
    type: ChallengeType;
    title: string;
    summary: string;
    agenda_item: string;
    why_now: string;
    poc: string;
    deadline: string;
    deadline_date: string;
    in_person: 'yes' | 'no' | 'optional';
    digest_to: string;
    task_intro: string;
    task_steps: string[];
    extras: { heading: string; items: string[] }[];
    voting: string;
    verification: string;
    poc_receives: string;
    factors: { minutes: number; in_person: boolean; city_asked: boolean; proof_required: boolean };
  }[];
};

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Contacts the model used, kept only if the agenda item actually names them. */
function verifiedContacts(item: AgendaItem): Contact[] {
  return item.contacts
    .filter((c) => c.office || c.name)
    .map((c) => ({ name: c.name, office: c.office ?? item.body, email: c.email, phone: c.phone }));
}

function contactText(contacts: Contact[], fallbackOffice: string): string {
  if (contacts.length === 0) return fallbackOffice;
  return contacts
    .map((c) => {
      const reach = [c.email, c.phone].filter(Boolean).join(', ');
      return `${c.name ? `${c.name}, ` : ''}${c.office}${reach ? ` (${reach})` : ''}`;
    })
    .join('; ');
}

/** Turns the model's output into app-ready challenges, checking everything we can check. */
function toChallenges(generated: Generated, items: Map<string, AgendaItem>, week: string): Challenge[] {
  const challenges: Challenge[] = [];
  for (const g of generated.challenges) {
    const item = items.get(g.source_item_id);
    if (!item) {
      console.warn(`  ! dropped "${g.title}": unknown source item ${g.source_item_id}`);
      continue;
    }
    if (!item.sourceUrl) {
      console.warn(`  ! dropped "${g.title}": its agenda item has no source link`);
      continue;
    }

    // Any email or phone in the POC text must come from the agenda; otherwise rebuild it.
    const contacts = verifiedContacts(item);
    const known = new Set(contacts.flatMap((c) => [c.email, c.phone]).filter(Boolean));
    const mentioned = g.poc.match(/[\w.+-]+@[\w-]+\.[\w.]+|\d{3}-\d{3}-\d{4}/g) ?? [];
    const poc = mentioned.every((m) => known.has(m)) ? g.poc : contactText(contacts, item.body);
    if (poc !== g.poc) console.warn(`  ! "${g.title}": POC had contact details not in the agenda; rebuilt from the agenda`);

    const factors: PointFactors = {
      minutes: g.factors.minutes,
      inPerson: g.factors.in_person,
      cityAsked: g.factors.city_asked,
      proofRequired: g.factors.proof_required,
    };
    const { points, breakdown } = scorePoints(factors);
    const deadlineDate = /^\d{4}-\d{2}-\d{2}$/.test(g.deadline_date) ? g.deadline_date : item.deadline || week;

    challenges.push({
      id: `${week}-${slug(g.title.replace(/\(.*?\)/g, ''))}`,
      number: challenges.length + 1,
      type: g.type,
      title: g.title.replace(/\s*\(\d+(\.\d+)?\s*points?\)\s*$/i, ''),
      points,
      pointsBreakdown: breakdown,
      factors,
      summary: g.summary,
      agendaItem: g.agenda_item,
      whyNow: g.why_now,
      poc,
      contacts: contacts.length > 0 ? contacts : [{ office: item.body }],
      deadline: g.deadline,
      deadlineDate,
      inPerson: g.in_person,
      digestTo: g.digest_to,
      task: { intro: g.task_intro || undefined, steps: g.task_steps },
      extras: g.extras.length > 0 ? g.extras : undefined,
      voting: g.voting || undefined,
      verification: g.verification || undefined,
      pocReceives: g.poc_receives,
      sourceUrl: item.sourceUrl,
    });
  }
  return challenges;
}

/** The readable write-up, laid out like exampleChallenges.md. */
function toMarkdown(week: ChallengeWeek): string {
  const total = week.challenges.reduce((sum, c) => sum + c.points, 0);
  const lines = [
    `# Challenges for the week of ${week.weekOf} · ${week.area}`,
    '',
    `_Generated ${week.generatedAt}. Points are computed by the app from the factors below; contacts and links come from the agendas._`,
    '',
    '## Overview',
    '',
    week.overview,
    '',
    week.sources,
    '',
  ];
  for (const c of week.challenges) {
    lines.push(`## Challenge ${c.number}: ${c.title} (${c.points} points)`, '', c.summary, '');
    lines.push('| | |', '|---|---|');
    lines.push(`| Agenda item | ${c.agendaItem} |`);
    lines.push(`| Why now | ${c.whyNow} |`);
    lines.push(`| Government POC | ${c.poc} |`);
    lines.push(`| Submission deadline | ${c.deadline} |`);
    lines.push(`| Points | ${c.pointsBreakdown} |`);
    lines.push(`| Source | ${c.sourceUrl} |`, '');
    lines.push('**The task**', '');
    if (c.task.intro) lines.push(c.task.intro, '');
    c.task.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push('');
    for (const extra of c.extras ?? []) {
      lines.push(`**${extra.heading}**`, '');
      if (extra.intro) lines.push(extra.intro, '');
      extra.items.forEach((item) => lines.push(`- ${item}`));
      lines.push('');
    }
    if (c.voting) lines.push(`**Voting:** ${c.voting}`, '');
    if (c.verification) lines.push(`**Verification:** ${c.verification}`, '');
    lines.push(`**What the POC receives:** ${c.pocReceives}`, '');
  }
  lines.push('## Points summary', '');
  lines.push('| Challenge | Points | Deadline | In person? | Digest goes to |', '|---|---|---|---|---|');
  for (const c of [...week.challenges].sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))) {
    lines.push(`| ${c.number}. ${c.title} | ${c.points} | ${c.deadlineDate} | ${c.inPerson} | ${c.digestTo} |`);
  }
  lines.push(`| Vote on someone else's submission | ${VOTE_POINTS} each | Same as challenge | no | (counted in digests) |`);
  lines.push('', `The week's set is worth ${total} points.`, '');
  return lines.join('\n');
}

async function main() {
  const { values } = parseArgs({
    options: {
      city: { type: 'string', default: SEED_PROFILE.city },
      neighborhood: { type: 'string', default: SEED_PROFILE.neighborhood ?? undefined },
      age: { type: 'string', default: String(SEED_PROFILE.age) },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  if (!(CITIES as readonly string[]).includes(values.city!)) throw new Error(`Unknown city: ${values.city}`);
  const neighborhood = values.city === 'Boston' ? (values.neighborhood ?? null) : null;
  if (neighborhood && !(BOSTON_NEIGHBORHOODS as readonly string[]).includes(neighborhood)) {
    throw new Error(`Unknown Boston neighborhood: ${neighborhood}`);
  }
  const profile: Profile = {
    ...SEED_PROFILE,
    city: values.city as City,
    neighborhood: neighborhood as BostonNeighborhood | null,
    age: Number(values.age),
  };

  const week = weekOf();
  const { items } = JSON.parse(await readFile(path.join(ROOT, 'data', 'agendas', 'items.json'), 'utf8')) as {
    items: AgendaItem[];
  };
  const pool = candidates(items, profile, week);
  if (pool.length < 4) throw new Error(`Only ${pool.length} usable agenda items for ${areaLabel(profile)}; need at least 4.`);
  console.log(`Generating challenges for ${areaLabel(profile)}, age ${profile.age}, week of ${week} from ${pool.length} candidate items…`);

  const examples = await readFile(path.join(ROOT, 'exampleChallenges.md'), 'utf8');
  const candidateList = pool.map((i) => ({
    id: i.id,
    relevance: i.relevance,
    title: i.title,
    summary: i.summary,
    docket: i.docket,
    action: i.action,
    deadline: i.deadline,
    neighborhoods: i.neighborhoods,
    citywide: i.citywide,
    contacts: i.contacts,
    body: i.body,
    meeting: `${i.meetingTitle}, ${i.meetingStart}${i.location ? `, ${i.location}` : ''}`,
  }));

  const generated = await structuredCall<Generated>({
    system: SYSTEM,
    schema: SCHEMA,
    effort: 'medium',
    content: [
      { type: 'text', text: `<examples>\n${examples}\n</examples>` },
      {
        type: 'text',
        text: [
          `Resident: ${profile.age}-year-old living in ${areaLabel(profile)}.`,
          `Week of: ${week} (Monday). Today is ${new Date().toLocaleDateString('en-CA')}.`,
          `<candidate_items>\n${JSON.stringify(candidateList, null, 1)}\n</candidate_items>`,
        ].join('\n'),
      },
    ],
  });

  const challenges = toChallenges(generated, new Map(pool.map((i) => [i.id, i])), week);
  if (challenges.length < 4) throw new Error(`Only ${challenges.length} challenges survived checks; not saving.`);

  const points = challenges.map((c) => c.points);
  const total = points.reduce((sum, p) => sum + p, 0);
  const result: ChallengeWeek = {
    weekOf: week,
    area: areaLabel(profile),
    generatedAt: new Date().toISOString(),
    origin: 'generated',
    overview: `This week's set is ${challenges.length} challenges worth ${Math.min(...points)}–${Math.max(...points)} points each (${total} max). ${generated.overview}`,
    sources: generated.sources,
    challenges,
  };
  const markdown = toMarkdown(result);

  if (values['dry-run']) {
    console.log(markdown);
  } else {
    const slugName = areaSlug(profile);
    const dir = path.join(OUT_DIR, week);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${slugName}.json`), JSON.stringify(result, null, 2));
    await writeFile(path.join(dir, `${slugName}.md`), markdown);

    const indexFile = path.join(OUT_DIR, 'index.json');
    const index = existsSync(indexFile) ? JSON.parse(await readFile(indexFile, 'utf8')) : { areas: {} };
    index.areas[slugName] = `${week}/${slugName}.json`;
    index.updatedAt = result.generatedAt;
    await writeFile(indexFile, JSON.stringify(index, null, 2));
    console.log(`Wrote data/challenges/${week}/${slugName}.json and .md`);
  }
  for (const c of challenges) console.log(`  ${c.number}. ${c.title} · ${c.points} pts · due ${c.deadlineDate} · ${c.type}`);
  console.log(`  ${costSummary()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
