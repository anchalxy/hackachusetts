/**
 * Step 2 of the challenges pipeline: read each meeting's agenda and pull out the items
 * residents can actually act on, tagged by neighborhood, with the contact who wants input.
 *
 *   node scripts/agendas/extract-items.ts [--city Boston] [--limit 10]
 *
 * Reads data/agendas/meetings.json, writes data/agendas/items.json. Results are cached per
 * meeting + agenda in data/agendas/cache/, so weekly runs only pay for new agendas.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { BOSTON_NEIGHBORHOODS } from '../../src/constants/areas.ts';
import { costSummary, mapLimit, structuredCall } from './claude.ts';
import { getBytes, getText, htmlToText } from './http.ts';
import type { AgendaItem, Meeting } from './types.ts';

const DIR = path.join(process.cwd(), 'data', 'agendas');
const CACHE = path.join(DIR, 'cache');
const MAX_TEXT_CHARS = 80_000; // big HTML agendas get truncated (noted in the prompt)
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const SYSTEM = `You read public meeting agendas for Boston, Cambridge, Somerville and Brookline and pull out the items where residents can give input or take part.

For each meeting, list the agenda items that a regular resident could act on in the next few weeks: attend and testify, submit a public comment, answer a survey, give design input, weigh in on spending, or test a city service. Skip procedural items (roll call, minutes approval), and mark include=false with a short skip_reason for items that are:
- too narrow (a single address's zoning variance or abutters meeting, an individual liquor or entertainment license, a personnel matter);
- too heavy for a points-based civic app (deaths in custody, criminal cases, sensitive individual cases);
- not open to public input.

Rules:
- Only use facts in the agenda. Never invent names, emails, phone numbers, dates or dockets.
- neighborhoods: for Boston, use only these names: ${BOSTON_NEIGHBORHOODS.join(', ')}. Leave it empty if the item isn't tied to specific neighborhoods. For other cities, leave it empty.
- citywide: true if the item affects the whole city rather than specific places.
- deadline: the last date residents can act (comment deadline, or the meeting date if input happens at the meeting), as YYYY-MM-DD, or "" if unknown.
- contacts: people or offices the agenda names as collecting input or sponsoring the item. Copy emails and phone numbers exactly. Use "" for unknown fields.
- Keep summary to one or two plain sentences a resident would understand.
- If an agenda has no actionable items, return an empty items list.`;

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          docket: { type: 'string' },
          action: {
            type: 'string',
            enum: ['attend_and_testify', 'public_comment', 'survey_or_feedback', 'design_input', 'budget_input', 'service_test', 'other'],
          },
          deadline: { type: 'string' },
          neighborhoods: { type: 'array', items: { type: 'string' } },
          citywide: { type: 'boolean' },
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                office: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
              },
              required: ['name', 'office', 'email', 'phone'],
              additionalProperties: false,
            },
          },
          include: { type: 'boolean' },
          skip_reason: { type: 'string' },
        },
        required: ['title', 'summary', 'docket', 'action', 'deadline', 'neighborhoods', 'citywide', 'contacts', 'include', 'skip_reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

type Extracted = { items: Omit<AgendaItem, 'id' | 'meetingId' | 'city' | 'body' | 'meetingTitle' | 'meetingStart' | 'location' | 'sourceUrl'>[] };

/** The agenda content for one meeting, as Claude content blocks. */
async function agendaContent(meeting: Meeting): Promise<{ key: string; blocks: Anthropic.Beta.BetaContentBlockParam[] } | null> {
  const header = `Meeting: ${meeting.title}\nBody: ${meeting.body}\nCity: ${meeting.city}\nStarts: ${meeting.start}\nLocation: ${meeting.location ?? 'unknown'}`;

  if (meeting.source === 'boston-notices' && meeting.summary) {
    return { key: meeting.summary, blocks: [{ type: 'text', text: `${header}\n\nPublic notice text:\n${meeting.summary}` }] };
  }

  // Prefer the agenda over the (often huge) packet, and HTML over PDF.
  const agendas = meeting.docs.filter((d) => d.kind === 'agenda');
  const doc = agendas.find((d) => d.format === 'html') ?? agendas[0];
  if (!doc) return null;

  if (doc.format === 'html') {
    const text = htmlToText(await getText(doc.url));
    const truncated = text.length > MAX_TEXT_CHARS;
    return {
      key: doc.url + text.length,
      blocks: [
        {
          type: 'text',
          text: `${header}\n\nAgenda${truncated ? ' (truncated)' : ''}:\n${text.slice(0, MAX_TEXT_CHARS)}`,
        },
      ],
    };
  }

  const pdf = await getBytes(doc.url);
  if (pdf.length > MAX_PDF_BYTES) return null;
  return {
    key: doc.url + pdf.length,
    blocks: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') } },
      { type: 'text', text: `${header}\n\nThe agenda is the attached PDF.` },
    ],
  };
}

async function extract(meeting: Meeting): Promise<AgendaItem[] | Error> {
  try {
    const content = await agendaContent(meeting);
    if (!content) return [];

    const hash = createHash('sha256').update(meeting.id + content.key).digest('hex').slice(0, 16);
    const cacheFile = path.join(CACHE, `${hash}.json`);
    let extracted: Extracted;
    if (existsSync(cacheFile)) {
      extracted = JSON.parse(await readFile(cacheFile, 'utf8'));
    } else {
      extracted = await structuredCall<Extracted>({ system: SYSTEM, content: content.blocks, schema: SCHEMA, effort: 'low' });
      await writeFile(cacheFile, JSON.stringify(extracted, null, 2));
    }

    return extracted.items.map((item, i) => ({
      ...item,
      neighborhoods: item.neighborhoods.filter((n) => (BOSTON_NEIGHBORHOODS as readonly string[]).includes(n)),
      contacts: item.contacts.map((c) => Object.fromEntries(Object.entries(c).filter(([, v]) => v !== ''))) as AgendaItem['contacts'],
      id: `${meeting.id}#${i}`,
      meetingId: meeting.id,
      city: meeting.city,
      body: meeting.body,
      meetingTitle: meeting.title,
      meetingStart: meeting.start,
      location: meeting.location,
      sourceUrl: meeting.pageUrl ?? meeting.docs[0]?.url ?? null,
    }));
  } catch (error) {
    return error as Error;
  }
}

async function main() {
  const { values } = parseArgs({ options: { city: { type: 'string' }, limit: { type: 'string' } } });
  const { meetings } = JSON.parse(await readFile(path.join(DIR, 'meetings.json'), 'utf8')) as { meetings: Meeting[] };
  let todo = meetings.filter((m) => !values.city || m.city === values.city);
  if (values.limit) todo = todo.slice(0, Number(values.limit));

  await mkdir(CACHE, { recursive: true });
  console.log(`Extracting agenda items from ${todo.length} meetings…`);
  const results = await mapLimit(todo, 4, extract);

  const items: AgendaItem[] = [];
  results.forEach((result, i) => {
    if (result instanceof Error) console.warn(`  ! ${todo[i].city} · ${todo[i].title}: ${result.message}`);
    else items.push(...result);
  });

  await writeFile(
    path.join(DIR, 'items.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2),
  );
  const kept = items.filter((i) => i.include);
  console.log(`Wrote ${items.length} items (${kept.length} actionable) to data/agendas/items.json`);
  for (const city of new Set(kept.map((i) => i.city))) {
    const cityItems = kept.filter((i) => i.city === city);
    const tagged = cityItems.filter((i) => i.neighborhoods.length > 0).length;
    console.log(`  ${city.padEnd(10)} ${cityItems.length} actionable, ${tagged} tagged to neighborhoods`);
  }
  console.log(`  ${costSummary()}`);
}

main();
