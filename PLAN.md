# Genesis Map: Plan

A living 3D globe that follows Genesis 1:1 to 8:14, from "In the beginning" to the ark at rest in the mountains of Ararat. It shows exactly what the text says and labels everything else. The goal is a demo credible enough to pitch to BibleProject.

Research brief (sources, verse table, reasoning): https://claude.ai/artifact/EV4dMECyuznxJE5SdSwQiW

## Principles

1. **The Bible is the first source of truth.** Respected biblical scholars are second. Reconstructions from outside the text are third.
2. **Every feature carries a tier.** Nothing is drawn without one.
   - `text`: stated in Genesis. Solid styling, verse always visible.
   - `scholarly`: a named scholar's reading. Dashed styling, scholar named on the card.
   - `model`: a reconstruction from outside the text. Translucent, "Model" badge, off by default.
3. **Guesses are called guesses.** A placement with no research behind it says "Location unknown. Shown here for illustration only."
4. **Alternatives sit side by side**, with reasons for and against. Never one location as fact.
5. **A "text only" switch** hides tiers 2 and 3. The map must still be worth watching with it on.
6. **Chronology is data.** Masoretic count by default (flood in year 1656), Septuagint as a toggle (2262), both labeled as textual traditions.
7. **Motion is smooth.** Ease between keyframes and glide toward the target each frame. Never re-aim or clamp per frame.

## Scope

In: Genesis 1:1 to 8:14. The demo ends zoomed in on the ark on dry ground, with the continents in today's positions.
Out: everything from Genesis 8:15 on; embedded BibleProject videos (later, embed only).

## Scenes

Defined in `src/data/scenes.ts` (19 scenes). In short:

- **Opening, days 1 and 2:** plain three.js, viewed from the water surface. No globe yet.
- **Day 3:** land appears and the camera rises until the horizon curves into the Mapbox globe. This handoff is the hinge of the piece.
- **Days 4 to 7, Eden, exile, Cain, Seth's line, Nephilim, ark:** on the globe.
- **Flood:** follows the verse dates (day 1, 151, 225, 315, 371).
- **Ending, four shots:** the ark grounds in open water (8:4); peaks appear (8:5-12); pull back as the earth dries and today's continents show (8:13-14); return to the ark on Ararat and stop.

## Stack

Vite, React 18, TypeScript strict, Mapbox GL JS 3 (globe projection), three.js. Mapbox token from `VITE_MAPBOX_TOKEN`, never committed. Terrain tooling: QGIS, GDAL, rio-rgbify, tippecanoe, GPlates. Tiles on Mapbox first, Cloudflare R2 as fallback.

## Milestones

| | Milestone | Done when |
| --- | --- | --- |
| M0 | Setup and globe test | App builds and deploys; data check passes; we know whether three.js custom layers work on the Mapbox globe on an iPhone |
| M1 | Days 1 to 3 | Water, light, expanse in three.js; seamless handoff to the globe; steady 30+ fps on iPhone |
| M2 | Pre-flood land | Model layer with Clarey and Werner as default, Rodinia and Pannotia toggle, "no data" regions faint; permissions on file |
| M3 | App shell and scene engine | Scroll and play through scenes; tier styling; info cards; "text only" switch |
| M4 | Days 4 to 7 | Lights, sea and sky, land life, rest |
| M5 | Eden to the ark | Scenes `eden` through `ark`, with all alternatives shown |
| M6 | Flood and ending | Flood calendar, breakup, the four ending shots |
| M7 | Polish and launch | Source review complete; outside reader has checked the verse table; pitch demo ready |

## M0 result (passed 2026-11-23)

Tested on a MacBook Pro in Chrome and on an iPhone in Safari.

- **three.js custom layers work on the Mapbox globe.** We stay on Mapbox.
- **How it works** (from Mapbox's source, `src/render/draw_custom.ts`): on globe, the layer gets the mercator matrix plus a globe-to-mercator matrix. The camera is `matrix x globeToMercator`, with globe coordinates on a sphere of radius `8192 / (2 * PI)`, y pointing south. See `src/spike/globeLayerTest.ts`.
- **Hiding the far side:** clip against the horizon plane Mapbox passes as the eighth argument (`globeClippingPlane`), with depth testing off.
- **A separate three.js canvas crossfades into the globe smoothly**, on desktop and phone.
- **Frame rate:** 120 fps on the MacBook for both the globe and the water. Phone confirmed working; exact frame rate not recorded.
- **Base style is `mapbox/standard`.** Classic satellite tiles (`mapbox.satellite`) return HTTP 429 on this Mapbox account. Ask Mapbox support why before the ending shots, which want satellite imagery.

Still open from M0:

- Depth testing against the globe hid the test rings on the near side. Layers that must be hidden by terrain (not only by the globe's curve) need this understood before M2.
- Between zoom 5 and 6 Mapbox blends the globe into flat mercator. The test layer does not handle that blend yet.

## Open items

- Written permission from Christopher Scotese (PALEOMAP) and from ICR (Clarey and Werner map) before M2.
- Read and cite by page every source marked `to-read` in `src/data/sources.ts`.
- Check approximate coordinates in `src/data/features.ts` against a gazetteer.
- KJV or World English Bible for on-screen verses.
- Find out whether and how BibleProject accepts outside pitches.
- Find a seminary-trained reader to review the verse table.
