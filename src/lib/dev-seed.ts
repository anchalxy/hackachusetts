import Storage from 'expo-sqlite/kv-store';

import { topicInfo } from '@/constants/report-topics';
import { getRecentInProgressCases } from '@/lib/boston-311';
import { addMyReport, getMyReports, type MyReport } from '@/lib/my-reports';

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

/** Dev only: wipe saved reports and the "first time" intro flag. */
export async function resetReports() {
  await Storage.removeItem('myReports');
  await Storage.removeItem('reportIntroSeen');
}
