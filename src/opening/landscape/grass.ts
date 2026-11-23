// Grass and herbs for day 3 (Gen 1:11-12): individual blades that sprout as the growth reaches them.
//
// Each blade is a small strip of triangles, drawn tens of thousands of times in one call.
// The valley is divided into short stretches along the route; only the stretches near the view
// are drawn, so the grass can be thick where it is seen without drawing the whole valley at once.
// A few blades in every hundred carry a flower head: "the herb yielding seed".

import * as THREE from "three";
import type { Flight, GroundSample, Terrain } from "./terrain.ts";
import { noise2, seededRandom, smoothstep } from "./noise.ts";

const vertexShader = /* glsl */ `
  attribute vec3 aOffset;     // where the blade stands
  attribute vec4 aShape;      // height, width, facing angle, lean
  attribute vec2 aGrow;       // how far along the route it stands; per-blade variation 0..1

  uniform float uTime;
  uniform float uFront;
  uniform float uBand;
  uniform float uLift;
  uniform float uWind;

  varying float vAlong;
  varying float vTint;
  varying float vDepth;
  varying float vFacing;

  void main() {
    // Each blade starts a little earlier or later than its neighbours, so growth is not a hard line.
    float raw = clamp((uFront - aGrow.x - aGrow.y * 0.014) / uBand, 0.0, 1.0);
    float grown = raw * raw * (3.0 - 2.0 * raw);

    float t = position.y;                       // 0 at the root, 1 at the tip
    float h = aShape.x * grown;
    // Flowering blades (the top few percent of the variation) are a thin stem with a head:
    // the upper ring of the strip is pushed up near the tip and widened.
    float flower = step(0.975, aGrow.y);
    float upper = step(0.6, t) * step(t, 0.7);
    t = mix(t, 0.88, flower * upper);
    float taper = mix(1.0 - 0.9 * t, 0.4 + 3.4 * upper, flower) * step(t, 0.999);
    float w = aShape.y * taper * (0.3 + 0.7 * grown);

    // Lean and wind bend the blade more toward the tip.
    float gust = sin(uTime * 1.6 + aOffset.x * 0.31 + aOffset.z * 0.23) * 0.16
               + sin(uTime * 3.3 + aOffset.x * 1.1 - aOffset.z * 0.7) * 0.05;
    float bend = (aShape.w + gust * uWind) * t * t * h;

    float c = cos(aShape.z);
    float s = sin(aShape.z);
    vec3 local = vec3(position.x * w, t * h, bend);
    vec3 world = aOffset + vec3(local.x * c + local.z * s, local.y, -local.x * s + local.z * c);
    world.x += gust * uWind * t * t * h * 0.6;  // the wind has a direction of its own
    world.y += uLift;

    vec4 mv = viewMatrix * vec4(world, 1.0);
    vAlong = t;
    vTint = aGrow.y;
    vDepth = -mv.z;
    vFacing = abs(c);                           // blades side-on to the light are a touch darker
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uLight;
  uniform vec3 uTint;       // colour of the light: warm at sunset, cool by moonlight
  uniform vec3 uFogColor;
  uniform float uFogDensity;

  varying float vAlong;
  varying float vTint;
  varying float vDepth;
  varying float vFacing;

  void main() {
    // Greens run from deep and cool to pale and dry, blade by blade.
    vec3 root = vec3(0.030, 0.095, 0.022);
    vec3 fresh = vec3(0.26, 0.47, 0.11);
    vec3 dry = vec3(0.50, 0.55, 0.20);
    vec3 tip = mix(fresh, dry, smoothstep(0.55, 0.95, vTint));
    vec3 color = mix(root, tip, vAlong * (0.5 + 0.5 * vAlong));

    // Flower heads: white, yellow, violet or red, chosen by the blade's own variation.
    float flower = step(0.975, vTint) * smoothstep(0.80, 0.86, vAlong);
    float pick = fract(vTint * 97.0);
    vec3 petal = pick < 0.3 ? vec3(0.96, 0.95, 0.90)
               : pick < 0.6 ? vec3(0.98, 0.83, 0.20)
               : pick < 0.82 ? vec3(0.62, 0.44, 0.86)
               : vec3(0.88, 0.22, 0.25);
    color = mix(color, petal, flower);

    color *= mix(0.55, 1.1, vAlong) * mix(0.84, 1.08, vFacing) * uLight * mix(vec3(1.0), uTint, 0.6);

    float fog = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
    gl_FragColor = vec4(mix(color, uFogColor, fog), 1.0);
  }
`;

export interface Grass {
  group: THREE.Group;
  uniforms: {
    uTime: { value: number };
    uFront: { value: number };
    uBand: { value: number };
    uLift: { value: number };
    uWind: { value: number };
    uLight: { value: number };
    uTint: { value: THREE.Color };
    uFogColor: { value: THREE.Color };
    uFogDensity: { value: number };
  };
  /** Show only the stretches of grass near the view. */
  setFlight(flight: number): void;
  dispose(): void;
}

/** One blade: a strip that narrows to a point, three segments tall. */
function buildBlade(): THREE.BufferGeometry {
  const segments = 3;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    positions.push(-0.5, t, 0, 0.5, t, 0);
  }
  positions.push(0, 1, 0);
  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (segments - 1) * 2;
  indices.push(last, last + 1, last + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

// Grass stands between where the route reaches land and where it lifts away at the end.
const FROM = 0.17;
const TO = 0.99;
/** Stretches of grass are drawn from a little behind the view to this far ahead (share of the route). */
const BEHIND = 0.02;
const AHEAD = 0.12;

export function buildGrass(flight: Flight, terrain: Terrain, stretches: number, bladesPerStretch: number): Grass {
  const random = seededRandom(1109);
  const blade = buildBlade();
  const uniforms = {
    uTime: { value: 0 },
    uFront: { value: -1 },
    uBand: { value: 0.03 },
    uLift: { value: 0 },
    uWind: { value: 1 },
    uLight: { value: 1 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uFogColor: { value: new THREE.Color() },
    uFogDensity: { value: 0.0011 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, side: THREE.DoubleSide });

  const group = new THREE.Group();
  const parts: { mesh: THREE.Mesh; from: number; to: number; geometry: THREE.InstancedBufferGeometry }[] = [];
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const ground: GroundSample = { y: 0, flat: 0 };
  const span = (TO - FROM) / stretches;

  for (let k = 0; k < stretches; k++) {
    const from = FROM + k * span;
    const offsets = new Float32Array(bladesPerStretch * 3);
    const shapes = new Float32Array(bladesPerStretch * 4);
    const grow = new Float32Array(bladesPerStretch * 2);
    let placed = 0;

    for (let tries = 0; placed < bladesPerStretch && tries < bladesPerStretch * 3; tries++) {
      const t = from + span * random();
      flight.curve.getPointAt(t, point);
      flight.curve.getTangentAt(t, tangent);

      // Sideways distance from the route: thick underneath it, thinning out to the sides.
      const r = random();
      const side = (random() < 0.5 ? -1 : 1) * (r < 0.55 ? random() * 12 : 12 + Math.pow(random(), 1.5) * 40);
      const x = point.x - tangent.z * side;
      const z = point.z + tangent.x * side;
      if (!terrain.sample(x, z, ground)) continue;

      const fertile = smoothstep(0.8, 3.0, ground.y) * smoothstep(0.78, 0.92, ground.flat);
      // Grass grows in drifts: thicker in some patches, thin in others.
      const drift = 0.35 + 0.65 * smoothstep(0.25, 0.7, noise2(x * 0.06, z * 0.06));
      if (random() > fertile * drift) continue;

      const i = placed++;
      offsets[i * 3] = x;
      offsets[i * 3 + 1] = ground.y - 0.02;
      offsets[i * 3 + 2] = z;
      const variation = random();
      const flowering = variation > 0.975;
      const tall = flowering ? 0.55 + random() * 0.45 : 0.28 + random() * 0.5 + (random() < 0.06 ? 0.35 : 0);
      shapes[i * 4] = tall * (0.8 + 0.4 * drift);
      shapes[i * 4 + 1] = flowering ? 0.022 + random() * 0.012 : 0.04 + random() * 0.045;
      shapes[i * 4 + 2] = random() * Math.PI * 2;
      shapes[i * 4 + 3] = (random() - 0.3) * 0.55;
      grow[i * 2] = flight.progressAtZ(z);
      grow[i * 2 + 1] = variation;
    }

    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = blade.index;
    geometry.setAttribute("position", blade.attributes.position);
    geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets.subarray(0, placed * 3), 3));
    geometry.setAttribute("aShape", new THREE.InstancedBufferAttribute(shapes.subarray(0, placed * 4), 4));
    geometry.setAttribute("aGrow", new THREE.InstancedBufferAttribute(grow.subarray(0, placed * 2), 2));
    geometry.instanceCount = placed;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    group.add(mesh);
    parts.push({ mesh, from, to: from + span, geometry });
  }

  return {
    group,
    uniforms,
    setFlight(at: number) {
      for (const part of parts) part.mesh.visible = part.to > at - BEHIND && part.from < at + AHEAD;
    },
    dispose() {
      for (const part of parts) part.geometry.dispose();
      blade.dispose();
      material.dispose();
    },
  };
}
