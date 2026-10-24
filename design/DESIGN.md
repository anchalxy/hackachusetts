# Tea Party — Design System

Hand this file to any designer or AI working on Tea Party screens. It records the decisions made while designing the Profile screen, including what was tried and rejected. Follow it closely: the look came out of many rounds of feedback.

## 1. Product in one paragraph

Tea Party is a civic-engagement app for young people in Boston and Cambridge. Users complete weekly challenges drawn from real city agendas, report 311-style issues with a photo, and earn **tea leaves** (the in-app currency) to spend on local rewards. There are four tabs: **Challenges** (shown as monuments on the Freedom Trail), **Report** (a map plus a camera button), **Rewards**, and **Profile**. The goal is to make local government visible and personal. For example, when something gets fixed, the user sees *who* fixed it.

## 2. The vibe

- **Clean first, cute second.** The base is a near-white, airy, modern app. The cuteness lives almost entirely in the illustrated icons and the mascot, not in the layout.
- **Boston Tea Party / harbor / Paul Revere** is expressed through small touches: the teacup logo, harbor-wave texture, the tricorn hat, Freedom Trail landmarks, and tea leaves as the currency. Never through parchment textures, serif fonts, or old-timey layouts.
- **Gamified but calm.** There are rewards, a streak and progress, but no confetti layouts, no stat-tile dashboards and no badge clutter.
- **Must not look AI-generated.** Avoid the generic look: tinted icon squares on every row, pills everywhere, evenly weighted cards, gradient blobs, emoji, Inter font.

## 3. Color

### Core UI tokens
| Token | Hex | Use |
|---|---|---|
| `bg` | `#FCFBF8` | App background (near-white, barely warm). **Not** yellow or parchment. |
| `surface` | `#FFFFFF` | Cards, tab bar |
| `border` | `#ECE6DA` | 1px card borders, dividers |
| `tile` | `#F3EFE6` | Background square behind every list icon; soft inner panels (`#F7F4EE`) |
| `ink` | `#1E2A3A` | Primary text, active tab label |
| `slate` | `#5B6573` | Secondary text |
| `mute` | `#8A919B` | Timestamps, dates, inactive icons |
| `teal` (primary) | `#2F6F73` | **All tappable buttons**, links, timeline, active highlight card |
| `brick` | `#C2533F` | Unread dot; streak/urgency accents |
| `gold` | `#B8892E` | Rare accent |

### Tea leaf (currency): its own green, used only for tea leaves
| Token | Hex |
|---|---|
| `leaf` | `#5DAE72` |
| `leafDark` | `#2F7A4E` (outline, and the text color for leaf amounts) |
| `leafLight` | `#9AD3A6` |
| `leafTint` | `#EEF6EF` (background of leaf amount badges and the balance pill) |

### Status badges: a tinted background with colored text, no dot, no border
| Status | Background | Text |
|---|---|---|
| In review | `#F6EEDC` | `#8A6620` |
| Approved | `#E3EFEC` | `#22545A` |
| Urgent / time left | `#F8E4DE` | `#9C3F2F` |
| Leaf reward (`+30`) | `#EEF6EF` | `#2F7A4E` + small Leafy |

### Highlight card (city bounty)
Background `teal #2F6F73`. Title `#FFFFFF`, body `#D7EAE7`, secondary `#CFE3E0`. Faint white harbor waves at the bottom edge (opacity 0.14). The button is white with teal text. Black or navy was rejected as too heavy.

### Color rules
- **Use color sparingly.** Most of the UI is ink, slate and white. Color appears in icons, buttons, badges and the one highlight card.
- **Teal means tappable.** If it's a solid teal pill, you can press it.
- **Green always means tea leaves.**

## 4. Typography
- **Headings:** **Bricolage Grotesque**, weight 700, slight negative tracking. It's friendly and has character, but it's still a clean sans.
- **Body / UI:** **DM Sans**, weights 400, 500, 600, 700.
- **Rejected:** Fredoka and Nunito (too round and childish), Libre Caslon and other serifs (looked bad), Inter (generic, reads as AI).

| Role | Font | Size / weight |
|---|---|---|
| Profile name | Bricolage | 24 / 700, −0.4 tracking |
| Hero card title | Bricolage | 19–21 / 700, −0.3 |
| Section header ("New", "Earlier") | Bricolage | 18 / 700 |
| Username (top bar) | DM Sans | 17 / 700 |
| List row text | DM Sans | 14. The bold lead-in (subject) is 700, the rest 400 |
| Secondary text | DM Sans | 13.5 / 400, slate |
| Buttons | DM Sans | 13.5 / 600 |
| Badges | DM Sans | 12.5 / 600 |
| Timestamps / dates | DM Sans | 11.5–12 / 400–500, mute |
| Tab labels | DM Sans | 11 / 500 (active 700, ink) |

**Copy style:** list rows read as sentences, Instagram-activity style: "**DPW approved** your graffiti report on Broadway · 2d". Keep each notification to 2 short lines.

## 5. Layout and spacing
- Frame: iPhone, 402 wide. Side gutter **20**. Everything aligns to the 20px edge, including icons, avatar, menu and badges.
- Card radius **20**, card padding **16**, 1px `border`, no shadows.
- Gap between cards **12**. Gap before a new section **~26**.
- List rows: height **68**, a 44px icon tile (radius 12) on the left, text starting **58px** in from the gutter. Dividers are 1px `border`, inset to start at the text, not full-bleed.
- Hero card icon tile: 64px, radius 16.
- Bottom tab bar: floating Apple-style capsule (see "Tab bar: Apple style").
- **Interactive vs informational must look different:**
  - **Button** = solid teal pill, height 32, fully rounded, white text.
  - **Badge** = tinted rectangle, height 26, **radius 8** (squarer), colored text, no border.
  - Never use outlined/ghost buttons next to badges; they read as ambiguous.

## 6. Profile screen structure (approved)
1. **Top bar:** teacup app mark (left) · **username centered** with a chevron (TikTok-style) · **leaf balance pill** (Leafy + "1,240") · hamburger menu.
2. **Header:** large avatar (left, r=52) · name (Bricolage) · city · "**12** reports · **9** challenges". No bio, no rank title, no stat tiles, no friends (friends are cut for the hackathon).
3. **"New"** section (with "3 unread" on the right):
   - **Hero card, "Your pothole got fixed!":** report icon, title, address. Then a **4-step timeline**: Submitted → In review → Approved → Fixed. It's a line with checked dots and a label and date under each, and the final step is enlarged with a soft halo. Below it, a soft panel: Dana's avatar, "Fixed by Dana R., DPW", "+50 tea leaves", and a **Say thanks** button. Showing the real person who fixed it is a core product idea.
   - **City bounty card (teal):** a personal question as the headline ("How do you get to Central Sq?"), one line saying who the city wants to hear from ("…renters like you"), Leafy + "Double tea leaves / Ends Friday", and a **Take survey** button. No "CITY BOUNTY" label and no demographic-ad headline.
4. **"Earlier"** list: about 6 rows, mixed types, each with one right-side element (a button *or* a badge):
   - Streak: "Your 5-week streak / Do a challenge to keep it" → badge `1 day left`
   - New challenge → button `Start`
   - Report in review → badge `In review`
   - City Council meeting → button `RSVP`
   - Report approved → badge `Approved`
   - Votes on your design → leaf badge `+30`
5. "See all notifications" link, then the tab bar.

### Report lifecycle (use everywhere)
**Submitted → In review → Approved → Fixed.** Users get alerts for In review, Approved and Fixed. No alert for Submitted, since the user did that themselves. Map pin colors: red = not reviewed, gold = in review, teal = in progress / fixed.

### What every control leads to
| Control | Destination |
|---|---|
| Username ⌄ | Switch account / copy profile link |
| Leaf balance | Rewards tab |
| Menu | Settings (neighborhood, notifications, privacy, log out) |
| "12 reports" | Report map filtered to my reports |
| "9 challenges" | My completed Freedom Trail stops |
| Report card / row | Report detail: photo, location, full timeline |
| Say thanks | One-tap thank-you to the crew, shown on the report |
| Take survey | City survey in-app; leaves credited on completion |
| Start | That challenge |
| RSVP | Adds the meeting to your calendar and unlocks the note-taking challenge |
| See all | Full notification inbox |

Rule: **no button without a destination.** Badges are never tappable.

## 6b. Menu sheet (from the hamburger)
A full-height sheet: the dimmed profile peeks out at the top, then a grabber, a large "Settings" title (Bricolage 26), and a round close button. The sheet is built from grouped white cards using the same row anatomy as the Earlier list: a 44px icon tile, a title (15/600) with a subtitle (13, slate) under it, dividers inset to the text, and **only a chevron on the right**. No buttons or badges inside the menu. Subtitles only show a **value** (Cambridge · Ward 4, 20, @ishaan.t) or a **problem** in brick ("Camera access is off"). Never a description of what the row is. If the title says it, leave the subtitle off. Row names: Tea leaves, Reporting guidelines, Notifications, Location & camera, Privacy, Help, About Tea Party, Terms.

Order:
1. **Profile card:** avatar, name, "@ishaan.t · Edit profile", leading to edit name and username.
2. **Your info:** Neighborhood ("Cambridge · Ward 4"), Age ("20", no chevron: it's locked, so the row isn't tappable). Both are set at sign-up. Age is stored as a birth date and is locked; neighborhood can change once every 30 days. This stops people gaming bounties. Caption under it: "Used to boost leaves when the city needs to hear from people like you." Dynamic rewards are based only on these two fields.
3. **How it works:**
   - *How tea leaves work* covers thresholds of 5 / 10 / 15, then 15 per reward after that; a streak bonus equal to the week number; rewards resetting the counter; QR codes expiring after 7 days; and leaves never going below 0.
   - *Reporting guidelines* explains what counts as a good report. There is no strike system: a report that isn't approved simply earns nothing, and we tell the user why.
4. **Preferences:**
   - *Notifications:* toggles for report updates (In review / Approved / Fixed), streak reminder, new weekly challenges and city surveys.
   - *Location & camera:* permission status, with a link to fix it. Reports use the device's location at the moment of reporting.
   - *Privacy:* reports go to 311 **anonymously** (photo, location and description only, never the user's name). Delete account lives here.
5. **Support** (no label): Help · About Tea Party · Terms & privacy policy.
6. **Log out**, in its own card, with brick text, centered, no icon. Version line below.

Left out on purpose: anything already reachable from the Profile screen (Rewards via the leaf pill, My reports via "12 reports", notifications via "See all"), and friends, invites and sharing (cut).

Inner pages (designed): **How tea leaves work** (Earn · Unlock rewards track 5 → 10 → 15 → +15 each after, with "Claiming a reward resets your counter to 0" · Good to know: streaks are weekly and miss a week = start over, codes last 7 days, never below zero) and **Reporting guidelines** (hero · grid of reportable types · 3 numbered tips · "Not for Tea Party": emergencies, private property, people/noise · anonymity footnote). Inner pages use a back chevron with no centered title, then a large hero (icon tile, Bricolage 26 heading, 2-line intro), and info rows with no chevrons.

Decisions:
- The **username chevron** should open Edit profile, or be removed. It no longer means switch account or copy link; sharing is cut.
- **Hidden dev menu for the demo:** long-press the teacup to advance a report's status or reset the week, so "Your pothole got fixed!" can be triggered live.

## 6c. Report tab (map)
**Base map: Apple Maps (MapKit)** with the muted standard style and points of interest hidden, so our pins pop. The mockup's map is a stand-in for it. Your location is the system blue dot.

**Pins**
- **Your reports** are photo pins (62px): the photo you took inside a white gap and a ring in the status color, with a short tail and a soft ground shadow. A small status dot sits on the ring at 1–2 o'clock, carrying a white glyph so status isn't shown by color alone.
- **Other people's reports:** not shown for now (off until we support them). Later they'd be 11px status-colored dots, and tapping one could offer "I see this too".
- On the map, a colored ring is fine, because pins *are* tappable. (Photos elsewhere still never get colored rings.)

**Status colors and glyphs** (same on pins, dots, list badges and timelines). Colors move from calm to good, and only the problem state is red:
| Status | Ring | Glyph (meaning) | Badge bg / text |
|---|---|---|---|
| Submitted | periwinkle `#7B8CC9` | clock (waiting for the city) | `#ECEEF8` / `#4A5891` |
| In review | gold `#C99A3B` | eye (being looked at) | `#F6EEDC` / `#8A6620` |
| Approved | teal `#2F6F73` | thumbs-up (city said yes) | `#E3EFEC` / `#22545A` |
| Fixed | navy `#3A4A5E` | check (done) | `#E6E9EF` / `#1E2A3A` |
| Not approved | brick `#C2533F` | × | `#F8E4DE` / `#9C3F2F` |

Red is reserved for Not approved, since red reads as "something's wrong". Submitted isn't a problem, so it gets calm periwinkle, which is also different from Apple's blue location dot.

Fixed pins stay on the map for 7 days, then live only in the list. Not-approved reports never appear on the map; they show in the list with the reason as the subtitle ("Private lot, not city property"). There's no legend: the list badges teach the colors.

**Screen layout**
- Top-left: leaf balance pill (y = 56, just under the status bar).
- **Report an issue**: a wide teal pill (54px tall) centered just above the sheet. The locate button (44px white circle) sits on the same row at the right, in thumb reach.
- **Bottom sheet (peek):** "Your reports" + "4 open · 1 fixed", plus your most recent report as one row.
- **Sheet pulled up:** title "Your reports" (Bricolage 24) + "4 open · 1 fixed · 12 all time". Sections **Open** (newest first) and **Done** (Fixed and Not approved). Rows use the standard list anatomy with a status badge on the right.

**Navigation: panel for browsing, one page for details** (see `report-states.png`)
- **Map (default):** a peek panel with the "Your reports" summary and your latest report. Report an issue and the locate button float above it.
- **Tap one of your pins: Quick look.** The same panel springs up (~330px) and its content cross-fades. The Report and locate buttons slide away, and the map only pans if the pin would be covered. It shows: photo, title, address, sent time, the 4-step timeline, **the latest update from the thread** (who said it and when), and a **View report** button. Close it with ×, a tap on the map, or a swipe down.
- **Drag the panel up: Your reports (full).** The map gets a 14% ink scrim; sections are Open and Done. **Tapping a row opens the Report page directly**, because from the list you want details, not location.
- **Report page (its own screen, pushed in the Report tab).** Order follows what you want to know:
  1. **Photo, full-bleed** (300px) with a top scrim, white status bar, and a floating white back button. The content sheet overlaps it with a 24px rounded top.
  2. **Title** (Bricolage 26) + address.
  3. **Status card**, the *only* tinted card, colored by the current status (In review = `#FBF5E6` with a `#F0E2BF` border). It has the status dot + status name (Bricolage 19), an estimate ("Day 1 of ~5"), one plain sentence ("Traffic & Parking is checking it."), the compact 4-step progress, and the leaf note.
  4. **Updates**, the thread, oldest to newest. Solid connector lines run only *between* avatars (never through a circle); a dashed line leads to a dashed "Next: Approved / You'll get a notification" placeholder.
  5. **Sent to 311** (tagged "Written by AI"): the AI summary, then "Street markings · Medium urgency", then a divider and **Your words** in small slate text. This replaces the separate "What you wrote" section.
  6. **Meta line** at the bottom in mute text: report # and sent time.
- Why not keep everything in the panel: long threads scrolling inside a draggable panel fight the drag gesture; the profile and notifications need a real destination; and back-navigation inside a panel is unclear.
- Replies are actions, not free chat: Say thanks (when fixed), Add a photo/detail (if the city asks), Try again (if not approved).
- Motion: spring ~350ms, 150ms content cross-fade. The panel has a soft layered shadow (4 stacked rounded-top layers at 2–5%), never a hard band.

## 6d. Report an issue: submit flow v2 (see `submit-flow.png`)
Spacing rule for this flow: on input screens the main button is pinned at the bottom; on result screens (sent, can't use, error, camera off) the content and button sit together as one centered group, so there's no dead space.
Order: **snap → AI checks the photo (seconds) → AI drafts the report → you edit → loose alignment check → sent to 311.** The tone is friendly throughout, with **Paul Revere on his horse** as the mascot for this flow (Leafy stays the currency mascot). There are no checklists or progress lists.
0. **First time only:** a sheet over the map titled "Report in 3 quick steps" (Snap the problem / Check what we wrote / Send it to 311), with an **Allow camera access** button (triggers the iOS prompt) and "Only used when you take a report photo." under it, plus a "What can I report?" link. Afterwards, Report an issue opens the camera directly.
   - **0b. Camera access is off** (denied): a dark screen with a muted camera, "Camera access is off", one reason line and **Open Settings**.
1. **Camera:** live-only, with location chip, framing corners, hint, and shutter.
2. **Paul's inspecting your photo…** (AI checks the photo, ≤10s): the photo dims with a soft scan line; a bottom card shows Paul, standing still, peering through a big magnifying glass (one magnified eye), and "Just a few seconds". Motion: a gentle 1s bob plus a lens glint. No "you can leave the app", since it's too short to matter. If it passes 8s, the copy changes to "Still looking…"; at 20s it becomes the error screen.
   - **2b. Let's try that again:** the photo isn't something the city can fix, or is too unclear. A gold card says "Nothing was sent", gives a specific reason and a tip, and offers **Retake photo**, plus "Emergency? Call 911 instead."
   - **2c. Hmm, Paul couldn't see it:** a network or AI error, or a timeout. It shows Paul with his magnifier, says the photo is saved, and offers **Try again** + a "Retake photo" link.
   - **2d. We can't send this one:** the photo is clear, but it isn't a city issue (private property, people). It shows a red status card ("Nothing was sent. No points lost."), the specific reason, "Think it's public? Try a photo that shows the street.", **Back to map** and a "What can I report?" link. There's no retake button, because retaking won't help.
3. **Here's what we'll send:** a big friendly heading + "We wrote this from your photo. Change anything." Then the photo with soft chips (place, Anonymous), the AI-drafted title + category (tagged "AI draft"), and an editable description field (focused, teal border, tip: "add when it's worst or who it affects"). The button is **Send to 311**.
   - **3b. Doesn't match** (loose check on Send): if the text has nothing to do with the photo, the field turns brick and an inline note appears ("Hmm, this doesn't match your photo. Tell us about the problem you snapped."), with a "Reset to AI draft" link. It stays on the same screen. The check is intentionally loose and only catches nonsense.
4. **On its way to 311!:** an **animation** (see `submit-sent-animation.gif`): Paul gallops in from the left along the top of the screen, waving a red **311** flag, with dust puffs behind him. He crosses slowly, in ~3.3s (ease in-out, legs alternating every ~120ms, ±3px bob), and exits right. As he passes the middle, a **big** planted 311 flag pops up where he rode (scale 0 → 1.15 → 1, at 1.7× size) and waves for ~1s, then lowers into the ground (eases down behind the ground line while fading, ~0.8s), leaving the title. "Back to map" sits 38px below the View report button. Then "Routed to Traffic, Parking & Transportation", a card with what was sent (thumb, title, report #, description), a green "Tea leaves are on the way" note, **View report**, and a "Back to map" link.
- The 4-step lifecycle starts at **Submitted** (= sent to 311). Everything before that happens on-screen in seconds, so there's no "Checking" pin on the map any more.

## 7. Icon style: the "Leafy" recipe
All icons share one construction:
1. **Flat fill** in the object's main color.
2. **Outline in a darker shade of the same hue** (not black), stroke 1.4 on a 24px grid, round joins and caps.
3. **Side shade:** a darker copy of the right ~25% of the shape at 20–28% opacity.
4. **White shine:** one short rounded stroke (and optionally a dot) at the top-left, opacity ~0.85.
5. **Chunky, simple proportions.** Readable at 24px.
6. **Faces: only Leafy (the tea leaf) and people have faces.** Everything else is faceless. Faces everywhere was rejected as "too many smileys".
7. In lists, every icon sits on the same `tile` square (#F3EFE6, radius 12). Scene icons (pothole, crosswalk, graffiti) are small rounded squares with their own thin outline, placed *inside* the tile like every other icon.
8. **Inactive tab state** ("muted"): fill `#F3F0EA`, outline `#8A919B`, no shade or shine. **Leafy stays full color in the tab bar even when inactive.** The currency should always catch the eye.

### Icon palette (fill / outline)
teal `#3F8C8F / #1F4E52` · brick `#E0694F / #9C3F2F` · gold `#E9C46A / #A57C2A` · navy `#4A5D78 / #1E2A3A` · green `#5DAE72 / #2F7A4E` · blue `#6BAED6 / #2F6E9A` · wood `#C98B5A / #7E5233` · stone `#C3C8CF / #5E6672` · orange `#F08A4B / #A4512A` · paper `#FFFFFF / #3A4A5E` · cream `#F1DEC0 / #9C8261` · glow `#FFE08A / #C99A3B` · asphalt `#7D8692 / #4A525E`

### Leafy (mascot + currency)
A plump teardrop leaf tilted about −14°, with a curled stem at the bottom, a shine stroke and a dot, dark dot eyes, a tiny smile and pink blush (`#F29A8A`). Under 18px, drop the face and show a center vein instead. It appears in: the balance pill, leaf amounts (`+50 tea leaves`), the bounty card, and the Rewards tab.


### Paul Revere (report-flow mascot)
He's drawn in the same Leafy style: same-hue outlines, side shade, shine, and a face, since he's a person. He rides a slim chestnut horse drawn as one clean silhouette (arched neck, long face with a white blaze, long legs; `#C98B5C` / `#7A4B2C`, dark mane) with a teal saddle blanket and gold trim. Paul wears a navy tricorn with gold trim, a blue coat (`#3F5A82`) with gold buttons, a white colonial queue and boots, and he faces right. There are three poses (`revere-sheet.svg`): **Alarm** (a proper colonial lantern with ring, cap, framed glass and a warm glow, held high; galloping), **Inspecting** (horse standing, Paul holding a magnifying glass out in front with a focused look), and **Delivering** (galloping with a red 311 flag). Galloping uses two leg phases that alternate. Use him only in the report flow, and keep Leafy for money.

### Tab bar: Apple style
A floating "glass" capsule (iOS 26 style), inset 16px, 64px tall, fully rounded, white at 94% with a hairline border and a soft shadow, sitting 34px above the bottom. The selected tab gets a teal-tint pill behind its icon, and its label turns teal and bold. It keeps our Leafy-style icons (inactive = muted versions; Leafy is always full color; Profile shows the user's photo). Content and bottom sheets run underneath it to the screen edge.

### Avatars
**Rule: use the person's real photo whenever we have one** (circle crop in a **neutral white frame**: 5px white on the profile header, 3px on small cards, plus a 1.2px `#E3DBCB` outline). **Never put a colored ring around a photo.** Teal means tappable, and colored rings read as Instagram stories. The profile photo isn't tappable; you change it from Menu → Edit profile. The tab-bar version keeps the ink active-tab ring.. The illustrated avatars below are only a **fallback** for users without a photo, and for city staff like Dana where we don't have one.

Same recipe applied to people: a circular badge with a tinted background and a faint inner ring, shoulders, a head with a same-hue darker outline, side shade, dot eyes with catchlights, blush, a smile, and a role hat.
- **Ishaan (user):** uses his real photo (`avatars/ishaan-photo.jpg`). Illustrated fallback, drawn from the photo: Messy black hair with flyaway tufts, thick brows, a big toothy smile, warm brown skin (`#CF956B` / outline `#8C5A3A`), a charcoal suit with a white collar and a red dotted tie, on a teal background `#DDEDE9`.
- **Colonist (alt):** the earlier tricorn-hat character (navy hat, gold trim, red cockade, teal coat, cravat). Kept as an optional or unlockable look.
- **Dana R. (DPW crew):** yellow hard hat, curly hair, navy shirt, orange safety vest with reflective stripes, gold background `#FBEFD2`.
- Idea for later: a hat per role (city staff = hard hat / beret, user = tricorn, maybe unlockable hats as rewards).

## 8. Rejected along the way (don't bring back)
- Parchment or yellow backgrounds; heavy color usage
- Rounded "bubbly" fonts (Fredoka/Nunito) and serifs (Caslon)
- Instagram-clone layout (stat tiles, story-highlight rows, Edit/Share buttons, bio, rank chips)
- Freedom Trail "stamp" highlights, a "Minuteman" rank, XP ring, a separate streak/coins/boost tile row
- Coins as currency (it's tea leaves)
- Three-bar progress meters (use the dot timeline)
- A black/navy bounty card; "CITY BOUNTY" eyebrow labels; "Renters 18–24 wanted" ad-style headlines
- Ghost "Keep it"-style buttons for non-actions; colored status dots inside badges
- Faces on every icon
- A "Reward unlocked" notification, and friend invites / friends row (cut for scope)
- Filter chips plus a dense pinned banner (felt disorganized)

## 9. Files
See `README.md` for the folder map and which format to use where.
