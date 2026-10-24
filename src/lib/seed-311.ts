import Storage from 'expo-sqlite/kv-store';

import { topicInfo } from '@/constants/report-topics';
import { getRecentCasesIn, type FollowableCase } from '@/lib/boston-311';
import { addSavedReports, getMyReports, refreshMyReportsFrom311, type MyReport } from '@/lib/my-reports';
import { markReportAlertsSeen, silenceReportAlerts } from '@/lib/report-events';
import { markReportLeavesCredited } from '@/lib/report-leaves';
import type { ExamplePhoto } from '@/lib/report-photo';

// Seeds the demo user's report history from REAL Boston 311 cases, then lets the normal pipeline
// (refreshMyReportsFrom311) find out what happened to each one: status, team, closure comment, date.
// Nothing about the outcome is made up here; the seed only says "the user reported this case".

const SEEDED_KEY = 'seed311Done';

/** Topics we have a real example photo for (311's own photo fields are always empty). */
export const TOPIC_PHOTO: Record<string, { photo: ExamplePhoto; title: string; noun: string }> = {
  Pothole: { photo: 'pothole', title: 'Pothole', noun: 'pothole' },
  'Street Light Outage': { photo: 'streetlight', title: 'Streetlight out', noun: 'streetlight' },
  'Illegal Graffiti': { photo: 'graffiti', title: 'Graffiti', noun: 'graffiti' },
  'Overflowing Trash': { photo: 'trash', title: 'Overflowing bin', noun: 'trash bin' },
  'Sidewalk Repair': { photo: 'sidewalk', title: 'Broken sidewalk', noun: 'sidewalk' },
  'Crosswalk Maintenance': { photo: 'crosswalk', title: 'Faded crosswalk', noun: 'crosswalk' },
};
const TOPICS = Object.keys(TOPIC_PHOTO);

/** How many real cases to follow in each state: a full lifecycle, mostly fixed so there's news. */
const MIX = { fixed: 4, approved: 2, inReview: 1, notApproved: 1 } as const;

const parse311Date = (s: string) => Date.parse(s.replace(' ', 'T').replace(/\+00$/, 'Z'));

/** "8 Sumner Ter, Boston, MA 02125" → "8 Sumner Ter" */
const street = (address: string) => address.split(',')[0];

/** One case per topic, so the seeded reports look like a real person's mix. */
function onePerTopic(cases: FollowableCase[], count: number, taken: Set<string>): FollowableCase[] {
  const picked: FollowableCase[] = [];
  const topics = new Set<string>();
  for (const c of cases) {
    if (picked.length >= count) break;
    if (taken.has(c.case_id) || topics.has(c.case_topic)) continue;
    topics.add(c.case_topic);
    taken.add(c.case_id);
    picked.push(c);
  }
  return picked;
}

/** The report as the user filed it: just sent, waiting on the city. 311 fills in the rest. */
function asSubmitted(c: FollowableCase): MyReport {
  const createdAt = parse311Date(c.open_date) || Date.now();
  const meta = TOPIC_PHOTO[c.case_topic];
  const department = c.assigned_department || topicInfo(c.case_topic).department;
  const description = `${c.case_topic} at ${street(c.full_address)}.`;
  return {
    id: `311-${c.case_id}`,
    number: c.case_id,
    topic: c.case_topic,
    title: meta?.title ?? c.case_topic,
    description,
    aiDraft: description,
    urgency: 'Medium',
    address: street(c.full_address),
    latitude: Number(c.latitude),
    longitude: Number(c.longitude),
    photoUri: meta ? `example:${meta.photo}` : undefined,
    createdAt,
    status: 'submitted',
    history: { submitted: createdAt },
    updates: [
      { who: 'You', kind: 'you', text: 'Submitted with a photo.', at: createdAt },
      { who: 'Boston 311', kind: 'city', text: `Received. Sent to ${department}.`, at: createdAt + 60_000 },
    ],
    department,
    caseId: c.case_id,
  };
}

/**
 * Once per install: follow a mix of real 311 cases, then sync them from 311. Returns the
 * reports after the sync. Safe to call on every focus; it no-ops after the first success.
 */
export async function seedFrom311Once(): Promise<MyReport[] | null> {
  const existing = await getMyReports();
  // The flag alone isn't enough: the Report tab's "Reset my reports" wipes reports, not this flag.
  if ((await Storage.getItem(SEEDED_KEY)) && existing.some((r) => r.id.startsWith('311-'))) return null;

  const following = new Set(existing.map((r) => r.caseId).filter(Boolean) as string[]);
  const results = await Promise.all(
    (Object.keys(MIX) as (keyof typeof MIX)[]).map(async (state) => ({
      state,
      cases: await getRecentCasesIn(state, TOPICS, 40),
    })),
  );
  const picked = results.flatMap(({ state, cases }) => onePerTopic(cases, MIX[state], following));
  if (picked.length === 0) return null;

  const seeded = picked.map(asSubmitted);
  // These outcomes predate the app's seed balance, so they must not pay out. Mark them first:
  // every save (including the sync below) credits newly approved reports.
  await markReportLeavesCredited(seeded.map((r) => r.id), existing);
  await silenceReportAlerts(seeded.map((r) => r.id));
  await addSavedReports(seeded);
  // The real workflow: ask 311 what happened to each case.
  const reports = await refreshMyReportsFrom311();
  // Their current state is history, not news; later 311 changes do alert.
  await markReportAlertsSeen(reports.filter((r) => seeded.some((s) => s.id === r.id)));
  await Storage.setItem(SEEDED_KEY, '1');
  return reports;
}
