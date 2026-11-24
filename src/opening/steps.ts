import { kjv } from "../data/kjv.ts";
import { SURFACE, VAULT_CLOSED, VAULT_OPEN, type OpeningEvents, type OpeningTargets } from "./openingScene.ts";

// The opening, one verse at a time. Each step names the scene it belongs to in
// src/data/scenes.ts, the verse shown on screen, and the state the scene glides to.
// Verse text is the King James Version (public domain), read from src/data/kjv.ts.

/** Says plainly how a verse has been pictured, when the picture goes beyond the words. */
export interface Depiction {
  /** Short label shown in a badge, e.g. "Scholarly reading". Omit for a plain note. */
  badge?: string;
  note: string;
  /** Source id from src/data/sources.ts, when the picture follows a named source. */
  source?: string;
}

export interface OpeningStep extends OpeningEvents {
  sceneId: "before" | "day-1" | "day-2" | "day-3" | "day-4";
  reference: string;
  text: string;
  targets: OpeningTargets;
  /** Seconds to hold before auto-advancing when playing. */
  hold: number;
  /** Seconds after the step starts at which the scene fades away to show the globe. */
  fadeToGlobeAfter?: number;
  depiction?: Depiction;
}

const divided: Depiction = {
  note: "Light and darkness are pictured as two halves of the sky. The text does not say how they were divided.",
};

const vault: Depiction = {
  badge: "Scholarly reading",
  note: "Pictured as a vault with water beyond it, the way the ancient world saw the sky (BibleProject, Ancient Cosmology).",
  source: "bibleproject-cosmology",
};

const landShape: Depiction = {
  badge: "Illustration",
  note: "The shape of the land is illustrative. The text does not describe it.",
};

const growth: Depiction = {
  badge: "Illustration",
  note: "The land, the kinds of fruit and the speed of growth are illustrative. The text says the earth brought them forth on the third day.",
};

const lights: Depiction = {
  badge: "Illustration",
  note: "The paths and sizes of the sun, moon and stars and the speed of time are illustrative. The text says they were set in the firmament to rule the day and the night.",
};

const calendar: Depiction = {
  badge: "Scholarly reading",
  note: "A year is pictured by the sunrise moving along the horizon and the land changing colour. The word for 'seasons' in Genesis 1:14 can also be translated 'festivals' (Rudolph, Tyndale Bulletin, 2003). Summer and winter are first named in Genesis 8:22.",
  source: "rudolph-festivals",
};

const globeView: Depiction = {
  badge: "Model",
  note: "The globe is a modern view of the same land and seas. The land shown is a model of a single pre-flood land, not from the text.",
};

// Day 2 ends with the vault open and the view tilted up. Day 3 brings the view back down.
const openSky = { light: 1, haze: 0, divide: 0, vault: VAULT_OPEN } as const;

// From the end of day 3: the land risen and green, the view at the head of the valley.
// On day 4 the view rises a little and turns to look back down the valley to the sea.
const grownLand = { ...openSky, wind: 0.7, ...SURFACE, land: 1, green: 1, flight: 1, turn: Math.PI, altitude: 30 } as const;

export const openingSteps: OpeningStep[] = [
  {
    sceneId: "before",
    reference: "Genesis 1:1",
    text: kjv("1:1"),
    targets: { light: 0, haze: 1, wind: 0.6, divide: 0, vault: VAULT_CLOSED, ...SURFACE },
    hold: 6,
  },
  {
    sceneId: "before",
    reference: "Genesis 1:2",
    text: kjv("1:2"),
    targets: { light: 0.07, haze: 0.9, wind: 1.3, divide: 0, vault: VAULT_CLOSED, ...SURFACE },
    hold: 11,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:3",
    text: kjv("1:3"),
    targets: { light: 1, haze: 0.85, wind: 1, divide: 0, vault: VAULT_CLOSED, ...SURFACE },
    hold: 10,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:4",
    text: kjv("1:4"),
    targets: { light: 1, haze: 0.85, wind: 0.95, divide: 1, vault: VAULT_CLOSED, ...SURFACE },
    hold: 10,
    depiction: divided,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:5",
    text: kjv("1:5"),
    targets: { light: 1, haze: 0.85, wind: 0.9, divide: 1, vault: VAULT_CLOSED, ...SURFACE },
    hold: 14,
    sweepSeconds: 10,
    depiction: divided,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:6",
    text: kjv("1:6"),
    targets: { light: 1, haze: 0.5, wind: 0.9, divide: 0, vault: 0.3, ...SURFACE, gaze: -4 },
    hold: 10,
    depiction: vault,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:7",
    text: kjv("1:7"),
    targets: { ...openSky, haze: 0.05, wind: 0.85, ...SURFACE, gaze: 16 },
    hold: 12,
    depiction: vault,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:8",
    text: kjv("1:8"),
    targets: { ...openSky, wind: 0.7, ...SURFACE, gaze: 16 },
    hold: 16,
    duskSeconds: 12,
    depiction: vault,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:9",
    text: kjv("1:9"),
    targets: { ...openSky, wind: 0.8, ...SURFACE, land: 1, flight: 0.05, gaze: -5 },
    hold: 18,
    depiction: landShape,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:10",
    text: kjv("1:10"),
    targets: { ...openSky, wind: 0.7, ...SURFACE, land: 1, flight: 0.145, gaze: -24 },
    hold: 16,
    depiction: landShape,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:11",
    text: kjv("1:11"),
    targets: { ...openSky, wind: 0.8, ...SURFACE, land: 1, green: 1, flight: 0.6, gaze: -14 },
    hold: 26,
    depiction: growth,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:12",
    text: kjv("1:12"),
    targets: { ...openSky, wind: 0.8, ...SURFACE, land: 1, green: 1, flight: 0.8, gaze: -14 },
    hold: 12,
    depiction: growth,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:13",
    text: kjv("1:13"),
    targets: { ...openSky, wind: 0.6, ...SURFACE, land: 1, green: 1, flight: 1, gaze: -12 },
    hold: 14,
    duskSeconds: 11,
    depiction: growth,
  },

  // Day 4. The view rests above the head of the valley, looking back over the land to the sea.
  {
    sceneId: "day-4",
    reference: "Genesis 1:14",
    text: kjv("1:14"),
    targets: { ...grownLand, sun: 1, hour: 7.3, gaze: 16 },
    hold: 13,
    depiction: lights,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:15",
    text: kjv("1:15"),
    targets: { ...grownLand, sun: 1, hour: 13.2, gaze: -16 },
    hold: 12,
    depiction: lights,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:16",
    text: kjv("1:16"),
    targets: { ...grownLand, sun: 1, hour: 21.6, gaze: 22 },
    hold: 15,
    depiction: lights,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:17",
    text: kjv("1:17"),
    targets: { ...grownLand, sun: 1, hour: 24, month: 1, gaze: 26 },
    hold: 14,
    depiction: lights,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:18",
    text: kjv("1:18"),
    targets: { ...grownLand, sun: 1, hour: 31.3, month: 1, year: 1, gaze: 4 },
    hold: 19,
    depiction: calendar,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:19",
    text: kjv("1:19"),
    targets: { ...grownLand, sun: 1, hour: 35, month: 1, year: 1, gaze: -10 },
    hold: 28,
    ascendAfter: 8,
    fadeToGlobeAfter: 12,
    depiction: globeView,
  },
];
