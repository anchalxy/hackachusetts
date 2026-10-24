/**
 * Where users can live. Greater Boston only (Plan.md): Boston plus the three neighbors.
 * Boston neighborhoods are the city's own names, as used in the 311 data.
 */
export const BOSTON_NEIGHBORHOODS = [
  'Allston',
  'Back Bay',
  'Bay Village',
  'Beacon Hill',
  'Brighton',
  'Charlestown',
  'Chinatown',
  'Dorchester',
  'Downtown',
  'East Boston',
  'Fenway',
  'Hyde Park',
  'Jamaica Plain',
  'Leather District',
  'Longwood',
  'Mattapan',
  'Mission Hill',
  'North End',
  'Roslindale',
  'Roxbury',
  'South Boston',
  'South Boston Waterfront',
  'South End',
  'West End',
  'West Roxbury',
] as const;

export const CITIES = ['Boston', 'Cambridge', 'Somerville', 'Brookline'] as const;

export type City = (typeof CITIES)[number];
export type BostonNeighborhood = (typeof BOSTON_NEIGHBORHOODS)[number];
