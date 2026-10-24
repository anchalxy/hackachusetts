# Design Document

## Overview

Tea Party is a civic-engagement product with two halves that meet at a folder of JSON files:

1. **The consumer app** — an Expo SDK 58 / React Native client, navigated with Expo Router, that ships the four tabs (Challenges, Report, Rewards, Account) and the per-challenge flows. All user-facing state lives in `expo-sqlite/kv-store` and is exposed to React through `useSyncExternalStore` reactive stores in `src/lib/`.
2. **The offline agenda pipeline** — a plain Node toolchain in `scripts/agendas/` that scrapes Greater Boston meeting agendas, uses Claude to extract resident-actionable items, generates the week's challenges with code-computed points, tracks what the city did afterward, and sends (mocked) email digests to the named government contacts.

The two halves never call each other at runtime. The pipeline **writes** to `data/` (meetings, items, challenges, updates, digests) and the app **reads** the committed outputs — either bundled at build time (`import demoWeek from 'data/challenges/demo-week.json'`) or over the Expo Router API route `GET /api/challenges` that reads them off disk. `data/` is the contract between them.

```
   scripts/agendas/ (Node, offline)              data/ (handoff)                 src/ (Expo app)
   ─────────────────────────────────            ────────────────                 ───────────────
   fetch-meetings  ─► meetings.json  ─┐          agendas/meetings.json
   extract-items   ─► items.json   ───┤  write   agendas/items.json      read    challenge-week.ts ─► Challenges tab
   generate-challenges ─► <week>/<area> ├────────► challenges/demo-week.json ────► /api/challenges  ─► flows
   track-updates   ─► updates.json ────┤          challenges/updates.json  ────►  challenge-update-feed.ts ─► Account
   send-digests    ─► digests/sent.json┘          digests/sent.json

   (live, at runtime, app only)
   analyze+api.ts ─► Claude (photo screen / match)      boston-311.ts ─► data.boston.gov SQL (dup check, status)
```

 Two places where the shipped code and the product prose disagree are called out as **Reconciliation items** and carried into tasks; where the rewards economy is concerned, `src/lib/rewards.ts` and `design/tokens/theme.ts` are authoritative (crate thresholds 50/100/150 then every 150; overflow carried; seed counter 120 of 150).

### Technology stack (as built)

| Concern | Choice | Location |
| --- | --- | --- |
| App framework | Expo SDK 58, React Native, TypeScript | `package.json`, `app.json` |
| Navigation | Expo Router (file-based, `src/app/`) | `src/app/_layout.tsx` |
| Persistence | `expo-sqlite/kv-store` (synchronous KV) | every `src/lib/*` store |
| Reactivity | `useSyncExternalStore` over module-level stores | `rewards.ts`, `challenge-progress.ts` |
| Camera / location / image | `expo-camera`, `expo-location`, `expo-image-manipulator`, `expo-file-system` | `settings.ts`, `report-photo.ts` |
| AI (app) | Anthropic SDK behind Expo Router API routes | `src/app/api/analyze+api.ts` |
| AI (pipeline) | Anthropic SDK, structured JSON-schema calls | `scripts/agendas/claude.ts` |
| 311 data | data.boston.gov CKAN datastore SQL | `src/lib/boston-311.ts` |
| Design tokens | generated token object | `design/tokens/theme.ts` → `src/ui/theme.ts` |
| Scheduling | GitHub Actions cron | `.github/workflows/weekly-challenges.yml` |

## Architecture

### Reactive store pattern

Every piece of user-facing state follows one shape, so the UI stays in sync without a global state library. A module owns a `let state`, a `Set` of listeners, `load()`/`set()` against `Storage` (the synchronous `expo-sqlite/kv-store`), and a `useX()` hook built on `useSyncExternalStore`.

```typescript
// Pattern shared by rewards.ts, challenge-progress.ts (synchronous KV stores)
let state: State = load();
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  Storage.setItemSync(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());        // notify every subscribed screen
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useState_(): State {
  return useSyncExternalStore(subscribe, () => state);
}
```

`rewards.ts` and `challenge-progress.ts` are fully reactive (synchronous KV + listeners). `my-reports.ts`, `profile.ts`, and `settings.ts` use the async `Storage.getItem/setItem` API and are read on demand / on focus rather than through a subscription, because reports are refreshed from the network (`refreshMyReportsFrom311`) and permissions are re-read on focus and foreground.

Derived values are pure functions of store state so they are both reactive and testable in isolation: `leafCounter(progress, rewards)`, `crateState(balance, cratesOpened)`, `leafBalance(progress, base)`, `streak(progress)`, `isOnMap(report, now)`, `statusFrom311(...)`, `dealStatus(deal, now)`.

### App route map (Expo Router, `src/app/`)

```
_layout.tsx                      root stack + font loading
(tabs)/_layout.tsx               floating-capsule tab bar
(tabs)/index.tsx                 Challenges — Freedom Trail
(tabs)/report.tsx                Report — personal map
(tabs)/rewards.tsx               Rewards — ship + crates
(tabs)/account.tsx               Account — profile, friends, activity
flow/urban-wild/                 design-input challenge flow
flow/spend-2-million/            budget-ballot challenge flow
flow/cummins-walk-audit/         service-test (walk audit) flow
flow/council-meeting/            meeting-notes flow
flow/rat-patrol/                 311-timing flow (report + day-7 check-in)
challenge/[id].tsx               generic challenge detail
report/[id].tsx                  a single report's thread + status
new-report.tsx                   photo-first capture → analyze → dup check → submit
deal/[id].tsx                    a redeemed deal's QR card
crate.tsx                        crate-open reveal animation
menu/                            settings (permissions, notifications, profile edit, dev)
api/analyze+api.ts               POST photo → Claude verdict/draft; match check
api/challenges+api.ts            GET demo|live week for an area
```

Only route code lives under `src/app/`; the stores, pure logic, and constants live in `src/lib/`, `src/constants/`, `src/ui/`, and `src/components/` per the project rule.

### Component map by tab

**Challenges tab** → `challenge-week.ts` (mode switch, `trailOrder`, `getChallenge`), `challenges.ts` (`Challenge`/`ChallengeWeek` types, `scorePoints`), `challenge-progress.ts` (`completeStop`, `addVote`, `streak`, `leafBalance`), `constants/trail.ts` (`TRAIL_STOPS`, Freedom Trail landmarks), `data/challenges/demo-week.json`. Each `flow/*` screen calls `completeStop(id, leaves, …)` when the user finishes, crediting leaves to the shared progress store.

**Report tab** → `my-reports.ts` (the report store, `statusFrom311`, `isOnMap`, `isFollowing`, `refreshMyReportsFrom311`), `report-photo.ts` (camera-shot prep + persistent storage), `report-check.ts` (calls `/api/analyze`), `boston-311.ts` (`findNearbyOpenCases` for dup check, `getCasesById` for status, `getRecentInProgressCases` for seeding), `constants/311-topics.ts` + `report-topics.ts` (topic→department/related-topics), `dev-seed.ts` (follow real in-progress cases for the demo).

**Rewards tab** → `rewards.ts` (the whole economy: `crateSize`, `crateState`, `leafCounter`, `openCrate`, `dealStatus`, `markDealUsed`, `PARTNERS`), `design/tokens/theme.ts` `points` block (thresholds), `crate.tsx` + `deal/[id].tsx` screens.

**Account tab** → `profile.ts` (profile store, `validateProfile`, `neighborhoodLockedUntil`), `constants/seed-profile.ts` (`Profile`, `areaLabel`/`areaSlug`/`neighborhoodLabel`), `settings.ts` (permissions + notification prefs), `challenge-update-feed.ts` (activity feed gated on completed challenges), `challenge-updates.ts` (tracked-update types).

### Challenges mode switch

`challenge-week.ts` reads `EXPO_PUBLIC_CHALLENGES_MODE` once at module load:

```typescript
const MODE = process.env.EXPO_PUBLIC_CHALLENGES_MODE === 'live' ? 'live' : 'demo';

export async function loadCurrentWeek(area: string): Promise<ChallengeWeek> {
  if (MODE === 'demo') return current;                 // bundled demo-week.json, no network
  const res = await fetch(`/api/challenges?mode=live&area=${encodeURIComponent(area)}`);
  const { week } = await res.json();
  return (current = week);
}
```

`GET /api/challenges` (`api/challenges+api.ts`) serves `demo-week.json` for `mode=demo`, and for `mode=live` looks the area up in `data/challenges/index.json`, validating the stored relative path against `^\d{4}-\d{2}-\d{2}/[a-z0-9-]+\.json$` before reading — never a path from the query string — and falling back to the demo week with `fallback: true` when the area has no generated week yet.

## Components and Interfaces

### Rewards economy (authoritative: `rewards.ts` + `theme.ts`)

The ship-on-rising-water visual is backed by one invariant: `leafCounter = max(0, earned − spent)`, where `earned` is the seed base (120) plus trail leaves plus dev bonus, and `spent` is the sum of sizes of opened crates.

```typescript
const SEED_LEAVES = 120;                               // seed counter before this week (120 of 150)
export function crateSize(index: number): number {     // 50, 100, 150, then 150 each
  return t.points.crateThresholds[index] ?? t.points.thenEvery;   // [50,100,150], 150
}
export function leafCounter(progress, rewards): number {
  const earned = trailLeaves(progress, SEED_LEAVES) + rewards.bonus;
  return Math.max(0, earned - rewards.spent);          // never below 0
}
export function crateState(balance, cratesOpened): CrateState {
  const size = crateSize(cratesOpened);
  let ready = 0, left = balance;
  while (left >= crateSize(cratesOpened + ready)) { left -= crateSize(cratesOpened + ready); ready += 1; }
  return { balance, size, filled: Math.min(balance, size), toGo: Math.max(0, size - balance), full: balance >= size, ready };
}
export function openCrate(progress, now = Date.now()): Deal | null {
  const crate = crateState(leafCounter(progress, state), state.cratesOpened);
  if (!crate.full) return null;                        // redemption only when full; one crate per call
  const deal = { id: String(now), partnerId: pickPartner(state.deals, now).id, code: newCode(), issuedAt: now };
  set({ ...state, cratesOpened: state.cratesOpened + 1, spent: state.spent + crate.size, deals: [deal, ...state.deals] });
  return deal;                                         // overflow stays in the counter, carried to next crate
}
```

Deals: each `openCrate` issues one `Deal { code, partnerId, issuedAt }`. `dealStatus(deal, now)` returns exactly one of `active | used | expired`; a code is `expired` once `now ≥ issuedAt + 7·DAY` and `used` once `markDealUsed` stamps `usedAt`. `markDealUsed` only stamps a deal that is not already used, so redemption is single-use and idempotent. A redeemed crate renders gray (driven by `dealStatus(...).kind === 'used'`).

**Dynamic rewards** are targeted by neighborhood and age only (from `Profile`), applied when a group is under 10% of responses and is the agenda item's focus, with the boost magnitude decided by the AI verifier. (Targeting/threshold is pure; the size is an AI decision.)

### Report flow (`new-report.tsx` + libs)

Photo-first, left to right:

1. **Capture** — `Report_Camera` (`expo-camera`) opens; no camera-roll access. `warmUpPhotoCheck()` pings `/api/analyze` so the route is warm by the time the shot lands. `preparePhoto` (`report-photo.ts`) shrinks the shot to a 1280px JPEG, keeps a base64 for the AI, and copies a persistent file under `documents/reports/`.
2. **Location** — the device location is read at the moment the photo is taken.
3. **Analyze** — `analyzePhoto(base64)` (`report-check.ts`) POSTs to `/api/analyze`, which asks Claude for a verdict (`ok | unclear | not_city_issue`), a 311 topic, a draft title/description, and urgency. `unclear` → retake; `not_city_issue` → rejected, never submitted to 311.
4. **Duplicate check** — on `ok`, `findNearbyOpenCases(lat, lon, topic)` (`boston-311.ts`) runs a bounding-box SQL query (±`RADIUS_LAT`=0.00045, ±`RADIUS_LON`=0.0006 ≈ 50 m) against open cases with the same or a related topic, exact-topic first. A match shows the case (topic, status, team, age) with a **Me too** button; `isFollowing(caseId)` disables Me too for a case already followed. Me too calls `addMyReport({ caseId, … })` and credits leaves as for an approved report. No match → submit step.
5. **Submit** — the user confirms/edits the description (`descriptionMatches` loosely checks the text still fits the photo, failing open). The new report is saved as a red pin.

**Pin status state machine** — `statusFrom311(case_status, closure_reason)` maps the 311 world onto the app lifecycle, and the pin color follows the status:

| 311 case_status | closure_reason | app status | pin color |
| --- | --- | --- | --- |
| (submitted by us, not yet in 311) / `Create` | — | `submitted` | red |
| `Needs Reallocation` | — | `inReview` | yellow |
| `In progress` | — | `approved` | green |
| `Closed` | `Noted` | `notApproved` | gray |
| `Closed` | `Transitioned` | `inReview` | yellow |
| `Closed` | `Resolved` (other) | `fixed` | leaves the map → notification naming the team |

`isOnMap(report, now)` keeps open reports on the map, keeps `fixed` ones for `FIXED_PIN_DAYS` (7) after the fix, and never shows `notApproved`. `refreshMyReportsFrom311()` pulls `getCasesById` for every open followed case, advances status, and appends a city thread message naming `assigned_team`.

**Points & penalties** — reaching `In progress` (`approved`) credits the report's leaves once. Penalties apply only to AI-rejected reports: the user's third AI-rejected report deducts 1 point; no other path deducts. Reports never count toward the streak.

**Demo mode** — submission to 311 is mocked (no real ticket); a real case's timeline is replayed so a report walks its pin-color states. `dev-seed.ts` can follow a few real in-progress cases so the refresh path is demoable.

### Challenge system

`Challenge`/`ChallengeWeek` (`challenges.ts`) are the shared shape between app and pipeline (no `@/` imports, since Node runs the file directly). `trailOrder(week)` sorts the week's 4–5 challenges by soonest deadline then number — one trail stop per challenge, no placeholder. Selecting a monument opens the detail (title, points, source agenda link, named contact) and routes into the matching `flow/*`.

Completion: every challenge requires a submission; council-meeting requires notes; the AI verifier checks notes/photos/timings against the referenced meeting or site before credit. On accept, `completeStop(id, leaves, …)` records the stop and credits leaves to `challenge-progress.ts`; on reject, no stop is recorded and the balance is unchanged (rat patrol is the one two-part flow: 30 on report, 10 at the day-7 check-in, via `pendingCheckIn`).

Voting: `addVote()` increments a weekly counter up to `MAX_VOTES` (10); each vote adds a fixed per-vote amount to the balance. Voting on one's own submission is rejected at the voting UI. **Reconciliation item:** the per-vote amount is `VOTE_LEAVES = 2` in `challenge-progress.ts` while `challenges.ts` exports `VOTE_POINTS = 1` and the requirements specify 1 point — tasks must pick one source of truth.

Streak: `streak(progress)` is weekly — `.safe` is true once at least one stop exists in the week; the bonus for week N equals N (expressed as "10 × streak week" in tea-leaf terms). Reports are excluded because `streak` reads only `progress.stops`.

### Offline agenda pipeline (`scripts/agendas/`)

Five stages, each a Node entry point, chained through `data/` files. The `Weekly_Run` is a GitHub Actions cron at Monday 06:00 America/New_York (`.github/workflows/weekly-challenges.yml`), also runnable with `npm run challenges:weekly`; it halts and reports if `ANTHROPIC_API_KEY` is absent.

| Stage | Entry | Reads | Writes | Claude? |
| --- | --- | --- | --- | --- |
| 1 fetch | `fetch-meetings.ts` | Legistar (Boston, Somerville), boston.gov notices, PrimeGov (Cambridge), CivicClerk (Brookline) | `data/agendas/meetings.json` | no |
| 2 extract | `extract-items.ts` | `meetings.json` + agenda docs | `data/agendas/items.json` (+ per-agenda cache) | yes |
| 3 generate | `generate-challenges.ts` | `items.json`, `docs/exampleChallenges.md` | `data/challenges/<week>/<area>.{json,md}`, `index.json` | yes |
| 4 track | `track-updates.ts` | published weeks + city records | `data/challenges/updates.json` | mixed |
| 5 digest | `send-digests.ts` | published weeks, `submissions.ts` cohort | emails via `mailer.ts`, `data/digests/sent.json` | optional |

**Data contracts.** Stage 1 normalizes every city's system into `Meeting` (`types.ts`): stable `id`, `city`, `source`, `body`, `start` (local Boston ISO), `docs`, `summary`. Stage 2 emits `AgendaItem`: `include` flag, `neighborhoods[]`, `contacts[]`, `action`, `deadline`, `sourceUrl` — and caches per agenda so a `Weekly_Run` only pays Claude for agendas not previously extracted (idempotent cache). Stage 3 filters items by `include` + the seed user's city, scores relevance by neighborhood proximity (`NEARBY`), and has Claude write 4–5 challenges; **points always come from `scorePoints()`, never the model**, and each challenge's `sourceUrl`/`contacts` are copied from its originating `AgendaItem`. Stage 4 records `TrackedChallenge` updates worded as plain facts (the `CAUSAL_CLAIM` regex guards against claiming the user caused the city's action), kept open for `TRACK_WEEKS` (8). Stage 5 addresses each `Digest` to the item's named contact; for the demo delivery is mocked (recipient forced / `--dry-run`).

**Point scoring (`scorePoints`)** — the single scoring authority, pure over `PointFactors`:

```
points = timePoints(minutes)                 // <15:1, 15–30:2, 30–45:3, 45–60:4, >60:5
       + (inPerson ? 2 : 0)
       + (cityAsked ? 1 : 0)
       + (proofRequired ? 1 : 0)
```

The app shows tea leaves as points × 10 (`t.points.leavesPerPoint`).

## Data Models

```typescript
// Challenge (shared app/pipeline) — challenges.ts
type PointFactors = { minutes: number; inPerson: boolean; cityAsked: boolean; proofRequired: boolean };
type Challenge = {
  id: string; number: number; type: ChallengeType; title: string;
  points: number; pointsBreakdown: string; factors: PointFactors;
  summary: string; agendaItem: string; contacts: Contact[];
  deadlineDate: string; sourceUrl: string; task: { steps: string[] }; /* …display fields */
};
type ChallengeWeek = { weekOf: string; area: string; origin: 'demo' | 'generated'; challenges: Challenge[] };

// Challenge progress (store) — challenge-progress.ts
type StopProgress = { leaves: number; at: number; pendingCheckIn?: boolean; data?: Record<string, unknown> };
type ChallengeProgress = { stops: Record<string, StopProgress>; votes: number };

// Report (store) — my-reports.ts
type ReportStatus = 'submitted' | 'inReview' | 'approved' | 'fixed' | 'notApproved';
type MyReport = {
  id: string; number: string; topic: string; title: string; description: string; aiDraft: string;
  urgency: 'Low' | 'Medium' | 'High'; address: string; latitude: number; longitude: number;
  photoUri?: string; createdAt: number; status: ReportStatus; history: Partial<Record<ReportStatus, number>>;
  updates: ReportUpdate[]; department: string; caseId?: string; team?: string; reason?: string;
};

// 311 (network) — boston-311.ts
type NearbyCase = { case_id: string; case_topic: string; case_status: string; assigned_team: string; full_address: string; open_date: string };
type CaseUpdate = { case_id: string; case_status: string; closure_reason: string | null; closure_comments: string | null; close_date: string | null; assigned_team: string };

// Rewards (store) — rewards.ts
type Deal = { id: string; partnerId: string; code: string; issuedAt: number; usedAt?: number };
type RewardsState = { cratesOpened: number; spent: number; bonus: number; deals: Deal[] };
type CrateState = { balance: number; size: number; filled: number; toGo: number; full: boolean; ready: number };

// Profile (store) — seed-profile.ts
type Profile = {
  name: string; username: string; city: City; neighborhood: BostonNeighborhood | null;
  ward: number | null; neighborhoodChangedAt: number | null; age: number;
  leaves: number; reportCount: number; challengeCount: number;
};

// Pipeline — types.ts
type Meeting = { id: string; city: City; source: 'legistar'|'civicclerk'|'primegov'|'boston-notices'; body: string; title: string; start: string; docs: AgendaDoc[]; summary: string | null };
type AgendaItem = { id: string; meetingId: string; city: City; title: string; summary: string; action: string; deadline: string; neighborhoods: string[]; citywide: boolean; contacts: Contact[]; include: boolean; sourceUrl: string | null };
type TrackedChallenge = { challengeId: string; title: string; weekOf: string; status: 'open'|'closed'|'noUpdateFound'; weeksChecked: number; updates: ChallengeUpdate[] };
```

## Error Handling

- **311 API** (`boston-311.ts`): every SQL call is wrapped in an `AbortController` timeout (4 s for the dup check so it can't hold the capture screen, 10 s default). `getRecent311Cases` caches for 24 h and returns a stale copy when the city API is down. Failures surface as thrown errors the screen can catch; the dup check degrades to "no match → submit".
- **AI photo check** (`report-check.ts` / `analyze+api.ts`): a 20 s total budget with one retry on transient (429 / ≥500 / network) errors; hard timeouts become a user-facing "timed out" message. The route returns typed JSON errors (400 missing image, 422 refusal, 429 rate limit, 500 missing/invalid key, 502 bad model output). `descriptionMatches` fails open so an outage never blocks a legitimate send.
- **Report photo** (`report-photo.ts`): the manipulator writes to cache (which iOS may clear), so each report copies its own file into the documents folder; `photoSource` resolves stored relative paths against the current documents path, tolerating reinstalls and legacy absolute URIs.
- **Pipeline fetch** (`fetch-meetings.ts`): sources run under `Promise.allSettled` so one broken city site doesn't sink the run; the process only fails when every source fails. Extraction caches per agenda to stay cheap and resilient to partial reruns.
- **Store loads**: every `load()` wraps `JSON.parse` in try/catch and falls back to a seed/empty state; `my-reports.ts` `normalize()` backfills missing and legacy fields so older saved data still renders.

## Reconciliation Items (code vs. spec)

Carried into tasks because the requirements flag them explicitly:

1. **Seed profile.** `constants/seed-profile.ts` ships `SEED_PROFILE` as *Ishaan Tewari / Cambridge (ward 4) / age 20 / leaves 1240*, but the spec's `Seed_User` is *Allston (Boston) / age 25* with a Leaf_Counter of *120 of 150*. The rewards counter already uses its own `SEED_LEAVES = 120` (authoritative, matches spec), so `SEED_PROFILE.leaves` (1240) is not what the Rewards tab shows. Tasks must align the seed profile's city/neighborhood/age (and decide whether `SEED_PROFILE.leaves` should be removed or set consistent with the 120/150 counter).
2. **Vote value.** `challenges.ts` exports `VOTE_POINTS = 1` (and the requirements say a vote is worth 1 point), while `challenge-progress.ts` credits `VOTE_LEAVES = 2` per vote. One must become the single source of truth (likely `VOTE_POINTS`, with tea-leaf display applying the ×10 convention).

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees. Each property below is universally quantified and maps to the acceptance criteria it validates. Existing fast-check suites (`rewards.pbt.test.ts`, `challenges.pbt.test.ts`, `challenge-week.pbt.test.ts`, `challenge-progress.pbt.test.ts`) already cover several of these.*

### Property 1: Trail covers every challenge with no placeholder

For any `ChallengeWeek` with 4 or 5 challenges, `trailOrder(week)` produces exactly one stop per challenge — its length equals `week.challenges.length`, every emitted stop corresponds to a real challenge (no `undefined`/placeholder), and the result is a permutation of the input challenges.

**Validates: Requirements 1.1, 1.4**

### Property 2: Crediting a stop is additive

For any `ChallengeProgress` and any leaves value `n ≥ 0`, completing a stop with `n` leaves increases the computed `leafBalance` by exactly `n` relative to its value before the stop was recorded.

**Validates: Requirements 2.5, 10.1**

### Property 3: Votes credit a fixed amount up to the weekly cap

For any number of `addVote()` calls `k`, the recorded vote count equals `min(k, MAX_VOTES)`; each counted vote increases the balance by the same fixed per-vote amount; and once the count reaches `MAX_VOTES`, `addVote()` returns false and the count does not increase.

**Validates: Requirements 3.1**

### Property 4: Streak stays alive iff a challenge was completed

For any `ChallengeProgress`, `streak(progress).safe` is true if and only if at least one stop exists in `progress.stops`, and the credited bonus for week number N equals N.

**Validates: Requirements 4.1, 4.2**

### Property 5: Map shows exactly the on-map reports at their locations

For any set of `MyReport`s and any time `now`, the pins rendered are exactly the reports for which `isOnMap(report, now)` is true, each placed at that report's `latitude`/`longitude`.

**Validates: Requirements 6.3**

### Property 6: Duplicate search is bounded, open, and topic-matched

For any center point, any candidate set of 311 cases, and any topic, every case returned by the nearby-open-case query lies within the bounding box `[lat ± RADIUS_LAT] × [lon ± RADIUS_LON]`, has `case_status ≠ 'Closed'`, and has a topic equal to or related to the query topic — with exact-topic matches ordered first.

**Validates: Requirements 8.1**

### Property 7: Following membership is exact and idempotent

For any set of stored reports and any `caseId`, `isFollowing(caseId)` is true if and only if some stored report has that `caseId`; and after a Me-too follow for `caseId` is added, `isFollowing(caseId)` is true and adding the same follow again does not change the following-set membership.

**Validates: Requirements 8.4**

### Property 8: 311 status maps totally onto the pin lifecycle

For any `(case_status, closure_reason)` pair, `statusFrom311` returns exactly the documented lifecycle state — `In progress` → `approved` (green), `Needs Reallocation` → `inReview` (yellow), `Closed`+`Noted` → `notApproved` (gray), `Closed`+`Transitioned` → `inReview`, other `Closed` → `fixed`, and anything else → `submitted` (red) — so the pin color is a total function of the 311 status.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 9: Resolved and rejected reports obey the on-map time filter

For any `MyReport` and any time `now`: `isOnMap` is false whenever the status is `notApproved`; for a `fixed` (resolved) report it is true only within `FIXED_PIN_DAYS` of the fix time and false afterward; and for any still-open status it is true.

**Validates: Requirements 9.5**

### Property 10: Crate size follows the threshold schedule

For any crate index `i`, `crateSize(i)` equals 50, 100, 150 for `i = 0, 1, 2` respectively, and equals 150 for every `i ≥ 3`.

**Validates: Requirements 12.2, 12.3**

### Property 11: A crate opens only when full

For any balance strictly less than the current crate's size, `openCrate` returns null and leaves the rewards state unchanged; for any balance greater than or equal to the size, `openCrate` succeeds.

**Validates: Requirements 12.4**

### Property 12: Opening a crate conserves leaves and carries overflow

For any full crate, the `leafCounter` after `openCrate` equals the counter before minus exactly that crate's size, and the resulting `crateState` reflects the carried-over remainder toward the next crate.

**Validates: Requirements 12.5**

### Property 13: Crates open one at a time

For any balance that covers `k` crates, a single `openCrate` call increments `cratesOpened` by exactly one and spends exactly one crate's size; opening repeatedly consumes the covered crates one by one.

**Validates: Requirements 12.6**

### Property 14: The leaf counter is never negative

For any `ChallengeProgress` and any `RewardsState`, `leafCounter(progress, rewards)` is greater than or equal to 0.

**Validates: Requirements 12.7**

### Property 15: Every issued deal has a unique code and a real partner

For any sequence of `openCrate` calls, each issued `Deal` has a non-empty single-use `code`, a `partnerId` that exists in `PARTNERS`, and a code distinct from every other issued deal's code.

**Validates: Requirements 13.1**

### Property 16: Deal status is a total, time-bounded classification

For any `Deal` and any time `now`, `dealStatus` returns exactly one of `active`, `used`, or `expired`: `used` whenever `usedAt` is set, otherwise `expired` when `now ≥ issuedAt + 7·DAY`, otherwise `active`.

**Validates: Requirements 13.2**

### Property 17: Redemption is single-use and idempotent

For any `Deal`, after `markDealUsed` the deal is `used`; calling `markDealUsed` again does not change its `usedAt`; and a `used` deal is never reported as `active`.

**Validates: Requirements 13.3**

### Property 18: Dynamic-reward boost gating

For any response-share value `s` and focus flag `f`, a dynamic-reward boost is applied if and only if `s < 0.10` and `f` is true.

**Validates: Requirements 14.2**

### Property 19: Usernames are accepted exactly by the format rule

For any string, `validateProfile` accepts the username if and only if it matches `^[a-z0-9._]{3,20}$`.

**Validates: Requirements 15.2**

### Property 20: Extraction cache makes reruns idempotent

For any set of agendas already extracted and cached, a second `agendas:extract` run produces identical extracted items and performs no new Claude extraction calls for those agendas.

**Validates: Requirements 18.2**

### Property 21: Generated challenges inherit source and contact from their item

For any generated `Challenge` tied to an `AgendaItem`, the challenge's `sourceUrl` and `contacts` are drawn from that originating item rather than invented.

**Validates: Requirements 19.2**

### Property 22: Points are a pure function of the four factors

For any `PointFactors`, `scorePoints(factors).points` equals `timePoints(minutes) + 2·[inPerson] + 1·[cityAsked] + 1·[proofRequired]`, where `timePoints` follows the minute bands (<15→1, 15–30→2, 30–45→3, 45–60→4, >60→5), and the breakdown string lists exactly the active factors.

**Validates: Requirements 19.3**

### Property 23: Digest is addressed to the item's contact

For any challenge that carries a named contact, the digest's computed intended recipient equals that contact's email (or office inbox).

**Validates: Requirements 20.1**

### Property 24: Area labels and slugs are well-formed over the scope

For any `City` and any optional Boston neighborhood drawn from the Greater Boston scope, `areaLabel` produces `"<neighborhood>, <city>"` when a neighborhood is set and `"<city>"` otherwise, and `areaSlug` produces a lowercase, dash-separated slug of the same parts.

**Validates: Requirements 21.1**

## Testing Strategy

**Dual approach.** Property-based tests (fast-check, already present for rewards, challenges, challenge-week, and challenge-progress) cover the universal properties above; example and integration tests cover specific flows, UI, and external seams.

- **Property tests (fast-check, ≥100 iterations each)** — the pure logic: `crateSize`/`crateState`/`leafCounter`/`openCrate`/`dealStatus`/`markDealUsed` (Properties 10–17), `scorePoints`/`timePoints` (22), `statusFrom311`/`isOnMap` (8, 9), `trailOrder` (1), `leafBalance`/`streak`/`addVote` (2, 3, 4), `isFollowing` (7), `findNearbyOpenCases` box predicate (6), `validateProfile` (19), `areaLabel`/`areaSlug` (24), and the extraction-cache idempotence and provenance checks in the pipeline (20, 21, 23). Each test is tagged **Feature: tea-party-civic-app, Property N: <text>** and references its design property.
- **Example / edge tests** — the three analyze verdicts routing (ok/unclear/not_city_issue), the third-rejection −1 penalty (10.2), Me-too follow + credit, seed-counter 120/150, demo-mode no-network week load, council-meeting notes-required, and the two reconciliation items once resolved.
- **Integration tests (1–3 examples, mocked where external)** — `/api/analyze` and `/api/challenges?mode=live` routes, `getCasesById` status refresh, the four pipeline fetch sources against recorded fixtures, and the AI verifier gate (mock accept/reject).
- **Manual demo verification** — the staged demo path in demo mode: Freedom Trail renders 4–5 stops, a report walks its pin colors via the replayed timeline, a crate toss/open issues a deal, and a dry-run digest sends nothing.
- **Gate every change** on `npx expo lint` and `npx tsc --noEmit` before done, per the workspace rules.
