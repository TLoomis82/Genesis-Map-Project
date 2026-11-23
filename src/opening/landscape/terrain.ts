// The land of day 3 (Gen 1:9-13) and the route the view flies over it.
//
// The shape is illustrative: the text says dry land appeared, and nothing about its form.
// It is built as a coast, a winding valley running inland, hills beside it and mountains beyond,
// so a low flight has something to travel through.
//
// Units are roughly metres. Sea level is y = 0. The view starts at the origin, facing -z (inland).

import * as THREE from "three";
import { fbm, noise2, ridged, smoothstep } from "./noise.ts";

export const LAND = {
  halfWidth: 700,
  near: 60, // -z of the seaward edge
  far: 1700, // -z of the inland edge
} as const;

// Route of the flight: [x, z, height above the ground or water].
const ROUTE: [number, number, number][] = [
  [0, 0, 3.2], // on the water, where days 1 and 2 are seen from
  [0, -90, 3.6],
  [14, -190, 30], // rising before the shore, to take in the land and the sea
  [42, -300, 38],
  [12, -420, 12], // down into the valley
  [-58, -560, 5],
  [-108, -700, 4.5],
  [-62, -850, 5],
  [28, -980, 5],
  [88, -1120, 6],
  [58, -1260, 9],
  [0, -1400, 34], // lifting over the head of the valley
];

/** x of the valley floor at a given z, following the route. */
function valleyCenter(z: number): number {
  const d = -z;
  for (let i = 1; i < ROUTE.length; i++) {
    const a = ROUTE[i - 1];
    const b = ROUTE[i];
    if (d <= -b[1]) {
      const t = smoothstep(-a[1], -b[1], d);
      return a[0] + (b[0] - a[0]) * t;
    }
  }
  return ROUTE[ROUTE.length - 1][0];
}

/** Height of the ground at a point. Below zero is under the sea. */
export function heightAt(x: number, z: number): number {
  const d = -z; // distance inland
  const side = Math.abs(x - valleyCenter(z));

  const inland = smoothstep(150, 340, d);
  const floor = 2.5 + 16 * smoothstep(250, 1400, d) + (fbm(x * 0.012, z * 0.012, 3) - 0.5) * 5;
  const hills = smoothstep(22, 260, side) * (34 + 120 * fbm(x * 0.0042 + 3.1, z * 0.0042, 4));
  const mountains = smoothstep(190, 620, side) * 210 * ridged(x * 0.0026, z * 0.0026 + 8.0, 5);
  const headwall = smoothstep(1330, 1640, d) * 150 * (0.4 + 0.6 * ridged(x * 0.003 + 5.0, z * 0.003, 4));
  const detail = (fbm(x * 0.045, z * 0.045, 3) - 0.5) * 2.2 * smoothstep(8, 60, side);

  const land = floor + hills + mountains + headwall + detail;
  const seabed = -9 - 5 * noise2(x * 0.01, z * 0.01);
  let y = seabed + (land - seabed) * inland;

  // Fall back into the sea at the sides and the far edge, so the land has no cut-off.
  const edge = (1 - smoothstep(540, 690, Math.abs(x))) * (1 - smoothstep(1560, 1695, d));
  y = seabed + (y - seabed) * edge;
  return y;
}

export interface Flight {
  curve: THREE.CatmullRomCurve3;
  /** Route progress (0..1) of the point on the route level with a given z. */
  progressAtZ(z: number): number;
  length: number;
}

export function buildFlight(): Flight {
  const points = ROUTE.map(([x, z, above]) => new THREE.Vector3(x, Math.max(heightAt(x, z), 0) + above, z));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");

  // The route always heads inland, so z identifies a place along it.
  const samples = 400;
  const zs: number[] = [];
  for (let i = 0; i <= samples; i++) zs.push(curve.getPointAt(i / samples).z);
  const progressAtZ = (z: number) => {
    if (z >= zs[0]) return 0;
    if (z <= zs[samples]) return 1 + (zs[samples] - z) / 1500; // beyond the end: keeps counting up
    let lo = 0;
    let hi = samples;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (zs[mid] > z) lo = mid;
      else hi = mid;
    }
    const span = zs[lo] - zs[hi] || 1;
    return (lo + (zs[lo] - z) / span) / samples;
  };

  return { curve, progressAtZ, length: curve.getLength() };
}

const rgb = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const SAND = rgb(0.66, 0.6, 0.47);
const SOIL_A = rgb(0.36, 0.28, 0.2);
const SOIL_B = rgb(0.47, 0.39, 0.28);
const ROCK_A = rgb(0.33, 0.31, 0.3);
const ROCK_B = rgb(0.5, 0.47, 0.44);

/** Lattice noise that repeats every `period` cells, so a texture made from it tiles without seams. */
function tileNoise(x: number, y: number, period: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const at = (cx: number, cy: number) => {
    const px = ((cx % period) + period) % period;
    const py = ((cy % period) + period) % period;
    let h = Math.imul(px + seed * 131, 374761393) ^ Math.imul(py + seed * 17, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const a = at(ix, iy);
  const b = at(ix + 1, iy);
  const c = at(ix, iy + 1);
  const d = at(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Fine grain so the ground is not flat colour up close. Generated, so no image file is needed. */
function buildGrainTexture(): THREE.DataTexture {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Four layers from coarse clods down to grit, each repeating exactly across the tile.
      const n =
        0.34 * tileNoise(x / 32, y / 32, 8, 1) +
        0.28 * tileNoise(x / 12.8, y / 12.8, 20, 2) +
        0.22 * tileNoise(x / 4, y / 4, 64, 3) +
        0.16 * tileNoise(x / 1.6, y / 1.6, 160, 4);
      const value = Math.round(255 * (0.55 + 0.45 * n));
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** The ground at a point, read from the mesh that is actually drawn, so plants sit exactly on it. */
export interface GroundSample {
  y: number;
  /** 1 = flat, 0 = vertical. */
  flat: number;
}

export interface Terrain {
  mesh: THREE.Mesh;
  /** Fast lookup of the drawn surface. Returns false outside the land. */
  sample(x: number, z: number, out: GroundSample): boolean;
  /** Shared with the grass: how far the growth has reached along the route. */
  uniforms: { uFront: { value: number }; uBand: { value: number } };
  dispose(): void;
}

export function buildTerrain(flight: Flight): Terrain {
  const cols = 360;
  const rows = 420;
  const geometry = new THREE.PlaneGeometry(1, 1, cols, rows);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const progress = new Float32Array(count);
  const fertile = new Float32Array(count);
  const color = new THREE.Color();

  // Pass 1: shape. Plane coordinates run -0.5..0.5; columns are packed closer near the valley,
  // where the view flies.
  for (let i = 0; i < count; i++) {
    const u = pos.getX(i) * 2;
    const v = pos.getY(i) + 0.5;
    const x = Math.sign(u) * Math.pow(Math.abs(u), 1.6) * LAND.halfWidth;
    const z = -(LAND.near + v * (LAND.far - LAND.near));
    pos.setXYZ(i, x, heightAt(x, z), z);
    uv.setXY(i, x / 14, z / 14);
  }
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal as THREE.BufferAttribute;

  // Pass 2: colour and fertility, from height and slope.
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const flat = normal.getY(i);

    const patchy = fbm(x * 0.02 + 40, z * 0.02, 3);
    color.copy(SOIL_A).lerp(SOIL_B, patchy);
    color.lerp(ROCK_A.clone().lerp(ROCK_B, noise2(x * 0.05, z * 0.05)), 1 - smoothstep(0.72, 0.9, flat));
    color.lerp(ROCK_B, smoothstep(90, 170, y) * 0.7);
    color.lerp(SAND, 1 - smoothstep(0.6, 3.2, y));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    progress[i] = flight.progressAtZ(z);
    // For the ground's own green: meadow climbs the gentler hillsides; steep rock and high peaks stay bare.
    fertile[i] = smoothstep(0.8, 3.0, y) * smoothstep(0.5, 0.8, flat) * (1 - smoothstep(120, 200, y));
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aProgress", new THREE.BufferAttribute(progress, 1));
  geometry.setAttribute("aFertile", new THREE.BufferAttribute(fertile, 1));

  const grain = buildGrainTexture();
  const uniforms = { uFront: { value: -1 }, uBand: { value: 0.03 } };
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: grain,
    bumpMap: grain,
    bumpScale: 0.6,
    roughness: 0.95,
    metalness: 0,
  });

  // The ground itself turns green where growth has reached, so distant slopes read as grass
  // beyond the range where individual blades are drawn.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFront = uniforms.uFront;
    shader.uniforms.uBand = uniforms.uBand;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aProgress;\nattribute float aFertile;\nvarying float vProgress;\nvarying float vFertile;",
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvProgress = aProgress;\nvFertile = aFertile;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uFront;\nuniform float uBand;\nvarying float vProgress;\nvarying float vFertile;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float grown = clamp((uFront - vProgress) / uBand, 0.0, 1.0) * vFertile;
        vec3 turf = mix(vec3(0.020, 0.075, 0.012), vec3(0.085, 0.20, 0.035), smoothstep(0.03, 0.14, diffuseColor.g));
        diffuseColor.rgb = mix(diffuseColor.rgb, turf, grown * 0.9);`,
      );
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  // Lookup into the grid of vertices. Columns were spaced by a power curve, so undo it to find the cell.
  const stride = cols + 1;
  const sample = (x: number, z: number, out: GroundSample): boolean => {
    const u = (Math.sign(x) * Math.pow(Math.abs(x) / LAND.halfWidth, 1 / 1.6) + 1) / 2; // 0..1 across
    const v = (-z - LAND.near) / (LAND.far - LAND.near); // 0..1 inland
    if (!(u >= 0 && u < 1 && v >= 0 && v < 1)) return false;
    const fc = u * cols;
    const fr = (1 - v) * rows; // the plane's rows run from far to near
    const c0 = Math.min(Math.floor(fc), cols - 1);
    const r0 = Math.min(Math.floor(fr), rows - 1);
    const tx = fc - c0;
    const tz = fr - r0;
    const a = r0 * stride + c0;
    const b = a + 1;
    const c = a + stride;
    const d = c + 1;
    const w00 = (1 - tx) * (1 - tz);
    const w10 = tx * (1 - tz);
    const w01 = (1 - tx) * tz;
    const w11 = tx * tz;
    out.y = pos.getY(a) * w00 + pos.getY(b) * w10 + pos.getY(c) * w01 + pos.getY(d) * w11;
    out.flat = normal.getY(a) * w00 + normal.getY(b) * w10 + normal.getY(c) * w01 + normal.getY(d) * w11;
    return true;
  };

  return {
    mesh,
    uniforms,
    sample,
    dispose() {
      geometry.dispose();
      material.dispose();
      grain.dispose();
    },
  };
}
