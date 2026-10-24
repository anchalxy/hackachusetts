import { getJson } from '../http.ts';
import type { AgendaDoc, DateWindow, Meeting } from '../types.ts';

// CivicClerk public OData API. Brookline publishes here.
const TENANT = 'brooklinema';
const API = `https://${TENANT}.api.civicclerk.com/v1`;

type CivicClerkEvent = {
  id: number;
  eventName: string;
  eventDescription: string | null;
  categoryName: string | null;
  startDateTime: string; // local wall-clock time, despite the trailing Z
  eventLocation: { address1: string | null; city: string | null } | null;
  publishedFiles: { fileId: number; type: string }[];
};

function docFor(file: CivicClerkEvent['publishedFiles'][number]): AgendaDoc | null {
  const kind = /packet/i.test(file.type) ? 'packet' : /agenda/i.test(file.type) ? 'agenda' : null;
  if (!kind) return null; // minutes etc. aren't useful before a meeting
  return { kind, format: 'pdf', url: `${API}/Meetings/GetMeetingFileStream(fileId=${file.fileId},plainText=false)` };
}

export async function fetchCivicClerk(window: DateWindow): Promise<Meeting[]> {
  const filter = `startDateTime ge ${window.from.toISOString()} and startDateTime le ${window.to.toISOString()}`;
  const url = `${API}/Events?$filter=${encodeURIComponent(filter)}&$orderby=startDateTime`;
  const { value } = await getJson<{ value: CivicClerkEvent[] }>(url);

  return value
    .filter((e) => !/cancel/i.test(e.eventName))
    .map((e) => ({
      id: `civicclerk:${TENANT}:${e.id}`,
      city: 'Brookline',
      source: 'civicclerk',
      body: e.categoryName ?? e.eventName,
      title: e.eventName,
      start: e.startDateTime.slice(0, 16),
      location: [e.eventLocation?.address1, e.eventLocation?.city].filter(Boolean).join(', ') || null,
      pageUrl: `https://${TENANT}.portal.civicclerk.com/event/${e.id}/overview`,
      docs: e.publishedFiles.map(docFor).filter((d): d is AgendaDoc => d !== null),
      summary: e.eventDescription || null,
    }));
}
