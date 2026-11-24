import { openingSteps, type Depiction } from "../opening/steps.ts";
import { kjv } from "../data/kjv.ts";
import { scenes } from "../data/scenes.ts";
import { features } from "../data/features.ts";
import type { LngLat } from "../data/types.ts";

// The whole story as one list of beats, in order. A beat is one verse on screen.
//   - The opening beats (Genesis 1:1-19) are drawn by the three.js opening scene.
//   - The globe beats (from day 5 on) are a camera position on the Mapbox globe.
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
  /** Index into openingSteps, for beats drawn by the opening scene. */
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
}

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
}

// The ark's track: it starts where the flood view starts, is carried east with the camera, and comes to
// rest in the mountains of Ararat. Only the resting is from the text.
const arkAt = (lng: number, lat: number, afloat = true): ArkPlace => ({ at: [lng, lat], afloat });

const globePlan: PlanBeat[] = [
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

const openingBeats: Beat[] = openingSteps.map((s, i) => ({
  sceneId: s.sceneId,
  reference: s.reference,
  text: s.text,
  hold: s.hold,
  depiction: s.depiction,
  openingStep: i,
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
}));

export const beats: Beat[] = [...openingBeats, ...globeBeats];

/** Index of the first beat of each scene, in scene order. Scenes with no beat are left out. */
export const chapters = scenes
  .map((scene) => ({ scene, first: beats.findIndex((b) => b.sceneId === scene.id) }))
  .filter((c) => c.first >= 0);

export const FIRST_GLOBE_BEAT = openingBeats.length;
