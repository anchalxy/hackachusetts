# Challenges tab: the Freedom Trail

Mockups for the Challenges tab and this week's five challenge flows (week of Oct 26, from `exampleChallenges.md`). PNGs are 2× references. The clickable prototype is the "Challenges tab" board in the Tea Party design canvas. The app opens straight onto this tab (see `screens/launch/README.md`).

## Files
```
screens/challenges/
  0-trail.png                 Challenges tab, top of the trail (this week)
  0b-trail-after-a-stop.png   same, after finishing Old North (check, +40, "Streak safe")
  trail-full-map.png          the whole scroll: this week, Week 5 (5 stops), Week 4 (4 stops)
  urban-wild/  spend-2-million/  cummins-walk-audit/  rat-patrol/  council-meeting/
                              0-sheet = detail sheet after tapping the stop or its label, then each step
  tea-leaf-scale.png          scoring rules and this week's values
  digest-cummins-mock.png     what Public Works receives (mock data)
flows/challenges-*.png        each flow's screens side by side
assets/trail/
  freedom-trail-map.svg       static map scene (ground, rivers, trail, forest, still props)
  layout.json                 EVERYTHING positional and animated, in 402-wide map space (see below)
  pieces/ pieces-muted/       16 landmark pieces (160×220) + grayed "missed" versions
  pieces/06-franklin-kite-string.svg, 06-franklin-kite-body.svg   Franklin's kite as two animated layers
  wind/                       gust-1…4.svg (the four gust paths) + the three leaf shapes
  ui/                         done-badge.svg, done-glow.svg, sparkle.svg
  scenery/                    fall icon library (trees, leaves, ducks, boats incl. swan boat…)
  icons/                      flow icons: rat, walk, stroller, wheelchair, livestream, ticket, signpost, burrow, droppings, trash-open, bus, pin
```

> **Re-rasterize the map tiles.** `freedom-trail-map.svg` changed again: the side labels are gone, so this week's scenery is back in its original spots. Regenerate `assets/images/trail/map-*.webp` from it.

## layout.json, key by key
| Key | What it is |
|---|---|
| `weeks[].stops[]` | `file`, `name`, `state` (cur/done/missed), `x`, `y` (middle of the piece's top face) |
| `labels[]` | this week's nameplates: `left/top/w/h` (centered under each piece) + `title`, `due`, `reward`, `challenge`. Styling in `labelsAbout` |
| `cards[]` | past-week cards ("Week 5 · 4 of 5 done") |
| `rivers[]` | `boats[]` (svg, size, anchor, polyline `path`, `dur`, `delay`), `bridge` (svg group + center/angle/length), `ripples` |
| `props[]`, `falls[]` | animated scenery and falling-leaf sources; animation recipes in `motion.props` / `motion.falls` |
| `wind` | **gust path data**: for each gust `d` (SVG path), `length`, `points` ([x, y, angle] × 61 along the path), `dashArray`, `lineKeyframes` (animate `strokeDashoffset` + opacity), `riderKeyframes` (ready-to-use translate/rotate/opacity keyframes for leaves riding the gust, ease already baked in → play **linear**), `every`/`delay`. Plus `riders`, `drift`, `driftKeyframes` |
| `kite` | Franklin's kite: layer files, `pivot` (statue's hand) and `bodyCenter`, sway/tilt keyframes |
| `doneStop` | finished-stop glow, badge, sparkles, pop |
| `motion` | hover/shadow for current stops, prop keyframes, falls, ripples (calmer pass) |

## Trail rules
- Each Monday 4–5 new stops appear at the top, under the forest. The trail runs bottom → top; the soonest deadline is lowest.
- Doing 1 challenge a week keeps the streak. A river and an angled bridge separate weeks; past weeks get a week card.
- Stop states: **current** (piece gently expanding in place + nameplate, both tappable), **done** (full color, warm glow, teal check with a gold ring, two slow twinkles; nameplate turns to "Done · +70 earned"), **missed** (grayed piece, no badge, no nameplate).
- This week: Copp's Hill → urban wild, Old North → $2M ballot, Paul Revere House → Cummins walk audit, Faneuil Hall → rat patrol, Boston Massacre Site → Council meeting.

## Nameplates (why they exist)
On their own the landmarks didn't read as challenges, and side labels looked detached. Each current stop now has a nameplate centered under it that overlaps the front of its tile, so piece and name read as one object. It holds the challenge icon (the floating chip on the piece is gone), the title, and a small leaf with **+70** and the due date. The teal border and bottom lip mark it as tappable; it opens the same sheet as the stop. The nameplate stays still while the piece pulses.

## Tea leaves
Doc points ×10 so a vote can be small. Time (under 15 min 10 · 15–30 20 · 30–45 30 · 45–60 40 · 60+ 50) + in person 20 + city asked 10 + proof checked 10. Votes +2, max 10 a week.
This week: Council 80 (60 livestream) · Cummins 80 · urban wild 70 · $2M 40 · rat patrol 40 (30 on report, 10 at the day-7 check-in).

## Motion (calmer pass; everything off with Reduce Motion)
| Element | Motion |
|---|---|
| Current stop | expands and contracts in place: scale 1 → 1.07 → 1, 2.8 s ease-in-out, origin at the front of the tile (50% 88%), stagger 0.7 s. No up-and-down float |
| Done stop | pop 0.6 → 1.12 → 1 (0.5 s); twinkles 4 s |
| Wind gusts | fixed to the screen. 4 paths, a 150-long dash sweeps along each in 3.2 s; every 16, 22, 27, 34 s (uneven on purpose). 3 leaves ride each gust. Data: `layout.wind` |
| Drifting leaves | 2 leaves, 21 s and 26 s across |
| Falling leaves | half as many; falls in the first third of a 16–22 s cycle, then rests |
| Trees, hay, leaf piles | one rustle per 14 s, offset by position |
| Ducks / squirrel / cattails | a short waddle every 7 s · two hops every 9 s · sway ±2.5° over 6 s |
| Boats | unchanged: rowing shells 17/23 s, sailboat 34 s, duck family 48 s, swan boat 30 s |
| Water marks | half as many, 7 s |
| Franklin's kite | layers in the piece's 160×220 frame. String + body sway around the statue's hand (−5° → 4° → −2° → 6°, 5.5 s); the body also tilts ±8° (2.3 s) |

## Placeholders to replace
Dates on the "what happens next" timelines, distances to urban wilds, the sample notes/ballot/ticket number, "Safer crossings near schools ($300K)" (added so the streets rule can be met), the two unnamed Cummins crossings, and every number in the digest. The urban wild's last step now asks **"Why these changes?"** instead of "Who is this space for?".
