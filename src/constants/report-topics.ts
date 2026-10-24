// Generated from a 20,000-case sample of Boston 311 data (Sep 14 – Oct 24, 2026):
// the department that usually handles each topic and the median days to resolve it.
// typicalDays is null when the sample had fewer than 5 resolved cases.
import type { ReportTopic } from './311-topics';
import type { IconName } from '@/ui/icon';

export type TopicInfo = { icon: IconName; department: string; shortDepartment: string; typicalDays: number | null };

export const TOPIC_INFO: Record<ReportTopic, TopicInfo> = {
  'Abandoned Vehicles': { icon: 'parking', department: 'Boston Transportation Department (BTD)', shortDepartment: 'Transportation', typicalDays: 6 },
  'Ballfield Issue': { icon: 'tree', department: 'Parks & Recreation', shortDepartment: 'Parks & Recreation', typicalDays: 7 },
  'Broken Park Equipment': { icon: 'bench', department: 'Parks & Recreation', shortDepartment: 'Parks & Recreation', typicalDays: 4 },
  'Broken Public Waste Receptacle': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Construction Debris': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Crosswalk Maintenance': { icon: 'crosswalk', department: 'Boston Transportation Department (BTD)', shortDepartment: 'Transportation', typicalDays: null },
  'Damaged/Faded Sign': { icon: 'traffic', department: 'Boston Transportation Department (BTD)', shortDepartment: 'Transportation', typicalDays: null },
  'Dead Animal General': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Fallen Tree or Branches': { icon: 'tree', department: 'Parks & Recreation', shortDepartment: 'Parks & Recreation', typicalDays: 1 },
  'Fences/Guardrails/Bollards': { icon: 'sidewalk', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: null },
  'Illegal Dumping or Disposal': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Illegal Graffiti': { icon: 'graffiti', department: 'City of Boston Property Management', shortDepartment: 'Property Management', typicalDays: 2 },
  'Illegal Parking': { icon: 'parking', department: 'Boston Transportation Department (BTD)', shortDepartment: 'Transportation', typicalDays: 1 },
  'Illegally Blocked Sidewalk': { icon: 'sidewalk', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Improper Trash Storage': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Lane Divider': { icon: 'crosswalk', department: 'Boston Transportation Department (BTD)', shortDepartment: 'Transportation', typicalDays: null },
  'Litter & Debris': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Locked Gates': { icon: 'lock', department: 'Parks & Recreation', shortDepartment: 'Parks & Recreation', typicalDays: null },
  'Missed Waste Pick-up': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Missing / Knocked Down Sign': { icon: 'traffic', department: 'Boston Transportation Department (BTD)', shortDepartment: 'Transportation', typicalDays: 4 },
  'Missing Manhole Cover': { icon: 'pothole', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: null },
  'Needle Pickup': { icon: 'siren', department: 'Boston Public Health Commission (BPHC)', shortDepartment: 'Public Health', typicalDays: 1 },
  'Overflowing Trash': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Overgrown Weeds': { icon: 'tree', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Park Groundskeeping': { icon: 'tree', department: 'Parks & Recreation', shortDepartment: 'Parks & Recreation', typicalDays: 2 },
  'Park Light Outage': { icon: 'streetlight', department: 'Parks & Recreation', shortDepartment: 'Parks & Recreation', typicalDays: 2 },
  'Park Overflowing Trash Can': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 2 },
  'Parking Meter Repairs': { icon: 'parking', department: 'Boston Transportation Department (BTD)', shortDepartment: 'Transportation', typicalDays: null },
  'Pothole': { icon: 'pothole', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 2 },
  'Road Marking Maintenance': { icon: 'crosswalk', department: 'Boston Transportation Department (BTD)', shortDepartment: 'Transportation', typicalDays: null },
  'Sidewalk Repair': { icon: 'sidewalk', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Street Light Knockdown': { icon: 'streetlight', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Street Light Outage': { icon: 'streetlight', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 4 },
  'Traffic Signal Knockdown': { icon: 'traffic', department: 'Boston Transportation Department (BTD)', shortDepartment: 'Transportation', typicalDays: 1 },
  'Trash Placed Out Early': { icon: 'trash', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Tree or Stump Removal': { icon: 'tree', department: 'Parks & Recreation', shortDepartment: 'Parks & Recreation', typicalDays: 2 },
  'Unauthorized Signage': { icon: 'traffic', department: 'Public Works Department (PWD)', shortDepartment: 'Public Works', typicalDays: 1 },
  'Wild Animal Issue': { icon: 'tree', department: 'Animal Care & Control', shortDepartment: 'Animal Care & Control', typicalDays: 1 },
  'Other': { icon: 'doc', department: 'Boston 311', shortDepartment: 'Boston 311', typicalDays: 1 },
};

export function topicInfo(topic: string): TopicInfo {
  return TOPIC_INFO[topic as ReportTopic] ?? TOPIC_INFO.Other;
}
