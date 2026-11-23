import type { OpeningTargets } from "./openingScene.ts";

// The opening, one verse at a time. Each step names the scene it belongs to in
// src/data/scenes.ts, the verse shown on screen, and the state the water and sky glide to.
// Verse text is the King James Version (public domain).
// Open item: check every verse string against a KJV source file before launch.

export interface OpeningStep {
  sceneId: "before" | "day-1" | "day-2";
  reference: string;
  text: string;
  targets: OpeningTargets;
  /** Seconds to hold before auto-advancing when playing. */
  hold: number;
}

export const openingSteps: OpeningStep[] = [
  {
    sceneId: "before",
    reference: "Genesis 1:1",
    text: "In the beginning God created the heaven and the earth.",
    targets: { light: 0, haze: 1, wind: 0.6 },
    hold: 6,
  },
  {
    sceneId: "before",
    reference: "Genesis 1:2",
    text: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
    targets: { light: 0.07, haze: 0.9, wind: 1.25 },
    hold: 11,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:3",
    text: "And God said, Let there be light: and there was light.",
    targets: { light: 1, haze: 0.85, wind: 1 },
    hold: 10,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:4",
    text: "And God saw the light, that it was good: and God divided the light from the darkness.",
    targets: { light: 0.12, haze: 0.85, wind: 0.9 },
    hold: 9,
  },
  {
    sceneId: "day-1",
    reference: "Genesis 1:5",
    text: "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.",
    targets: { light: 0.9, haze: 0.85, wind: 0.9 },
    hold: 10,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:6",
    text: "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.",
    targets: { light: 0.95, haze: 0.45, wind: 0.9 },
    hold: 9,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:7",
    text: "And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so.",
    targets: { light: 1, haze: 0.05, wind: 0.85 },
    hold: 11,
  },
  {
    sceneId: "day-2",
    reference: "Genesis 1:8",
    text: "And God called the firmament Heaven. And the evening and the morning were the second day.",
    targets: { light: 1, haze: 0, wind: 0.8 },
    hold: 9,
  },
];
