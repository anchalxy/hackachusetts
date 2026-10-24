import type { IconName } from '@/ui/icon';

/** The 16 Freedom Trail landmarks, in trail order (design/assets/trail/pieces). */
export const LANDMARKS = [
  { file: '01-boston-common', name: 'Boston Common' },
  { file: '02-state-house', name: 'Massachusetts State House' },
  { file: '03-park-street-church', name: 'Park Street Church' },
  { file: '04-granary-burying-ground', name: 'Granary Burying Ground' },
  { file: '05-kings-chapel', name: 'King’s Chapel' },
  { file: '06-franklin-latin-school', name: 'Boston Latin School' },
  { file: '07-old-corner-bookstore', name: 'Old Corner Bookstore' },
  { file: '08-old-south-meeting-house', name: 'Old South Meeting House' },
  { file: '09-old-state-house', name: 'Old State House' },
  { file: '10-boston-massacre-site', name: 'Boston Massacre Site' },
  { file: '11-faneuil-hall', name: 'Faneuil Hall' },
  { file: '12-paul-revere-house', name: 'Paul Revere House' },
  { file: '13-old-north-church', name: 'Old North Church' },
  { file: '14-copps-hill', name: 'Copp’s Hill' },
  { file: '15-uss-constitution', name: 'USS Constitution' },
  { file: '16-bunker-hill-monument', name: 'Bunker Hill Monument' },
] as const;

export type LandmarkFile = (typeof LANDMARKS)[number]['file'];

export type FlowRoute =
  | '/flow/urban-wild'
  | '/flow/spend-2-million'
  | '/flow/cummins-walk-audit'
  | '/flow/rat-patrol'
  | '/flow/council-meeting';

/** A chip on the detail sheet. `leaf` = green with Leafy, `due` = gold, `urgent` = brick, plain = tile. */
export type StopChip = { label: string; tone: 'leaf' | 'due' | 'urgent' | 'plain' };

/**
 * How one of this week's challenges shows up on the trail and in its detail sheet
 * (design/screens/challenges/README.md, tea-leaf-scale.png). Copy is from the mockups.
 */
export type TrailStop = {
  landmark: LandmarkFile;
  /** Floating chip above the piece, and the sheet's icon tile. */
  icon: IconName;
  /** Tea leaves = the doc's points ×10, with the design's scoring (tea-leaf-scale.png). */
  leaves: number;
  title: string;
  body: string;
  chips: StopChip[];
  askedBy: { name: string; office: string };
  /** "boston.gov · Urban Wilds Strategic Plan open house" */
  sourceLabel: string;
  flow: FlowRoute;
};

export const TRAIL_STOPS: Record<string, TrailStop> = {
  'demo-urban-wild': {
    landmark: '14-copps-hill',
    icon: 'tree',
    leaves: 70,
    title: 'Redesign your urban wild',
    body: 'Visit one of Boston’s 31 urban wilds and design what it should become. Parks is writing its first Urban Wilds Strategic Plan, and the open house is Nov 10.',
    chips: [
      { label: '+70 tea leaves', tone: 'leaf' },
      { label: 'Due Sun, Nov 8', tone: 'due' },
      { label: '45–60 min', tone: 'plain' },
      { label: 'In person', tone: 'plain' },
    ],
    askedBy: { name: 'Katherine Oetheimer', office: 'Boston Parks and Recreation' },
    sourceLabel: 'boston.gov · Urban Wilds Strategic Plan open house',
    flow: '/flow/urban-wild',
  },
  'demo-pb-2-million': {
    landmark: '13-old-north-church',
    icon: 'ballot',
    leaves: 40,
    title: 'Spend Boston’s $2 million',
    body: 'Residents sent in over 1,300 ideas this summer. Build your own ballot from real projects before residents draft the official one on Nov 5.',
    chips: [
      { label: '+40 tea leaves', tone: 'leaf' },
      { label: 'Due Wed, Nov 4', tone: 'due' },
      { label: '30–45 min', tone: 'plain' },
    ],
    askedBy: { name: 'Office of Participatory Budgeting', office: 'City Hall, Room 813' },
    sourceLabel: 'boston.gov · Ideas in Action, cycle 3',
    flow: '/flow/spend-2-million',
  },
  'demo-cummins-walk-audit': {
    landmark: '12-paul-revere-house',
    icon: 'crosswalk',
    leaves: 80,
    title: 'Walk-audit Cummins Highway',
    body: 'The rebuilt Cummins Highway in Mattapan is nearly done. Walk, roll or bike three crossings and score how it works, for everyone who missed the Oct 24 walkthrough.',
    chips: [
      { label: '+80 tea leaves', tone: 'leaf' },
      { label: 'Due Sun, Nov 1', tone: 'due' },
      { label: '45–60 min', tone: 'plain' },
      { label: 'In person', tone: 'plain' },
    ],
    askedBy: { name: 'Cummins Highway project team', office: 'Boston Public Works' },
    sourceLabel: 'boston.gov · Cummins Highway project',
    flow: '/flow/cummins-walk-audit',
  },
  'demo-rat-patrol': {
    landmark: '11-faneuil-hall',
    icon: 'rat',
    // 30 on the report, 10 at the day-7 check-in.
    leaves: 40,
    title: 'Rat patrol: time a 311 report',
    body: 'Report a sign of rats to 311, then check back in 7 days. Response times go to the Council committee that just reviewed Boston’s Rodent Action Plan.',
    chips: [
      { label: '+40 tea leaves', tone: 'leaf' },
      { label: 'Report by Sun, Nov 1', tone: 'due' },
      { label: '15–30 min', tone: 'plain' },
    ],
    askedBy: { name: 'Meagan Corugedo Martin', office: 'City Services Committee staff' },
    sourceLabel: 'boston.gov · Docket #1804, Rodent Action Plan',
    flow: '/flow/rat-patrol',
  },
  'demo-council-oct-28': {
    landmark: '10-boston-massacre-site',
    icon: 'notes',
    // 60 by livestream.
    leaves: 80,
    title: 'Cover the Oct 28 Council meeting',
    body: 'Follow one docket at Wednesday’s City Council meeting, from first mention to the vote. Your notes go to its sponsor and your district councilor.',
    chips: [
      { label: '+80 tea leaves', tone: 'leaf' },
      { label: '+60 by livestream', tone: 'plain' },
      { label: 'Due Fri, Oct 30', tone: 'urgent' },
      { label: 'Over 1 hour', tone: 'plain' },
    ],
    askedBy: { name: 'Docket sponsor + your councilor', office: 'Boston City Council' },
    sourceLabel: 'boston.gov · City Council agenda, Oct 28',
    flow: '/flow/council-meeting',
  },
};

/** Generated weeks don't have hand-made stops yet: fall back by position on the trail. */
const FALLBACK_LANDMARKS: LandmarkFile[] = [
  '10-boston-massacre-site',
  '11-faneuil-hall',
  '12-paul-revere-house',
  '13-old-north-church',
  '14-copps-hill',
];

export function trailStop(challengeId: string): TrailStop | undefined {
  return TRAIL_STOPS[challengeId];
}

export function fallbackLandmark(index: number): LandmarkFile {
  return FALLBACK_LANDMARKS[index % FALLBACK_LANDMARKS.length];
}

export function landmarkName(file: LandmarkFile): string {
  return LANDMARKS.find((l) => l.file === file)?.name ?? '';
}

/** "Your next stop is due by Sun, Nov 8" on every Sent screen. */
export const NEXT_STOP_DUE = 'Sun, Nov 8';
