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
}

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
const WHOLE_GLOBE: LngLat = [43.5, 28.0]; // the view the opening hands over to
const edenFrame = midpoint(centerOf("eden-north"), centerOf("eden-south")); // both proposed sites in view
const ararat = centerOf("ararat-region");

/** One beat per globe scene for now: its first verse and a resting camera. */
const globePlan: { sceneId: string; verse: string; camera: GlobeCamera; hold?: number }[] = [
  { sceneId: "day-5", verse: "1:20", camera: { center: WHOLE_GLOBE, zoom: 1.4, seconds: 4 } },
  { sceneId: "day-6", verse: "1:24", camera: { center: WHOLE_GLOBE, zoom: 2.4, pitch: 20, seconds: 8 } },
  { sceneId: "day-7", verse: "2:2", camera: { center: WHOLE_GLOBE, zoom: 1.4, seconds: 8, driftDegrees: 120 }, hold: 30 },
  { sceneId: "eden", verse: "2:10", camera: { center: edenFrame, zoom: 4.3, seconds: 9 }, hold: 20 },
  { sceneId: "exile", verse: "3:24", camera: { center: edenFrame, zoom: 4.3, bearing: -8, seconds: 6 } },
  { sceneId: "cain", verse: "4:16", camera: { center: [edenFrame[0] + 6, edenFrame[1]], zoom: 4.0, seconds: 9 } },
  { sceneId: "seth-to-noah", verse: "5:1", camera: { center: WHOLE_GLOBE, zoom: 1.8, seconds: 9 } },
  { sceneId: "nephilim", verse: "6:4", camera: { center: WHOLE_GLOBE, zoom: 1.8, bearing: 6, seconds: 6 } },
  { sceneId: "ark", verse: "6:15", camera: { center: WHOLE_GLOBE, zoom: 1.8, seconds: 6 } },
  { sceneId: "flood", verse: "7:11", camera: { center: WHOLE_GLOBE, zoom: 1.3, seconds: 8, driftDegrees: 60 }, hold: 22 },
  { sceneId: "end-grounding", verse: "8:4", camera: { center: ararat, zoom: 6.2, pitch: 55, seconds: 12 }, hold: 18 },
  { sceneId: "end-receding", verse: "8:5", camera: { center: ararat, zoom: 7.4, pitch: 62, bearing: 20, seconds: 10 }, hold: 16 },
  { sceneId: "end-pullback", verse: "8:13", camera: { center: ararat, zoom: 1.5, seconds: 12 }, hold: 18 },
  { sceneId: "end-return", verse: "8:14", camera: { center: ararat, zoom: 9, pitch: 66, bearing: -15, seconds: 14 }, hold: 20 },
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
  depiction: notBuilt,
  camera: g.camera,
}));

export const beats: Beat[] = [...openingBeats, ...globeBeats];

/** Index of the first beat of each scene, in scene order. Scenes with no beat are left out. */
export const chapters = scenes
  .map((scene) => ({ scene, first: beats.findIndex((b) => b.sceneId === scene.id) }))
  .filter((c) => c.first >= 0);

export const FIRST_GLOBE_BEAT = openingBeats.length;
