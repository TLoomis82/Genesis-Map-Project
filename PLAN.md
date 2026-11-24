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
| M3 | App shell and scene engine | Scroll and play through scenes; tier styling; info cards; "text only" switch; each scene has a slot for an explore mode (see M8) |
| M4 | Days 4 to 7 | Lights, sea and sky, land life, rest |
| M5 | Eden to the ark | Scenes `eden` through `ark`, with all alternatives shown |
| M6 | Flood and ending | Flood calendar, breakup, the four ending shots |
| M7 | Polish and launch | Source review complete; outside reader has checked the verse table; pitch demo ready |
| M8 | Explore mode for the creation days | Each of days 1 to 3 can be played with as well as watched, on mouse and touch, at a steady 30+ fps on iPhone |

## M8: explore mode (idea agreed 2026-11-23, to build after the other milestones)

Every creation day becomes something to play with, not only to watch, so the piece can carry a lesson. The verse-by-verse story stays the default; each day gets an "explore" button.

| Day | What the visitor can do | Size | Notes |
| --- | --- | --- | --- |
| 1, the deep (1:2) | Swipe across the water and it sloshes | Moderate | Needs a ripple simulation that reacts to the pointer; today's water is fixed wave patterns |
| 1, light and dark (1:4-5) | Drag to move around the divided light and darkness | Easy | The divided sky already has an angle; tie it to the drag |
| 2, the firmament (1:6-8) | Look down below the water and up to the top of the vault | Moderate | Needs an underwater view and free up-and-down look |
| 3, the land (1:9-13) | Fly into the land to see the grass and trees up close | Moderate | The flight exists; let the visitor steer or scrub it and look around |

Each day opens from an overview framed like the globe view, but with no sphere before the text gives one: a boundless water surface seen from above. The hard part is one continuous dive from that overview down to the trees.

Rough size: 25 to 40 hours.

To settle before building:

- **Who the visitor is in the scene.** The visitor explores what the verse describes; they do not do what the text says God did. Moving your view around the divided light is fine. A swipe that stirs the waters needs careful wording, since 1:2 says the Spirit of God moved on the waters. BibleProject may be sensitive to this.
- **Touch as well as mouse**, and the extra load of a ripple simulation on phones.
- **Later days** (4 to 6) could get explore modes too; not designed yet.

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

## M1 status and day 3 direction (2026-11-23)

Done and reviewed on screen: Genesis 1:1-8 (darkness, light, divided light, evening and morning, the vault). Thirteen verse steps exist in `src/opening/steps.ts`.

Day 3 (1:9-13) first pass was rejected as generic: a noise island with a green colour wash. New direction, agreed:

- **Live 3D, as realistic as it can be made in the browser.** A film clip could replace the growth sequence later.
- **A drone flight:** the camera skims low over the land along a curved path, through valleys, not hovering in front of an island.
- **Real growth:** individual grass blades sprouting ahead of the camera, and trees rising from the ground, leafing and bearing fruit (apples, peaches, lemons and so on).
- **Labels:** the land's shape, the choice of fruits and the speed of growth are illustration. The text says the earth brought forth grass, herbs and fruit trees bearing fruit within the third day (1:11-12); it names no fruits and gives no speed.
- **Light without a sun.** Light has existed since day 1 (1:3) but the sun is not made until day 4, so the scene is lit with a direction but shows no sun disc.
- **Assets must be free-licensed** and recorded in `ASSETS.md` with their source and license.

Second pass built the same day (`src/opening/landscape/`): a coast and winding valley, a fixed flight route with banking, grass drawn blade by blade in stretches near the view, flower heads, shrubs, and fruit trees (EZ-Tree shapes) that rise, leaf and fruit. Growth runs ahead of the view in layers: the ground greens far ahead, distant trees rise early, and grass and the trees beside the route rise close in. Checked in still screenshots only; motion and frame rate still need judging on the Mac and iPhone. Desktop draws about 2.3 to 2.6 million triangles a frame in the growth scenes; phones get fewer blades and trees and have not been measured.

Day 4 first pass (Gen 1:14-19), same day: the view rises at the head of the valley and turns to look back to the sea. A sun, moon and stars are drawn in the sky shader and move with an "hour" value; the land's light follows them (warm at sunset, cool by moonlight). The rise and fade to the globe now happens at the end of day 4, not day 3. Far-off trees are drawn more simply to keep the cost down. Checked in stills only.

Still to do on day 3: judge the growth in motion; more natural ground (stones, better textures); shadows; the coast view at 1:10; leftover ripple patterns on the water near the shore; check frame rate on the iPhone and tune counts.

Working method from here: the workspace can now install packages, type check, build and take its own screenshots (software rendering, about 2 fps, so frame rates are still measured on the Mac and iPhone).

## Open items

- Licences, checked 2026-11-23:
  - **Scotese and Wright PaleoDEMs: CC BY 4.0** (Zenodo record 5460860). Free to use with credit; no permission needed. The record covers the last 540 million years: check that the Rodinia and Pannotia shapes we want are in it.
  - **This repo is public on GitHub.** Anything waiting on permission lives only in `private/` (ignored by git) and loads only on a local machine.
  - **Clarey and Werner map: no licence found.** ICR's use policy says graphics need permission (permissions@icr.org). Ask before the map is shown outside private testing.
- Read and cite by page every source marked `to-read` in `src/data/sources.ts`.
- Check approximate coordinates in `src/data/features.ts` against a gazetteer.
- KJV or World English Bible for on-screen verses. (KJV for now, read from `src/data/kjv.ts`; spot-check against a printed KJV.)
- Find out whether and how BibleProject accepts outside pitches.
- Find a seminary-trained reader to review the verse table.

## Day 4 direction (2026-11-23)

Day 4 is built around the lights as timekeepers: a large sun rising in the middle of the view, tree shadows
swinging (larger screens only), sunset into a large moon and thick stars, the moon running through its phases
while the stars wheel and leave trails, then a year passing with the sunrise sliding along the horizon and the
land changing colour.

- The time of year is one value (`seasonOf(year)` in `src/opening/openingScene.ts`). **Planned: season tabs**
  (spring, summer, autumn, winter) that set this value directly, as part of M8 explore mode.
- "Seasons" in 1:14 is shown under a "Scholarly reading" note (Rudolph, Tyndale Bulletin 2003: the word can be
  translated "festivals"). No snow or bare trees are shown: the text does not describe them.
- Mapbox cannot tilt its camera above the horizon, so the sky scenes stay in the three.js engine. From M3, day 3's
  valley moves onto the Mapbox globe as a custom layer so everything from day 3 on is one world.

## M3 status (2026-11-23)

Built, first pass (`src/story/`):

- **One story, one list of beats** (`beats.ts`): the 19 opening verses, then one beat per globe scene (33 in all).
  Play, Back/Next, arrow keys, the chapter list and the progress bar work the same across both.
- **One globe** (`GlobeStage.tsx`) under the opening canvas, kept for the rest of the story. Each globe beat is a
  single eased camera move. Camera centres come from `approxCenter` in `features.ts`, never typed in.
- **Tier styling**: solid = text, dashed = scholarly reading, dotted = model, on badges, chips and pins.
- **Info cards** (`InfoCard.tsx`): tier, verses, note, confidence line, reasons for and against, other readings,
  sources with "not yet read first-hand" or "permission not yet given" where that is the case.
- **"Text only" switch**: hides every feature above tier `text`.
- **Explore slot** (`explore.ts`): add a component under a scene id and the scene gets an Explore button.
- **Verses** now come from a KJV file (`src/data/kjv.ts`) instead of being typed in.

Still to do in M3:

- Check the globe half on a real device (the build machine has no Mapbox access): camera moves, pins, the fade.
- Move day 3's valley onto the globe as a custom layer. Needs a test on a real device, like M0, and a decision:
  any spot on today's globe is an `illustration` placement until the pre-flood land (M2) exists.
- Scrolling as a way to move through the story (now: buttons, keys, chapter list).
- More than one beat per globe scene.

## M2 status (2026-11-23)

- `scripts/paleodem-to-geojson.ts` turns one Scotese and Wright PaleoDEM text file into land strips in three height
  bands (tested on a made-up grid only; the real files have not been seen yet).
- Tyler supplied the 0 to 85 million year files. The converter works on them. `?land=085` or `?land=000` draws one over the globe as a test of the method (no scene uses it). These later slices can serve the breakup in the ending.
- Files for 0 to 285 million years are now in hand (kept outside the repo; only converted land goes in `public/land/`). `?land=200` and `?land=250` show the Pangaea-like shapes.
- Some source files use old-Mac line endings; the converter handles all three kinds.
- Blocked on data: the build machine cannot download from Zenodo. Needed from Tyler: the PaleoDEM csv zip
  (Zenodo record 5460860) and, for private use only, the Clarey and Werner 2018 paper PDF.
- Other pre-flood maps, checked 2026-11-23: flood geologists hold three views, a Pangaea-like land (Clarey and
  Werner; Baumgardner 2018), a Rodinia-like land (Snelling 2014), or Rodinia changing to Pangaea mid-flood.
  None comes from the text itself, so all stay tier `model`. The plan's default plus toggle already covers them.

## Clarey and Werner 2018, read first-hand (2026-11-23)

- The paper is copyright Creation Science Fellowship; the pre-flood map (Figure 8, p. 359) is marked
  "(c) 2017 Institute for Creation Research. Used by permission." So ICR owns the map and must be asked.
- Figure 8 shows three zones (shallow sea, lowland, upland) for North America, South America and Africa only, in a
  Pangaea-like fit, with question marks where the authors are unsure. It has no latitude or longitude.
- On Eden the paper proposes no location: it says the garden's position "will likely never be known" (p. 370).
  Added as support for the `eden-lost` reading.
- Next: trace the three zones (colour separation works) and fit them onto the Scotese 200 Ma land so both models
  share one globe. The fit is ours, not the authors', and must be labelled so. Traced files stay in `private/`.
- **2023 paper read too** (Clarey and Werner, Ninth ICC, pp. 412-445, copyright Cedarville University ICC). Its Figure 17
  (p. 426) is a whole-world pre-flood map in four zones (deep sea, shallow sea, lowland, upland), including Europe and
  Asia. The image is exactly twice as wide as tall, so it is read as a plain latitude-longitude grid of the whole globe;
  that reading is ours and is not stated in the paper. It supersedes the 2018 half-world map for our purposes.
- Traced by colour into `public/land/private/clarey-werner-2023.geojson` (ignored by git; sent to Tyler directly).
  `?land=cw` shows it on a local machine only. Ask ICR and Cedarville ICC before it appears anywhere public.

## Land look (2026-11-23)

- Land models are now one smooth, shaded picture draped over the globe (`scripts/land-texture.py`, Mapbox image
  source), not blocks. Scotese pictures use the real heights in the data. The Clarey and Werner picture has no
  heights to use: its zones are theirs, the surface texture is made up, and its on-screen note says so.
- Not yet checked on a real Mapbox globe: whether the picture wraps cleanly at the date line and what shows at
  the poles (a picture cannot reach past 85 degrees).
- Next for looks: real 3D relief from a height map (illustrative for Clarey and Werner), then our own grass and
  trees where the camera comes down.
- Private material has two guards: it shows only under `npm run dev` with `VITE_SHOW_PRIVATE=1` in `.env.local`,
  and every build deletes `land/private/` from its output (`vite.config.ts`).
- 3D relief added for the Scotese models: Terrain-RGB height tiles (`public/land/dem/`, zoom 0 to 3) and
  `setTerrain`, exaggerated 30 times by default (`&relief=` to change). Pictures now use real sea depths and a
  richer height colour ramp at 4096 px. Untested on a real Mapbox globe.
- Clouds added (`src/story/cloudLayer.ts`): a slow shell of cloud around the globe as a three.js custom layer, using
  the M0 method. Decoration only. Fades out between zoom 3.5 and 4.5. `?clouds=0` switches it off. Tested on a
  stand-in globe; not yet seen on Mapbox. It keeps the map redrawing every frame while shown: check phone speed.
- Confirmed on Tyler's Mac (2026-11-23): draped land, clouds and readout all run at 120 fps. The clouds needed
  both faces drawn, because Mapbox's globe coordinates mirror the sphere.
- Sky layer now also draws cloud shadows (not on phones) and a day and night side. Whole-globe views are sized
  to the screen and lifted clear of the verse. Not yet seen on Mapbox.
- Fine data (2026-11-23): Tyler supplied the PALEOMAP 6-minute netCDF files (ten times finer). `land-texture.py`
  reads them directly (the grid is one plain block of 32-bit numbers; no netCDF library needed). Today and 85 Ma
  are remade from them, with height tiles to zoom 4. 200 and 250 Ma follow when their files arrive.
- All five test ages (0, 85, 200, 250, 540 Ma) are now built from the 6-minute files; height tiles kept to zoom 3
  (about 6.5 MB in all). The full set of 109 fine files is in hand outside the repo.
- Tyler also supplied the PALEOMAP atlas index. It lists maps older than the height files reach: 560 to 600 Ma
  (the time of Pannotia) and 750 to 1000 Ma (the time of Rodinia). Those exist as atlas maps, not height files,
  so a Rodinia or Pannotia option would need the atlas package (`PALEOMAP_PaleoAtlases.zip` on EarthByte).

## Land wired into the story (2026-11-23)

- Each globe beat names its land (`land` in `src/story/beats.ts`). Creation week from day 5 and the flood use the
  Pangaea-like model (Scotese and Wright, 200 Ma file); Eden to the ark and the ending use today's map, because
  their pins are present-day positions and the story ends in today's world.
- The opening now hands over to the model land (the globe is prepared before the fade).
- New feature `land-drawn-pangaea` ("The land drawn here", confidence `illustration`) says plainly that the drawn
  land is a stand-in and whose model it is. An on-screen "Model" note repeats it.
- `?land=` is now only an override for checks (`none` for today's map everywhere).
- Still to do: a soft change between lands (it switches at once now), and the breakup from 200 Ma to today in the flood.
- Close views of a land model were blurry (the data stops at about 11 km). Now: a double-size picture of the 200 Ma
  land for larger screens, a little made-up surface roughness on land (said so on the card), and the camera cannot
  come closer than zoom 4.4 while a model is shown. Truly close views are for our own 3D landscape.

## The flood from space (2026-11-23)

- The sky layer (`src/story/cloudLayer.ts`) now also draws the flood: water over every part of the land below the
  current level, read from a height picture of the land model (`public/land/height/`, made by
  `land-texture.py height`). Level and storm glide to the values each beat sets.
- Beats: 7:11, 7:17, 7:19, 7:20 (water rises over the pre-flood model until all is covered), 7:24 (all covered; the
  land underneath is swapped to today's arrangement, labelled as the plate-tectonics model), 8:1, 8:4 (still covered,
  camera moves toward the Ararat region), 8:5 (peaks show), 8:13 (water gone), 8:14 (today's real map).
- The text supplies the dates and "all the high hills were covered". The water levels (250 to 7,000 m), the land's
  heights and the breakup are illustrative or model, and each beat says so.
- Tested on a stand-in globe only. Not yet seen on Mapbox. The story is now 41 beats.
- Still to do: the close views (ark afloat, ark at rest, peaks around it), a soft change from the model of today's
  land to the real map at 8:14, and showing the breakup itself for those who want to see the model.

## Durupinar (2026-11-23)

- On the day of this note a team announced radiocarbon dates of 2400 to 2200 BC for charred wood from the
  Durupinar formation. Added as a third candidate resting place (`ararat-durupinar`, card only, no pin) with reasons
  for and against. It is a press announcement, not a published result: revisit when a paper or independent review
  appears. The ending still shows the region the text names, not a single site.
- To do: a checked position for the formation before it can have a pin; read Collins and Fasold (1996) first-hand.

## Direction change (agreed 2026-11-23): the Bible's own cosmos is the hub

- Read `STORYBOARD.md` next to this plan. It now leads.
- The main stage is the world as Genesis pictures it (deep, land, vault, waters above, a garden on a height). The
  viewer turns it, taps a part, and the view moves into that event: watch once, then one touch control.
- The realistic globe with its land models becomes the second layer, "Where on earth?". Nothing built is dropped:
  the flood layer, clouds, land engine, cards and pins all carry over.
- Reason: BibleProject's own lens is the ancient cosmos and the story's literary design, not flood geology. Leading
  with a Pangaea-like land could put them off.
- People are figures of light; God is never drawn as a figure.
- Open decisions are listed at the end of the storyboard (the fall, narration, art direction).
- The storyboard is interactive and is the app's front door (`src/board/`): the hub picture with twelve rings, a
  move-in on tap, a card per scene (verse from the KJV file, narration, watch, touch, labels) and a button into the
  playable story where a scene exists. `?view=story` or `?debug` opens the story directly.
- Direction update (late 2026-11-23): the detailed globe is the hub and stays realistic; every event scene, and the
  creation days before the globe exists, are hand-drawn "on the fly" and interactive. See the top of `STORYBOARD.md`.

## Overnight work, 2026-11-23 to 24 (Tyler away; feedback due in the morning)

Done and pushed:
- `src/illustrated/kit.tsx`: shared parts for hand-drawn scenes (moment clock, view framing, lines that draw themselves
  in, verse plate, moment strip).
- `src/illustrated/Waters.tsx`: the beginning, day 1 and day 2, hand-drawn on the fly and live (swipe the water; drag the
  sky to turn light and dark on day 1, or to lift the vault on day 2). Open directly with `?view=scene&scene=day-2`.
- `src/illustrated/EdenMan.tsx`: figure given a human shape; scenery draws itself in.
- The storyboard cards for these four scenes open the hand-drawn versions.

Not done, in order:
1. The front door. It is still the illustrated picture of the cosmos; per the latest direction it should be the
   detailed globe with tap targets. Needs Mapbox, so it needs Tyler's eyes.
2. The handoff from the sketched creation days to the detailed globe.
3. Days 3 and 4 hand-drawn (they exist only in the earlier realistic style, under `?view=story`).
4. Eden 2 to 6, east of Eden, the generations: storyboard only.
5. Seen only as stills in a test browser: motion, the boil, sloshing under a real finger, and phone speed are unchecked.

## 2026-11-24

- Tyler's feedback: the sloshing is right. The drawing-in is now blank paper, pencil sketch, ink, then colour brushed
  in, with no pencil or brush pictured.
- Days 3 and 4 are hand-drawn and live (`src/illustrated/Land.tsx`), with season tabs on day 4. Creation days 1 to 4 and
  the man from the dust now all exist in the hand-drawn style; the earlier realistic versions remain under `?view=story`.
- Interaction labels: every hand-drawn scene now says on the drawing what can be touched (`Hints` in
  `src/illustrated/kit.tsx`). A tag clears once the viewer has done it; "Show tips" brings them back. The moment
  strip and the season tabs carry standing labels. Rule for new scenes: no interaction without a label.
- Day 5 and day 6 built hand-drawn and live (`src/illustrated/Creatures.tsx`). Checked as stills and with scripted
  drags and taps in headless Chromium, desktop and phone size. Not yet checked: frame rate on a real iPhone.
- Day 7, Eden 2 to 6, east of Eden (`src/illustrated/Eden.tsx`) and the generations
  (`src/illustrated/Generations.tsx`) built hand-drawn and live, each with labelled interactions. Every chapter
  before the flood now opens as a hand-drawn scene from the hub. Checked as stills and with scripted taps and
  drags, desktop and phone size; not yet on a real iPhone.
- The ark (`src/illustrated/Ark.tsx`): built to the text's numbers, then a hand-off button to the globe at 7:11.
  On the globe the ark is one marker (`ark` on each flood beat in `src/story/beats.ts`, drawn by `GlobeStage`) that
  glides to its place for each beat and rests at the Ararat region's centre from 8:4 on. Feature `ark-afloat`
  carries the note. The globe half is written but NOT seen running: no Mapbox here. Tyler to check on his Mac.
- Front door on the detailed globe (`src/board/StoryBoard.tsx`, rings drawn by `GlobeStage` from `at`/`side` on each
  target in `src/board/board.ts`). With a Mapbox token the hub's frame holds the live globe: tap a ring and the
  camera eases in and the scene card opens; "Whole world" eases back out. No token, or `?hub=flat`: the flat
  picture as before. Rings for the days of creation and the flood are placed for layout only and the header says
  so. NOT seen running (no Mapbox here): ring spacing, label overlap and phone layout need Tyler's check.
- Timeline under the hub (`src/board/Timeline.tsx`), after the one on tylerloomis.com: four eras, a block per part of
  the story, a cell per scene; tap a block and the globe goes to its ring, tap a ring and its block lights; "Play
  the story" walks the scenes; a slider scrubs. Blocks are sized by scene, not time; real spans are labels and only
  where the text gives them (Eden: "Length not given"; Adam to the flood from the Genesis 5 data, Hebrew or Greek).
  With the flood open, a second track true to scale by day; tapping a day opens the globe story at that verse.
  On a phone the scene list is hidden and the timeline takes its place.
- The way on from each hand-drawn scene (`NextScene` context and `NextButton` in `src/illustrated/kit.tsx`, set in
  `src/App.tsx`): when a scene has played through, a button leads to the next scene in story order, so the story
  can be walked from "In the beginning" to the ark without going back to the hub.
- Creation to globe: day 7's button is "See the finished world". The drawing swells and fades to its paper, and the
  front door fades in from that paper, with the detailed globe when a Mapbox token is set. Seen working here only
  with the flat hub; the fade onto the live globe is NOT seen.
- Direction change (afternoon, 2026-11-24), see the top of STORYBOARD.md: the globe story is the main line and the
  front door; the hand-drawn scenes are drill-ins from gold dots that show only on their own part of the story.
  New: `src/opening/spaceOpening.ts` and `spaceSteps.ts` (1:1-8 from far off, swipeable water); day 3 and day 4
  beats on the globe (`flood` level falls from over-all to 0 so the land comes up; `stars` 0 until day 4);
  `drills` on every beat; `onDrill` returns to the same verse. The old ground-level opening
  (`src/opening/openingScene.ts`, `landscape/`, the steps in `steps.ts`) is no longer used by the story; kept for
  now, to delete once Tyler has seen the new one. Opening seen running here (software rendering, so no real frame
  rate); the globe half (land coming up, stars, dots on the globe) NOT seen.
- Day 4 on the globe: the sun and moon in their true places (`src/data/astronomy.ts`, numbers from the NASA NSSDC
  fact sheets, source `nasa-factsheets`). The sky layer projects them at true distance and size and reports where
  they fall on screen; `GlobeStage` draws them there (sun disc, moon disc with its phase; the glare and name tags
  are added). The light on the globe comes from the same sun. Three beats, one real arrangement (sun at the March
  equinox, moon a little short of full) at three hours: 1:14 sun at the earth's edge, 1:16 moon at the edge, 1:18
  half day and half night. The text gives no date, so the arrangement is labelled illustration. At true size both
  are about half a degree across, so they are small. Maths checked against a known camera; NOT seen on Mapbox.
  Sun and moon are drawn only on the day 4 beats for now.
- Hands on the main line (every one labelled on screen):
  - the deep: swipe the waters; day 1: drag sideways to carry the light round; day 2: drag up to lift the sky off
    the waters (`mode` in `src/opening/spaceOpening.ts`). Seen working here.
  - day 3: slider "Draw the waters back"; day 4: sliders "Turn the earth under the sun" and "Move the moon through
    its month"; the flood: slider "Day N of the flood" from day 1 to 371, which sets the verse and moves the water
    and the ark between verses (`floodOn` in `src/story/beats.ts`; days 77 and 113 for 7:19 and 7:20 are
    illustration, the rest are the text's). The sliders are seen here; their effect on the globe is NOT.
  - Still to do from the list: tap for life on days 5 and 6; drag the water down at Ararat (the flood slider
    already covers it); hold for wind on the deep.
- Day 3 land is bare until the grass: `public/land/scotese-200ma-bare.jpg` (the green picture recoloured to bare
  earth, same relief and seas) lies over the green one for 1:9-10 and fades away over six seconds at 1:11.
- Handover from the firmament to the globe, reworked after Tyler said it looked off. Three causes found by reading
  the code: the waiting globe was not yet at the size and place of its first verse, so it moved during the fade
  (now it waits already there); the waters were sized by a formula that came out smaller than the real globe (now
  the sky layer measures the globe's outline on screen and the waters ease onto it); and the waters ended bright
  blue and half lit where the globe is navy and fully lit (now the last verse of day 2 turns the light to the near
  side and the water takes the globe's sea colour). NOT seen on Mapbox.
- Timeline under the story (`src/story/StoryTimeline.tsx`): one strip along the bottom with the four eras and a
  block per part, each filling as its verses play; tap a block to go there. It replaces the thin progress bar and
  the Chapters menu. The globe and the opening now stop above the strip, so the Mapbox logo and credits stay in
  view. The globe also loads from the first verse now, so the opening can sit on its measured outline throughout.
- Eden to the ark now stays on the land before the flood (Tyler: "isn't this the new earth"). Today's map came back
  too early. The pins for the proposed sites of Eden and the way east are present-day places, so they show only on
  today's map, behind a switch on those verses: "Where is this today?" / "Back to the land before the flood". The
  world changes to today's arrangement only at 7:24, in the flood, as before.
- Drill-in dots are laid out on the screen as a ring round the middle of the view and then pinned to the globe once
  the camera rests, names on the outside, so six dots (Eden) do not cover each other or the pins.
- Still on the detailed globe, by design: the flood and the ark at rest.
- Next: Tyler's feedback on all chapters; then the front door on the detailed globe and the handoff to it.
