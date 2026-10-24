import { getText, htmlToText } from '../http.ts';
import type { DateWindow, Meeting } from '../types.ts';

// boston.gov/public-notices: hearings and community meetings that aren't in Legistar
// (City Council committee hearings, BERDO, licensing, neighborhood meetings). HTML only.
const SITE = 'https://www.boston.gov';
const PAGES = 3; // ~10 notices per page, newest first

/** Notice detail pages carry two <time datetime="…Z">: posted-at and the meeting itself (later). */
function meetingStart(html: string): string | null {
  const times = [...html.matchAll(/datetime="([^"]+)"/g)].map((m) => new Date(m[1]));
  if (times.length === 0) return null;
  const latest = new Date(Math.max(...times.map((t) => t.getTime())));
  const local = latest.toLocaleString('sv-SE', { timeZone: 'America/New_York' }); // "2026-10-26 10:00:00"
  return local.slice(0, 16).replace(' ', 'T');
}

/** Location from the page's schema.org JSON-LD (its startDate is UTC without a Z, so we don't use that). */
function location(html: string): string | null {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const graph = JSON.parse(m[1])['@graph'] ?? [];
      const address = graph.find((node: { location?: unknown }) => node.location)?.location?.address;
      if (!address) continue;
      const street = [address.streetAddress].flat().filter(Boolean).join(', ');
      return [street, address.addressLocality].filter(Boolean).join(', ') || null;
    } catch {
      // malformed JSON-LD: fall through to null
    }
  }
  return null;
}

async function listNoticeLinks(): Promise<{ path: string; title: string }[]> {
  const links: { path: string; title: string }[] = [];
  for (let page = 0; page < PAGES; page++) {
    const html = await getText(`${SITE}/public-notices?page=${page}`);
    for (const m of html.matchAll(/href="(\/public-notices\/\d+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      if (!links.some((l) => l.path === m[1])) links.push({ path: m[1], title: htmlToText(m[2]) });
    }
  }
  return links;
}

export async function fetchBostonNotices(window: DateWindow): Promise<Meeting[]> {
  const meetings: Meeting[] = [];
  for (const { path, title } of await listNoticeLinks()) {
    const html = await getText(`${SITE}${path}`);
    const start = meetingStart(html);
    if (!start) continue;
    const when = new Date(start).getTime();
    if (when < window.from.getTime() || when > window.to.getTime()) continue;

    const body = html.match(/<article[\s\S]*?<\/article>/)?.[0] ?? html;
    meetings.push({
      id: `boston-notices:${path.split('/').pop()}`,
      city: 'Boston',
      source: 'boston-notices',
      body: /city council/i.test(title) ? 'City Council' : 'Public notice',
      title,
      start,
      location: location(html),
      pageUrl: `${SITE}${path}`,
      docs: [{ kind: 'notice', format: 'html', url: `${SITE}${path}` }],
      summary: htmlToText(body)
        .split('\n')
        .filter((line) => !/^(Toggle|Page Sections|topics|Contact Us)$/i.test(line.trim()))
        .join('\n')
        .slice(0, 1500),
    });
  }
  return meetings;
}
