# Launch: Paul Revere rides in

There are no accounts yet: the app runs as the seed user (Ishaan), so there's no welcome page with a button. Opening the app is a 2.5 s moment where Paul Revere gallops across the screen with a gust of wind and leaves behind him, then the app settles onto the Challenges tab. It plays on cold starts only.

![frames](../../flows/launch.png)

> DESIGN.md currently says Revere is for the report flow only. This launch (and the app icon) intentionally make him the face of the app; update that line when you next edit DESIGN.md.

## 1 · Native splash (static, shown while JS loads)
Cream `#FCFBF8` with the **Tea Party** wordmark centered. It must match frame 2 exactly so the hand-off is invisible.

`app.json → plugins → expo-splash-screen`:
```json
{ "backgroundColor": "#FCFBF8", "image": "./assets/images/splash-wordmark.png", "imageWidth": 182 }
```
Use `design/assets/launch/splash-wordmark.png` (Bricolage Grotesque 800, ink `#1E2A3A`, transparent, tightly cropped). At `imageWidth: 182` it matches the 40 px wordmark drawn in code.

App icon: `assets/launch/icon.png` (Revere with his lantern on a cream ground, a gust and two leaves; 1024², no alpha). Android adaptive: `android-icon-foreground/background/monochrome.png` (rider kept inside the 66% safe zone). Web: `favicon.png`.

## 2 · The ride (0.15 – 2.05 s)
| t (s) | What happens |
|---|---|
| 0 | Wordmark already showing (Bricolage 800, 40/50, centered on the screen's middle) |
| 0.15 | Revere enters from the left (`revere-lantern-gallop-a/b.svg`, drawn 220 × 170, top at y = 522), crossing to off-screen right in **1.9 s**, `cubic-bezier(.35,0,.6,1)` |
| always | Legs swap every **120 ms** (show frame a, then b) and he bobs ±3 px on the same beat. His own speed lines are hidden: the gust does that job |
| 0.15 | A gust (same style as the trail gusts: soft `#A9BBC8` 7 px under white 3.4 px) is dragged behind him: a 260-long dash sweeping along the path below in 2.2 s with the same easing, so its head stays at his heels and it curls up after he passes |
| 0.17 – 0.53 | 4 leaves ride the same path (0.12 s apart), spinning, fading out at the end |
| 0.45 | "Welcome back, Ishaan" (DM Sans 15, slate) rises 8 px and fades in under the wordmark |

## 3 · Hand-off (1.8 – 2.5 s)
- 1.80: wordmark and greeting fade out (0.3 s).
- 2.05: the cream overlay fades out (0.45 s) onto the Challenges tab, already laid out at the top of the trail.
- 2.50: overlay removed. A tap anywhere skips to the end. With Reduce Motion: hold the splash 300 ms, then cross-fade.

## Paths (402 × 874 frame; scale by screenWidth/402)
- Gust: `M-260 612 C -150 600, -60 624, 40 608 S 200 592, 300 606 c 16 8 6 30 -10 26 c -12 -4 -8 -18 6 -15 C 330 612, 420 600, 520 604` (pathLength 1000, dash 260/2000, offset 260 → −1000)
- Rider: translateX from −240 to 442.
