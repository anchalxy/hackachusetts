import { bostonDate, getJson } from '../http.ts';
import type { City, DateWindow, Meeting } from '../types.ts';

// Granicus Legistar Web API. Boston and Somerville both publish here.
// Docs: https://webapi.legistar.com/Help
const CLIENTS: { city: City; client: string; site: string }[] = [
  { city: 'Boston', client: 'boston', site: 'https://boston.legistar.com' },
  { city: 'Somerville', client: 'somervillema', site: 'https://somervillema.legistar.com' },
];

type LegistarEvent = {
  EventId: number;
  EventBodyName: string;
  EventDate: string; // "2026-10-27T00:00:00" (date only)
  EventTime: string | null; // "9:30 AM"
  EventLocation: string | null;
  EventAgendaFile: string | null;
  EventAgendaStatusName: string;
  EventComment: string | null;
  EventInSiteURL: string | null;
};

/** "2026-10-27T00:00:00" + "9:30 AM" → "2026-10-27T09:30". */
function toLocalStart(date: string, time: string | null): string {
  const day = date.slice(0, 10);
  const match = time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return `${day}T00:00`;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return `${day}T${String(hours).padStart(2, '0')}:${match[2]}`;
}

async function fetchClient(
  { city, client, site }: (typeof CLIENTS)[number],
  window: DateWindow,
): Promise<Meeting[]> {
  const filter = `EventDate ge datetime'${bostonDate(window.from)}' and EventDate le datetime'${bostonDate(window.to)}'`;
  const url = `https://webapi.legistar.com/v1/${client}/events?$filter=${encodeURIComponent(filter)}&$orderby=EventDate`;
  const events = await getJson<LegistarEvent[]>(url);

  return events
    .filter((e) => !/cancel/i.test(`${e.EventComment ?? ''} ${e.EventAgendaStatusName}`))
    .map((e) => ({
      id: `legistar:${client}:${e.EventId}`,
      city,
      source: 'legistar',
      body: e.EventBodyName,
      title: e.EventBodyName,
      start: toLocalStart(e.EventDate, e.EventTime),
      location: e.EventLocation,
      pageUrl: e.EventInSiteURL ?? `${site}/Calendar.aspx`,
      docs: e.EventAgendaFile ? [{ kind: 'agenda', format: 'pdf', url: e.EventAgendaFile }] : [],
      summary: e.EventComment || null,
    }));
}

export async function fetchLegistar(window: DateWindow): Promise<Meeting[]> {
  const results = await Promise.all(CLIENTS.map((c) => fetchClient(c, window)));
  return results.flat();
}
