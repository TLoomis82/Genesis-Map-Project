import { VAULT_CLOSED, VAULT_OPEN, type OpeningTargets } from "./openingScene.ts";
import type { Tier } from "../data/types.ts";

// The opening, one verse at a time. Each step names the scene it belongs to in
// src/data/scenes.ts, the verse shown on screen, and the state the water and sky glide to.
// Verse text is the King James Version (public domain).
// Open item: check every verse string against a KJV source file before launch.

/** Says plainly how a verse has been pictured, when the picture goes beyond the words. */
export interface Depiction {
  tier: Tier;
  note: string;
  /** Source id from src/data/sources.ts, required when tier is 'scholarly' or 'model'. */
  source?: string;
}

export interface OpeningStep {
  sceneId: "before" | "day-1" | "day-2";
  reference: string;
  text: string;
  targets: OpeningTargets;
  /** Seconds to hold before auto-advancing when playing. */
  hold: number;
  /** One pass of the light/dark boundary across the sky, in seconds. */
  sweepSeconds?: number;
  depiction?: Depiction;
}

const divided: Depiction = {
  tier: "text",
  note: "Light and darkness are pictured as two halves of the sky. The text does not say how they were divided.",
};

const vault: Depiction = {
  tier: "scholarly",
  note: "Pictured as a vault with water beyond it, the way the ancient world saw the sky (BibleProject, Ancient Cosmology).",
  source: "bibleproject-cosmology",
};

export const openingSteps: OpeningStep[] = [
  {
    sceneId: "before",
    reference: "Genesis 1:1",
    text: "In the beginning God created the heaven and the earth.",
    targets: { light: 0, haze: 1, wind: 0.6, divide: 0, vault: VAULT_CLOSED },
    hold: 6,
  },
  {
    sceneId: "before",
    reference: "Genesis 1:2",
    text: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
    targets: { light: 0.07, haze: 0.9, wind: 1.3, divide: 0, vault: VAULT_CLOSED },
    hold: 11,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:3",
    text: "And God said, Let there be light: and there was light.",
    targets: { light: 1, haze: 0.85, wind: 1, divide: 0, vault: VAULT_CLOSED },
    hold: 10,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:4",
    text: "And God saw the light, that it was good: and God divided the light from the darkness.",
    targets: { light: 1, haze: 0.85, wind: 0.95, divide: 1, vault: VAULT_CLOSED },
    hold: 10,
    depiction: divided,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:5",
    text: "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.",
    targets: { light: 1, haze: 0.85, wind: 0.9, divide: 1, vault: VAULT_CLOSED },
    hold: 14,
    sweepSeconds: 10,
    depiction: divided,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:6",
    text: "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.",
    targets: { light: 1, haze: 0.5, wind: 0.9, divide: 0, vault: 0.3 },
    hold: 10,
    depiction: vault,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:7",
    text: "And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so.",
    targets: { light: 1, haze: 0.05, wind: 0.85, divide: 0, vault: VAULT_OPEN },
    hold: 12,
    depiction: vault,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:8",
    text: "And God called the firmament Heaven. And the evening and the morning were the second day.",
    targets: { light: 1, haze: 0, wind: 0.7, divide: 0, vault: VAULT_OPEN },
    hold: 9,
    depiction: vault,
  },
];
