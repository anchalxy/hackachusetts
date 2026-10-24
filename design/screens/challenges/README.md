# Challenges tab: the Freedom Trail

Mockups for the Challenges tab and this week's five challenge flows (week of Oct 26, from `exampleChallenges.md`). PNGs are 2× references. The live, clickable prototype is the "Challenges tab" board in the Tea Party design canvas.

## Files
```
screens/challenges/
  0-trail.png                 Challenges tab, top of the trail (this week)
  0b-trail-after-a-stop.png   same, after finishing Old North (check, +40, "Streak safe")
  trail-full-map.png          the whole scroll: this week, Week 5 (5 stops), Week 4 (4 stops)
  urban-wild/  spend-2-million/  cummins-walk-audit/  rat-patrol/  council-meeting/
                              0-sheet = detail sheet after tapping the stop, then each step
  tea-leaf-scale.png          scoring rules and this week's values
  digest-cummins-mock.png     what Public Works receives (mock data)
flows/challenges-*.png        each flow's screens side by side
assets/trail/
  freedom-trail-map.svg       static map scene (ground, rivers, trail, forest, still props)
  layout.json                 stop positions, rivers, bridges, boats and animated props for overlays
  pieces/ pieces-muted/       16 landmark pieces (160×220) + grayed "missed" versions
  scenery/                    fall icon library (trees, leaves, ducks, boats incl. swan boat…)
  icons/                      flow icons: rat, walk, stroller, wheelchair, livestream, ticket, signpost, burrow, droppings, trash-open, bus, pin
```

## Trail rules
- Each Monday 4–5 new stops appear at the top, under the forest. The trail runs bottom → top; the soonest deadline is lowest.
- Doing 1 challenge a week keeps the streak. A river and an angled bridge separate weeks; past weeks get a week card ("Week 5 · 4 of 5 done").
- Stop states: **current** (breathing piece + floating icon chip, tappable), **done** (full color, warm glow, teal check with a gold ring, two twinkles), **missed** (grayed piece, no badge).
- This week: Copp's Hill → urban wild, Old North → $2M ballot, Paul Revere House → Cummins walk audit, Faneuil Hall → rat patrol, Boston Massacre Site → Council meeting.

## Tea leaves
Doc points ×10 so a vote can be small. Time (under 15 min 10 · 15–30 20 · 30–45 30 · 45–60 40 · 60+ 50) + in person 20 + city asked 10 + proof checked 10. Votes +2, max 10 a week.
This week: Council 80 (60 livestream) · Cummins 80 · urban wild 70 · $2M 40 · rat patrol 40 (30 on report, 10 at the day-7 check-in).

## Motion (all loop; turn off with Reduce Motion)
| Element | Motion |
|---|---|
| Current piece | scale 1 → 1.04 → 1, 3.2 s ease-in-out, origin at the base, staggered 0.8 s |
| Icon chip | translateY 0 → −7 px → 0, 3.2 s, same stagger |
| Done stop | pop in 0.6 → 1.12 → 1 (0.5 s); twinkles scale 0.4 → 1, 2.6 s |
| Wind gusts | 4 swirl paths, dash of 150/900 sweeps across in 3.2 s; repeat every 16, 21, 27, 33 s (uneven on purpose). 5 leaves ride each path (offset-path, rotate with it) |
| Drifting leaves | 4 leaves cross the screen in 17–23 s with spin or flip |
| Falling leaves | from grouping trees, fall ~50 px with sway, 9–14 s cycles |
| Trees, hay, leaf piles | short rustle (±1.5–2.5°) twice per 10 s |
| Ducks / squirrel / cattails | waddle 1.3 s · hop twice every 5 s · sway ±4°, 3.8 s |
| Boats | follow each river's curve: rowing shells 17 s / 23 s, sailboat 34 s, duck family 48 s; swan boat goes back and forth on the pond, 30 s. Bridges sit above the boats. |
| Water marks | small white waves drift +22 px and fade, 4.6 s |
| Franklin's kite | sways ±5° around the statue's hand (5.5 s) and tilts ±8° (2.3 s); animated inside `pieces/06-franklin-latin-school.svg` |

## Placeholders to replace
Dates on the "what happens next" timelines, distances to urban wilds, the sample notes/ballot/ticket number, "Safer crossings near schools ($300K)" (added so the streets rule can be met), the two unnamed Cummins crossings, and every number in the digest.
