import { getRecentInProgressCases } from '@/lib/boston-311';
import { addMyReport, getMyReports, type MyReport } from '@/lib/my-reports';

/**
 * Dev only: follow a few real, currently in-progress 311 cases so we can watch the
 * refresh work. They're saved as `submitted` (red) on purpose, so the next sync from
 * 311 should flip them to green.
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
    seeded.push(
      await addMyReport({
        topic: c.case_topic,
        description: `Seeded from 311: ${c.full_address}`,
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
        status: 'submitted',
        caseId: c.case_id,
        assignedTeam: c.assigned_team,
      }),
    );
  }
  return seeded;
}
