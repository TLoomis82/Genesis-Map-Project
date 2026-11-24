// A thin shell of slow-moving cloud around the Mapbox globe, drawn as a three.js custom layer.
//
// It draws the sky, which is decoration and no claim about the story:
//   - clouds that drift slowly,
//   - the soft shadows those clouds cast on the surface,
//   - a day side and a night side, with a soft edge between them.
// And it draws the flood: water over every part of the land that lies below the current water
// level, read from a picture of the land model's heights. The story sets the level and how stormy
// the sky is; both glide to their new values. How high the water stands at each verse is
// illustrative (the text gives dates, and says all the high hills were covered).
//
// All of it fades out as the camera comes down (above zoom 3.5 to 4.5).
//
// The drawing method is the one proved in the M0 globe test (src/spike/globeLayerTest.ts): the
// camera is Mapbox's matrix times its globe-to-mercator matrix, positions are in Mapbox's globe
// coordinates, and the far side is hidden with the horizon plane Mapbox passes each frame.

import * as THREE from "three";
import type { CustomLayerInterface, Map as MapboxMap } from "mapbox-gl";

const GLOBE_RADIUS = 8192 / Math.PI / 2;
/** How far above the surface the shell sits, as a share of the globe's radius. */
const SHELL_HEIGHT = 1.008;
/** Clouds are fully shown below the first zoom and gone above the second. */
const FADE_FROM = 3.5;
const FADE_TO = 4.5;

/** Unit vector toward a longitude and latitude, in Mapbox globe coordinates (y points south). */
function sunDirection(lng: number, lat: number): THREE.Vector3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lng * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo));
}

const vertexShader = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec4 uHorizon;   // plane: a point p faces the camera when dot(n, p) + d >= 0
  uniform float uOctaves;
  uniform vec3 uSun;       // direction to the sun, in globe coordinates
  uniform float uShadows;  // 1 = draw cloud shadows, 0 = skip them (phones)
  uniform sampler2D uHeight;   // land heights: 0 = sea level or below, 1 = 6375 m
  uniform float uHasHeight;    // 1 when a height picture is loaded
  uniform float uLevel;        // flood water level, metres above the old sea level
  uniform float uStorm;        // 0 = fair weather, 1 = the sky closed over
  varying vec3 vPos;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      if (float(i) >= uOctaves) break;
      sum += amp * noise(p);
      p = p * 2.03 + 7.1;
      amp *= 0.5;
    }
    return sum;
  }

  // How much cloud there is in direction n (0..1), before any fading.
  float cloudAt(vec3 n) {
    // The whole field turns slowly about the poles (the globe's y axis), and its shape drifts.
    float a = uTime * 0.006;
    vec3 p = vec3(n.x * cos(a) - n.z * sin(a), n.y, n.x * sin(a) + n.z * cos(a));
    vec3 warp = vec3(fbm(p * 2.1 + uTime * 0.004), fbm(p * 2.1 + 31.7), fbm(p * 2.1 - 12.3));
    float density = fbm(p * 4.6 + warp * 1.9 + vec3(0.0, uTime * 0.003, 0.0));
    // Broad weather systems decide where cloud gathers; the finer field gives it its shape.
    float systems = fbm(p * 1.3 + 4.0);
    // Fair weather leaves clear sky between systems; a storm fills most of it in.
    float cover = smoothstep(0.53 - 0.20 * uStorm, 0.74 - 0.16 * uStorm, density + (systems - 0.5) * 0.4 * (1.0 - 0.6 * uStorm));
    return cover * (0.62 + 0.38 * fbm(p * 13.0 + warp * 3.0));   // break up the solid middles
  }

  void main() {
    // Hide the half of the shell that is behind the globe.
    float facing = (dot(uHorizon.xyz, vPos) + uHorizon.w) / length(vPos);
    if (facing < 0.0) discard;
    float rim = smoothstep(0.0, 0.10, facing);   // thin the clouds out toward the edge of the disc

    vec3 n = normalize(vPos);
    float day = smoothstep(-0.22, 0.38, dot(n, uSun));   // 1 in full sun, 0 well into the night side

    // The flood: water wherever the land lies below the water level.
    float water = 0.0;
    vec3 waterColor = vec3(0.0);
    if (uLevel > 0.5) {
      float lat = asin(clamp(-n.y, -1.0, 1.0));              // the globe's y axis points south
      vec2 uv = vec2(atan(n.x, n.z) / 6.2831853 + 0.5, 0.5 - lat / 3.14159265);
      float ground = uHasHeight > 0.5 ? texture2D(uHeight, uv).r * 6375.0 : 0.0;
      float depth = uLevel - ground;                          // metres of flood water above this spot
      float shore = smoothstep(0.0, 90.0, depth);
      float body = smoothstep(0.0, 1500.0, depth);
      float churn = 1.0 - smoothstep(40.0, 420.0, depth);     // paler, churned water near the new shore
      water = shore * (0.6 + 0.38 * body);
      waterColor = mix(vec3(0.30, 0.40, 0.45), vec3(0.05, 0.12, 0.23), body) + churn * 0.13;
      waterColor *= 0.90 + 0.20 * noise(n * 90.0 + vec3(uTime * 0.05, 0.0, uTime * 0.03));
    }

    float cloud = cloudAt(n) * rim * (0.85 + 0.1 * uStorm);
    // A cloud's shadow falls a little way from it, on the side away from the sun.
    float shadow = uShadows > 0.5 ? cloudAt(normalize(n + uSun * 0.035)) * 0.34 * day : 0.0;
    float night = (1.0 - day) * 0.62;
    float dark = 1.0 - (1.0 - shadow) * (1.0 - night);

    vec3 cloudColor = mix(vec3(0.80, 0.85, 0.92), vec3(1.0), smoothstep(0.2, 0.9, cloud));
    cloudColor = mix(cloudColor, vec3(0.52, 0.55, 0.60), uStorm * 0.7) * (0.22 + 0.78 * day);

    // Bottom to top: flood water, then darkness (night and cloud shadow), then cloud.
    float seen = 1.0 - (1.0 - water) * (1.0 - dark) * (1.0 - cloud);
    if (seen * uOpacity < 0.004) discard;
    vec3 color = waterColor * water * (1.0 - dark) * (1.0 - cloud) + cloudColor * cloud;
    gl_FragColor = vec4(color / max(seen, 0.0001), seen * uOpacity);
  }
`;

/** For the ?debug readout: is the layer being drawn, and did anything go wrong? */
export const cloudStatus = { frames: 0, opacity: 0, projection: "not drawn yet", level: 0, storm: 0, error: null as string | null };

/** What the story asks of the sky and the flood for one beat. */
export interface FloodState {
  /** Water level in metres above the old sea level. 0 = no flood. */
  level: number;
  /** 0 = fair weather, 1 = the sky closed over. */
  storm: number;
}

export interface SkyLayer {
  layer: CustomLayerInterface;
  /** Glide the water level and the weather toward new values, or jump straight to them. */
  setFlood(state: FloodState, jump?: boolean): void;
  /** The picture of land heights the flood is measured against, or null for none (water rises evenly). */
  setHeights(url: string | null): void;
}

/** Metres per second the water level may change at most, so a rise always reads as a rise. */
const LEVEL_SPEED = 884;

export function createCloudLayer(): SkyLayer {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const globeToMercatorMatrix = new THREE.Matrix4();
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uHorizon: { value: new THREE.Vector4(0, 0, 1, 1e9) },
    uOctaves: { value: small ? 4 : 5 },
    uSun: { value: sunDirection(-12, 16) },
    uShadows: { value: small ? 0 : 1 },
    uHeight: { value: null as THREE.Texture | null },
    uHasHeight: { value: 0 },
    uLevel: { value: 0 },
    uStorm: { value: 0 },
  };
  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS * SHELL_HEIGHT, 96, 64);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // Both sides: Mapbox's globe coordinates have y pointing south, which mirrors the sphere, so the faces
    // toward the camera count as "back" faces. The horizon test in the shader removes the far half.
    side: THREE.DoubleSide,
  });
  scene.add(new THREE.Mesh(geometry, material));

  let renderer: THREE.WebGLRenderer | null = null;
  let map: MapboxMap | null = null;
  const started = performance.now();
  let last = started;
  const want: FloodState = { level: 0, storm: 0 };
  const loader = new THREE.TextureLoader();
  let heightsUrl: string | null = null;

  const layer = {
    id: "story-clouds",
    type: "custom",
    renderingMode: "3d",

    onAdd(m: MapboxMap, gl: WebGL2RenderingContext) {
      map = m;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
        renderer.autoClear = false;
      } catch (e) {
        cloudStatus.error = e instanceof Error ? e.message : String(e);
      }
    },

    render(_gl: WebGL2RenderingContext, matrix: number[], projection?: { name?: string }, globeToMercator?: number[]) {
      if (!renderer || !map) return;
      // Only on the globe proper, and only while the camera is far enough out.
      const zoom = map.getZoom();
      const shown = projection?.name === "globe" && globeToMercator ? 1 - THREE.MathUtils.smoothstep(zoom, FADE_FROM, FADE_TO) : 0;
      uniforms.uOpacity.value = shown;
      // Glide the flood toward what the story asked for, whether or not anything is drawn this frame.
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const gap = want.level - uniforms.uLevel.value;
      uniforms.uLevel.value += THREE.MathUtils.clamp(gap * 1.5, -LEVEL_SPEED, LEVEL_SPEED) * dt;
      uniforms.uStorm.value += (want.storm - uniforms.uStorm.value) * (1 - Math.exp(-dt * 0.5));
      cloudStatus.level = uniforms.uLevel.value;
      cloudStatus.storm = uniforms.uStorm.value;
      cloudStatus.frames += 1;
      cloudStatus.opacity = shown;
      cloudStatus.projection = projection?.name ?? "not passed";
      if (shown <= 0) return;

      const params = arguments[7] as { globeClippingPlane?: readonly number[] | null } | undefined;
      const plane = params?.globeClippingPlane;
      if (plane && plane.length === 4) uniforms.uHorizon.value.set(plane[0], plane[1], plane[2], plane[3]);
      else uniforms.uHorizon.value.set(0, 0, 1, 1e9);

      uniforms.uTime.value = (now - started) / 1000;
      camera.projectionMatrix.fromArray(matrix).multiply(globeToMercatorMatrix.fromArray(globeToMercator!));
      try {
        renderer.resetState();
        renderer.render(scene, camera);
      } catch (e) {
        cloudStatus.error = e instanceof Error ? e.message : String(e);
      }
      map.triggerRepaint(); // keep the clouds moving
    },

    onRemove() {
      geometry.dispose();
      material.dispose();
      uniforms.uHeight.value?.dispose();
      renderer = null;
      map = null;
    },
  };
  return {
    layer: layer as unknown as CustomLayerInterface,
    setFlood(state, jump = false) {
      want.level = state.level;
      want.storm = state.storm;
      if (jump) {
        uniforms.uLevel.value = state.level;
        uniforms.uStorm.value = state.storm;
      }
      map?.triggerRepaint();
    },
    setHeights(url) {
      if (url === heightsUrl) return;
      heightsUrl = url;
      if (!url) {
        uniforms.uHasHeight.value = 0;
        return;
      }
      loader.load(url, (texture) => {
        if (url !== heightsUrl) return texture.dispose(); // a newer picture was asked for meanwhile
        texture.flipY = false; // row 0 of the picture is the north pole
        texture.wrapS = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearFilter; // no smaller copies: they smear across the date line
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        uniforms.uHeight.value?.dispose();
        uniforms.uHeight.value = texture;
        uniforms.uHasHeight.value = 1;
        map?.triggerRepaint();
      });
    },
  };
}
