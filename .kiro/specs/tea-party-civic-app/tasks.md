# Implementation Plan: Tea Party Civic App

## Overview

Tea Party is an **already-built** system: the Expo SDK 58 / React Native app (four tabs plus per-challenge flows) and the offline Node agenda pipeline both exist and run. This plan is therefore a **verify / polish / fill-gap / reconcile** plan, not a build-from-scratch plan. No task below re-creates code that already ships.

Work is ordered by risk:

1. **Reconciliation first** — the two real code-vs-spec divergences the design calls out (seed profile; vote value), because they are the only places where shipped code contradicts the requirements.
2. **Fill the property-test gap** — five fast-check suites already exist (`rewards`, `challenges`, `challenge-week`, `challenge-progress`, `robustness`); the remaining design correctness properties (reports, 311 dup check, profile/area, pipeline scoring/provenance/cache/digest) need property tests added.
3. **Verify behavior against requirements, tab by tab**, plus the report flow end-to-end, the pipeline stages, and the demo/live mode switch — mostly in demo mode, so these are marked optional where they are pure verification.
4. **Final gate** — `npx expo lint`, `npx tsc --noEmit`, and a demo-mode smoke pass across all four tabs.

Authoritative sources where prose and code disagree on the rewards economy: `src/lib/rewards.ts` and `design/tokens/theme.ts` (crate thresholds 50/100/150 then 150, overflow carried, seed counter 120 of 150).

## Tasks

- [ ] 1. Reconcile the seed profile with the Seed_User spec
  - [ ] 1.1 Align `SEED_PROFILE` identity and location with the spec
    - In `src/constants/seed-profile.ts`, change `SEED_PROFILE` from Cambridge/ward 4/age 20 to the Seed_User: city `Boston`, neighborhood `Allston`, `ward: null`, `age: 25`. Clear or adjust `ward` consistently with a Boston neighborhood.
    - Confirm `areaLabel`/`areaSlug`/`neighborhoodLabel` still produce well-formed output for the new "Allston, Boston" area (e.g. `boston-allston`).
    - _Requirements: 21.1, 21.2_
  - [ ] 1.2 Make `SEED_PROFILE.leaves` consistent with the 120/150 counter (single source of truth)
    - The Rewards tab counter is driven by `rewards.ts` `SEED_LEAVES = 120` (authoritative), not by `SEED_PROFILE.leaves` (currently 1240). Decide and apply one of: remove `SEED_PROFILE.leaves` and have the profile header read the live `leafCounter`, or set it to match the 120-of-150 seed so no screen shows the stale 1240.
    - Update every reader of `SEED_PROFILE.leaves` (note `challenge-progress.ts` `leafBalance` defaults its `base` to `SEED_PROFILE.leaves`) so the balance shown anywhere agrees with the Rewards counter.
    - _Requirements: 12.8, 21.2_
  - [ ]* 1.3 Add an example test pinning the seed counter and seed identity
    - Assert the seed user resolves to Allston/Boston, age 25, and that the initialized Leaf_Counter is 120 of 150 (via `rewards.ts` seed path), guarding against regression to the old 1240/Cambridge values.
    - _Requirements: 12.8, 21.2_

- [ ] 2. Reconcile the vote value and build the dynamic-reward gate to single sources of truth
  - [ ] 2.1 Unify vote crediting on `VOTE_POINTS`
    - `challenges.ts` exports `VOTE_POINTS = 1` and Requirement 3.1 says a vote is worth 1 point, while `challenge-progress.ts` credits `VOTE_LEAVES = 2`. Make `challenge-progress.ts` the consumer of the single constant: credit `VOTE_POINTS` per vote (applying the ×10 tea-leaf display convention only at render, consistent with `t.points.leavesPerPoint`). Remove or re-export the duplicate `VOTE_LEAVES` so only one value exists.
    - Update `leafBalance` so `progress.votes * <per-vote>` uses the unified value.
    - _Requirements: 3.1_
  - [ ]* 2.2 Update the existing challenge-progress property test for the unified vote value
    - `challenge-progress.pbt.test.ts` currently asserts `leafBalance(p, base) === base + earned + p.votes * VOTE_LEAVES`. Update this to the unified constant so **Property 3 (votes credit a fixed amount up to the weekly cap)** stays green, and confirm `addVote()` still caps at `MAX_VOTES` (10) and returns false past the cap.
    - **Property 3: Votes credit a fixed amount up to the weekly cap**
    - **Validates: Requirements 3.1**
  - [ ] 2.3 Implement the dynamic-reward boost gate as a pure function
    - The review confirmed no dynamic-reward / threshold / boost-targeting logic exists in `src/` (only a comment on the profile `age` field). Add a minimal pure predicate in `src/lib/rewards.ts`, e.g. `shouldBoost(responseShare: number, isAgendaFocus: boolean): boolean` returning `responseShare < 0.10 && isAgendaFocus`, so the gating described by Requirement 14.2 has a real, testable implementation. The boost *size* is explicitly left to the AI_Verifier (Requirement 14.3) and is NOT computed here; this task only builds the gate, using neighborhood/age-derived `responseShare` as input (Requirement 14.1).
    - _Requirements: 14.1, 14.2, 14.3_
  - [ ]* 2.4 Write property test for the dynamic-reward boost gate
    - Over arbitrary `responseShare` in `[0, 1]` and arbitrary `isAgendaFocus`, assert `shouldBoost` returns true iff `responseShare < 0.10` AND `isAgendaFocus`; cover the `0.10` boundary (not boosted at exactly `0.10`).
    - **Property 18: Dynamic-reward boost gating**
    - **Validates: Requirements 14.2**

- [ ] 3. Checkpoint - reconciliation complete
  - Ensure all existing tests pass after tasks 1-2, ask the user if questions arise about which direction a reconciliation was taken (e.g. whether `SEED_PROFILE.leaves` was removed vs. set to 120).

- [ ] 4. Fill property-test gaps for report + 311 logic
  - [ ]* 4.1 Add property test for the 311 status → pin lifecycle mapping
    - Over arbitrary `(case_status, closure_reason)` pairs in `my-reports.ts`, assert `statusFrom311` returns exactly one documented lifecycle state (In progress→approved/green, Needs Reallocation→inReview/yellow, Closed+Noted→notApproved/gray, Closed+Transitioned→inReview, other Closed→fixed, else submitted/red) so pin color is a total function.
    - **Property 8: 311 status maps totally onto the pin lifecycle**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
  - [ ]* 4.2 Add property test for the on-map time filter
    - Over arbitrary `MyReport` and `now`, assert `isOnMap` is false for `notApproved`, true for `fixed` only within `FIXED_PIN_DAYS` (7) of the fix time, and true for any still-open status; and that rendered pins are exactly the on-map reports at their `latitude`/`longitude`.
    - **Property 5: Map shows exactly the on-map reports at their locations**
    - **Property 9: Resolved and rejected reports obey the on-map time filter**
    - **Validates: Requirements 6.3, 9.5**
  - [ ]* 4.3 Add property test for the duplicate-search bounding box and Me-too following set
    - For `findNearbyOpenCases` (`boston-311.ts`), assert every returned case lies within `[lat ± RADIUS_LAT] × [lon ± RADIUS_LON]`, has `case_status ≠ 'Closed'`, and matches the query topic or a related topic with exact-topic first. For `isFollowing` (`my-reports.ts`), assert membership is exact and that re-adding the same Me-too follow is idempotent.
    - **Property 6: Duplicate search is bounded, open, and topic-matched**
    - **Property 7: Following membership is exact and idempotent**
    - **Validates: Requirements 8.1, 8.4**

- [ ] 5. Fill property-test gaps for profile and area helpers
  - [ ]* 5.1 Add property test for username validation
    - Over arbitrary strings, assert `validateProfile` accepts the username iff it matches `^[a-z0-9._]{3,20}$`.
    - **Property 19: Usernames are accepted exactly by the format rule**
    - **Validates: Requirements 15.2**
  - [ ]* 5.2 Add property test for area labels and slugs over the Greater Boston scope
    - Over arbitrary `City` and optional Boston neighborhood, assert `areaLabel` is `"<neighborhood>, <city>"` when a neighborhood is set and `"<city>"` otherwise, and `areaSlug` is a lowercase dash-separated slug of the same parts.
    - **Property 24: Area labels and slugs are well-formed over the scope**
    - **Validates: Requirements 21.1**

- [ ] 6. Fill property-test gaps for the offline pipeline
  - [ ]* 6.1 Add property test for `scorePoints`
    - Over arbitrary `PointFactors`, assert `scorePoints(factors).points === timePoints(minutes) + 2·[inPerson] + 1·[cityAsked] + 1·[proofRequired]` with the minute bands (<15→1, 15–30→2, 30–45→3, 45–60→4, >60→5), and that the breakdown string lists exactly the active factors.
    - **Property 22: Points are a pure function of the four factors**
    - **Validates: Requirements 19.3**
  - [ ]* 6.2 Add tests for extraction-cache idempotence and challenge provenance
    - Assert a second `agendas:extract` over an already-cached agenda set produces identical items with no new Claude extraction calls (mock the Claude client), and that each generated `Challenge`'s `sourceUrl`/`contacts` are copied from its originating `AgendaItem` rather than invented.
    - **Property 20: Extraction cache makes reruns idempotent**
    - **Property 21: Generated challenges inherit source and contact from their item**
    - **Validates: Requirements 18.2, 19.2**
  - [ ]* 6.3 Add test for digest recipient resolution
    - For any challenge carrying a named contact, assert the digest's computed intended recipient equals that contact's email/office inbox before the (mocked) send.
    - **Property 23: Digest is addressed to the item's contact**
    - **Validates: Requirements 20.1**

- [ ] 7. Checkpoint - property coverage complete
  - Ensure all property suites pass (the five existing plus the new ones), ask the user if questions arise.

- [ ] 8. Verify tab behavior against requirements (demo mode)
  - [ ]* 8.1 Verify the Challenges tab
    - Confirm the Freedom Trail renders one monument per challenge for a 4-challenge and a 5-challenge week with no placeholder (exercise `trailOrder`), that selecting a monument opens a detail with title, points, source agenda link, and named contact, and that each of the five flows (urban-wild, spend-2-million, cummins-walk-audit, council-meeting, rat-patrol) is reachable. Confirm a completed stop credits leaves additively and the weekly streak goes safe after one stop with an N-point bonus for week N; confirm voting on one's own submission is rejected. Confirm the week resets on schedule; that the council-meeting challenge requires notes; that the AI_Verifier checks submitted notes and checks photos/timings; that a rejected verification withholds credit and informs the user; and that challenges are completed individually, not as a team.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.2, 4.1, 4.2, 4.3_
  - [ ]* 8.2 Verify the Report flow end-to-end in demo mode
    - Walk camera (no camera-roll access) → location captured at shot time → `analyzePhoto` verdicts (ok / unclear → retake / not_city_issue → rejected, not submitted) → dup check via `findNearbyOpenCases` → Me too (credits leaves, disabled when already following) or submit → red pin. Confirm the mocked 311 submission creates no real ticket and a replayed real-case timeline advances a report through red→yellow→green→(gray|off-map) pin states, that reaching In progress credits the report's leaves once, that the third AI-rejected report deducts 1 point and no other path deducts, and that a Resolved case leaves the map with a team-naming notification.
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.2, 8.3, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 11.1, 11.2, 16.3_
  - [ ]* 8.3 Verify the Rewards tab economy and deals
    - Confirm the ship-on-rising-water visual with crates shows the seed counter at 120 of 150; that crate sizes follow 50/100/150 then 150; that a crate opens only when full, one at a time, reducing the counter by the crate size and carrying overflow; that the counter never shows below 0; that opening issues a single-use QR Deal assigned to a real partner that expires 7 days out and is single-use (redeemed crate renders gray); and that the dynamic-reward boost *gate* (the pure `shouldBoost` predicate from task 2.3) fires only on under-10% response share AND agenda-item focus. Note: only the gate is built — end-to-end targeting and the AI-decided boost size (Requirements 14.1, 14.3) are design-only and are not exercised here (see Notes).
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.1, 13.2, 13.3, 13.4, 14.2_
  - [ ]* 8.4 Verify the Account tab
    - Confirm the Account tab shows username, neighborhood, and friend count; that entering another username adds a friend; that there is no external social sharing of activity; and that notifications fire for a new deal, a friend extending a streak, and a resolved report (naming the team). Confirm the activity feed is gated on completed challenges.
    - _Requirements: 15.1, 15.2, 15.3, 16.1, 16.2, 16.3_
  - [ ]* 8.5 Verify the demo/live challenge mode switch
    - With `EXPO_PUBLIC_CHALLENGES_MODE` unset or non-`live`, confirm the Challenges tab shows the bundled demo week with no network call; with `live`, confirm it loads the latest generated week for the seed user's area via `GET /api/challenges`, that the stored path is validated against `^\d{4}-\d{2}-\d{2}/[a-z0-9-]+\.json$`, and that a missing area falls back to the demo week with `fallback: true`.
    - _Requirements: 5.1, 5.2_

- [ ] 9. Verify the offline pipeline stages and data contracts
  - [ ]* 9.1 Verify the five pipeline stages, scheduling, and key guard
    - Confirm the five stages chain through `data/` as specified: `agendas:fetch` pulls the next 4 weeks from Boston/Somerville Legistar, boston.gov notices, Cambridge PrimeGov, and Brookline CivicClerk into `meetings.json` (sources under `Promise.allSettled`); `agendas:extract` writes actionable, neighborhood-and-contact-tagged items to `items.json` with a per-agenda cache; `challenges:generate` writes 4–5 challenges for the seed area with points always from `scorePoints()` (never the model) and source/contacts copied from the item; `track-updates` records plain-fact updates guarded by the `CAUSAL_CLAIM` regex; `send-digests` mocks delivery (forced recipient / `--dry-run`). Confirm the Monday 06:00 America/New_York cron and `npm run challenges:weekly` entry exist and that the run halts and reports when `ANTHROPIC_API_KEY` is absent.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 18.1, 18.2, 19.1, 19.2, 19.3, 20.1, 20.2_

- [ ] 10. Final gate - lint, typecheck, and demo smoke pass
  - [ ] 10.1 Run lint and typecheck
    - Run `npx expo lint` and `npx tsc --noEmit` (per AGENTS.md) and fix any errors introduced by the reconciliation and new tests.
    - _Requirements: 21.3_
  - [ ]* 10.2 Demo-mode manual smoke pass across all four tabs
    - In demo mode, confirm: Challenges renders 4–5 trail stops; a report walks its pin colors via the replayed timeline; a crate opens and issues a deal; the Account tab shows the Allston seed user; and a dry-run digest sends nothing. Confirm progress/leaf/deal state persists across an app restart (via `expo-sqlite`/`kv-store` backing the `useSyncExternalStore` stores) and rehydrates to the same counters.
    - _Requirements: 5.1, 11.1, 11.2, 20.2, 21.2, 21.4_

## Notes

- This is an as-built verification plan: the reconciliations (1.1, 1.2, 2.1), the dynamic-reward gate (2.3), the new property tests, and the lint/typecheck gate (10.1) are the required code work; the tab/flow/pipeline verification tasks (8-9) and the smoke pass (10.2) are optional because they are read-only confirmation against the running demo.
- Dynamic rewards (Requirement 14 / Property 18): the review confirmed no dynamic-reward, threshold, or boost-targeting logic exists in `src/` (only a comment on the profile `age` field). We took **option (a)**: task 2.3 adds a minimal pure gate `shouldBoost(responseShare, isAgendaFocus)` (boost iff `responseShare < 0.10` AND agenda-item focus) and task 2.4 adds its Property 18 test — low-effort and gives Property 18 a real implementation to validate. We deliberately did NOT build the full targeting pipeline or the AI-decided boost *size*: Requirements 14.1 (neighborhood/age targeting end to end) and 14.3 (AI_Verifier decides boost size) remain **design-only / not-yet-built** for the demo, so task 8.3 verifies only the gate and no longer claims to verify those unbuilt behaviors.
- Tasks marked with `*` are optional (verification and additional tests) and can be skipped for a faster pass; the reconciliation items and the final lint/typecheck gate are required.
- Five fast-check suites already exist (`rewards`, `challenges`, `challenge-week`, `challenge-progress`, `robustness`); tasks 4-6 add property tests only for the design properties not yet covered.
- Each task references the requirements it supports and, where it is a property test, the design correctness property it validates.
- The two reconciliation items are genuine code/spec divergences confirmed in source: `constants/seed-profile.ts` (Ishaan/Cambridge/age 20/leaves 1240) and `challenge-progress.ts` (`VOTE_LEAVES = 2` vs `challenges.ts` `VOTE_POINTS = 1`).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "2.3"] },
    { "id": 1, "tasks": ["1.3", "2.2", "2.4", "4.1", "4.2", "4.3", "5.1", "5.2", "6.1", "6.2", "6.3"] },
    { "id": 2, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "9.1"] },
    { "id": 3, "tasks": ["10.1"] },
    { "id": 4, "tasks": ["10.2"] }
  ]
}
```
