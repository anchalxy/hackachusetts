# Tea Party

**You snap a pothole. Hours later, you learn Dana from Public Works fixed it. That's Tea Party.**

Tea Party is an iPhone app (React Native / Expo) that gets young people in Greater Boston involved in local government a few minutes at a time. Every week it turns real city agendas into a short list of challenges. It lets you report street problems with a photo and follow them through Boston's real 311 system. It pays you in tea leaves that unlock deals at local spots.

Built for Hackachusetts (October 2026) by Ishaan Tewari and Anchal Bhardwaj.

This document covers what we built, how each piece works, and why we made the choices we did. Two companion docs go deeper:
- [Plan.md](docs/Plan.md): the original brief and the product rules we settled on.
- [design/DESIGN.md](design/DESIGN.md): the full design system and every screen decision.

---

## Contents

1. [The brief](#1-the-brief)
2. [The ideas the app is built on](#2-the-ideas-the-app-is-built-on)
3. [The app, tab by tab](#3-the-app-tab-by-tab)
4. [The weekly challenge pipeline](#4-the-weekly-challenge-pipeline)
5. [Where AI is used, and where it isn't](#5-where-ai-is-used-and-where-it-isnt)
6. [Data sources](#6-data-sources)
7. [Tea leaves: the points economy](#7-tea-leaves-the-points-economy)
8. [Architecture](#8-architecture)
9. [Design system](#9-design-system)
10. [Decision log](#10-decision-log)
11. [What's real and what's mocked](#11-whats-real-and-whats-mocked)
12. [Known gaps and inconsistencies](#12-known-gaps-and-inconsistencies)
13. [Running and sharing the app](#13-running-and-sharing-the-app)
14. [Where things live](#14-where-things-live)

---

## 1. The brief

### The problem

Most young people only hear from local government twice: at election time, and when there's a public meeting at noon on a Wednesday that they're never going to make. Those two channels are also basically the only ways officials hear back. So decisions about parks, bus lanes and budgets get made with input from whoever had the afternoon free.

The city is actually asking for input, all the time:
- Boston Parks is collecting ideas for its 31 urban wilds ahead of a November open house.
- The Office of Participatory Budgeting got over 1,300 ideas this summer and drafts the ballot on November 5.
- Public Works wants to know whether the rebuilt Cummins Highway works for someone pushing a stroller.

Those asks are buried in agenda PDFs and public notices that almost nobody under 30 reads.

311 has the opposite problem. Reporting a pothole is easy, but then the report disappears. You never find out whether anyone looked at it, who fixed it, or that it was closed a few hours later (the median Boston 311 case closes in about 4.6 hours). Government stays a faceless "they" instead of a crew that came out and did the job.

### The insight

When people can see local government working, they pay attention. A short video of a pothole getting filled does more for young people's interest in their city than any mailer. Young people who feel connected to local politics are also more likely to stay where they live, which is one of the goals of the Mass AI Coalition. The brief was to build that feeling into a habit: something you can do every week, in a few minutes, from your phone.

### The original plan, in brief

From [Plan.md](docs/Plan.md), the app has four tabs:

- **Weekly Challenges:** scrape local agendas for places where the city wants input, and turn them into weekly challenges. Examples: redesign a park, balance a real budget, test a city service, cover a council meeting. They're shown as monuments on the Freedom Trail, and there's a weekly streak.
- **Report:** a map of Boston with a button to photograph a 311-style issue. AI checks that it's a real city problem, and the report then shows on the map with its status. When it's resolved, you're told *who* in government fixed it.
- **Rewards:** challenges and approved reports earn points. Points fill wooden tea crates you throw into Boston Harbor, and each crate holds a deal from a local business, redeemed with a QR code.
- **Account:** your profile, neighborhood and notifications.

There was also a government side: pull real 311 data, avoid double-reporting, and send what residents say to the officials named on agendas before their deadlines.

### Scope we settled on

- **Area:** Greater Boston, meaning Boston (by neighborhood), Cambridge, Somerville and Brookline.
- **One seeded demo user**, no accounts or sign-in.
- **Native iPhone app** built with Expo, tested on a real iPhone (for the camera) and in the iOS Simulator.
- **Cut:** friends, social sharing, teams and a government-facing dashboard.
- **Mocked for the demo:**
  - The challenge flows (the challenges themselves are real).
  - Submitting to the live 311 queue.
  - The digests that go to city staff.

---

## 2. The ideas the app is built on

These principles explain most of the decisions in the rest of this document.

1. **The government is people.** Every challenge names the office or staff member who asked for input. Every fixed report names the team that fixed it and quotes the city's own closing note. The design's hero card says "Fixed by Dana R., DPW," not "Your ticket was closed."
2. **Only show what the city is actually asking for.** Challenges come from real agenda items with deadlines and named contacts. We don't make up civic tasks.
3. **Real data, never invented outcomes.** The seeded report history follows real Boston 311 cases, and their statuses, teams and closing comments come from the city's dataset. Nothing about an outcome is made up.
4. **AI writes the words; code makes the decisions.** Claude reads agendas, writes challenge copy, checks photos and drafts reports. Points, thresholds, statuses and payouts are computed by plain code from fixed rules, so the economy can't drift and the model can't be argued into paying more.
5. **A weekly habit, not a daily chore.** Doing one challenge a week keeps your streak. The trail resets each Monday with 4–5 new stops.
6. **Clean first, cute second.** The layout is calm and modern. The Boston Tea Party theme lives in the illustrations, the mascots and the currency, never in parchment or old-timey fonts.
7. **Fail open, never block the user on our own outage.** If the duplicate search or the description check fails, you can still send your report.

---

## 3. The app, tab by tab

The app opens on a short launch animation, then lands on the Challenges tab. The tabs are **Challenges**, **Report**, **Rewards** and **Profile**.

### 3.0 Launch: Paul Revere rides in

There's no sign-in, so there's no welcome page. On a cold start the native splash (the Tea Party wordmark on cream) hands off to a 2.5-second animation:
1. Paul Revere gallops across the screen with his lantern, a gust of wind and four leaves trailing behind him.
2. "Welcome back, Ishaan" fades in.
3. The overlay fades away onto the trail.

How it works ([launch-overlay.tsx](src/components/launch/launch-overlay.tsx)):
- **Seamless hand-off:** the wordmark is drawn at the same size and position as the native splash image, so the switch from native to JavaScript is invisible.
- **Animation:** Revere's legs swap between two SVG frames every 120 ms with a ±3 px bob. The gust is an animated dash along an SVG path, and the leaves follow 33 pre-sampled points on that path.
- **Interaction:** a tap anywhere skips it. With Reduce Motion on, it holds for 300 ms and cross-fades.
- **When it plays:** only on a cold start. A module-level flag stops it replaying on fast refresh.

**Why:** the launch and the app icon make Revere the face of the app. He's the messenger who rode to tell people something was happening, which is exactly what the app does for city agendas.

### 3.1 Challenges: the Freedom Trail

**What you see.** A tall illustrated map of Boston's Freedom Trail, in autumn:
- **This week's challenges** are landmarks near the top: Copp's Hill, Old North Church, Paul Revere House, Faneuil Hall and the Boston Massacre Site.
- **Past weeks** sit below, separated by a river and a bridge, each with a card like "Week 5 · 4 of 5 done."
- **Each current stop** gently pulses and has a nameplate underneath with the challenge title, its tea-leaf reward and its due date.
- **The trail runs bottom to top,** so the soonest deadline is the lowest stop.
- **Floating pills** show your streak and your leaf balance.

**This week's five challenges** are real Boston items live between Oct 26 and Nov 10, 2026 ([exampleChallenges.md](docs/exampleChallenges.md)):

| Landmark | Challenge | Asked by | Tea leaves |
|---|---|---|---|
| Copp's Hill | **Redesign your urban wild:** visit one, photograph it, place up to 5 changes on a map | Boston Parks (Urban Wilds Strategic Plan) | 70 |
| Old North | **Spend Boston's $2 million:** build a participatory-budget ballot under real constraints | Office of Participatory Budgeting | 40 |
| Paul Revere House | **Cummins Highway walk audit:** time the walk signals, rate the street, photograph best/worst spots | Boston Public Works | 80 |
| Faneuil Hall | **Rat Patrol:** report rodent activity to 311, check back in 7 days | City Services Committee (Rodent Action Plan hearing) | 40 (30 + 10 at check-in) |
| Boston Massacre Site | **Cover the Oct 28 City Council meeting:** follow one docket, file notes | Docket sponsor + your district councilor | 80 in person, 60 livestream |

**How a challenge works.** Tapping a stop or its nameplate opens a native sheet. It shows:
- what the city wants and why now, and who asked;
- a source link to boston.gov;
- an Add to Google Calendar line;
- a **Start challenge** button.

Start swaps the sheet for that challenge's flow, so closing the flow lands you back on the trail. Every flow ends on a "Sent" screen that shows:
- the landmark with a gold check;
- a "what happens next" timeline, for example *Sent → Voting until Nov 8 → Parks gets it Nov 9 → Open house Nov 10*;
- the tea leaves you earned, and that your streak is safe.

The five flows ([src/app/flow/](src/app/flow/)):

- **Council meeting** has two steps. Pick in-person or livestream with a native segmented control. Pick a docket: the Bad Landlords List ordinance or the Blue Hill Ave bus-lane summons. Then record the outcome (passed / referred / amended / tabled), who spoke, and your own take.
- **Cummins walk audit** has three steps:
  1. Choose how you're getting around: walking, stroller, wheelchair or bike.
  2. At each of three crossings, time the walk signal with a real in-app stopwatch (to 0.1 s) and note what was in the way.
  3. Rate the sidewalk, crossing safety, bus-stop access and lighting from 1 to 5, and photograph the best and worst spots.

  Results from stroller and wheelchair users are the hardest for the city to collect at a single walkthrough, which is why the mode comes first.
- **Rat Patrol** has two steps plus a check-in:
  1. Pick the kind of sign (burrows, droppings, overflowing or open trash) and take a photo. The block is read from the photo's GPS.
  2. File it with BOS:311, using a button that opens the city's 311 page, and paste the ticket number.

  Seven days later, the check-in asks what the city did: nothing, inspected, baited, or closed with no visible action.
- **Spend $2 million** has two steps.
  - **Build:** add projects priced from last cycle's real ballot. A sticky card tracks spending against four rules: under $2M, at least 4 projects, none over $500K, and at least one streets or parks project. The app logs every project you cut, because what the city most wants to learn is what people cut first.
  - **Rank:** drag your picks into order, then write why your top pick matters.
- **Urban wild** has three steps plus voting:
  1. Pick one of three nearby wilds and check in.
  2. Photograph the entrance, the best spot and the worst spot.
  3. Place up to five changes (trail, signs, seating, lighting, cleanup, easy entrance, leave it wild) as draggable pins on a park map.

  Then vote on neighbors' designs for 2 leaves a vote.

**Why the Freedom Trail?** Challenges needed a home that felt like Boston and showed progress over time. The trail is a real path through real landmarks, it reads naturally as "stops," and stacking weeks down the scroll makes your history visible without a stats dashboard. The nameplates came later: on their own, the landmarks didn't read as tappable challenges, and side labels looked detached ([design/screens/challenges/README.md](design/screens/challenges/README.md)).

**How the trail is drawn** ([src/components/trail/](src/components/trail/)):
- **Static scene:** the map is a 371 KB, ~2,000-node SVG. Drawing that live would mean parsing it on mount and painting one 1206 × 9090 px layer, so it's pre-rasterized at 3× into three WebP tiles that decode off the JavaScript thread.
- **Animated pieces:** everything that moves sits on top. That's landmark pieces, nameplates, rowing shells, a sailboat, a duck family, the swan boat, rustling trees, hopping squirrels, falling leaves, wind gusts and Franklin's kite. It's all Reanimated 4 CSS animations, declared once and run on the UI thread.
- **Pausing:** the map is split into three bands, and animation pauses for any band more than 300 map units off-screen, and for the whole tab when it isn't focused.
- **Stable layout:** a deterministic hash gives every prop its own phase, so the scene doesn't reshuffle between renders.
- **Reduce Motion:** turns all of it off. Stops sit at rest, and boats park at their starting point.
- **Positions:** every position comes from one design file, [design/assets/trail/layout.json](design/assets/trail/layout.json), in a 402-unit-wide coordinate space scaled to the screen.

### 3.2 Report: photo first, AI-checked, followed through 311

**What you see.**
- **The map:** Apple Maps in its muted style with points of interest hidden, so the app's pins stand out. Your reports appear as **photo pins**: your own photo inside a ring colored by status, with a small status glyph so color isn't the only signal.
- **The panel:** a bottom panel peeks with "Your reports · N open · N fixed."
- **Navigation:**
  - Tapping a pin raises a quick look with the photo, the timeline and the latest update.
  - Dragging the panel up shows the full list, split into Open and Done.
  - Tapping a row opens the full report page.

**The submit flow** ([new-report.tsx](src/app/new-report.tsx)):
1. **Camera.** Tap *Report an issue* and the in-app camera opens. It's live camera only, with **no camera roll**, so nobody can submit old or downloaded photos. Your location is taken from the device at the moment of the shot, and the address chip shows where you are.
2. **Paul inspects the photo.** The photo is resized to 1280 px and sent to the app's server route, which asks Claude to sort it into one of three outcomes:
   - **A real city issue:** something in public space a department could fix.
   - **Unclear:** too dark, blurry, far away, or nothing visible. You get a specific reason, a tip and a retake.
   - **Not a city issue:** private property, people, noise, emergencies or screenshots. You get the reason and no retake, because a retake won't help.
3. **Claude drafts the report.** For a real issue, it picks one of 311's categories and writes a short title, a description a crew could act on (only what's visible, no street names) and an urgency level.
4. **Duplicate check.** The app queries Boston's live 311 data for open cases of a related category within about 50 m. If one exists, you see it ("Someone beat you to it"), including its status, age and assigned team, with a **Me too** button. Me too follows the city's real case instead of filing a duplicate, and you still earn leaves when it's approved.
5. **Review and edit.** You see exactly what will be sent, marked "AI draft," with an editable description. If you changed the text, a deliberately loose second check confirms it still describes the photo. It only catches nonsense, and if the check itself fails, the report goes through anyway.
6. **Sent.** Paul gallops across the screen with a red 311 flag, plants it, and you see where your report was routed.

**What happens next.**
- **Statuses** follow a four-step lifecycle: **Submitted → In review → Approved → Fixed**, plus **Not approved**. They map from real 311 records:

  | 311 status | Closure reason | App status |
  |---|---|---|
  | (not in the dataset yet) | n/a | Submitted |
  | Needs Reallocation | n/a | In review |
  | In progress | n/a | Approved |
  | Closed | Noted (e.g. "No issue found") | Not approved |
  | Closed | anything else | Fixed |

- **Sync:** every time you open the Report or Profile tab, the app re-checks the city's records for the cases you follow.
- **Notifications:** when a status changes, you get a phone notification. A fix names the team and quotes the city's own closing comment.
- **Leaves:** reports pay **50 tea leaves when the city approves them**, not when you send them, because approval is the signal that the report was real.
- **Pins:** fixed pins stay on the map for 7 days. Not-approved reports never show on the map; they show in the list with the reason.

**The report page** ([report/[id].tsx](src/app/report/[id].tsx)) is laid out in the order you'd want to know things:
1. A full-bleed photo.
2. A status card showing the current step, for example "Day 2 of ~5." The estimate comes from median resolution times computed from a 20,000-case sample of real 311 data.
3. A thread of updates from the city.
4. "Sent to 311," showing the AI draft and, if you edited it, your words alongside.

**Why photo-first?** The first plan was to type a description, then take a photo. We flipped it because the photo is the evidence: the AI can check it and write the description for you, which cuts most of the effort. Taking location at the shutter, with no camera roll, keeps reports honest.

**Why show only your own reports on the map?** Other people's reports were planned as small dots with an "I see this too" option. For now, the duplicate check at submit time covers that need without crowding the map.

### 3.3 Rewards: toss the crate into the harbor

**What you see.**
- **A harbor scene** with the *Beaver* (one of the three real Tea Party ships), Paul cheering on deck, and a wooden tea crate on the dock that fills with leaves as you earn them.
- **A progress panel:** "120 of 150 leaves, 30 to go."
- **My Deals** below, with a badge on each saying how many days are left.

**The crate moment** ([crate.tsx](src/app/crate.tsx)). When the crate is full you tap **Toss it in the harbor!**:
1. Paul lifts the crate over his head.
2. You tap to throw. It arcs, splashes, and the camera follows it down through darkening water, past fish and bubbles, to the sea floor.
3. It hovers there, glowing. You tap it once: it squashes, a golden bloom flashes, the lid lifts, light rays turn, and a deal card rises up. For example, "You found a deal! Flour Bakery + Café."

That's one continuous animation with exactly one meaningful tap, built with Reanimated and SVG. Haptics land on the throw, the splash and the lid. The opening runs about 1.3 s to the card, faster than the original design's 3 s, so the tap pays off right away.

**Deals** ([deal/[id].tsx](src/app/deal/[id].tsx)):
- **The deal page:** the partner's name, address, a Google Maps link, and a large single-use QR code with Leafy in the middle. The QR uses error correction level H, so the logo in the middle doesn't stop it scanning.
- **Expiry:** codes expire 7 days after they're issued.
- **Partners:** real local spots (Flour, Tatte, Pavement Coffeehouse, Café Luna, Boston Public Market, Diesel Café). The offers are placeholders until each business confirms.
- **Redemption is mandatory:** the deal is saved the instant the crate opens, so closing the screen can't lose it.

**Why a crate in the harbor?** It's the Boston Tea Party, played forward: you're throwing tea into the harbor, but this time it's a reward. It also solves a practical problem. Random deals at fixed thresholds feel like a surprise, which beats a static rewards catalog.

### 3.4 Profile

([account.tsx](src/app/(tabs)/account.tsx))

- **Top bar:** your username, the leaf pill and a menu button.
- **Header:** your photo, name, city, and "N reports · N challenges."
- **"New" section:** led by a **hero card** whenever one of your reports was recently fixed: "Your pothole got fixed!" It shows the full timeline and who fixed it. Showing the real person who fixed it is a core product idea.
- **"Earlier" list:** activity rows written as sentences, each with exactly one button *or* one badge. Examples: a streak about to run out, a new challenge (Start), a council meeting (RSVP), a report approved, a rat-patrol check-in due.

How the feed is ranked ([notifications.ts](src/lib/notifications.ts)):
- **Tiers:** rows are ranked "act now," then "news," then everything else.
- **Budgets:** each kind has a limit (1 streak row, 2 challenge rows, 3 report rows, 6 rows total), so a burst of report updates can't push out a challenge you could start right now.

**The settings menu** ([src/app/menu/](src/app/menu/)) opens from the menu button:
- **Edit profile:** name and username, validated.
- **Neighborhood:** can change once every 30 days.
- **Age**
- **How tea leaves work** and **Reporting guidelines**
- **Notifications:** three toggles. iOS asks for permission when you turn one on, never on first open.
- **Location & camera:** shows live permission status, with a fix-it link.
- **Privacy, Help, About and Terms**

**Why lock the neighborhood and age?** These are the two fields planned for boosting rewards when the city needs to hear from a group, so they have to be hard to change. That stops people from gaming the boosts.

---

## 4. The weekly challenge pipeline

This is how real agendas become challenges. It's three Node scripts in [scripts/agendas/](scripts/agendas/), run in order by `npm run challenges:weekly`. A GitHub Actions workflow ([.github/workflows/weekly-challenges.yml](.github/workflows/weekly-challenges.yml)) runs them every Monday at 6 a.m. Boston time and commits the results.

### Step 1: fetch meetings (`agendas:fetch`)

It pulls the next four weeks of public meetings from four sources:

| City | Source | How |
|---|---|---|
| Boston, Somerville | Legistar Web API | Official events API, with agenda PDFs |
| Boston | boston.gov public notices | HTML scrape of the notices pages |
| Cambridge | PrimeGov API | Cambridge moved here from iQM2 in 2026 |
| Brookline | CivicClerk OData API | Agenda and packet files only |

Robustness:
- **Source isolation:** a broken city site can't sink the run, because each source runs independently and the step only fails if all four do.
- **Cancellations:** cancelled meetings are dropped.
- **Time zones:** each source has its own quirk. Legistar splits date and time, CivicClerk's local times wrongly end in "Z," and boston.gov's structured data is UTC without a "Z."

The current snapshot has **77 meetings**: Boston 38, Cambridge 19, Brookline 15, Somerville 5.

### Step 2: extract actionable items (`agendas:extract`)

Claude reads each agenda, as HTML text or the PDF itself, and keeps only the items a regular resident could act on in the next few weeks. It skips:
- procedural items;
- anything too narrow, like single-address variances or individual licenses;
- anything too heavy for a points app, like deaths in custody or criminal cases;
- anything not open to input.

For each kept item, it records:
- a title and summary;
- the type of action (testify, public comment, survey, design input, budget input, service test);
- the deadline;
- the Boston neighborhoods it affects, from a fixed list;
- the named contact, with name, office, email and phone.

The prompt says to **never invent names, emails, phone numbers, dates or dockets**, and the output is forced into a strict JSON schema.

Results are cached per agenda, so a weekly run only pays for agendas that are new or changed. The current snapshot has **147 items, 81 kept**.

### Step 3: write the week (`challenges:generate`)

1. **Rank the candidates:** items for the user's area are ranked by relevance: their own neighborhood, then nearby neighborhoods (e.g. Allston → Brighton, Fenway), then citywide.
2. **Write the week:** Claude picks and writes 4–5 challenges, calibrated on the hand-written examples in [exampleChallenges.md](docs/exampleChallenges.md). It must:
   - mix the types, with none more than twice;
   - ground each challenge in exactly one agenda item;
   - set the submission deadline at least a day before the meeting, so residents' input arrives in time.
3. **Check the output** in code:
   - Challenges whose source item is unknown or has no link are dropped.
   - Any email or phone number in the contact text must appear in the agenda item's contacts. If it doesn't, the contact is rebuilt from the agenda data and a warning is logged.
   - Points are always recomputed by `scorePoints()`. Claude estimates the effort factors honestly but never writes point values, and any "(N points)" left in a title is stripped.
   - The run refuses to save if fewer than 4 challenges survive.

Output is a JSON file the app reads, plus a Markdown write-up in the same format as the examples. The current generated week is [data/challenges/2026-10-26/boston-allston.md](data/challenges/2026-10-26/boston-allston.md): five challenges for an Allston resident, all from boston.gov notices.

### Demo mode vs live mode

The app shows the hand-checked demo week (`data/challenges/demo-week.json`, which is exampleChallenges.md word for word) unless `EXPO_PUBLIC_CHALLENGES_MODE=live`. Live mode fetches the latest generated week from `/api/challenges`. Generated weeks don't have hand-built flows yet, so their Start button opens the source page.

**Why both?** The scraped data is real, but a demo needs every challenge to have a polished, tested flow. The pipeline proves the system works; the demo week shows what it feels like.

### Cost

About $1.50 for a first full extraction, then about $0.25 a week plus any new agendas.

---

## 5. Where AI is used, and where it isn't

| Where | Model | What Claude does | What code still decides |
|---|---|---|---|
| Agenda extraction | `claude-opus-5-5`, low effort | Reads agendas (HTML or PDF), keeps actionable items, tags neighborhoods and contacts | Neighborhoods re-checked against the canonical list; empty fields removed |
| Challenge writing | `claude-opus-5-5`, medium effort | Picks and writes the week's challenges; estimates effort factors | Points, contact verification, deadline format, minimum count |
| Photo check | `claude-opus-5-5`, low effort | Sorts the photo (real issue / unclear / not a city issue), writes reason and tip, or drafts title, category, description and urgency | Category must be one of 311's topics (schema enum); timeouts; what happens next |
| Description match | `claude-opus-5-5`, low effort | Says whether your edited text still fits the photo | Loose by design; any failure lets the report through |

Shared patterns:
- **Structured outputs:** every call uses a strict JSON schema, so the app never parses free text.
- **Refusal fallback:** every call has server-side refusal fallback turned on.
- **The key stays on the server:** the photo check runs in an Expo Router API route ([analyze+api.ts](src/app/api/analyze+api.ts)), so the Anthropic key never ships inside the app.
- **Timeouts:** the photo check has a 20-second budget with one quiet retry for network or server errors. The server side gives up at 18 seconds so it doesn't keep retrying after the app has.
- **A warm-up ping:** when the camera opens, the app pings the route, so the server is warmed up by the time you take the photo.
- **Indoor testing:** `REPORT_TEST_DRINKS=1` makes any photo of a drink count as a valid report, so the whole flow can be tried indoors. It must be off for a real demo.

**Why so strict about AI's role?** Two reasons:
1. **Trust:** a civic app that invented a city contact or a deadline would be worse than no app.
2. **Fairness:** if the model set the points, the economy would drift week to week.

So Claude handles reading and writing, and plain rules handle everything that has to be consistent.

---

## 6. Data sources

| Source | Used for | Notes |
|---|---|---|
| Boston 311 Service Requests (data.boston.gov, resource `254adca6…`) | Duplicate search, status sync, seeded history, typical fix times | Free, public, supports SQL. Photos in the dataset are always empty, so duplicates match on location + category. A saved snapshot is in [boston-311/](data/boston-311/). |
| Legistar (Boston, Somerville) | Meetings and agendas | Public API |
| boston.gov public notices | Meetings and notices | Scraped |
| PrimeGov (Cambridge) | Meetings and agendas | Public API |
| CivicClerk (Brookline) | Meetings and agendas | Public API |
| Last cycle's participatory budget ballot | Project prices in the $2M challenge | Hand-entered |
| Google Calendar event links | "Add to calendar" | Template link; no sign-in or API key |

---

## 7. Tea leaves: the points economy

- **Points ×10 = tea leaves.** The rules in [exampleChallenges.md](docs/exampleChallenges.md) are written in points from 1 to 10. The app shows them ×10, so small actions like votes can be worth something without fractions.
- **Challenge points** = time (under 15 min 1 · 15–30 2 · 30–45 3 · 45–60 4 · over 60 5) + 2 if in person + 1 if the city asked + 1 if proof is required.
- **Reports** pay 50 leaves when approved by the city.
- **Votes** on other people's submissions pay 2 leaves each, up to 10 votes a week. You can't vote on your own.
- **Streak bonus:** 10 × your streak week, paid with your first challenge each week. Week 6 is +60.
- **Crates** fill at 50, then 100, then 150, then every 150 after that. Opening one spends its size, and anything over carries to the next crate. If you have enough for two, you open them one at a time.
- **Leaves never go below zero.** A report that isn't approved earns nothing. You don't lose leaves.
- **Deals** are single-use and expire after 7 days.

One ledger holds every leaf ([rewards.ts](src/lib/rewards.ts)). Everything that pays calls the same `creditLeaves`, and opening a crate is the only spend. The balance is `max(0, earned − spent)`. Every source of leaves is protected against double-paying:
- **Challenges** credit once, after the Sent screen renders, so remounts can't pay twice.
- **Reports** track which ids have already been paid.
- **The seeded history** is marked as paid before it's saved, so the demo doesn't start with a lump sum.

**Why these thresholds?** With these numbers, someone who does two or three challenges a week earns about one reward a week. That's often enough to feel good, but not so often that rewards stop meaning anything.

---

## 8. Architecture

### Stack

- **Core:** Expo SDK 58, React Native 0.88, React 19.3, TypeScript (strict). The React Compiler and typed routes are on.
- **Navigation:** Expo Router, with file-based routes in [src/app/](src/app/).
- **Animation and gestures:** Reanimated 4 (CSS animations + worklets) and Gesture Handler.
- **Graphics:** react-native-svg. Design SVGs are imported directly as components through `react-native-svg-transformer`.
- **Maps:** react-native-maps, which is Apple Maps on iOS.
- **Native modules:** expo-camera, expo-location, expo-image-manipulator, expo-image, expo-notifications, expo-haptics.
- **Storage:** expo-sqlite's key-value store.
- **AI:** `@anthropic-ai/sdk`, server-side only.

### Navigation

- **Tabs:** real native iOS tabs (`expo-router/native-tabs`) with the system Liquid Glass bar, styled with the app's own full-color icons and fonts.
- **Presentation styles:** each screen type uses a native style:
  - the report flow: a transparent modal, so the first-time intro sheet sits over the map;
  - a challenge: a form sheet sized to its content;
  - each challenge flow and the settings menu: their own modals;
  - the crate: a full-screen modal with no swipe-to-dismiss.
- **Sent screens** turn off swipe-back, so you can't reopen a form you've already sent.

### State and storage

There's no backend database and no accounts. Everything lives on the device in expo-sqlite's key-value store:
- **Data:** your reports, challenge progress, the leaf ledger, your profile, notification preferences, which alerts you've seen.
- **Photos:** report photos are copied out of the cache, which iOS can clear, into the app's documents folder.
- **Reading state:** stores are module-level and read by screens through `useSyncExternalStore`. The rewards and challenge stores read synchronously, so the first frame already has the right numbers.
- **Writing safely:** writes to reports go through a serialized queue that re-reads the latest data first, so two writes can't overwrite each other.
- **Migration:** older saved data is migrated on load (renamed statuses and fields).

The only network calls are:
1. Boston's 311 data (read-only).
2. The app's own API routes: photo check, and challenges in live mode.

### Notifications

All notifications are local; there's no push server.
- **Report updates:** fire as soon as a sync sees a status change.
- **New challenges:** a repeating Monday 9 a.m. alert, "New challenges are on the trail."
- **Streak reminder:** a Sunday 10 a.m. alert, only scheduled if your streak isn't safe yet. Finishing a challenge cancels it.

Tapping a notification deep-links to the right screen, including from a cold start.

### Theming and design tokens

- **Tokens:** colors, spacing, radii, status colors, point rules and motion timings live in [design/tokens/tokens.json](design/tokens/tokens.json) and [theme.ts](design/tokens/theme.ts). The app imports them, so there are no hard-coded hex values in screens.
- **Light only:** the app is deliberately light-only.
- **Fonts:** Bricolage Grotesque for headings and DM Sans for everything else, loaded before the splash hides.

### Performance decisions worth knowing

- **Trail map:** rasterized tiles instead of a live 2,000-node SVG.
- **Off-screen animation:** paused by band and when the tab isn't focused.
- **Map pins:** keep re-rendering only until their photo has actually drawn, then freeze. Pins on a map are snapshotted, so a pin frozen too early would be blank.
- **Photos:** resized to 1280 px and JPEG at 0.7 before upload, which keeps the AI check fast and cheap.
- **Slow requests:** every network call has its own timeout ("never let it hold a screen hostage"). The duplicate search gets 4 seconds before it fails open.

---

## 9. Design system

The full system, with every rejected idea, is in [design/DESIGN.md](design/DESIGN.md). The short version:

**The vibe:**
- **Clean first, cute second.** A near-white, airy layout. The personality is in the illustrated icons and mascots.
- **The theme in small touches.** The Boston Tea Party, the harbor and Paul Revere show up as the currency, the tricorn hat, Freedom Trail landmarks and harbor waves, never as parchment or serif fonts.
- **Gamified but calm.** No confetti layouts, stat tiles or badge clutter.
- **It must not look AI-generated.** No tinted icon squares on every row, no pills everywhere, no gradient blobs, no emoji, no Inter.

**Color rules:**
- **Teal (`#2F6F73`) means tappable.** Solid teal pills are buttons.
- **Green means tea leaves.** The currency has its own green family and nothing else uses it.
- **Red is reserved for "Not approved."** "Submitted" gets a calm periwinkle, because waiting isn't a problem. That periwinkle is also distinct from Apple's blue location dot.
- **Buttons and badges look different.** Buttons are fully rounded teal pills; badges are squarer tinted rectangles. Badges are never tappable, and nothing is a button without a destination.

**Type:** Bricolage Grotesque 700 for headings, DM Sans for everything else. We rejected rounded fonts (too childish), serifs (looked bad) and Inter (looks generic).

**The icon recipe ("Leafy" style):** flat fill, an outline in a darker shade of the same hue (never black), a side shade, one white shine, chunky proportions. Only Leafy and people get faces; "too many smileys" was an early rejection.

**Mascots:**
- **Leafy**, a tea leaf, is the currency.
- **Paul Revere** on his horse is the messenger: he inspects your photo, delivers it to 311, and rides in on launch.

**Report statuses** use the same color *and* glyph everywhere: pins, badges and timelines.

| Status | Color | Glyph |
|---|---|---|
| Submitted | periwinkle | clock |
| In review | gold | eye |
| Approved | teal | thumbs-up |
| Fixed | navy | check |
| Not approved | brick | × |

---

## 10. Decision log

Decisions that shaped the product, and why.

| Decision | Why |
|---|---|
| Name the person or office everywhere | The core idea: government should feel like people. |
| Challenges only from real agenda items with named contacts | Shows the city is already asking; gives every submission a real destination. |
| Points computed by code, never by the AI | Consistency and fairness; the model can't inflate rewards. |
| Contacts verified against the agenda after generation | A wrong email for a city official would destroy trust. |
| Photo first, camera only, location at the shutter | The photo is the evidence; it lets the AI write the report; no old or downloaded photos. |
| AI rejects non-city issues *before* submission | Protects the city's queue; the user is told why and loses nothing. |
| "Me too" instead of duplicate reports | Fewer duplicate tickets for the city; the user still gets updates and credit. |
| Leaves paid on approval, not on submit | Approval is the city's signal that the report was real. |
| No penalties for rejected reports | A strike system punished people for trying; a report that isn't approved simply earns nothing. |
| Reports don't count toward the streak | The streak rewards engaging with the city's agenda; reports have their own payoff. |
| Weekly streak, not daily | Civic life runs on weekly meeting cycles; daily would feel like a chore. |
| Freedom Trail for challenges | Real Boston landmarks, reads naturally as "stops," shows history without stat tiles. |
| Tea crates in the harbor for rewards | The Boston Tea Party played forward; random deals at thresholds feel like a surprise. |
| Neighborhood locked for 30 days, age locked | These drive reward boosts, so they can't be gamed. |
| Reports to 311 are anonymous | Only photo, location and description; never the user's name. |
| Seeded history follows *real* 311 cases | The demo shows real outcomes and real crew names, not invented ones. |
| Demo week shown by default, live pipeline kept separate | Every demo challenge needs a polished flow; the pipeline proves the system is real. |
| Light-only theme | One carefully tuned palette instead of two half-tuned ones in a hackathon. |
| Native tabs and sheets | The app should feel like an iPhone app, with system gestures and Liquid Glass for free. |
| Cut friends, sharing and teams | Scope. Individual challenges keep the core loop testable. |

---

## 11. What's real and what's mocked

For honesty with judges and anyone building on this.

**Real:**
- The agenda pipeline (four cities' APIs and notices, Claude extraction and generation) and its committed output.
- The five demo challenges: real agenda items, real deadlines, real named offices.
- The AI photo check and report drafting (Claude, via the app's API route).
- The duplicate search against Boston's live 311 data.
- Status sync from Boston's real 311 records for cases you follow ("Me too" and the seeded history), with real team names and closing comments.
- Typical fix times, computed from 20,000 real cases.
- Every interaction in the flows: the walk-signal stopwatch, the budget rules, drag-to-rank, the park map, photo capture, calendar links.
- Local notifications, the leaf economy, crates, QR codes and expiry.

**Mocked or simplified for the hackathon:**
- **Sending a new report to 311.** It's saved on the phone and never enters the city's live queue. Plan.md decided this to avoid creating fake tickets. A new report stays "Submitted" because it has no city case to follow.
- **Digests to city staff.** No digest is generated or emailed. The Sent screens describe what the office would receive.
- **Some verifications:**
  - Cummins photo locations ("both photos are on Cummins Hwy").
  - Council notes checked against the recording.
  - The urban-wild check-in, which doesn't check your distance.
  - The 311 ticket in Rat Patrol, which is checked by format only.
  - Face and plate blurring.
- **Dates and content:** hard-coded for the week of Oct 26:
  - the timelines and check-in date;
  - the two council dockets, which come from the Oct 21 filing;
  - three canned neighbor designs to vote on;
  - placeholder names for Cummins crossings 2 and 3, and placeholder distances to the urban wilds.
- **The streak:** starts at a fixed week 5. Past trail weeks are illustration, and nothing rolls the week over automatically.
- **Deal offers:** placeholders until each business confirms. Redeeming a code is simulated (long-press the QR); there's no business-side scanner.
- **Accounts:** there's one seeded user and no sign-in. Log out and Delete account are placeholders.
- **Hidden demo tools:**
  - long-press the leaf pill for leaf and report tools;
  - long-press the streak pill to reset the week;
  - long-press a QR code to simulate the scan.

---

## 12. Known gaps and inconsistencies

Things we found reviewing the code, roughly by importance:

1. **New reports never progress.** Because submission is mocked, a new report has no 311 case to follow. It stays "Submitted," never pays its 50 leaves, and the Sent screen's "tea leaves are on the way" doesn't come true. Plan.md's idea of playing back a real case's timeline isn't built yet.
2. **Example reports only seed in development.** The six example reports (one at every stage) are only added in a development build, so a shared or production build starts with an empty map. The real-311 seed on the Profile tab does run everywhere.
3. **Error messages are vague.** Every photo-check failure (missing API key, server unreachable, rate limit) shows the same "might be your connection" screen. The server returns specific errors; the app doesn't show them yet.
4. **No server address for native builds.** The app calls its API with relative URLs, which works against the dev server. A shared build needs the API deployed (EAS Hosting) and its address set as `origin` in [app.json](app.json). The challenges route also reads files from disk, which a hosted deploy would need to bundle.
5. **The seed user doesn't match.** [Plan.md](docs/Plan.md) says Allston, age 25. The app's seed profile and DESIGN.md say Cambridge, Ward 4, age 20. The demo and generated weeks are for Allston. The weekly workflow uses the seed profile, so it would generate for Cambridge.
6. **Demo point labels don't match the formula.** The labels come straight from the doc, but the formula disagrees for 3 of 5 challenges (urban wild 6 vs 7, $2M 5 vs 4, Cummins 7 vs 8). The trail's leaf values follow the formula.
7. **Vote values disagree.** It's 1 point in the challenge rules but 2 leaves in the app (1 point would be 10 leaves).
8. **Age and neighborhood boosts aren't built.** The settings copy describes them; no code applies them yet.
9. **Reduce Motion is incomplete.** The trail and launch respect it, but the crate toss and the harbor crate's pulse don't.
10. **The QR payload uses an unhandled link scheme.** It's `teaparty://…`, while the app's URL scheme is `hackachusetts`.
11. **Template leftovers.** A few files and assets from the Expo starter are unused (themed text/view, the React logo, `use-boston-311.ts`).

---

## 13. Running and sharing the app

### Locally

```bash
npm install
# .env.local (not committed): ANTHROPIC_API_KEY=...
npx expo start          # open on an iPhone with Expo Go, or press i for the simulator
npx expo lint
npx tsc --noEmit
```

`.env` (committed, no secrets):
- `EXPO_PUBLIC_CHALLENGES_MODE=demo` or `live`.
- `REPORT_TEST_DRINKS=1`, the indoor testing mode. Set it to 0 for a real demo.

To refresh the challenges:

```bash
npm run challenges:weekly    # fetch → extract → generate (needs ANTHROPIC_API_KEY)
```

### Getting it to judges

The plan we settled on (free apart from Anthropic API usage, which is a few cents a report):
1. **Deploy the API routes** with EAS Hosting (`eas deploy`). Store `ANTHROPIC_API_KEY` as a secret EAS environment variable. Set a spend limit on the key in the Anthropic Console.
2. **Point the app at the server** by setting `origin` in the `expo-router` plugin in app.json.
3. **Publish the app** with `eas update`. Judges install **Expo Go** and scan a QR code. This needs testing first: confirm Expo Go runs every module the app uses and can open the update.
4. **Fix gaps 1–3 above** so judges see seeded reports and clear error messages.

A web link (`npx expo export --platform web`) would need real work first:
- expo-sqlite needs its WebAssembly file accepted by the bundler, plus two security headers on the server.
- Maps and SF Symbols need web fallbacks.

An Android APK would need a Google Maps API key.

---

## 14. Where things live

```
src/app/                  every screen (Expo Router: each file is a route)
  (tabs)/                 index (Challenges), report, rewards, account (Profile)
  new-report.tsx          the whole photo → AI → send flow
  report/[id].tsx         report page
  challenge/[id].tsx      challenge sheet
  flow/<challenge>/       the five challenge flows
  crate.tsx, deal/[id]    crate toss and deal QR
  menu/                   settings pages
  api/                    server routes: analyze (photo check), challenges
src/components/           trail, report, rewards, challenge-flow, launch, menu
src/lib/                  logic: my-reports, boston-311, seed-311, report-check, report-leaves,
                          report-events, challenge-progress, challenge-week, challenges (points),
                          rewards (ledger), notifications (inbox), device-notifications, profile, settings
src/constants/            311 topics, report topics + typical fix days, trail stops, seed profile
src/ui/                   theme, text, icons, shared components
scripts/agendas/          the weekly pipeline (fetch, extract, generate, sources/, claude.ts)
data/agendas/             meetings.json, items.json, per-agenda cache
data/challenges/          demo-week.json, generated weeks, index.json
design/                   DESIGN.md, tokens, SVG assets, mockups, flows, animations
data/boston-311/          saved 311 snapshot + fetch scripts
docs/                     Plan.md (original brief), exampleChallenges.md (hand-written demo week)
.github/workflows/        weekly-challenges.yml
```
