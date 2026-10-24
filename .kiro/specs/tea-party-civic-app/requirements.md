# Requirements Document

## Introduction

Tea Party is a civic-engagement mobile application for Greater Boston (Boston by neighborhood, Cambridge, Somerville, and Brookline) that turns participation in local government into a game. Young residents complete weekly challenges derived from real government agenda items, report neighborhood issues through a photo-first flow backed by the live Boston 311 dataset, and earn an in-app currency ("tea leaves") that converts into real partner-business rewards. An offline data pipeline scrapes agendas, extracts resident-actionable items with Claude, generates challenges, and sends mocked email digests to the named government contacts, so officials learn what residents want without residents having to attend meetings.

This document describes the system as built, reverse-engineered from the existing TypeScript codebase (Expo SDK 58 / React Native / Expo Router), the offline pipeline in `scripts/agendas/`, the generated data in `data/`, and the product decisions recorded in `Plan.md` and `exampleChallenges.md`. Requirements describe what the system does and should do, anchored to real behavior. Where `Plan.md` prose and the shipped code disagree on the rewards economy, the code is authoritative (thresholds 50/100/150 then every 150; overflow carried over; seed counter 120/150).

The product is built for a hackathon demo, so the four consumer tabs (Challenges, Report, Rewards, Account) and the government-facing offline pipeline are all co-equal in scope, and each area supports both a mocked demo mode and a live mode.

## Glossary

- **Tea_Party_App**: The Expo SDK 58 / React Native consumer mobile application, navigated with Expo Router, that exposes the four tabs and challenge/report/reward flows.
- **Challenges_Tab**: The Weekly Challenges tab that renders the Freedom Trail visual and challenge entry points.
- **Report_Tab**: The tab showing the animated Boston map of the user's own reports and the report-creation flow.
- **Rewards_Tab**: The tab showing the ship-on-rising-water visual, crates, tea-leaves counter, and partner deals.
- **Account_Tab**: The tab showing user info, friends, and notifications.
- **Freedom_Trail**: The visual metaphor on the Challenges_Tab that lays out the week's 4 to 5 challenges as monuments along a trail.
- **Challenge**: One weekly task tied to a real government agenda item, with a point value, a submission requirement, and a named government contact.
- **Challenge_Flow**: The multi-screen guided flow for completing a specific Challenge (urban-wild, spend-2-million, cummins-walk-audit, council-meeting, rat-patrol).
- **Submission**: The user-provided artifact (photos, notes, timings, ballot, design) that completes a Challenge.
- **AI_Verifier**: The Claude-backed component that checks a Submission (meeting notes, photos, timings) against the referenced meeting or site before credit is awarded.
- **Vote**: A user action endorsing another user's Submission, worth 1 point and disallowed on the user's own Submission.
- **Weekly_Streak**: The consecutive-week counter that stays alive when the user completes at least one Challenge in the week.
- **Report**: A user-filed neighborhood issue created through the photo-first flow and backed by the Boston 311 dataset.
- **Report_Camera**: The in-app camera used to capture a Report photo, with no access to the device camera roll.
- **Report_Pin**: A colored map marker representing one of the user's Reports or followed cases.
- **AI_Report_Analyzer**: The Claude-backed component that suggests a 311 category and draft description from a Report photo and rejects non-city issues.
- **Boston_311_Dataset**: The data.boston.gov "311 Service Requests - NEW SYSTEM" resource `254adca6-64ab-4c5c-9fc0-a6da622be185`, queried for duplicate detection and status.
- **Me_Too**: The action that follows an existing open 311 case within ~50 m instead of filing a duplicate Report.
- **Tea_Leaves**: The in-app currency earned from completed Challenges, approved Reports, Votes, and the Weekly_Streak bonus.
- **Leaf_Counter**: The displayed tea-leaves balance, equal to leaves earned minus leaves consumed by opened crates, never below 0.
- **Crate**: A wooden tea crate in the Rewards_Tab water that fills with Tea_Leaves and, when full, yields a partner Deal.
- **Deal**: A redeemable partner-business offer represented by a single-use QR code that expires 7 days after issue.
- **Dynamic_Reward**: A reward boost targeted by neighborhood and age when a group is under 10% of responses and is the focus of an agenda item.
- **Seed_User**: The pre-seeded demo user, located in Allston (Boston), age 25, with a starting Leaf_Counter of 120 of 150.
- **Agenda_Pipeline**: The offline Node pipeline in `scripts/agendas/` (`agendas:fetch`, `agendas:extract`, `challenges:generate`, digest sending) that produces the data consumed by the app.
- **Weekly_Run**: The scheduled Monday 06:00 America/New_York execution of the Agenda_Pipeline via GitHub Actions, also runnable by hand with `npm run challenges:weekly`.
- **Digest**: The email summary of resident input sent (mocked for the demo) to the named government contact for an agenda item.
- **Challenges_Mode**: The runtime switch `EXPO_PUBLIC_CHALLENGES_MODE` selecting demo (default) or live challenge data.

## Requirements

### Requirement 1: Freedom Trail weekly challenges

**User Story:** As a resident, I want to see this week's civic challenges laid out on the Freedom Trail, so that I can pick something meaningful to do.

#### Acceptance Criteria

1. WHEN the Challenges_Tab is opened, THE Challenges_Tab SHALL render the Freedom_Trail with one monument for each Challenge in the current week.
2. THE Challenges_Tab SHALL render between 4 and 5 Challenges for the current week.
3. WHEN a week begins, THE Challenges_Tab SHALL reset the Freedom_Trail to the new week's Challenges.
4. WHERE the current week contains 4 Challenges, THE Challenges_Tab SHALL render the Freedom_Trail without an empty or placeholder monument.
5. WHEN a Challenge monument is selected, THE Challenges_Tab SHALL open that Challenge's detail screen showing its title, point value, source agenda link, and named government contact.
6. THE Challenges_Tab SHALL provide a dedicated Challenge_Flow for each of the challenge types urban-wild, spend-2-million, cummins-walk-audit, council-meeting, and rat-patrol.

### Requirement 2: Challenge submissions and AI verification

**User Story:** As a resident, I want to complete a challenge by submitting proof, so that my input reaches the city and I earn credit.

#### Acceptance Criteria

1. THE Tea_Party_App SHALL require a Submission for every Challenge before marking that Challenge complete.
2. WHERE a Challenge is council-meeting attendance, THE Tea_Party_App SHALL require meeting notes as part of the Submission.
3. WHEN a Submission containing meeting notes is submitted, THE AI_Verifier SHALL check the notes against the referenced meeting before credit is awarded.
4. WHEN a Submission containing photos or timings is submitted, THE AI_Verifier SHALL check that the photos and timings are consistent with the referenced site before credit is awarded.
5. WHEN the AI_Verifier accepts a Submission, THE Tea_Party_App SHALL credit the Challenge's Tea_Leaves to the Leaf_Counter.
6. IF the AI_Verifier rejects a Submission, THEN THE Tea_Party_App SHALL withhold credit for that Challenge and inform the user of the rejection.
7. THE Tea_Party_App SHALL record Challenges as completed by an individual user rather than by a team.

### Requirement 3: Voting on submissions

**User Story:** As a resident, I want to vote on other people's submissions, so that the best ideas rise to the top of the city's digest.

#### Acceptance Criteria

1. WHEN a user casts a Vote on another user's Submission, THE Tea_Party_App SHALL award 1 point to the voting user.
2. IF a user attempts to Vote on the user's own Submission, THEN THE Tea_Party_App SHALL reject the Vote.

### Requirement 4: Weekly streak

**User Story:** As a resident, I want my weekly streak to reflect staying engaged, so that consistent participation is rewarded.

#### Acceptance Criteria

1. WHEN a user completes at least one Challenge within a week, THE Tea_Party_App SHALL keep the Weekly_Streak alive for that week.
2. WHEN the Weekly_Streak is credited for week number N, THE Tea_Party_App SHALL award a bonus equal to N points.
3. THE Tea_Party_App SHALL exclude Reports from the Weekly_Streak calculation.

### Requirement 5: Demo and live challenge modes

**User Story:** As someone running the demo, I want to switch between pre-seeded and live challenge data, so that the app is reliable on stage but real when needed.

#### Acceptance Criteria

1. WHERE Challenges_Mode is unset or any value other than `live`, THE Tea_Party_App SHALL display the pre-seeded demo week from `exampleChallenges.md` content without a network call.
2. WHERE Challenges_Mode equals `live`, THE Tea_Party_App SHALL load the latest generated week for the Seed_User's area.

### Requirement 6: Personal reports map

**User Story:** As a resident, I want a map that shows only the issues I reported, so that my view stays personal and uncluttered.

#### Acceptance Criteria

1. WHEN the Report_Tab is opened, THE Report_Tab SHALL render an animated Boston map.
2. THE Report_Tab SHALL display only Reports filed by the current user and cases the current user followed with Me_Too.
3. THE Report_Tab SHALL render each displayed Report as a Report_Pin at the Report's location.

### Requirement 7: Photo-first report capture

**User Story:** As a resident, I want to report an issue by taking a photo of it right now, so that reports are grounded in real, current conditions.

#### Acceptance Criteria

1. WHEN the user starts a Report, THE Report_Camera SHALL open the in-app camera.
2. THE Report_Camera SHALL exclude access to the device camera roll.
3. WHEN a Report photo is captured, THE Report_Tab SHALL record the device location at the moment the photo is taken.
4. WHEN a Report photo is captured, THE AI_Report_Analyzer SHALL suggest one Boston 311 category and a draft description for the Report.
5. IF the AI_Report_Analyzer determines the photo is not a real 311 or city issue, THEN THE Report_Tab SHALL reject the Report and SHALL NOT submit it to Boston_311_Dataset.
6. WHEN the AI_Report_Analyzer returns a suggested category and draft description, THE Report_Tab SHALL allow the user to confirm or edit the description before submitting.

### Requirement 8: Duplicate detection and Me too

**User Story:** As a resident, I want the app to catch when my issue is already reported nearby, so that I can follow it instead of creating a duplicate.

#### Acceptance Criteria

1. WHEN a Report passes AI_Report_Analyzer validation, THE Report_Tab SHALL query Boston_311_Dataset for open cases within approximately 50 meters having the same category.
2. WHEN a matching open case is found, THE Report_Tab SHALL show the existing case with its category, status, assigned team, and time since filing, and SHALL offer a Me_Too action.
3. WHEN the user selects Me_Too on a matching case, THE Tea_Party_App SHALL add that case to the user's followed Reports and SHALL award the user Tea_Leaves as for an approved Report.
4. IF the user already follows a matching case, THEN THE Report_Tab SHALL disable the Me_Too action for that case.
5. WHEN no matching open case is found, THE Report_Tab SHALL continue to the submission step.

### Requirement 9: Report pin status colors

**User Story:** As a resident, I want map pins that tell me where each report stands, so that I can see progress at a glance.

#### Acceptance Criteria

1. WHILE a Report has been submitted by the app but is not yet in Boston_311_Dataset or has status Create, THE Report_Pin SHALL be colored red.
2. WHILE a Report has 311 status Needs Reallocation, THE Report_Pin SHALL be colored yellow.
3. WHILE a Report has 311 status In progress, THE Report_Pin SHALL be colored green.
4. WHILE a Report is closed with closure reason Noted, THE Report_Pin SHALL be colored gray.
5. WHEN a Report is closed with closure reason Resolved, THE Report_Tab SHALL remove the Report_Pin from the map and present the Report as a notification that names the responsible team.

### Requirement 10: Report points and penalties

**User Story:** As a resident, I want fair points for valid reports, so that the system rewards genuine civic contributions.

#### Acceptance Criteria

1. WHEN a Report reaches 311 status In progress, THE Tea_Party_App SHALL award the Report's Tea_Leaves to the Leaf_Counter.
2. WHEN a user's third AI-rejected Report occurs, THE Tea_Party_App SHALL deduct 1 point from the Leaf_Counter.
3. THE Tea_Party_App SHALL apply Report penalties only to AI-rejected Reports.

### Requirement 11: Mocked 311 submission and timeline

**User Story:** As someone running the demo, I want 311 submission mocked with a realistic status timeline, so that the demo shows progress without filing real city tickets.

#### Acceptance Criteria

1. WHILE running in demo mode, THE Report_Tab SHALL mock submission to Boston_311_Dataset without creating a real 311 ticket.
2. WHILE running in demo mode, THE Report_Tab SHALL replay a real case's status timeline so a Report advances through its pin color states.

### Requirement 12: Tea leaves and crate economy

**User Story:** As a resident, I want my tea leaves to fill crates I can open for real rewards, so that civic effort turns into something tangible.

#### Acceptance Criteria

1. THE Rewards_Tab SHALL display Tea_Leaves as the in-app currency on the ship-on-rising-water visual with Crates in the water.
2. WHEN crate number 1, 2, or 3 (zero-based crates 0, 1, 2) is being filled, THE Rewards_Tab SHALL set that Crate's size to 50, 100, and 150 Tea_Leaves respectively.
3. WHEN filling any Crate after the third, THE Rewards_Tab SHALL set that Crate's size to 150 Tea_Leaves.
4. WHILE a Crate is full, THE Rewards_Tab SHALL require the user to redeem the Crate.
5. WHEN a full Crate is opened, THE Rewards_Tab SHALL reduce the Leaf_Counter by that Crate's size and SHALL carry any overflow Tea_Leaves toward the next Crate.
6. WHILE the Leaf_Counter covers more than one Crate, THE Rewards_Tab SHALL present one Crate to open at a time.
7. THE Leaf_Counter SHALL never display a value below 0.
8. WHEN the Tea_Party_App initializes the Seed_User, THE Rewards_Tab SHALL set the Seed_User's Leaf_Counter to 120 of 150.

### Requirement 13: Partner deals and QR codes

**User Story:** As a resident, I want a redeemable code for each reward, so that a partner business can honor my discount.

#### Acceptance Criteria

1. WHEN a Crate is opened, THE Rewards_Tab SHALL issue a Deal containing a single-use QR code and SHALL assign the Deal to a partner business.
2. WHEN a Deal is issued, THE Rewards_Tab SHALL expire the Deal's QR code 7 days after the issue time.
3. WHEN a Deal's QR code is redeemed once, THE Rewards_Tab SHALL mark the QR code used and SHALL prevent further redemption.
4. WHILE a Crate has been redeemed, THE Rewards_Tab SHALL render that Crate gray.

### Requirement 14: Dynamic rewards by neighborhood and age

**User Story:** As a resident in an under-represented group, I want extra reward incentives when my input is scarce, so that the city hears more from groups like mine.

#### Acceptance Criteria

1. THE Rewards_Tab SHALL target Dynamic_Reward boosts using neighborhood and age only.
2. WHEN a group identified by neighborhood and age is under 10% of responses and is the focus of an agenda item, THE Rewards_Tab SHALL apply a Dynamic_Reward boost to that group.
3. WHEN applying a Dynamic_Reward, THE AI_Verifier SHALL determine the size of the boost.

### Requirement 15: Profile and friends

**User Story:** As a resident, I want to manage my profile and friends, so that the app reflects who I am and who I know.

#### Acceptance Criteria

1. WHEN the Account_Tab is opened, THE Account_Tab SHALL display the user's username, neighborhood, and friend count.
2. WHEN the user enters another user's username, THE Account_Tab SHALL add that user as a friend.
3. THE Account_Tab SHALL NOT provide social sharing of activity outside the app.

### Requirement 16: Notifications

**User Story:** As a resident, I want timely notifications, so that I know when something relevant happens.

#### Acceptance Criteria

1. WHEN a new Deal becomes available, THE Account_Tab SHALL present a notification to the user.
2. WHEN a friend extends the friend's Weekly_Streak, THE Account_Tab SHALL present a notification to the user.
3. WHEN a user's Report is resolved, THE Account_Tab SHALL present a notification to the user that names the responsible team.

### Requirement 17: Weekly pipeline run and meeting fetch

**User Story:** As a maintainer, I want the challenge pipeline to run weekly and pull real meetings, so that challenges stay current with the city's agenda.

#### Acceptance Criteria

1. THE Agenda_Pipeline SHALL execute the Weekly_Run every Monday at 06:00 America/New_York via GitHub Actions.
2. THE Agenda_Pipeline SHALL support manual execution through the command `npm run challenges:weekly`.
3. IF the environment secret `ANTHROPIC_API_KEY` is absent when the Weekly_Run starts, THEN THE Agenda_Pipeline SHALL stop the run and report the missing secret.
4. WHEN `agendas:fetch` runs, THE Agenda_Pipeline SHALL pull the next 4 weeks of meetings from the Boston and Somerville Legistar APIs, boston.gov public notices, the Cambridge PrimeGov API, and the Brookline CivicClerk API, and SHALL write the results to `data/agendas/meetings.json`.

### Requirement 18: Agenda item extraction and caching

**User Story:** As a maintainer, I want Claude to extract only actionable items and reuse prior work, so that challenges are relevant and runs stay cheap.

#### Acceptance Criteria

1. WHEN `agendas:extract` runs, THE Agenda_Pipeline SHALL have Claude read each agenda and retain only items residents can act on, each tagged with a neighborhood and a named government contact, and SHALL write the results to `data/agendas/items.json`.
2. THE Agenda_Pipeline SHALL cache extraction results per agenda so that the Weekly_Run processes only agendas not previously extracted.

### Requirement 19: Challenge generation and point scoring

**User Story:** As a maintainer, I want generated challenges with code-computed points, so that difficulty scoring is consistent and defensible.

#### Acceptance Criteria

1. WHEN `challenges:generate` runs, THE Agenda_Pipeline SHALL have Claude write 4 to 5 Challenges for the Seed_User's area calibrated on `exampleChallenges.md`.
2. WHEN a Challenge is generated, THE Agenda_Pipeline SHALL take the Challenge's source link and government contact from the originating agenda item.
3. WHEN a Challenge is generated, THE Agenda_Pipeline SHALL compute the point value in code from estimated time (under 15 min = 1, 15 to 30 min = 2, 30 to 45 min = 3, 45 to 60 min = 4, over 60 min = 5), plus 2 for in-person attendance, plus 1 when a city office asked for the input, plus 1 when proof is required.

### Requirement 20: Government digests

**User Story:** As a maintainer, I want digests to the right officials without spamming real staff during the demo, so that the government loop is proven but safe.

#### Acceptance Criteria

1. WHEN resident input is compiled for an agenda item, THE Agenda_Pipeline SHALL address the Digest to that agenda item's named government contact.
2. WHILE running for the demo, THE Agenda_Pipeline SHALL mock the Digest delivery rather than sending email to real government staff.

### Requirement 21: Scope, platform, and seed user

**User Story:** As a user and maintainer, I want the app scoped to Greater Boston and built on a consistent stack with a seeded demo user, so that the demo runs predictably on the intended platform.

#### Acceptance Criteria

1. THE Tea_Party_App SHALL scope civic content to Greater Boston covering Boston by neighborhood, Cambridge, Somerville, and Brookline.
2. THE Tea_Party_App SHALL provide a Seed_User located in Allston (Boston) with age 25.
3. THE Tea_Party_App SHALL run on Expo SDK 58 with React Native and route navigation through Expo Router.
4. THE Tea_Party_App SHALL persist user-facing state through `expo-sqlite/kv-store` and expose that state to the UI through `useSyncExternalStore`.
