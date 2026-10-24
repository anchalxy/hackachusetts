import { getJson } from '../http.ts';
import type { AgendaDoc, DateWindow, Meeting } from '../types.ts';

// PrimeGov public portal API. Cambridge moved here from iQM2 in 2026.
const SITE = 'https://cambridgema.primegov.com';

type PrimeGovMeeting = {
  id: number;
  title: string;
  dateTime: string; // local, no offset: "2026-10-27T18:00:00"
  location: string | null;
  documentList: {
    id: number;
    templateId: number;
    templateName: string; // "HTML Agenda", "Agenda", "Packet", "Minutes"
    compileOutputType: number; // 1 = PDF, 3 = HTML
  }[];
};

function docFor(doc: PrimeGovMeeting['documentList'][number]): AgendaDoc | null {
  const kind = /packet/i.test(doc.templateName) ? 'packet' : /agenda/i.test(doc.templateName) ? 'agenda' : null;
  if (!kind) return null;
  return doc.compileOutputType === 3
    ? { kind, format: 'html', url: `${SITE}/Portal/Meeting?compiledMeetingDocumentFileId=${doc.id}` }
    : { kind, format: 'pdf', url: `${SITE}/Public/CompiledDocument?meetingTemplateId=${doc.templateId}&compileOutputType=1` };
}

export async function fetchPrimeGov(window: DateWindow): Promise<Meeting[]> {
  const upcoming = await getJson<PrimeGovMeeting[]>(`${SITE}/api/v2/PublicPortal/ListUpcomingMeetings`);
  const from = window.from.getTime();
  const to = window.to.getTime();

  return upcoming
    .filter((m) => {
      // dateTime has no offset; parsing it as local is fine for a day-level window.
      const time = new Date(m.dateTime).getTime();
      return time >= from && time <= to && !/cancel/i.test(m.title);
    })
    .map((m) => ({
      id: `primegov:cambridgema:${m.id}`,
      city: 'Cambridge',
      source: 'primegov',
      body: m.title,
      title: m.title.trim(),
      start: m.dateTime.slice(0, 16),
      location: m.location || null,
      pageUrl: `${SITE}/Portal/MeetingPreview?compiledMeetingDocumentFileId=${m.documentList.find((d) => d.compileOutputType === 3)?.id ?? ''}`,
      docs: m.documentList.map(docFor).filter((d): d is AgendaDoc => d !== null),
      summary: null,
    }));
}
