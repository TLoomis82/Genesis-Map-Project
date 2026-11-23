import type { Scene } from './types.ts';

// Scene order for the first demo: creation week through the ark at rest (Gen 1:1 to 8:14).
// Days 1 and 2 run in plain three.js from the water surface. Day 3 hands off to the globe.

export const scenes: Scene[] = [
  { id: 'before', title: 'In the beginning', verses: ['Gen 1:1-2'], shows: 'Black, then dark restless water to every horizon. Wind over the water.', renderer: 'three', tier: 'text', features: ['deep'] },
  { id: 'day-1', title: 'Day 1: Light', verses: ['Gen 1:3-5'], shows: 'Light breaks without a sun. It fades and returns once: evening and morning.', renderer: 'three', tier: 'text', features: ['deep'] },
  { id: 'day-2', title: 'Day 2: The expanse', verses: ['Gen 1:6-8'], shows: 'The haze above the water lifts and opens into sky.', renderer: 'three', tier: 'text', features: ['deep', 'firmament'] },
  { id: 'day-3', title: 'Day 3: Land and plants', verses: ['Gen 1:9-13'], shows: 'Water draws back, rock breaks the surface, land greens. The camera rises until the horizon curves into the globe.', renderer: 'handoff', tier: 'model', features: ['dry-land', 'land-clarey-werner'] },
  { id: 'day-4', title: 'Day 4: Lights', verses: ['Gen 1:14-19'], shows: 'Sun, moon and stars appear. The first day and night line crosses the globe.', renderer: 'mapbox', tier: 'model', features: ['dry-land', 'land-clarey-werner'] },
  { id: 'day-5', title: 'Day 5: Sea and sky', verses: ['Gen 1:20-23'], shows: 'Movement in the seas and flocks in the sky.', renderer: 'mapbox', tier: 'model', features: ['dry-land', 'land-clarey-werner'] },
  { id: 'day-6', title: 'Day 6: Animals and humankind', verses: ['Gen 1:24-31'], shows: 'The camera descends to the land. Animals, then humankind.', renderer: 'mapbox', tier: 'model', features: ['dry-land', 'land-clarey-werner'] },
  { id: 'day-7', title: 'Day 7: Rest', verses: ['Gen 2:1-3'], shows: 'Stillness. One slow full rotation with no cuts.', renderer: 'mapbox', tier: 'model', features: ['dry-land', 'land-clarey-werner'] },

  { id: 'eden', title: 'Eden', verses: ['Gen 2:8-14'], shows: 'One river parting into four. Four readings of where Eden was, side by side.', renderer: 'mapbox', tier: 'scholarly', features: ['eden-river', 'four-rivers', 'eden-north', 'eden-south', 'eden-lost', 'eden-sacred'] },
  { id: 'exile', title: 'Fall and exile', verses: ['Gen 3:23-24'], shows: 'The way out, eastward. A guarded entrance.', renderer: 'mapbox', tier: 'text', features: ['garden-east-gate'] },
  { id: 'cain', title: 'Cain, Nod and the city', verses: ['Gen 4:16-17'], shows: 'An arrow east from Eden that fades out. A city marked as illustration.', renderer: 'mapbox', tier: 'text', features: ['nod', 'city-enoch'] },
  { id: 'seth-to-noah', title: "Seth's line to Noah", verses: ['Gen 5:1-32'], shows: 'Ten generations as overlapping lifespans on the timeline.', renderer: 'mapbox', tier: 'text', features: [] },
  { id: 'nephilim', title: 'The Nephilim', verses: ['Gen 6:1-4'], shows: 'The passage, with both main readings on the card.', renderer: 'mapbox', tier: 'scholarly', features: [] },
  { id: 'ark', title: 'The ark', verses: ['Gen 6:14-22'], shows: 'The ark at scale: 300 by 50 by 30 cubits. No building site is shown.', renderer: 'mapbox', tier: 'text', features: [] },

  { id: 'flood', title: 'The flood', verses: ['Gen 7:11-24'], shows: 'Water from below and above on the same day. It rises over the highest land.', renderer: 'mapbox', tier: 'model', features: ['land-clarey-werner', 'breakup'] },
  { id: 'end-grounding', title: 'The ark rests', verses: ['Gen 8:1-4'], shows: 'Wind over the water. The ark settles onto something unseen, open water all around.', renderer: 'mapbox', tier: 'text', features: ['ararat-region'] },
  { id: 'end-receding', title: 'The waters recede', verses: ['Gen 8:5-12'], shows: 'Time-lapse by the verse dates. Peaks, then ridgelines, break the surface around the ark.', renderer: 'mapbox', tier: 'text', features: ['ararat-region'] },
  { id: 'end-pullback', title: 'The earth dries', verses: ['Gen 8:13-14'], shows: "The camera rises to the globe as the water drains. Today's continents appear, already apart.", renderer: 'mapbox', tier: 'model', features: ['breakup'] },
  { id: 'end-return', title: 'The ark on Ararat', verses: ['Gen 8:4', 'Gen 8:14'], shows: 'A slow descent back to the mountains of Ararat and in to the ark on dry ground. Hold, then stop.', renderer: 'mapbox', tier: 'scholarly', features: ['ararat-region', 'ark-resting-place', 'ararat-agri', 'ararat-cudi'] },
];
