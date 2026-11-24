import type { ComponentType } from "react";

// The slot for explore modes (M8): a scene that can be played with as well as watched.
// To give a scene an explore mode, add its component here under the scene id from
// src/data/scenes.ts. The player shows an "Explore" button on any scene listed.
//
// Planned (see PLAN.md, M8): day 1 swipe the water and spin light and dark; day 2 look below
// the water and above the vault; day 3 fly the valley freely; day 4 season tabs.

export interface ExploreProps {
  onClose: () => void;
}

export const exploreModes: Partial<Record<string, ComponentType<ExploreProps>>> = {};
