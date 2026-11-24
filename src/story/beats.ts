import { spaceSteps } from "../opening/spaceSteps.ts";
import type { Depiction } from "../opening/steps.ts";
import { kjv } from "../data/kjv.ts";
import { scenes } from "../data/scenes.ts";
import { features } from "../data/features.ts";
import type { LngLat } from "../data/types.ts";

// The whole story as one list of beats, in order. A beat is one verse on screen.
//   - The opening beats (Genesis 1:1-8) are drawn from far off by src/opening/spaceOpening.ts.
//   - The globe beats (from day 3 on) are a camera position on the Mapbox globe.
// The player moves through this one list, so play, scrub and the chapter list work the same
// way across both.

/** Where the globe camera rests for a beat. Mapbox eases to it; nothing is re-aimed per frame. */
export interface GlobeCamera {
  center: LngLat;
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** Seconds the move takes. */
  seconds: number;
  /** After arriving, drift this many degrees of longitude east over the rest of the hold. */
  driftDegrees?: number;
}

/** A land model that can be draped over the globe: a file pair made by scripts/land-texture.py. */
export type LandId = "000" | "085" | "200" | "250" | "540";

export interface Beat {
  sceneId: string;
  /** e.g. "Genesis 1:14" */
  reference: string;
  text: string;
  /** Seconds to hold before auto-advancing when playing. */
  hold: number;
  depiction?: Depiction;
  /** Index into spaceSteps, for beats drawn by the opening seen from space. */
  openingStep?: number;
  /** Camera on the globe, for beats shown on the globe. */
  camera?: GlobeCamera;
  /** The land model draped over the globe for this beat. Left out: today's map. */
  land?: LandId;
  /** The flood for this beat: water level in metres above the old sea level, and how stormy the sky is (0..1). */
  flood?: { level: number; storm: number };
  /** How many times taller than life the land stands. Left out: the usual amount. */
  relief?: number;
  /** Where the ark is drawn on the globe for this beat, and whether the water carries it. */
  ark?: ArkPlace;
  /** How bright the stars are behind the globe, 0 to 1. None before day 4. Left out: the usual amount. */
  stars?: number;
  /** Hand-drawn scenes that can be opened from this beat: the dots that say there is more to see here. */
  drills: Drill[];
}

/** A hand-drawn scene that can be opened from a beat. */
export interface Drill {
  /** The scene's id in src/illustrated (and in the address: ?view=scene&scene=...). */
  scene: string;
  label: string;
}

// Which hand-drawn scenes belong to which part of the story. The dots for them appear only while that
// part is on screen, so the globe is never covered in dots for things that are not places.
const DRILLS: Record<string, Drill[]> = {
  before: [{ scene: "beginning", label: "In the beginning, drawn" }],
  "day-1": [{ scene: "day-1", label: "Day 1, drawn" }],
  "day-2": [{ scene: "day-2", label: "Day 2, drawn" }],
  "day-3": [{ scene: "day-3", label: "Land and plants, drawn" }],
  "day-4": [{ scene: "day-4", label: "Sun, moon and stars, drawn" }],
  "day-5": [{ scene: "day-5", label: "Sea and sky, drawn" }],
  "day-6": [{ scene: "day-6", label: "Animals and humankind, drawn" }],
  "day-7": [{ scene: "day-7", label: "Rest, drawn" }],
  eden: [
    { scene: "eden-man", label: "The man from the dust" },
    { scene: "eden-garden", label: "The garden" },
    { scene: "eden-river", label: "The river" },
    { scene: "eden-naming", label: "The naming" },
    { scene: "eden-woman", label: "The woman" },
    { scene: "eden-fall", label: "The fall" },
  ],
  exile: [{ scene: "exile", label: "East of Eden, drawn" }],
  "seth-to-noah": [{ scene: "generations", label: "The generations, drawn" }],
  ark: [{ scene: "ark", label: "The ark, built to its measures" }],
};

/** The ark's place on the globe. Only its resting among the mountains of Ararat is from the text (8:4);
 * where it was built and the track it was carried along are not given, and are illustration. */
export interface ArkPlace {
  at: LngLat;
  afloat: boolean;
}

const notBuiltOnModel: Depiction = {
  badge: "Placeholder",
  note: "This scene is not built yet. The verse and the camera position are in place. The land is a model, not from the text: tap \"The land drawn here\".",
};

const floodRising: Depiction = {
  badge: "Model",
  note: "The dates and the covering of the high hills are from the text. How high the water stands at each verse, and the shape and height of the land it covers, are illustrative.",
};

const floodOverAll: Depiction = {
  badge: "Model",
  note: "Under the water the land is redrawn in today's arrangement. That follows catastrophic plate tectonics, a model: the text says nothing about continents moving. Tap \"Continents move apart during the flood\".",
};

const floodFalling: Depiction = {
  badge: "Model",
  note: "The dates are from the text. The land that appears is drawn at today's heights and positions, and the water levels are illustrative.",
};

const notBuilt: Depiction = {
  badge: "Placeholder",
  note: "This scene is not built yet. The verse, the camera position and the cards are in place; the globe shows today's continents.",
};

/** Present-day position of a feature, taken from src/data/features.ts (never typed in here). */
function centerOf(id: string): LngLat {
  const c = features.find((f) => f.id === id)?.approxCenter;
  if (!c) throw new Error(`Feature ${id} has no approxCenter`);
  return c;
}
const midpoint = (a: LngLat, b: LngLat): LngLat => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Framing only. These are views of the globe, not claims about where anything happened.
const WHOLE_GLOBE: LngLat = [43.5, 28.0]; // the view of today's globe
const PRE_FLOOD_VIEW: LngLat = [-5, 5]; // faces the middle of the model land (a framing choice only)
const edenFrame = midpoint(centerOf("eden-north"), centerOf("eden-south")); // both proposed sites in view
const ararat = centerOf("ararat-region");

/** One beat per globe scene for now: its first verse and a resting camera. */
// Creation week and the flood are shown on the model of a single pre-flood land. Eden to the ark, and
// the ending, are shown on today's map: their pins are present-day positions, and the story ends in
// today's world.
const PRE_FLOOD: LandId = "200";

// Water levels in metres above the old sea level. The pre-flood model's highest land is about 3,300 m and
// today's is far higher, so COVERED stands above both. These numbers only drive the picture.
const COVERED = 7000;
const TODAY: LandId = "000";
const AFLOAT: LngLat = [-5, 5];
const araratWide: GlobeCamera = { center: ararat, zoom: 2.6, seconds: 8 };

interface PlanBeat {
  sceneId: string;
  verse: string;
  camera: GlobeCamera;
  hold?: number;
  land?: LandId;
  flood?: { level: number; storm: number };
  relief?: number;
  depiction?: Depiction;
  ark?: ArkPlace;
  stars?: number;
}

const landAppears: Depiction = {
  badge: "Model",
  note: "The land is a model, not from the text. How the waters drew back, and the look of the land as it came up, are illustration.",
};
const lightsSet: Depiction = {
  badge: "Illustration",
  note: "The stars behind the globe and the day and night on it are illustration. The text says the lights were set in the firmament to rule the day and the night.",
};

// The ark's track: it starts where the flood view starts, is carried east with the camera, and comes to
// rest in the mountains of Ararat. Only the resting is from the text.
const arkAt = (lng: number, lat: number, afloat = true): ArkPlace => ({ at: [lng, lat], afloat });

const globePlan: PlanBeat[] = [
  // Day 3 and day 4. The globe is first seen under water, as the opening left it; then the land comes up.
  { sceneId: "day-3", verse: "1:9", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 5 }, hold: 12, land: PRE_FLOOD, flood: { level: 1400, storm: 0 }, relief: 8, stars: 0, depiction: landAppears },
  { sceneId: "day-3", verse: "1:10", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 5, driftDegrees: 30 }, hold: 13, land: PRE_FLOOD, flood: { level: 0, storm: 0 }, stars: 0, depiction: landAppears },
  { sceneId: "day-3", verse: "1:11", camera: { center: PRE_FLOOD_VIEW, zoom: 2.5, pitch: 30, seconds: 8 }, hold: 13, land: PRE_FLOOD, stars: 0, depiction: landAppears },
  { sceneId: "day-4", verse: "1:14", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 8 }, hold: 13, land: PRE_FLOOD, depiction: lightsSet },
  { sceneId: "day-4", verse: "1:16", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 6, driftDegrees: 60 }, hold: 14, land: PRE_FLOOD, depiction: lightsSet },
  { sceneId: "day-5", verse: "1:20", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 4 }, land: PRE_FLOOD },
  { sceneId: "day-6", verse: "1:24", camera: { center: PRE_FLOOD_VIEW, zoom: 2.4, pitch: 35, seconds: 8 }, land: PRE_FLOOD },
  { sceneId: "day-7", verse: "2:2", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 8, driftDegrees: 120 }, hold: 30, land: PRE_FLOOD },
  { sceneId: "eden", verse: "2:10", camera: { center: edenFrame, zoom: 4.3, seconds: 9 }, hold: 20 },
  { sceneId: "exile", verse: "3:24", camera: { center: edenFrame, zoom: 4.3, bearing: -8, seconds: 6 } },
  { sceneId: "cain", verse: "4:16", camera: { center: [edenFrame[0] + 6, edenFrame[1]], zoom: 4.0, seconds: 9 } },
  { sceneId: "seth-to-noah", verse: "5:1", camera: { center: WHOLE_GLOBE, zoom: 1.8, seconds: 9 } },
  { sceneId: "nephilim", verse: "6:4", camera: { center: WHOLE_GLOBE, zoom: 1.8, bearing: 6, seconds: 6 } },
  { sceneId: "ark", verse: "6:15", camera: { center: WHOLE_GLOBE, zoom: 1.8, seconds: 6 } },
  // The flood, seen from space. The land stands lower than usual here so nothing pokes through the water.
  { sceneId: "flood", verse: "7:11", camera: { center: AFLOAT, zoom: 1.4, seconds: 5 }, hold: 10, land: PRE_FLOOD, flood: { level: 250, storm: 0.7 }, relief: 8, depiction: floodRising, ark: arkAt(AFLOAT[0], AFLOAT[1], false) },
  { sceneId: "flood", verse: "7:17", camera: { center: [AFLOAT[0] + 14, AFLOAT[1]], zoom: 1.4, seconds: 7 }, hold: 8, land: PRE_FLOOD, flood: { level: 1100, storm: 0.7 }, relief: 8, depiction: floodRising, ark: arkAt(AFLOAT[0] + 10, AFLOAT[1] + 2) },
  { sceneId: "flood", verse: "7:19", camera: { center: [AFLOAT[0] + 28, AFLOAT[1]], zoom: 1.4, seconds: 7 }, hold: 8, land: PRE_FLOOD, flood: { level: 2700, storm: 0.6 }, relief: 8, depiction: floodRising, ark: arkAt(AFLOAT[0] + 24, AFLOAT[1] + 6) },
  { sceneId: "flood", verse: "7:20", camera: { center: [AFLOAT[0] + 42, AFLOAT[1]], zoom: 1.4, seconds: 7 }, hold: 8, land: PRE_FLOOD, flood: { level: COVERED, storm: 0.5 }, relief: 0, depiction: floodRising, ark: arkAt(AFLOAT[0] + 38, AFLOAT[1] + 12) },
  { sceneId: "flood", verse: "7:24", camera: { center: [ararat[0] - 40, 20], zoom: 1.4, seconds: 8, driftDegrees: 30 }, hold: 13, land: TODAY, flood: { level: COVERED, storm: 0.35 }, relief: 0, depiction: floodOverAll, ark: arkAt(ararat[0] - 22, ararat[1] - 12) },
  // The ark rests while the water still covers everything; then the mountains show; then the earth dries.
  { sceneId: "end-grounding", verse: "8:1", camera: { center: [ararat[0] - 20, 28], zoom: 1.6, seconds: 7 }, hold: 8, land: TODAY, flood: { level: COVERED, storm: 0.15 }, relief: 0, depiction: floodRising, ark: arkAt(ararat[0] - 7, ararat[1] - 4) },
  { sceneId: "end-grounding", verse: "8:4", camera: araratWide, hold: 10, land: TODAY, flood: { level: 5600, storm: 0.1 }, relief: 0, depiction: floodFalling, ark: arkAt(ararat[0], ararat[1], false) },
  { sceneId: "end-receding", verse: "8:5", camera: { ...araratWide, zoom: 2.2, bearing: 8 }, hold: 11, land: TODAY, flood: { level: 3200, storm: 0.05 }, relief: 8, depiction: floodFalling, ark: arkAt(ararat[0], ararat[1], false) },
  { sceneId: "end-pullback", verse: "8:13", camera: { center: ararat, zoom: 1.5, seconds: 12 }, hold: 18, land: TODAY, flood: { level: 0, storm: 0 }, depiction: floodFalling, ark: arkAt(ararat[0], ararat[1], false) },
  { sceneId: "end-pullback", verse: "8:14", camera: { center: ararat, zoom: 1.5, seconds: 6, driftDegrees: 25 }, hold: 16, ark: arkAt(ararat[0], ararat[1], false) },
  { sceneId: "end-return", verse: "8:4", camera: { center: ararat, zoom: 9, pitch: 66, bearing: -15, seconds: 14 }, hold: 20, ark: arkAt(ararat[0], ararat[1], false) },
];

const openingBeats: Beat[] = spaceSteps.map((s, i) => ({
  sceneId: s.sceneId,
  reference: `Genesis ${s.verse}`,
  text: kjv(s.verse),
  hold: s.hold,
  depiction: s.depiction,
  openingStep: i,
  drills: DRILLS[s.sceneId] ?? [],
}));

const globeBeats: Beat[] = globePlan.map((g) => ({
  sceneId: g.sceneId,
  reference: `Genesis ${g.verse}`,
  text: kjv(g.verse),
  hold: g.hold ?? 14,
  depiction: g.depiction ?? (g.land ? notBuiltOnModel : notBuilt),
  camera: g.camera,
  land: g.land,
  flood: g.flood,
  relief: g.relief,
  ark: g.ark,
  stars: g.stars,
  drills: DRILLS[g.sceneId] ?? [],
}));

/** The water level that stands over all the land: the globe waits under it while the opening plays. */
export const UNDER_WATER = COVERED;

export const beats: Beat[] = [...openingBeats, ...globeBeats];

/** Index of the first beat of each scene, in scene order. Scenes with no beat are left out. */
export const chapters = scenes
  .map((scene) => ({ scene, first: beats.findIndex((b) => b.sceneId === scene.id) }))
  .filter((c) => c.first >= 0);

export const FIRST_GLOBE_BEAT = openingBeats.length;
