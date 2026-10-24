import * as Location from 'expo-location';
import Storage from 'expo-sqlite/kv-store';

import { topicInfo } from '@/constants/report-topics';
import { getRecentInProgressCases } from '@/lib/boston-311';
import { addMyReport, addSavedReports, getMyReports, type MyReport, type ReportStatus, type ReportUpdate } from '@/lib/my-reports';
import type { ExamplePhoto } from '@/lib/report-photo';

/** "1282 Boylston St, Boston, MA 02215" → "1282 Boylston St". */
const street = (address: string) => address.split(',')[0];

/**
 * Dev only (long-press the leaf pill): follow a few real, currently in-progress 311 cases so
 * we can watch the refresh work. They're saved as Submitted on purpose, so the next sync from
 * 311 should move them to Approved.
 */
export async function seedInProgressCases(count = 3): Promise<MyReport[]> {
  const following = new Set((await getMyReports()).map((r) => r.caseId));
  const cases = (await getRecentInProgressCases(20)).filter((c) => !following.has(c.case_id));

  // One per topic so the pins are easy to tell apart.
  const picked = cases
    .filter((c, i) => cases.findIndex((other) => other.case_topic === c.case_topic) === i)
    .slice(0, count);

  const seeded: MyReport[] = [];
  for (const c of picked) {
    const info = topicInfo(c.case_topic);
    seeded.push(
      await addMyReport({
        topic: c.case_topic,
        title: c.case_topic,
        description: `Followed from Boston 311 case ${c.case_id}.`,
        aiDraft: '',
        urgency: 'Medium',
        address: street(c.full_address),
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
        status: 'submitted',
        caseId: c.case_id,
        team: c.assigned_team,
        department: info.department,
        updates: [
          { who: 'You', kind: 'you', text: 'Followed this report.', at: Date.now() },
          { who: 'Boston 311', kind: 'city', text: `Received. Sent to ${info.department}.`, at: Date.parse(c.open_date.replace(' ', 'T').replace('+00', 'Z')) || Date.now() },
        ],
      }),
    );
  }
  return seeded;
}

export const EXAMPLES_SEEDED_KEY = 'reportExamplesSeeded';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Example = {
  photo: ExamplePhoto;
  topic: string;
  title: string;
  address: string;
  description: string;
  aiDraft?: string;
  urgency: MyReport['urgency'];
  /** Offset from the map center, in degrees. */
  at: [number, number];
  status: ReportStatus;
  /** How long ago it was sent, and when it reached each later step (ms after sending). */
  sentAgo: number;
  steps: Partial<Record<ReportStatus, number>>;
  team?: string;
  reason?: string;
  /** City updates after "Received", oldest first: [ms after sending, who, text]. */
  updates: [number, string, string][];
};

/** One report at every step of the lifecycle, with the kind of updates the city sends. */
const EXAMPLES: Example[] = [
  {
    photo: 'streetlight',
    topic: 'Street Light Outage',
    title: 'Streetlight out',
    address: 'Prospect St',
    description: 'Streetlight fixture is smashed and the light is out, leaving this stretch of sidewalk dark at night.',
    urgency: 'Medium',
    at: [0.004, 0.006],
    status: 'submitted',
    sentAgo: 2 * HOUR,
    steps: {},
    updates: [],
  },
  {
    photo: 'trash',
    topic: 'Overflowing Trash',
    title: 'Overflowing bin',
    address: 'Cambridge St',
    description: 'Public trash bin is overflowing, with bags and loose paper piled around it on the sidewalk.',
    urgency: 'Medium',
    at: [0.007, -0.004],
    status: 'inReview',
    sentAgo: 1 * DAY,
    steps: { inReview: 20 * HOUR },
    team: 'PWD Sanitation',
    updates: [[20 * HOUR, 'PWD Sanitation', 'We’re routing this to the right crew. Bins on this route are emptied Tuesdays and Fridays.']],
  },
  {
    photo: 'crosswalk',
    topic: 'Crosswalk Maintenance',
    title: 'Faded crosswalk',
    address: 'Hampshire St at Inman Sq',
    description: 'Crosswalk paint is mostly worn away at a busy intersection next to a bus stop. Hard to see at night.',
    aiDraft: 'Crosswalk paint is mostly worn away at a busy intersection. Needs a repaint.',
    urgency: 'Medium',
    at: [-0.003, -0.007],
    status: 'inReview',
    sentAgo: 1 * DAY + 3 * HOUR,
    steps: { inReview: 22 * HOUR },
    team: 'Traffic & Parking',
    updates: [[22 * HOUR, 'Traffic & Parking', 'We’re reviewing this. Repaints are usually scheduled within 2 weeks of approval.']],
  },
  {
    photo: 'graffiti',
    topic: 'Illegal Graffiti',
    title: 'Graffiti on wall',
    address: 'Broadway',
    description: 'Red spray-painted graffiti across a concrete wall facing the street.',
    urgency: 'Low',
    at: [-0.006, 0.003],
    status: 'approved',
    sentAgo: 2 * DAY,
    steps: { inReview: 5 * HOUR, approved: 26 * HOUR },
    team: 'Property Management',
    updates: [
      [5 * HOUR, 'Property Management', 'Thanks, we’re taking a look.'],
      [26 * HOUR, 'Property Management', 'Approved and assigned to a crew. Removal is scheduled for this week.'],
    ],
  },
  {
    photo: 'pothole',
    topic: 'Pothole',
    title: 'Pothole',
    address: 'Mass Ave',
    description: 'Deep pothole in the travel lane with crumbling edges. Cars swerve to avoid it.',
    urgency: 'High',
    at: [0.001, -0.011],
    status: 'fixed',
    sentAgo: 3 * DAY,
    steps: { inReview: 2 * HOUR, approved: 9 * HOUR, fixed: 2 * DAY + 20 * HOUR },
    team: 'PWD Street Repair',
    updates: [
      [2 * HOUR, 'PWD Street Repair', 'Got it. An inspector is heading out.'],
      [9 * HOUR, 'PWD Street Repair', 'Confirmed on site. Scheduled for a hot patch.'],
      [2 * DAY + 20 * HOUR, 'Dana R., PWD', 'Filled with hot patch and rolled flat. Thanks for flagging it!'],
    ],
  },
  {
    photo: 'sidewalk',
    topic: 'Illegally Blocked Sidewalk',
    title: 'Car on sidewalk',
    address: 'Harvard Ave',
    description: 'Cars parked across the sidewalk, blocking the way for people walking and wheelchairs.',
    urgency: 'Medium',
    at: [-0.009, -0.002],
    status: 'notApproved',
    sentAgo: 4 * DAY,
    steps: { notApproved: 1 * DAY },
    team: 'Parking Enforcement',
    reason: 'Private lot, not city property',
    updates: [[1 * DAY, 'Parking Enforcement', 'This is a private lot, so the city can’t ticket here. Closed without action.']],
  },
];

/**
 * Dev only: adds one example report at every step (Submitted → Fixed, plus Not approved) around
 * `center`, with photos and city updates, so the map, quick look and report page can be tested.
 */
export async function seedExampleReports(center: { latitude: number; longitude: number }) {
  const now = Date.now();
  const reports: MyReport[] = EXAMPLES.map((e, i) => {
    const createdAt = now - e.sentAgo;
    const info = topicInfo(e.topic);
    const history: MyReport['history'] = { submitted: createdAt };
    for (const [step, after] of Object.entries(e.steps)) history[step as ReportStatus] = createdAt + after;
    const updates: ReportUpdate[] = [
      { who: 'You', kind: 'you', text: 'Submitted with a photo.', at: createdAt },
      { who: 'Boston 311', kind: 'city', text: `Received. Sent to ${info.department}.`, at: createdAt + 60_000 },
      ...e.updates.map(([after, who, text]): ReportUpdate => ({ who, kind: 'city', text, at: createdAt + after })),
    ];
    return {
      id: `example-${now}-${i}`,
      number: `TP-${String(createdAt).slice(-6)}`,
      topic: e.topic,
      title: e.title,
      description: e.description,
      aiDraft: e.aiDraft ?? e.description,
      urgency: e.urgency,
      address: e.address,
      latitude: center.latitude + e.at[0],
      longitude: center.longitude + e.at[1],
      photoUri: `example:${e.photo}`,
      createdAt,
      status: e.status,
      history,
      updates,
      department: info.department,
      team: e.team,
      reason: e.reason,
    };
  });
  await addSavedReports(reports);
  return reports;
}

/** Seeded user's neighborhood, for when we don't know where the device is yet. */
const ALLSTON = { latitude: 42.3539, longitude: -71.1337 };

/** Where to put example reports: around the device if we know where it is, else Allston. */
export async function exampleCenter() {
  // Don't wait long: the list waits on this, and some platforms never answer.
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
  const position = await Promise.race([Location.getLastKnownPositionAsync().catch(() => null), timeout]);
  return position?.coords ?? ALLSTON;
}

/** Dev only: the first time the Report tab opens (after this shipped), add the examples once. */
export async function seedExamplesOnce(): Promise<boolean> {
  if (!__DEV__ || (await Storage.getItem(EXAMPLES_SEEDED_KEY))) return false;
  await Storage.setItem(EXAMPLES_SEEDED_KEY, '1');
  await seedExampleReports(await exampleCenter());
  return true;
}

/** Dev only: wipe saved reports and the "first time" intro flag. */
export async function resetReports() {
  await Storage.removeItem('myReports');
  await Storage.removeItem('reportIntroSeen');
  await Storage.removeItem(EXAMPLES_SEEDED_KEY);
}
