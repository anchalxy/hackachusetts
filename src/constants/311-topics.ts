/**
 * 311 case topics a resident could photograph, taken from the city's own
 * `case_topic` values (boston-311/data.csv). Requests that aren't a visible
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
