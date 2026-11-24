import { kjv } from "../data/kjv.ts";
import type { SpaceTargets } from "./spaceOpening.ts";
import type { Depiction } from "./steps.ts";

// The opening seen from space, one verse at a time: Genesis 1:1-8. Each step names its scene, its
// verse, and the state the picture glides to. From 1:9 the story is on the globe.

export interface SpaceStep {
  sceneId: "before" | "day-1" | "day-2";
  verse: string;
  targets: SpaceTargets;
  hold: number;
  depiction: Depiction;
}

const farOff: Depiction = {
  badge: "Illustration",
  note: "Seen from far off, where the earth will be. The text gives no viewpoint, and no shape for the deep.",
};
const divided: Depiction = {
  badge: "Illustration",
  note: "Light and darkness are pictured as a lit side and a dark side, and evening and morning as the light going once round. The text does not say how they were divided.",
};
const firmament: Depiction = {
  badge: "Illustration",
  note: "The firmament is pictured from far off as the mist lifting clear of the waters and a sky forming, with the waters above as cloud. The text does not say how it looked.",
};

const step = (sceneId: SpaceStep["sceneId"], verse: string, hold: number, depiction: Depiction, targets: SpaceTargets): SpaceStep => ({ sceneId, verse, hold, depiction, targets });

export const spaceSteps: SpaceStep[] = [
  step("before", "1:1", 6, farOff, { water: 0, light: 0, divide: 0, vault: 0, turn: 0, face: 0 }),
  step("before", "1:2", 12, farOff, { water: 1, light: 0, divide: 0, vault: 0, turn: 0, face: 0 }),
  step("day-1", "1:3", 10, farOff, { water: 1, light: 1, divide: 0, vault: 0, turn: 0, face: 0 }),
  step("day-1", "1:4", 10, divided, { water: 1, light: 1, divide: 1, vault: 0, turn: 0, face: 0 }),
  step("day-1", "1:5", 13, divided, { water: 1, light: 1, divide: 1, vault: 0, turn: 1, face: 0 }),
  step("day-2", "1:6", 10, firmament, { water: 1, light: 1, divide: 1, vault: 0.4, turn: 1, face: 0 }),
  step("day-2", "1:7", 11, firmament, { water: 1, light: 1, divide: 1, vault: 1, turn: 1, face: 0 }),
  step("day-2", "1:8", 12, firmament, { water: 1, light: 1, divide: 1, vault: 1, turn: 2, face: 1 }),
];

export const stepText = (s: SpaceStep) => kjv(s.verse);
