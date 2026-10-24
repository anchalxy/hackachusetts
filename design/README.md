# Tea Party: design handoff

Everything a developer (or another Claude) needs to build the app UI. Read `DESIGN.md` for the rules and the reasoning behind them; use this README to find files.

## Folder map
```
design/
  DESIGN.md              ← design system + every screen decision (start here)
  tokens/
    tokens.json          ← colors, type, spacing, radii, status colors, tab bar, motion timings
    theme.ts             ← same tokens as a TypeScript object (import into React Native / web)
  assets/                ← ship these in the app
    icons/               ← 24-unit SVG icons (Leafy style), e.g. flag.svg, camera.svg, pothole.svg
    icons-muted/         ← inactive-tab versions (flag, camera, flame, calendar, ballot, teacup)
    mascots/             ← leafy.svg (currency), revere-*.svg (report flow), flag-311-planted-*.svg
    rewards/             ← crate-fill-0/25/50/75/100.svg, crate-closed.svg, paul-standing-lift/throw/cheer.svg, ship-beaver.svg, fish-*.svg, sun.svg, cloud.svg
    avatars/             ← ishaan-photo.jpg (real photo, preferred), illustrated fallbacks (dana, ishaan, colonist)
    fonts/               ← Bricolage Grotesque 700/800 + DM Sans 400–700 (.ttf, SIL Open Font License)
  screens/               ← full-screen mockups: .svg (drag into Figma, layers named) + .png (reference)
    profile/  menu/  report/  submit/  rewards/
  flows/                 ← submit-flow.png, report-navigation.png, rewards-flow.png
  animations/            ← sent-revere-gallop.gif, crate-reward.gif (reference), revere-gallop-loop.svg
  sheets/                ← icon-library and paul-revere overview sheets
```

## Which format to use where
| Need | Use |
|---|---|
| Icons, mascots, illustrated avatars in the app | **SVG** from `assets/`. React Native: `react-native-svg` + `react-native-svg-transformer` (import as components). iOS/SwiftUI: add to the Asset Catalog with "Preserve Vector Data". Web: `<img src>` or inline. |
| Colors, type, spacing, status styles | `tokens/theme.ts` (or `tokens.json`). Don't hard-code hex values. |
| Building a screen | Look at `screens/**.png`, read the matching section in `DESIGN.md`, and build it with real components. The screen SVGs are mockups for Figma, **not** for shipping (map, photos and text are placeholders). |
| Editing the design | Drag `screens/**.svg` into Figma. Install the two fonts first. |
| The success animation | Build it in code from `mascots/revere-flag-gallop-a.svg` / `-b.svg` (swap every 120ms while moving left→right over ~3.3s with ease-in-out and a ±3px bob), then `flag-311-planted-a/b.svg` (pop 0→1.15→1, wave, hold 1s, lower into the ground over 0.8s). Timings are in `tokens.json → motion`. The GIF is just for reference. |

No HTML is needed: every element is either a native component (built from tokens) or an SVG asset. If you'd like, the same SVGs can later be converted to a Lottie file for smoother animation.

## Notes
- **Map:** Apple Maps (MapKit), muted standard style, POIs hidden. Our pins are custom annotations (photo in a status-colored ring + status dot).
- **Report lifecycle:** Submitted → In review → Approved → Fixed (+ Not approved). The colors and glyphs are in `tokens.json → color.status`.
- **Submit flow states:** see `flows/submit-flow.png`. AI rejections have two screens: **2b** photo unclear (retake) and **2d** not a city issue (no retake). Errors and timeouts go to **2c**.
- **Faces:** only Leafy and people get faces. No colored rings around photos (rings mean "tappable/story").
