// A thin shell of slow-moving cloud around the Mapbox globe, drawn as a three.js custom layer.
//
// It draws three things, all decoration, none of them a claim about the story:
//   - clouds that drift slowly,
//   - the soft shadows those clouds cast on the surface,
//   - a day side and a night side, with a soft edge between them.
// They make the globe read as a living, sunlit world from space. All of it fades out as the camera
// comes down (above zoom 3.5 to 4.5), so close views of the land are clear and evenly lit.
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
    float cover = smoothstep(0.53, 0.74, density + (systems - 0.5) * 0.4);   // clear sky between systems, no milky haze
    return cover * (0.62 + 0.38 * fbm(p * 13.0 + warp * 3.0));   // break up the solid middles
  }

  void main() {
    // Hide the half of the shell that is behind the globe.
    float facing = (dot(uHorizon.xyz, vPos) + uHorizon.w) / length(vPos);
    if (facing < 0.0) discard;
    float rim = smoothstep(0.0, 0.10, facing);   // thin the clouds out toward the edge of the disc

    vec3 n = normalize(vPos);
    float day = smoothstep(-0.22, 0.38, dot(n, uSun));   // 1 in full sun, 0 well into the night side

    float cloud = cloudAt(n) * rim * 0.85;
    // A cloud's shadow falls a little way from it, on the side away from the sun.
    float shadow = uShadows > 0.5 ? cloudAt(normalize(n + uSun * 0.035)) * 0.34 * day : 0.0;
    float night = (1.0 - day) * 0.62;
    float dark = 1.0 - (1.0 - shadow) * (1.0 - night);

    vec3 cloudColor = mix(vec3(0.80, 0.85, 0.92), vec3(1.0), smoothstep(0.2, 0.9, cloud)) * (0.22 + 0.78 * day);
    float alpha = (cloud + dark * (1.0 - cloud)) * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(cloudColor * cloud / max(cloud + dark * (1.0 - cloud), 0.0001), alpha);
  }
`;

/** For the ?debug readout: is the layer being drawn, and did anything go wrong? */
export const cloudStatus = { frames: 0, opacity: 0, projection: "not drawn yet", error: null as string | null };

export function createCloudLayer(): CustomLayerInterface {
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
      cloudStatus.frames += 1;
      cloudStatus.opacity = shown;
      cloudStatus.projection = projection?.name ?? "not passed";
      if (shown <= 0) return;

      const params = arguments[7] as { globeClippingPlane?: readonly number[] | null } | undefined;
      const plane = params?.globeClippingPlane;
      if (plane && plane.length === 4) uniforms.uHorizon.value.set(plane[0], plane[1], plane[2], plane[3]);
      else uniforms.uHorizon.value.set(0, 0, 1, 1e9);

      uniforms.uTime.value = (performance.now() - started) / 1000;
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
      renderer = null;
      map = null;
    },
  };
  return layer as unknown as CustomLayerInterface;
}
