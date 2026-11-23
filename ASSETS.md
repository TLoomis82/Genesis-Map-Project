# Assets and their licences

Every model, texture or library used for what appears on screen is listed here with its source and licence.
Nothing is added to the project without an entry.

| Asset | Used for | Source | Licence | Notes |
| --- | --- | --- | --- | --- |
| EZ-Tree 1.1.0 (`@dgreenheck/ez-tree`) | Tree and shrub shapes, bark and leaf textures in day 3 | https://github.com/dgreenheck/ez-tree (npm) | MIT, copyright 2024 Daniel Greenheck | The bark and leaf images ship inside the library. Confirm their origin with the author before public launch. |
| three.js | All 3D drawing | https://github.com/mrdoob/three.js (npm) | MIT | |
| Mapbox GL JS | The globe | https://github.com/mapbox/mapbox-gl-js (npm) | Mapbox Terms of Service | Requires a Mapbox account and token. |

## Generated in code (no outside asset)

- Water, sky and vault: shaders in `src/opening/openingScene.ts`.
- Land shape and ground grain: `src/opening/landscape/terrain.ts`.
- Grass blades and flower heads: `src/opening/landscape/grass.ts`.
- Fruit: plain coloured spheres placed among the leaves, `src/opening/landscape/trees.ts`.
