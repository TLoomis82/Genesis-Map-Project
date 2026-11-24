// The opening of Genesis Map (Gen 1:1-8), seen from the surface of the waters.
// Plain three.js on its own canvas: no globe, no land, and no sun (the sun arrives on day 4).
//
// A handful of numbers drive everything, and each one glides toward its target every frame:
//   light   0 = darkness, 1 = full light                                   (Gen 1:3)
//   haze    1 = mist everywhere, water and sky are one; 0 = clear air      (Gen 1:2, 1:6)
//   wind    scale of the waves                                             (Gen 1:2)
//   divide  0 = light everywhere; 1 = half the sky light, half dark        (Gen 1:4)
//   vault   how far the expanse has opened, from the horizon (0) to overhead (1.2).
//           Where it is open you see clear air and, beyond it, the waters above   (Gen 1:6-8)
// A step can also ask for one of two passing events:
//   sweep  the light/dark boundary crosses the sky once: evening, then morning   (Gen 1:5)
//   dusk   the light fades to night and returns once: evening, then morning      (Gen 1:8, 1:13)
//   ascend after a delay, the view rises high above the land and whitens, ready to fade to the globe
//
// Day 3 adds the land (see ./landscape), flown over along a fixed route:
//   land      0 = under the water, 1 = fully risen                           (Gen 1:9)
//   green     0 = bare ground, 1 = growth runs ahead of the view             (Gen 1:11-12)
//   flight    how far along the route the view is, 0..1. It moves at a steady, limited speed.
//   altitude  extra height above the route (used for the final rise)
//   gaze      where the view looks: height of the look-at point, 100 units ahead, relative to the view
//   veil      0 = clear, 1 = the whole frame is a bright haze (used for the fade to the globe)
// The land's shape is illustrative only: the text does not describe it.
//
// Day 4 adds the lights in the vault (Gen 1:14-19):
//   sun       0 = no sun, moon or stars yet; 1 = they are there
//   hour      time of day, 0..24 and beyond (30 = six the next morning). It moves at a limited speed,
//             so a day passes as one continuous sweep of the sun, then the moon and stars.
//   month     months passed. As it moves, the moon runs through its phases and the stars wheel.
//   year      years passed. As it moves, the place where the sun rises slides along the horizon
//             and back, and the land's colours shift through the seasons.
// Their paths across the sky and the speed of time are illustrative. The season of the year is
// kept as a single value (see seasonOf) so that it can be set directly later, for example from tabs.

import * as THREE from "three";
import { buildFlight } from "./landscape/terrain.ts";
import type { Landscape } from "./landscape/index.ts";

export interface OpeningTargets {
  light: number;
  haze: number;
  wind: number;
  divide: number;
  vault: number;
  land: number;
  green: number;
  flight: number;
  sun: number;
  hour: number;
  month: number;
  year: number;
  /** Which way the view faces, as a turn away from the route's direction, in radians. */
  turn: number;
  altitude: number;
  gaze: number;
  veil: number;
}

export interface OpeningEvents {
  /** One pass of the light/dark boundary across the sky, in seconds. */
  sweepSeconds?: number;
  /** The light fades to night and returns once, in seconds. */
  duskSeconds?: number;
  /** Seconds after the step starts at which the view rises and whitens. */
  ascendAfter?: number;
}

export const SURFACE = { land: 0, green: 0, flight: 0, sun: 0, hour: 12, month: 0, year: 0, turn: 0, altitude: 0, gaze: -10, veil: 0 } as const;

export const VAULT_CLOSED = -0.05;
export const VAULT_OPEN = 1.2;

// Shared by the water and the sky so the two always agree.
const common = /* glsl */ `
  uniform float uTime;
  uniform float uLight;
  uniform float uHaze;
  uniform float uWind;
  uniform float uDivide;
  uniform float uDivideAngle;
  uniform float uVault;
  uniform float uVeil;
  uniform float uSun;      // the sun is there (day 4 on)
  uniform float uMoon;     // how strongly the moon shows
  uniform float uStars;    // how strongly the stars show
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform float uMoonPhase;
  uniform float uStarTurn;   // how far the star field has turned, in radians
  uniform float uStarTrail;  // 0 = points, 1 = full trails
  uniform vec3 uCamera;

  const vec3 DARK = vec3(0.0, 0.002, 0.005);
  // The point the stars turn about: above the sea, part-way up the sky.
  const vec3 STAR_POLE = vec3(0.2, 0.37, 0.907);

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // How much light reaches a given direction. With uDivide = 1, one half of the sky is dark.
  float localLight(vec3 dir) {
    vec2 d = normalize(dir.xz + vec2(0.00001));
    vec2 lit = vec2(cos(uDivideAngle), sin(uDivideAngle));
    float side = smoothstep(-0.35, 0.35, dot(d, lit));
    return uLight * mix(1.0, mix(0.04, 1.0, side), uDivide);
  }

  // The mist of day 1: slightly warm, because the light has no source yet.
  vec3 mistColor(float l) {
    return mix(DARK, mix(vec3(0.80, 0.87, 0.95), vec3(0.95, 0.92, 0.86), uHaze), l);
  }

  // 0 where the mist still hangs, 1 where the expanse has opened, by height above the horizon.
  float expanseOpen(float y) {
    return 1.0 - smoothstep(uVault - 0.10, uVault + 0.02, y);
  }

  // Colour at the horizon; also the colour distant water fades into.
  vec3 horizonColor(vec3 dir) {
    float l = localLight(dir);
    vec3 clearHorizon = mix(DARK, vec3(0.80, 0.87, 0.95), l);
    return mix(mistColor(l), clearHorizon, expanseOpen(0.0));
  }

  // The sun, moon and stars are seen at full strength in the sky and a little softened in the water.
  float shimmerAmountForLights(float shimmerAmount) {
    return mix(0.55, 1.0, shimmerAmount);
  }

  // shimmerAmount: 1 for the sky itself, lower for its softer reflection in the water.
  vec3 skyColor(vec3 dir, float shimmerAmount) {
    float l = localLight(dir);
    float y = clamp(dir.y, 0.0, 1.0);

    // The expanse: clear air, pale at the horizon and deep overhead.
    vec3 clearHorizon = mix(DARK, vec3(0.80, 0.87, 0.95), l);
    vec3 vaultBlue = mix(DARK, vec3(0.08, 0.27, 0.62), l);

    // The waters above, seen through the vault: slow, shifting bands of light,
    // like looking up at the underside of a calm sea.
    vec2 q = dir.xz / max(y, 0.12);
    float w1 = vnoise(q * 1.7 + vec2(uTime * 0.030, uTime * 0.020));
    float w2 = vnoise(q * 3.3 + vec2(-uTime * 0.025, uTime * 0.010) + 7.3);
    float r1 = 1.0 - abs(2.0 * w1 - 1.0);
    float r2 = 1.0 - abs(2.0 * w2 - 1.0);
    float shimmer = pow(r1 * r2, 2.0) * smoothstep(0.04, 0.40, y);
    vec3 above = vaultBlue + vec3(0.40, 0.55, 0.70) * shimmer * 0.6 * shimmerAmount * l;

    vec3 clear = mix(above, clearHorizon, pow(1.0 - y, 4.0));

    // The lights set in the vault on day 4. Sun and moon are drawn several times life size,
    // so they read as the "two great lights" on a small screen.
    float sunUp = smoothstep(-0.06, 0.02, uSunDir.y);
    float low = 1.0 - smoothstep(0.0, 0.4, uSunDir.y);            // 1 when the sun is near the horizon
    float sd = max(dot(dir, uSunDir), 0.0);
    vec3 sunColor = mix(vec3(1.0, 0.97, 0.88), vec3(1.0, 0.58, 0.26), low);
    // Evening and morning colour along the horizon, strongest toward the sun.
    float band = pow(1.0 - y, 5.0) * pow(sd, 2.5) * low * smoothstep(-0.3, 0.0, uSunDir.y) * uSun;
    clear = mix(clear, vec3(1.0, 0.56, 0.26), clamp(band * 0.85, 0.0, 1.0));

    vec3 lights = sunColor * uSun * sunUp
      * (smoothstep(0.99945, 0.99962, sd) * 3.0 + pow(sd, 700.0) * 0.8 + pow(sd, 50.0) * 0.16 + pow(sd, 6.0) * 0.09 * (0.4 + low));

    // The moon: a small lit ball, so it can wax and wane. uMoonPhase runs 0 (new) to 0.5 (full) to 1.
    vec3 moonRight = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDir));
    vec3 moonTop = cross(uMoonDir, moonRight);
    vec3 offMoon = dir - uMoonDir;
    vec2 onDisc = vec2(dot(offMoon, moonRight), dot(offMoon, moonTop)) / 0.031;
    float moonR2 = dot(onDisc, onDisc);
    if (moonR2 < 1.0) {
      vec3 moonN = vec3(onDisc, sqrt(1.0 - moonR2));
      float phaseAngle = uMoonPhase * 6.2831853;
      float lit = smoothstep(-0.06, 0.10, dot(moonN, vec3(sin(phaseAngle), 0.0, -cos(phaseAngle))));
      float moonFace = 0.74 + 0.26 * vnoise(onDisc * 3.2 + 4.0);       // faint markings
      float moonEdge = 1.0 - smoothstep(0.90, 1.0, moonR2);
      lights += vec3(0.93, 0.95, 1.0) * uMoon * moonEdge * moonFace * (0.035 + 0.965 * lit);
    }
    float md = max(dot(dir, uMoonDir), 0.0);
    float moonFull = 0.5 - 0.5 * cos(uMoonPhase * 6.2831853);      // 0 at new, 1 at full
    lights += vec3(0.80, 0.86, 1.0) * uMoon * moonFull * (pow(md, 500.0) * 0.14 + pow(md, 30.0) * 0.04);

    // Stars: a scatter of points, each with its own brightness and a slow twinkle. The whole
    // field turns about a fixed point in the sky, and while it turns fast each star leaves a trail.
    float starLight = 0.0;
    for (int k = 0; k < 10; k++) {
      float back = float(k) * 0.007 * uStarTrail;
      float turn = uStarTurn - back;
      // Rotate the direction about the pole (Rodrigues' formula).
      vec3 sdir = dir * cos(turn) + cross(STAR_POLE, dir) * sin(turn) + STAR_POLE * dot(STAR_POLE, dir) * (1.0 - cos(turn));
      vec3 starGrid = sdir * 260.0;
      vec3 cell = floor(starGrid);
      float pick = hash(cell.xy + cell.z * 37.0);
      float star = step(0.9900, pick) * smoothstep(0.40, 0.05, length(fract(starGrid) - 0.5));
      float twinkle = 0.72 + 0.28 * sin(uTime * 2.6 + pick * 400.0);
      starLight += star * twinkle * (0.35 + 1.7 * fract(pick * 91.7)) * (k == 0 ? 1.0 : 0.55 * uStarTrail * (1.0 - float(k) / 10.0));
      if (uStarTrail < 0.02) break;                                // no trails: one pass is enough
    }
    lights += vec3(0.95, 0.96, 1.0) * starLight * uStars * smoothstep(0.02, 0.22, y);

    return mix(mistColor(l), clear + lights * shimmerAmountForLights(shimmerAmount), expanseOpen(y));
  }

  // The bright haze the view rises into before the globe appears.
  vec3 applyVeil(vec3 color, vec3 dir) {
    return mix(color, mix(DARK, vec3(0.86, 0.90, 0.96), localLight(dir)), uVeil);
  }

  // Density of mist between the view and a point.
  float mistAmount(float dist) {
    return 1.0 - exp(-dist * mix(0.0012, 0.020, uHaze));
  }

  void addWave(vec2 p, vec2 dir, float len, float amp, float speed, inout float h, inout vec2 slope) {
    float k = 6.2831853 / len;
    float phase = dot(p, dir) * k + uTime * speed;
    h += amp * sin(phase);
    slope += dir * (k * amp * cos(phase));
  }

  // Long swells: these move the mesh.
  void swell(vec2 p, inout float h, inout vec2 slope) {
    addWave(p, vec2(0.96, 0.28), 83.0, 1.10, 0.55, h, slope);
    addWave(p, vec2(-0.37, 0.93), 47.0, 0.62, 0.70, h, slope);
    addWave(p, vec2(0.76, -0.65), 23.0, 0.30, 0.95, h, slope);
    addWave(p, vec2(-0.98, -0.20), 11.0, 0.13, 1.30, h, slope);
  }

  // The same swells for shading, with the short ones fading out with distance.
  // Far away they are smaller than a pixel and would only show up as speckle.
  void swellShaded(vec2 p, float dist, inout float h, inout vec2 slope) {
    addWave(p, vec2(0.96, 0.28), 83.0, 1.10, 0.55, h, slope);
    addWave(p, vec2(-0.37, 0.93), 47.0, 0.62 * (1.0 - smoothstep(350.0, 1100.0, dist)), 0.70, h, slope);
    addWave(p, vec2(0.76, -0.65), 23.0, 0.30 * (1.0 - smoothstep(90.0, 380.0, dist)), 0.95, h, slope);
    addWave(p, vec2(-0.98, -0.20), 11.0, 0.13 * (1.0 - smoothstep(35.0, 170.0, dist)), 1.30, h, slope);
  }

  // Small surface texture: irregular, so it never forms stripes. Shading only.
  float chop(vec2 p) {
    return vnoise(p * 0.35 + vec2(uTime * 0.22, uTime * 0.10))
      + 0.45 * vnoise(p * 0.90 + vec2(-uTime * 0.30, uTime * 0.18))
      + 0.20 * vnoise(p * 2.30 + vec2(uTime * 0.35, -uTime * 0.40));
  }

  vec2 chopSlope(vec2 p) {
    float e = 0.15;
    return vec2(
      chop(p + vec2(e, 0.0)) - chop(p - vec2(e, 0.0)),
      chop(p + vec2(0.0, e)) - chop(p - vec2(0.0, e))
    ) / (2.0 * e);
  }
`;

const waterVertex = /* glsl */ `
  ${common}
  varying vec3 vWorld;

  void main() {
    // The water mesh follows the view, so waves are worked out from where each point is in the world.
    vec3 pos = (modelMatrix * vec4(position, 1.0)).xyz;
    float h = 0.0;
    vec2 slope = vec2(0.0);
    swell(pos.xz, h, slope);
    pos.y += h * uWind;
    vWorld = pos;
    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragment = /* glsl */ `
  ${common}
  varying vec3 vWorld;

  void main() {
    vec3 toPoint = vWorld - uCamera;
    float dist = length(toPoint);
    vec3 view = -toPoint / dist;

    // The normal is worked out per pixel: swells plus small chop that fades with distance.
    float h = 0.0;
    vec2 slope = vec2(0.0);
    swellShaded(vWorld.xz, dist, h, slope);
    slope += chopSlope(vWorld.xz) * 0.42 * (1.0 - smoothstep(12.0, 85.0, dist));
    vec3 normal = normalize(vec3(-slope.x * uWind, 1.0, -slope.y * uWind));

    vec3 reflected = reflect(-view, normal);
    reflected.y = abs(reflected.y);

    float l = localLight(-view);
    float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(normal, view), 0.0), 5.0);
    vec3 deep = mix(vec3(0.0, 0.003, 0.006), vec3(0.01, 0.09, 0.13), l);
    vec3 color = mix(deep, skyColor(reflected, 0.25), fresnel);

    // Mist: thick when haze is high, so the water melts into the sky with no horizon line.
    color = mix(color, horizonColor(-view), mistAmount(dist));
    gl_FragColor = vec4(applyVeil(color, -view), 1.0);
  }
`;

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  ${common}
  varying vec3 vDir;
  void main() {
    vec3 dir = normalize(vDir);
    gl_FragColor = vec4(applyVeil(skyColor(dir, 1.0), dir), 1.0);
  }
`;

/** A square grid stretched so cells are tiny near the camera and large far away. */
function buildWaterGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(2, 2, 220, 220);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const v = pos.getZ(i);
    const r = Math.max(Math.abs(u), Math.abs(v));
    const stretch = r > 0 ? (Math.pow(r, 3) * 1500) / r : 0;
    pos.setXYZ(i, u * stretch, 0, v * stretch);
  }
  pos.needsUpdate = true;
  return geometry;
}

/** Fastest the day passes, in hours per second. */
const HOUR_SPEED = 1.15;
/** Fastest the months and years pass, per second: a month in about eight seconds, a year in about fifteen. */
const MONTH_SPEED = 0.13;
const YEAR_SPEED = 0.075;

/**
 * The season at a point in the year. year counts whole years; its fraction is the time of year,
 * starting from the green of spring: 0.25 summer, 0.5 autumn, 0.75 winter.
 * swing runs -1..1 and moves the sunrise along the horizon; autumn and winter run 0..1 and tint the land.
 */
export function seasonOf(year: number): { swing: number; autumn: number; winter: number } {
  const phase = year - Math.floor(year);
  const bump = (centre: number, width: number) => {
    const d = Math.abs(phase - centre);
    return THREE.MathUtils.smoothstep(1 - d / width, 0, 1);
  };
  return { swing: Math.sin(phase * Math.PI * 2), autumn: bump(0.5, 0.24), winter: bump(0.75, 0.22) };
}
const SUNSET_LIGHT = new THREE.Color(1, 0.62, 0.34);
const MOON_LIGHT = new THREE.Color(0.62, 0.72, 1);

/** Fastest the flight moves, as a share of the route per second (about 24 metres a second). */
const FLIGHT_SPEED = 0.016;

/** Phones and other small screens get a lighter version of the land. */
const SMALL_SCREEN = Math.min(window.innerWidth, window.innerHeight) < 600;

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

// With the camera looking toward -z: at angle 0 the boundary runs straight ahead
// (dark on the left, light on the right); at PI/2 the view ahead is dark; at 3PI/2 it is light.
const SWEEP_FROM = 0;
const SWEEP_TO = Math.PI * 1.5;

export class OpeningScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
  private uniforms = {
    uTime: { value: 0 },
    uLight: { value: 0 },
    uHaze: { value: 1 },
    uWind: { value: 1 },
    uDivide: { value: 0 },
    uDivideAngle: { value: SWEEP_FROM },
    uVault: { value: VAULT_CLOSED },
    uVeil: { value: 0 },
    uSun: { value: 0 },
    uMoon: { value: 0 },
    uStars: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uMoonPhase: { value: 0.5 },
    uStarTurn: { value: 0 },
    uStarTrail: { value: 0 },
    uCamera: { value: new THREE.Vector3(0, 3.2, 0) },
  };
  private disposables: { dispose(): void }[] = [];
  private current: OpeningTargets = { light: 0, haze: 1, wind: 1, divide: 0, vault: VAULT_CLOSED, ...SURFACE };
  private target: OpeningTargets = { ...this.current };
  private angle = SWEEP_FROM;
  private sweep: { start: number; seconds: number } | null = null;
  private dusk: { start: number; seconds: number } | null = null;
  private dim = 0; // 0 = full light, 1 = night; glides like everything else
  private ascendAt: number | null = null;
  private flight = buildFlight();
  private flightSpeed = 0;
  private hourSpeed = 0;
  private monthSpeed = 0;
  private yearSpeed = 0;
  private lightDir = new THREE.Vector3();
  private lightColor = new THREE.Color();
  private landscape: Landscape | null = null;
  private landscapeLoading: Promise<void> | null = null;
  private disposed = false;
  private water!: THREE.Mesh;
  private sky!: THREE.Mesh;
  private fog = new THREE.FogExp2(0x000000, 0.0011);
  private fogDisplay = new THREE.Color();
  private eye = new THREE.Vector3();
  private heading = new THREE.Vector3();
  private headingAhead = new THREE.Vector3();
  private headingFar = new THREE.Vector3();
  private facing = new THREE.Vector3();
  private bank = 0;
  private lookAt = new THREE.Vector3();
  private time = 0;
  private running = false;
  private frame = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !SMALL_SCREEN; // tree shadows on larger screens only, for speed
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const waterGeometry = buildWaterGeometry();
    const waterMaterial = new THREE.ShaderMaterial({ vertexShader: waterVertex, fragmentShader: waterFragment, uniforms: this.uniforms });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.frustumCulled = false;

    const skyGeometry = new THREE.SphereGeometry(3000, 48, 24);
    const skyMaterial = new THREE.ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.frustumCulled = false;
    sky.renderOrder = -1;

    this.water = water;
    this.sky = sky;
    this.scene.add(sky, water);
    this.scene.fog = this.fog; // applies to the land, grass and trees; water and sky do their own mist
    this.disposables.push(waterGeometry, waterMaterial, skyGeometry, skyMaterial);
    this.resize();
  }

  /**
   * Build the land, grass and trees of day 3. Heavy, so it is done once, shortly before it is needed.
   * Phones get fewer blades and trees.
   */
  ensureLandscape(): Promise<void> {
    // The code for the land (including the tree library) is fetched only now, so the opening itself loads fast.
    this.landscapeLoading ??= import("./landscape/index.ts").then(({ Landscape }) => {
      if (this.disposed) return;
      this.landscape = new Landscape(
        this.flight,
        SMALL_SCREEN
          ? { grassStretches: 60, bladesPerStretch: 9000, trees: 85, herbs: 100, shadows: false }
          : { grassStretches: 60, bladesPerStretch: 22000, trees: 170, herbs: 180, shadows: true },
      );
      this.scene.add(this.landscape.group);
    });
    return this.landscapeLoading;
  }

  resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** Where the scene should glide to, plus any passing events. Changes are never applied instantly. */
  setTargets(t: OpeningTargets, events: OpeningEvents = {}) {
    this.target = { ...t };
    this.dusk = events.duskSeconds ? { start: this.time, seconds: events.duskSeconds } : null;
    this.ascendAt = events.ascendAfter !== undefined ? this.time + events.ascendAfter : null;
    if (events.sweepSeconds) {
      this.angle = SWEEP_FROM;
      this.sweep = { start: this.time, seconds: events.sweepSeconds };
    } else {
      this.sweep = null;
      // Outside a sweep the boundary rests straight ahead. Only reset it while it cannot be seen.
      if (this.current.divide < 0.05) this.angle = SWEEP_FROM;
    }
  }

  /** Jump straight to a state, with no glide. Used only for the very first frame. */
  snapTo(t: OpeningTargets) {
    this.target = { ...t };
    this.current = { ...t };
    this.sweep = null;
    this.dusk = null;
    this.ascendAt = null;
    this.dim = 0;
    this.flightSpeed = 0;
    this.hourSpeed = 0;
    this.monthSpeed = 0;
    this.yearSpeed = 0;
    this.heading.set(0, 0, 0);
    this.bank = 0;
    this.angle = SWEEP_FROM;
  }

  play() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      this.advance(Math.min((now - last) / 1000, 0.1));
      last = now;
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  /** For checks: what the last frame cost to draw. */
  debugInfo() {
    const r = this.renderer.info.render;
    return { triangles: r.triangles, drawCalls: r.calls };
  }

  /** For checks and screenshots: run the scene forward by some seconds at once, then draw one frame. */
  debugAdvance(seconds: number) {
    const stepSize = 1 / 30;
    for (let t = 0; t < seconds; t += stepSize) this.advance(stepSize);
    this.renderer.render(this.scene, this.camera);
  }

  /** Move everything forward by dt seconds. */
  private advance(dt: number) {
    this.time += dt;
    const time = this.time;

    // One eased pass of the boundary; when it ends, the sky becomes fully light.
    if (this.sweep) {
      const t = Math.min((time - this.sweep.start) / this.sweep.seconds, 1);
      this.angle = SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * smoother(t);
      if (t >= 1) {
        this.sweep = null;
        this.target.divide = 0;
      }
    }

    // The ascent: rise high above the land, look down, and let the bright haze close in.
    if (this.ascendAt !== null && time >= this.ascendAt) {
      this.ascendAt = null;
      this.target.altitude = 1500;
      this.target.gaze = -220;
      this.target.veil = 1;
    }

    // Evening and morning: the dim level rises to night and falls back, then the event ends.
    let dimTarget = 0;
    if (this.dusk) {
      const t = Math.min((time - this.dusk.start) / this.dusk.seconds, 1);
      dimTarget = Math.pow(Math.sin(Math.PI * t), 2);
      if (t >= 1) this.dusk = null;
    }
    this.dim += (dimTarget - this.dim) * (1 - Math.exp(-dt * 2.5));

    // Glide each value toward its target: smooth start, smooth stop, no jumps.
    const ease = 1 - Math.exp(-dt * 0.45);
    const slow = 1 - Math.exp(-dt * 0.2);
    const c = this.current;
    const g = this.target;
    c.light += (g.light - c.light) * ease;
    c.haze += (g.haze - c.haze) * ease;
    c.wind += (g.wind - c.wind) * ease;
    c.divide += (g.divide - c.divide) * ease;
    c.vault += (g.vault - c.vault) * ease;
    c.land += (g.land - c.land) * slow; // the land rises slowly
    c.green += (g.green - c.green) * ease;
    c.altitude += (g.altitude - c.altitude) * ease;
    c.gaze += (g.gaze - c.gaze) * ease;
    c.veil += (g.veil - c.veil) * ease;
    c.sun += (g.sun - c.sun) * ease;
    c.turn += (g.turn - c.turn) * (1 - Math.exp(-dt * 0.3)); // a slow pan

    // The hour moves like the flight: steadily, at a limited speed, easing in and out.
    const hourWanted = THREE.MathUtils.clamp((g.hour - c.hour) * 0.7, -HOUR_SPEED, HOUR_SPEED);
    this.hourSpeed += (hourWanted - this.hourSpeed) * (1 - Math.exp(-dt * 1.4));
    c.hour += this.hourSpeed * dt;
    const monthWanted = THREE.MathUtils.clamp((g.month - c.month) * 0.7, -MONTH_SPEED, MONTH_SPEED);
    this.monthSpeed += (monthWanted - this.monthSpeed) * (1 - Math.exp(-dt * 1.4));
    c.month += this.monthSpeed * dt;
    const yearWanted = THREE.MathUtils.clamp((g.year - c.year) * 0.7, -YEAR_SPEED, YEAR_SPEED);
    this.yearSpeed += (yearWanted - this.yearSpeed) * (1 - Math.exp(-dt * 1.4));
    c.year += this.yearSpeed * dt;

    // The flight moves at a steady, limited speed, easing in and out, however far away its target is.
    const wanted = THREE.MathUtils.clamp((g.flight - c.flight) * 0.7, -FLIGHT_SPEED, FLIGHT_SPEED);
    this.flightSpeed += (wanted - this.flightSpeed) * (1 - Math.exp(-dt * 1.4));
    c.flight = THREE.MathUtils.clamp(c.flight + this.flightSpeed * dt, 0, 1);

    // Where the sun and moon stand. On day 4 the view has turned to look back down the valley to the
    // sea (toward +z), and both lights cross the sky right in front of it: the sun rises just left of
    // centre at 6, stands highest at 12 and sets just right of centre at 18; the moon follows it up.
    // Through a year the sunrise slides along the horizon and back, and the noon sun stands higher or lower.
    const u = this.uniforms;
    const season = seasonOf(c.year);
    const sunAngle = ((c.hour - 6) / 12) * Math.PI;
    u.uSunDir.value
      .set(Math.cos(sunAngle) * 0.3 + season.swing * 0.42, Math.sin(sunAngle) * (0.62 - season.swing * 0.12), 0.78)
      .normalize();
    const moonAngle = sunAngle - Math.PI + 0.25;
    u.uMoonDir.value.set(Math.cos(moonAngle) * 0.3 - 0.12, Math.sin(moonAngle) * 0.3, 0.8).normalize();
    u.uMoonPhase.value = 0.5 + c.month; // full when first seen, then waning and waxing
    u.uStarTurn.value = (c.hour / 24) * Math.PI * 2 * 0.25 + c.month * Math.PI * 2 * 0.7;
    u.uStarTrail.value = THREE.MathUtils.clamp(Math.abs(this.monthSpeed) / MONTH_SPEED, 0, 1);
    const daylight = THREE.MathUtils.smoothstep(u.uSunDir.value.y, -0.1, 0.22);
    const moonUp = THREE.MathUtils.smoothstep(u.uMoonDir.value.y, -0.05, 0.2);
    u.uSun.value = c.sun;
    u.uMoon.value = c.sun * THREE.MathUtils.smoothstep(u.uMoonDir.value.y, -0.05, 0.05) * (0.35 + 0.65 * (1 - daylight));
    u.uStars.value = c.sun * (1 - daylight) * (1 - daylight);

    // Before day 4 the light simply is. From day 4 it follows the sun, with moonlight at night.
    const ruled = THREE.MathUtils.lerp(1, THREE.MathUtils.lerp(0.13 + 0.09 * moonUp, 1, daylight), c.sun);
    const light = c.light * (1 - 0.9 * this.dim) * ruled;

    // Light on the land: from one side with no sun shown (day 3), then from the sun or the moon.
    const lowSun = 1 - THREE.MathUtils.smoothstep(u.uSunDir.value.y, 0, 0.4);
    this.lightDir.set(-0.55, 0.5, 0.35).normalize();
    this.lightDir.lerp(daylight > 0.02 ? u.uSunDir.value : u.uMoonDir.value, c.sun).normalize();
    this.lightColor.setRGB(1, 0.945, 0.86).lerp(SUNSET_LIGHT, lowSun * daylight * c.sun).lerp(MOON_LIGHT, (1 - daylight) * c.sun);
    const direct = THREE.MathUtils.lerp(1, Math.max(daylight, 0.16 * moonUp), c.sun);

    u.uTime.value = time;
    u.uLight.value = light;
    u.uHaze.value = c.haze;
    u.uWind.value = c.wind;
    u.uDivide.value = c.divide;
    u.uDivideAngle.value = this.angle;
    u.uVault.value = c.vault;
    u.uVeil.value = c.veil;

    // The view: a point on the route, looking where the route is about to go.
    // On the water (flight = 0) this is the same floating view as days 1 and 2.
    const curve = this.flight.curve;
    // The heading is not read straight off the route: it glides toward where the route is going,
    // so turns begin early, build slowly and never snap.
    curve.getPointAt(c.flight, this.eye);
    curve.getTangentAt(Math.min(c.flight + 0.02, 1), this.headingAhead);
    curve.getTangentAt(Math.min(c.flight + 0.06, 1), this.headingFar);
    this.headingAhead.add(this.headingFar);
    this.headingAhead.y *= 0.5;
    this.headingAhead.normalize();
    if (this.heading.lengthSq() === 0) this.heading.copy(this.headingAhead);
    const yawBefore = Math.atan2(this.heading.x, -this.heading.z);
    this.heading.lerp(this.headingAhead, 1 - Math.exp(-dt * 1.1)).normalize();
    const yawRate = dt > 0 ? (Math.atan2(this.heading.x, -this.heading.z) - yawBefore) / dt : 0;

    const moving = THREE.MathUtils.clamp(Math.abs(this.flightSpeed) / FLIGHT_SPEED, 0, 1);
    const floating = 1 - THREE.MathUtils.smoothstep(c.flight, 0.0, 0.05);
    this.eye.y += c.altitude + Math.sin(time * 0.45) * 0.3 * c.wind * (0.25 + 0.75 * floating);
    this.camera.position.copy(this.eye);
    u.uCamera.value.copy(this.eye);

    // The view can turn away from the direction of travel (day 4 looks back the way it came).
    const cosTurn = Math.cos(c.turn);
    const sinTurn = Math.sin(c.turn);
    this.facing.set(
      this.heading.x * cosTurn + this.heading.z * sinTurn,
      this.heading.y * cosTurn,
      -this.heading.x * sinTurn + this.heading.z * cosTurn,
    );
    this.lookAt.copy(this.eye).addScaledVector(this.facing, 100);
    this.lookAt.x += Math.sin(time * 0.11) * 6 * floating;
    this.lookAt.y += c.gaze;
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.lookAt);

    // A slight lean into turns, following how fast the heading is changing, and itself smoothed.
    const wantedBank = THREE.MathUtils.clamp(-yawRate * 0.7, -0.09, 0.09) * moving;
    this.bank += (wantedBank - this.bank) * (1 - Math.exp(-dt * 1.2));
    this.camera.rotateZ(this.bank + Math.sin(time * 0.31) * 0.012 * c.wind * (0.3 + 0.7 * floating));

    // Water and sky travel with the view so their edges are never reached.
    this.water.position.set(this.eye.x, 0, this.eye.z);
    this.sky.position.copy(this.eye);

    // Fog for the land matches the horizon colour, and thickens into the veil at the end.
    this.fogDisplay.setRGB(0.8 * light, 0.87 * light, 0.95 * light);
    this.fog.color.setRGB(this.fogDisplay.r, this.fogDisplay.g, this.fogDisplay.b, THREE.SRGBColorSpace);
    this.fog.density = 0.0011 + c.haze * 0.01 + c.veil * c.veil * 0.03;

    this.landscape?.update({
      time,
      land: c.land,
      green: c.green,
      flight: c.flight,
      eye: this.eye,
      light,
      lightDir: this.lightDir,
      lightColor: this.lightColor,
      direct: direct * c.light * (1 - 0.9 * this.dim),
      autumn: season.autumn,
      winter: season.winter,
      focus: this.lookAt,
      wind: c.wind,
      fogColor: this.fogDisplay,
      fogDensity: this.fog.density,
    });
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose() {
    this.pause();
    this.disposed = true;
    for (const d of this.disposables) d.dispose();
    this.landscape?.dispose();
    this.renderer.dispose();
  }
}
