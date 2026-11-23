# Genesis Map

Genesis 1:1 to 8:14 on a living globe, from "In the beginning" to the ark at rest in the mountains of Ararat. The map shows what the text says and labels everything else as a scholar's reading or a model.

See `PLAN.md` for the plan and `CLAUDE.md` for project rules.

## Run it

```sh
npm install
cp .env.example .env.local   # then set VITE_MAPBOX_TOKEN to your Mapbox public token
npm run dev
```

## Check the data

```sh
npm run check:data
```

This fails if any feature is missing a tier, a verse or a source, and prints the chronology and flood calendar worked out from the verse dates. Needs Node 22.18 or newer.
