/**
 * 311 case topics a resident could photograph, taken from the city's own
 * `case_topic` values (data/boston-311/data.csv). Requests that aren't a visible
 * problem (permits, stickers, lost pets, suggestions) are left out.
 */
export const REPORTABLE_TOPICS = [
  'Abandoned Vehicles',
  'Ballfield Issue',
  'Broken Park Equipment',
  'Broken Public Waste Receptacle',
  'Construction Debris',
  'Crosswalk Maintenance',
  'Damaged/Faded Sign',
  'Dead Animal General',
  'Fallen Tree or Branches',
  'Fences/Guardrails/Bollards',
  'Illegal Dumping or Disposal',
  'Illegal Graffiti',
  'Illegal Parking',
  'Illegally Blocked Sidewalk',
  'Improper Trash Storage',
  'Lane Divider',
  'Litter & Debris',
  'Locked Gates',
  'Missed Waste Pick-up',
  'Missing / Knocked Down Sign',
  'Missing Manhole Cover',
  'Needle Pickup',
  'Overflowing Trash',
  'Overgrown Weeds',
  'Park Groundskeeping',
  'Park Light Outage',
  'Park Overflowing Trash Can',
  'Parking Meter Repairs',
  'Pothole',
  'Road Marking Maintenance',
  'Sidewalk Repair',
  'Street Light Knockdown',
  'Street Light Outage',
  'Traffic Signal Knockdown',
  'Trash Placed Out Early',
  'Tree or Stump Removal',
  'Unauthorized Signage',
  'Wild Animal Issue',
  'Other',
] as const;

export type ReportTopic = (typeof REPORTABLE_TOPICS)[number];

/**
 * Topics residents (and the AI) easily mix up for the same problem. Used to widen the
 * duplicate search. Includes 311 topics we don't offer ourselves, since existing cases use them.
 */
const RELATED_TOPICS: string[][] = [
  ['Street Light Outage', 'Street Light Other', 'Street Light Knockdown', 'Street Light Electrical Safety', 'Park Light Outage'],
  ['Damaged/Faded Sign', 'Missing / Knocked Down Sign', 'Knocked Down Sign'],
  ['Litter & Debris', 'Illegal Dumping or Disposal', 'Construction Debris', 'Improper Trash Storage', 'Trash Placed Out Early', 'Missed Waste Pick-up'],
  ['Overflowing Trash', 'Park Overflowing Trash Can', 'Broken Public Waste Receptacle'],
  ['Pothole', 'Sidewalk Repair', 'Missing Manhole Cover'],
  ['Crosswalk Maintenance', 'Road Marking Maintenance', 'Lane Divider'],
  ['Fallen Tree or Branches', 'Tree or Stump Removal', 'Overgrown Weeds', 'Park Groundskeeping'],
  ['Broken Park Equipment', 'Ballfield Issue', 'Park Groundskeeping', 'Locked Gates'],
  ['Illegal Parking', 'Abandoned Vehicles', 'Illegally Blocked Sidewalk', 'Illegal Yard Parking'],
  ['Dead Animal General', 'Wild Animal Issue', 'Domestic Animal Issue'],
];

/** The topic plus every topic grouped with it. `null` means "Other": match any topic. */
export function relatedTopics(topic: string): string[] | null {
  if (topic === 'Other') return null;
  const related = new Set([topic]);
  for (const group of RELATED_TOPICS) {
    if (group.includes(topic)) group.forEach((t) => related.add(t));
  }
  return [...related];
}
