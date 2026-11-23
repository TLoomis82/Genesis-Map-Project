// The living land of day 3 (Gen 1:9-13): terrain, light, grass and fruit trees.
// Built only when the story gets near day 3, because it is the heaviest part of the opening.
//
// Light: light has existed since day 1 (Gen 1:3) but the sun is not made until day 4 (1:14-19).
// So the land is lit from a direction, with no sun shown in the sky.

import * as THREE from "three";
import { buildTerrain, type Flight, type Terrain } from "./terrain.ts";
import { buildGrass, type Grass } from "./grass.ts";
import { buildOrchard, type Orchard } from "./trees.ts";

// Growth runs ahead of the view in layers, each a share of the route (1 = about 1,500 metres):
// the ground greens far ahead, like a wave rolling up the valley; grass blades rise closer in;
// trees have their own timing (see trees.ts).
const GROUND_LEAD = 0.24;
const GROUND_BAND = 0.09;
const GRASS_LEAD = 0.06;
const GRASS_BAND = 0.035;
/** Depth the land sits under the sea before it rises. */
const SUNK = 330;

export interface LandscapeState {
  time: number;
  /** 0 = under the sea, 1 = fully risen. */
  land: number;
  /** 0 = bare, 1 = growth is running ahead of the view. */
  green: number;
  /** Where the view is along the route, 0..1, and its position. */
  flight: number;
  eye: THREE.Vector3;
  /** Overall light level after evening, morning, sun and moon are applied, 0..1. */
  light: number;
  /** Direction the direct light comes from, its colour, and its strength 0..1. */
  lightDir: THREE.Vector3;
  lightColor: THREE.Color;
  direct: number;
  wind: number;
  /** Fog colour as it should appear on screen. */
  fogColor: THREE.Color;
  fogDensity: number;
}

export class Landscape {
  readonly group = new THREE.Group();
  private terrain: Terrain;
  private grass: Grass;
  private orchard: Orchard;
  private sunLike = new THREE.DirectionalLight(0xfff1dc, 2.4);
  private skyLight = new THREE.HemisphereLight(0xcfe0ff, 0x4a4034, 1.1);

  constructor(flight: Flight, options: { grassStretches: number; bladesPerStretch: number; trees: number; herbs: number }) {
    this.terrain = buildTerrain(flight);
    this.grass = buildGrass(flight, this.terrain, options.grassStretches, options.bladesPerStretch);
    this.orchard = buildOrchard(flight, this.terrain, options.trees, options.herbs);

    // Low and from one side, so slopes and trunks have form. No sun is drawn in the sky.
    this.sunLike.position.set(-0.55, 0.5, 0.35).multiplyScalar(1000);
    this.group.add(this.terrain.mesh, this.grass.group, this.orchard.group, this.sunLike, this.sunLike.target, this.skyLight);
  }

  update(state: LandscapeState) {
    // Nothing of the land is drawn while it is still under the sea.
    this.group.visible = state.land > 0.002;
    if (!this.group.visible) return;
    const lift = -(1 - state.land) * SUNK;
    this.terrain.mesh.position.y = lift;
    this.orchard.group.position.y = lift;

    // Where growth has reached, measured along the route. Before plants are called for, it sits
    // well behind the start, so nothing has grown.
    const reach = THREE.MathUtils.lerp(-0.4, state.flight, state.green);
    this.terrain.uniforms.uFront.value = reach + GROUND_LEAD;
    this.terrain.uniforms.uBand.value = GROUND_BAND;

    this.grass.setFlight(state.flight);
    const g = this.grass.uniforms;
    g.uTime.value = state.time;
    g.uFront.value = reach + GRASS_LEAD;
    g.uBand.value = GRASS_BAND;
    g.uLift.value = lift;
    g.uWind.value = state.wind;
    g.uLight.value = state.light;
    g.uFogColor.value.copy(state.fogColor);
    g.uFogDensity.value = state.fogDensity;

    this.orchard.update(reach, state.time, state.eye);

    this.sunLike.position.copy(state.lightDir).multiplyScalar(1000);
    this.sunLike.color.copy(state.lightColor);
    this.sunLike.intensity = 2.4 * state.direct;
    this.skyLight.intensity = 1.1 * state.light;
    g.uTint.value.copy(state.lightColor);
  }

  dispose() {
    this.terrain.dispose();
    this.grass.dispose();
    this.orchard.dispose();
  }
}
