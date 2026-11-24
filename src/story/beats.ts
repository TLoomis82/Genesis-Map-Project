import { spaceSteps } from "../opening/spaceSteps.ts";
import { arrange, type Sky } from "../data/astronomy.ts";
import type { LifeWant } from "./lifeLayer.ts";
import { floodDay, floodEvents } from "../data/chronology.ts";
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
  /** The sun and moon drawn in their true places for this beat. Left out: neither is drawn. */
  sky?: Sky;
  /** The land's cover: bare for the dry land of 1:9-10, growing at the grass and trees of 1:11. Left out: green. */
  growth?: "bare" | "growing";
  /** What is alive on the globe: flocks, shoals, whales, herds, humankind. Left out: nothing drawn. */
  life?: LifeWant;
  /**
   * The same verse seen on today's map, for the parts of the story that have places people point to today
   * (the proposed sites of Eden, the way east). The story itself stays on the land before the flood; the
   * viewer can switch to this view and back.
   */
  today?: GlobeCamera;
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
  sky?: Sky;
  growth?: "bare" | "growing";
  life?: LifeWant;
  today?: GlobeCamera;
}

// Life on the globe, by verse. The numbers only set how full the picture is.
const lifeOf = (flocks: number, shoals: number, whales: number, herd = 0, people = false, calm = false): LifeWant => ({ flocks, shoals, whales, herds: [herd, herd, herd], people, calm });
const greening: Depiction = {
  badge: "Illustration",
  note: "The green spreading over the land, where it starts and how fast, are illustration. The text says the earth brought forth grass, herb and fruit tree on the third day.",
};
const living: Depiction = {
  badge: "Illustration",
  note: "The flocks, shoals, whales and herds are illustration, and far from to scale: seen from here, each would be the size of a country. The text gives the kinds and their realms, not places or numbers.",
};
const atRest: Depiction = {
  badge: "Illustration",
  note: "All that the six days made, shown together and slowed. The text says God rested on the seventh day, blessed it and sanctified it.",
};

// From Eden to the ark the story is still before the flood, so it stays on the land before the flood. No
// place on that land can be pinned: the pins are present-day positions and are shown only on today's map.
const beforeFlood: Depiction = {
  badge: "Model",
  note: "Shown on a model of the land before the flood, where no place can be pinned. \"Where is this today?\" switches to today's map and the places people have proposed.",
};
const stillBeforeFlood: Depiction = {
  badge: "Model",
  note: "Still before the flood, so still on the model of that land. The land is a model, not from the text.",
};

// Day 4. One arrangement the sun and moon can really take (see src/data/astronomy.ts); the text gives no
// date, so which arrangement is illustration. The sun is at the March equinox and the moon is a little
// short of full. Each beat is the same sky at a different hour, so the earth has turned:
//   1:14  night over the land; the view pulls back and the sun stands just clear of the earth's edge
//   1:16  day over the land; the moon stands just clear of the earth's edge, nearly full
//   1:18  the view closes in again on the land, half in day and half in night
// The view pulls back for the first two so that there is room beside the earth on a phone as well.
/** How far the moon is round from the sun in the story's arrangement, in degrees (180 would be full). */
export const MOON_ROUND = 172;
/** The story's sky at any hour (which longitude faces the sun) and any day of the moon's month. */
export const skyWith = (subsolarLng: number, moonRound = MOON_ROUND): Sky => arrange({ sunLongitude: 0, elongation: moonRound, node: 208, subsolarLng });
const skyAt = (subsolarLng: number): Sky => skyWith(subsolarLng);

const landAppears: Depiction = {
  badge: "Model",
  note: "The land is a model, not from the text. How the waters drew back, and the look of the land as it came up, are illustration.",
};
const lightsSet: Depiction = {
  badge: "Model",
  note: "The sun and moon are drawn where they would really be for this view, at their true distances and sizes, so they are small (NASA fact sheets). The text gives no date: this arrangement, the sun's glare and the stars are illustration.",
  source: "nasa-factsheets",
};

// The ark's track: it starts where the flood view starts, is carried east with the camera, and comes to
// rest in the mountains of Ararat. Only the resting is from the text.
const arkAt = (lng: number, lat: number, afloat = true): ArkPlace => ({ at: [lng, lat], afloat });

const globePlan: PlanBeat[] = [
  // Day 3 and day 4. The globe is first seen under water, as the opening left it; then the land comes up.
  { sceneId: "day-3", verse: "1:9", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 5 }, hold: 12, land: PRE_FLOOD, flood: { level: 1400, storm: 0 }, relief: 8, stars: 0, growth: "bare", depiction: landAppears },
  { sceneId: "day-3", verse: "1:10", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 5, driftDegrees: 30 }, hold: 13, land: PRE_FLOOD, flood: { level: 0, storm: 0 }, relief: 8, stars: 0, growth: "bare", depiction: landAppears },
  { sceneId: "day-3", verse: "1:11", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 5 }, hold: 16, land: PRE_FLOOD, relief: 8, stars: 0, growth: "growing", depiction: greening },
  { sceneId: "day-3", verse: "1:12", camera: { center: PRE_FLOOD_VIEW, zoom: 2.1, seconds: 8, driftDegrees: 25 }, hold: 13, land: PRE_FLOOD, relief: 8, stars: 0, growth: "growing", depiction: greening },
  { sceneId: "day-4", verse: "1:14", camera: { center: PRE_FLOOD_VIEW, zoom: 0.4, seconds: 8 }, hold: 14, land: PRE_FLOOD, depiction: lightsSet, sky: skyAt(PRE_FLOOD_VIEW[0] + 185) },
  { sceneId: "day-4", verse: "1:16", camera: { center: PRE_FLOOD_VIEW, zoom: 0.4, seconds: 6 }, hold: 15, land: PRE_FLOOD, depiction: lightsSet, sky: skyAt(PRE_FLOOD_VIEW[0] + 3) },
  { sceneId: "day-4", verse: "1:18", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 6 }, hold: 14, land: PRE_FLOOD, depiction: lightsSet, sky: skyAt(PRE_FLOOD_VIEW[0] - 85) },
  { sceneId: "day-5", verse: "1:20", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 5 }, hold: 14, land: PRE_FLOOD, depiction: living, life: lifeOf(8, 10, 0) },
  { sceneId: "day-5", verse: "1:21", camera: { center: [PRE_FLOOD_VIEW[0] + 40, PRE_FLOOD_VIEW[1]], zoom: 1.6, seconds: 8 }, hold: 14, land: PRE_FLOOD, depiction: living, life: lifeOf(8, 10, 5) },
  { sceneId: "day-5", verse: "1:22", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 8 }, hold: 14, land: PRE_FLOOD, depiction: living, life: lifeOf(20, 26, 6) },
  { sceneId: "day-6", verse: "1:24", camera: { center: PRE_FLOOD_VIEW, zoom: 1.9, seconds: 8 }, hold: 15, land: PRE_FLOOD, depiction: living, life: lifeOf(14, 18, 4, 7) },
  { sceneId: "day-6", verse: "1:27", camera: { center: PRE_FLOOD_VIEW, zoom: 1.9, seconds: 6 }, hold: 15, land: PRE_FLOOD, depiction: living, life: lifeOf(14, 18, 4, 8, true) },
  { sceneId: "day-7", verse: "2:1", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 8 }, hold: 12, land: PRE_FLOOD, depiction: atRest, life: lifeOf(14, 18, 4, 8, true, true) },
  { sceneId: "day-7", verse: "2:2", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 8, driftDegrees: 120 }, hold: 30, land: PRE_FLOOD, depiction: atRest, life: lifeOf(14, 18, 4, 8, true, true) },
  { sceneId: "eden", verse: "2:10", camera: { center: PRE_FLOOD_VIEW, zoom: 2.6, seconds: 9 }, hold: 20, land: PRE_FLOOD, depiction: beforeFlood, today: { center: edenFrame, zoom: 4.3, seconds: 6 } },
  { sceneId: "exile", verse: "3:24", camera: { center: PRE_FLOOD_VIEW, zoom: 2.6, bearing: -8, seconds: 6 }, land: PRE_FLOOD, depiction: beforeFlood, today: { center: edenFrame, zoom: 4.3, bearing: -8, seconds: 6 } },
  { sceneId: "cain", verse: "4:16", camera: { center: [PRE_FLOOD_VIEW[0] + 14, PRE_FLOOD_VIEW[1]], zoom: 2.4, seconds: 9 }, land: PRE_FLOOD, depiction: beforeFlood, today: { center: [edenFrame[0] + 6, edenFrame[1]], zoom: 4.0, seconds: 6 } },
  { sceneId: "seth-to-noah", verse: "5:1", camera: { center: PRE_FLOOD_VIEW, zoom: 1.4, seconds: 9, driftDegrees: 40 }, land: PRE_FLOOD, depiction: stillBeforeFlood },
  { sceneId: "nephilim", verse: "6:4", camera: { center: PRE_FLOOD_VIEW, zoom: 1.8, bearing: 6, seconds: 6 }, land: PRE_FLOOD, depiction: stillBeforeFlood },
  { sceneId: "ark", verse: "6:15", camera: { center: PRE_FLOOD_VIEW, zoom: 1.8, seconds: 6 }, land: PRE_FLOOD, depiction: stillBeforeFlood },
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
  sky: g.sky,
  growth: g.growth,
  life: g.life,
  today: g.today,
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

// ---------------------------------------------------------------------------------------------
// The flood by day, for the slider. Each key is a verse of the flood with the day it falls on.
// Days with a date in the text come from src/data/chronology.ts; 7:17 is day 40 and 7:24 day 150 by
// the text's own counts. 7:19 and 7:20 have no day: they are set evenly between, which is illustration.

const dayOf = (id: string) => floodDay(floodEvents.find((e) => e.id === id)!.date!);
const FLOOD_DAYS: [string, number][] = [
  ["7:11", dayOf("start")],
  ["7:17", 40],
  ["7:19", 77],
  ["7:20", 113],
  ["7:24", 150],
  ["8:4", dayOf("rested")],
  ["8:5", dayOf("tops-seen")],
  ["8:13", dayOf("waters-dried")],
  ["8:14", dayOf("earth-dry")],
];
export const floodKeys = FLOOD_DAYS.map(([verse, day]) => ({ day, beat: beats.findIndex((b) => b.reference === `Genesis ${verse}` && b.ark !== undefined) })).filter((k) => k.beat >= 0);
export const LAST_FLOOD_DAY = floodKeys[floodKeys.length - 1].day;

/** The flood on a given day: the verse it belongs to, and the water and the ark between that verse and the next. */
export function floodOn(day: number): { beat: number; flood: { level: number; storm: number }; ark: ArkPlace } {
  let i = 0;
  while (i < floodKeys.length - 2 && day >= floodKeys[i + 1].day) i++;
  const a = floodKeys[i];
  const b = floodKeys[i + 1];
  const k = Math.max(0, Math.min(1, (day - a.day) / Math.max(b.day - a.day, 1)));
  const from = beats[a.beat];
  const to = beats[b.beat];
  const f0 = from.flood ?? { level: 0, storm: 0 };
  const f1 = to.flood ?? { level: 0, storm: 0 };
  const p0 = from.ark!;
  const p1 = to.ark!;
  return {
    beat: k >= 1 ? b.beat : a.beat,
    flood: { level: f0.level + (f1.level - f0.level) * k, storm: f0.storm + (f1.storm - f0.storm) * k },
    ark: { at: [p0.at[0] + (p1.at[0] - p0.at[0]) * k, p0.at[1] + (p1.at[1] - p0.at[1]) * k], afloat: k < 1 ? p0.afloat || p1.afloat : p1.afloat },
  };
}
