import { SURFACE, VAULT_CLOSED, VAULT_OPEN, type OpeningEvents, type OpeningTargets } from "./openingScene.ts";

// The opening, one verse at a time. Each step names the scene it belongs to in
// src/data/scenes.ts, the verse shown on screen, and the state the scene glides to.
// Verse text is the King James Version (public domain).
// Open item: check every verse string against a KJV source file before launch.

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
  note: "The paths of the sun, moon and stars and the speed of the day are illustrative. The text says they were set in the firmament to rule the day and the night.",
};

const globeView: Depiction = {
  badge: "Placeholder",
  note: "The globe is a modern view of the same land and seas. The continents shown are today's, standing in until the pre-flood land model is added.",
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
    text: "In the beginning God created the heaven and the earth.",
    targets: { light: 0, haze: 1, wind: 0.6, divide: 0, vault: VAULT_CLOSED, ...SURFACE },
    hold: 6,
  },
  {
    sceneId: "before",
    reference: "Genesis 1:2",
    text: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
    targets: { light: 0.07, haze: 0.9, wind: 1.3, divide: 0, vault: VAULT_CLOSED, ...SURFACE },
    hold: 11,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:3",
    text: "And God said, Let there be light: and there was light.",
    targets: { light: 1, haze: 0.85, wind: 1, divide: 0, vault: VAULT_CLOSED, ...SURFACE },
    hold: 10,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:4",
    text: "And God saw the light, that it was good: and God divided the light from the darkness.",
    targets: { light: 1, haze: 0.85, wind: 0.95, divide: 1, vault: VAULT_CLOSED, ...SURFACE },
    hold: 10,
    depiction: divided,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:5",
    text: "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.",
    targets: { light: 1, haze: 0.85, wind: 0.9, divide: 1, vault: VAULT_CLOSED, ...SURFACE },
    hold: 14,
    sweepSeconds: 10,
    depiction: divided,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:6",
    text: "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.",
    targets: { light: 1, haze: 0.5, wind: 0.9, divide: 0, vault: 0.3, ...SURFACE, gaze: -4 },
    hold: 10,
    depiction: vault,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:7",
    text: "And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so.",
    targets: { ...openSky, haze: 0.05, wind: 0.85, ...SURFACE, gaze: 16 },
    hold: 12,
    depiction: vault,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:8",
    text: "And God called the firmament Heaven. And the evening and the morning were the second day.",
    targets: { ...openSky, wind: 0.7, ...SURFACE, gaze: 16 },
    hold: 16,
    duskSeconds: 12,
    depiction: vault,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:9",
    text: "And God said, Let the waters under the heaven be gathered together unto one place, and let the dry land appear: and it was so.",
    targets: { ...openSky, wind: 0.8, ...SURFACE, land: 1, flight: 0.05, gaze: -5 },
    hold: 18,
    depiction: landShape,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:10",
    text: "And God called the dry land Earth; and the gathering together of the waters called he Seas: and God saw that it was good.",
    targets: { ...openSky, wind: 0.7, ...SURFACE, land: 1, flight: 0.145, gaze: -24 },
    hold: 16,
    depiction: landShape,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:11",
    text: "And God said, Let the earth bring forth grass, the herb yielding seed, and the fruit tree yielding fruit after his kind, whose seed is in itself, upon the earth: and it was so.",
    targets: { ...openSky, wind: 0.8, ...SURFACE, land: 1, green: 1, flight: 0.6, gaze: -14 },
    hold: 26,
    depiction: growth,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:12",
    text: "And the earth brought forth grass, and herb yielding seed after his kind, and the tree yielding fruit, whose seed was in itself, after his kind: and God saw that it was good.",
    targets: { ...openSky, wind: 0.8, ...SURFACE, land: 1, green: 1, flight: 0.8, gaze: -14 },
    hold: 12,
    depiction: growth,
  },
  {
    sceneId: "day-3",
    reference: "Genesis 1:13",
    text: "And the evening and the morning were the third day.",
    targets: { ...openSky, wind: 0.6, ...SURFACE, land: 1, green: 1, flight: 1, gaze: -12 },
    hold: 14,
    duskSeconds: 11,
    depiction: growth,
  },

  // Day 4. The view rests above the head of the valley, looking back over the land to the sea.
  {
    sceneId: "day-4",
    reference: "Genesis 1:14",
    text: "And God said, Let there be lights in the firmament of the heaven to divide the day from the night; and let them be for signs, and for seasons, and for days, and years:",
    targets: { ...grownLand, sun: 1, hour: 8.2, gaze: 2 },
    hold: 13,
    depiction: lights,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:15",
    text: "And let them be for lights in the firmament of the heaven to give light upon the earth: and it was so.",
    targets: { ...grownLand, sun: 1, hour: 12.5, gaze: -12 },
    hold: 10,
    depiction: lights,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:16",
    text: "And God made two great lights; the greater light to rule the day, and the lesser light to rule the night: he made the stars also.",
    targets: { ...grownLand, sun: 1, hour: 21.5, gaze: 4 },
    hold: 15,
    depiction: lights,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:17",
    text: "And God set them in the firmament of the heaven to give light upon the earth,",
    targets: { ...grownLand, sun: 1, hour: 24.5, gaze: 2 },
    hold: 9,
    depiction: lights,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:18",
    text: "And to rule over the day and over the night, and to divide the light from the darkness: and God saw that it was good.",
    targets: { ...grownLand, sun: 1, hour: 31.2, gaze: 0 },
    hold: 12,
    depiction: lights,
  },
  {
    sceneId: "day-4",
    reference: "Genesis 1:19",
    text: "And the evening and the morning were the fourth day.",
    targets: { ...grownLand, sun: 1, hour: 35, gaze: -10 },
    hold: 28,
    ascendAfter: 8,
    fadeToGlobeAfter: 12,
    depiction: globeView,
  },
];
