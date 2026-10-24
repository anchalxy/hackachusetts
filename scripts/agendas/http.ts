// Some city sites block requests without a browser-like user agent.
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Hackachusetts civic app; agenda fetcher)' };

async function get(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
      if (response.ok) return response;
      lastError = new Error(`${response.status} ${response.statusText} for ${url}`);
      if (response.status < 500) break; // 4xx won't fix itself
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw lastError;
}

export async function getJson<T>(url: string): Promise<T> {
  return (await get(url)).json() as Promise<T>;
}

export async function getText(url: string): Promise<string> {
  return (await get(url)).text();
}

export async function getBytes(url: string): Promise<Buffer> {
  return Buffer.from(await (await get(url)).arrayBuffer());
}

/** Collapses tags and entities into plain text. Good enough for agenda pages, not a real parser. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** `Date` → `YYYY-MM-DD` in Boston time. */
export function bostonDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
