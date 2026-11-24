# Genesis Map: project instructions

Read `PLAN.md` and `STORYBOARD.md` before any work. The storyboard decides what each scene shows.

## Content rules

- The Bible is the first source of truth, respected biblical scholars second, outside reconstructions third.
- Nothing is drawn unless it is a `MapFeature` in `src/data/features.ts` with a tier, verses and a one-sentence note.
- Tier `scholarly` and `model` features must cite a source id from `src/data/sources.ts`.
- Never present a speculative location as fact. Show alternatives with reasons for and against.
- A placement with no research behind it uses confidence `illustration` and says so on its card.
- Do not add facts from memory. A new claim needs a verse or a source that has been read first-hand.
- On-screen Bible text comes from a public-domain translation (KJV or WEB).
- Run `npm run check:data` after any change to `src/data`. It must pass.

## Code rules

- Vite, React 18, TypeScript strict, Mapbox GL JS 3 globe, three.js.
- Mapbox token comes from `VITE_MAPBOX_TOKEN`. Never commit a token.
- Camera motion: ease between keyframes and glide toward the target each frame. Never re-aim or clamp per frame.
- Scenes are made by changing layers, lighting, sea level, terrain and camera on a live globe, not by showing images.
- Test phone layout and performance. Target: steady 30+ fps on an iPhone.

## Working rules

- Commit and push only when asked.
  - Standing permission from Tyler (2026-11-23): on branch `m0-setup`, commit and push after each finished step without asking. Never push private material; never push to `main` unasked.
- Show results with screenshots where possible.
- Keep explanations short and plain; lead with the answer.
