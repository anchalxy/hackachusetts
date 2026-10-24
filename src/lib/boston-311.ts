import Storage from 'expo-sqlite/kv-store';

// Boston 311 open data (new 311 system). No coordinates or case IDs in this slice.
// See boston-311/README.md for the saved snapshot and field notes.
const URL =
  'https://data.boston.gov/api/3/action/datastore_search?resource_id=254adca6-64ab-4c5c-9fc0-a6da622be185&fields=open_date,case_topic,service_name,assigned_department,case_status,neighborhood,zip_code,on_time,city_council_district,ward&sort=open_date%20desc&limit=100';

const CACHE_KEY = 'boston311:recent';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type Case311 = {
  open_date: string;
  case_topic: string;
  service_name: string;
  assigned_department: string;
  case_status: string;
  neighborhood: string;
  zip_code: string;
  on_time: 'ONTIME' | 'OVERDUE';
  city_council_district: string;
  ward: string;
};

export type Recent311 = { fetchedAt: number; cases: Case311[] };

const RESOURCE_ID = '254adca6-64ab-4c5c-9fc0-a6da622be185';

export type NearbyCase = {
  case_id: string;
  case_topic: string;
  case_status: string;
  assigned_team: string;
  full_address: string;
  open_date: string;
};

// ~50 m around the point. One degree of latitude is ~111 km; longitude shrinks with cos(lat).
const RADIUS_LAT = 0.00045;
const RADIUS_LON = 0.0006;

/** Open 311 cases with the same topic near a point, newest first. Used to catch duplicates. */
export async function findNearbyOpenCases(
  latitude: number,
  longitude: number,
  topic: string,
): Promise<NearbyCase[]> {
  // Values are numbers we computed and a topic from our own fixed list, but escape quotes anyway.
  const safeTopic = topic.replace(/'/g, "''");
  const sql = `SELECT case_id, case_topic, case_status, assigned_team, full_address, open_date
    FROM "${RESOURCE_ID}"
    WHERE case_status <> 'Closed'
      AND case_topic = '${safeTopic}'
      AND latitude::float BETWEEN ${latitude - RADIUS_LAT} AND ${latitude + RADIUS_LAT}
      AND longitude::float BETWEEN ${longitude - RADIUS_LON} AND ${longitude + RADIUS_LON}
    ORDER BY open_date DESC
    LIMIT 5`;

  const response = await fetch(
    `https://data.boston.gov/api/3/action/datastore_search_sql?sql=${encodeURIComponent(sql)}`,
  );
  if (!response.ok) throw new Error(`311 search failed: ${response.status}`);
  const json = await response.json();
  if (!json.success) throw new Error('311 search was not successful');
  return json.result.records;
}

/** Latest 311 cases, refreshed from the city at most once a day. */
export async function getRecent311Cases(): Promise<Recent311> {
  const raw = await Storage.getItem(CACHE_KEY);
  const cached: Recent311 | null = raw ? JSON.parse(raw) : null;
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached;

  try {
    const response = await fetch(URL);
    if (!response.ok) throw new Error(`311 request failed: ${response.status}`);
    const json = await response.json();
    if (!json.success) throw new Error('311 request was not successful');

    const fresh: Recent311 = { fetchedAt: Date.now(), cases: json.result.records };
    await Storage.setItem(CACHE_KEY, JSON.stringify(fresh));
    return fresh;
  } catch (error) {
    // Offline or the city API is down: a stale copy beats nothing.
    if (cached) return cached;
    throw error;
  }
}
