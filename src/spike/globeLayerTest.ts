// M0 globe test, part 1: does a three.js custom layer draw correctly on the Mapbox globe?
//
// It draws three things that are easy to judge by eye against the base map:
//   - a red ring on the equator
//   - a blue ring on the prime meridian (through Greenwich)
//   - a dot at each feature in src/data/features.ts that has coordinates
// If the rings and dots sit where they should and stay put while the globe spins, the test passes.
//
// How Mapbox draws custom layers on the globe (read from its source, src/render/draw_custom.ts):
// the matrix always expects mercator coordinates, and a second matrix converts earth-centred
// globe coordinates (sphere of radius EXTENT / (2 * PI), y pointing south) into mercator.
// So the camera is: matrix x globeToMercator. This holds below zoom 5; between zoom 5 and 6
// Mapbox blends the globe into flat mercator, which this test does not handle yet.
//
// Hiding the far side: Mapbox also passes a horizon plane (renderParameters.globeClippingPlane).
// A point faces the camera when n . p + d >= 0. The layer clips against that plane instead of
// relying on the depth buffer, which hid the rings on the near side too in the first run.

import * as THREE from "three";
import type mapboxgl from "mapbox-gl";
import { features } from "../data/features.ts";

const GLOBE_RADIUS = 8192 / Math.PI / 2;

/** Longitude and latitude in degrees to Mapbox globe coordinates. */
function lngLatToGlobe(lng: number, lat: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lng * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(la) * Math.sin(lo) * radius,
    -Math.sin(la) * radius,
    Math.cos(la) * Math.cos(lo) * radius,
  );
}

function ring(points: THREE.Vector3[], color: number): THREE.LineLoop {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color, depthTest: false }));
}

export interface LayerDebug {
  renderCalls: number;
  argCount: number;
  projection: string;
  transition: number | null;
  horizonPlane: boolean;
  markers: number;
  error: string | null;
}

export interface GlobeTestLayer {
  layer: mapboxgl.CustomLayerInterface;
  debug: LayerDebug;
  setDepthTest(on: boolean): void;
}

export function createGlobeTestLayer(): GlobeTestLayer {
  const debug: LayerDebug = { renderCalls: 0, argCount: 0, projection: "unknown", transition: null, horizonPlane: false, markers: 0, error: null };

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const globeToMercatorMatrix = new THREE.Matrix4();
  // Horizon plane, updated every frame. Starts as "everything visible".
  const horizon = new THREE.Plane(new THREE.Vector3(0, 0, 1), 1e9);
  const materials: THREE.Material[] = [];
  let renderer: THREE.WebGLRenderer | null = null;
  let map: mapboxgl.Map | null = null;

  const lift = GLOBE_RADIUS * 1.003; // just above the surface so lines are not buried

  // Equator (red) and prime meridian (blue).
  const equator: THREE.Vector3[] = [];
  const meridian: THREE.Vector3[] = [];
  for (let i = 0; i < 360; i += 2) {
    equator.push(lngLatToGlobe(i - 180, 0, lift));
    meridian.push(i < 180 ? lngLatToGlobe(0, i - 90, lift) : lngLatToGlobe(180, 270 - i, lift));
  }
  const equatorRing = ring(equator, 0xff4d4d);
  const meridianRing = ring(meridian, 0x4da3ff);
  scene.add(equatorRing, meridianRing);
  materials.push(equatorRing.material as THREE.Material, meridianRing.material as THREE.Material);

  // One dot per feature that has coordinates. White = text tier, gold = scholarly.
  const dotGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 0.012, 16, 12);
  for (const f of features) {
    if (!f.approxCenter) continue;
    const material = new THREE.MeshBasicMaterial({ color: f.tier === "text" ? 0xffffff : 0xffc94d, depthTest: false });
    const dot = new THREE.Mesh(dotGeometry, material);
    dot.position.copy(lngLatToGlobe(f.approxCenter[0], f.approxCenter[1], lift));
    dot.name = f.id;
    scene.add(dot);
    materials.push(material);
    debug.markers += 1;
  }

  for (const mat of materials) mat.clippingPlanes = [horizon];

  const layer = {
    id: "m0-globe-test",
    type: "custom",
    renderingMode: "3d",

    onAdd(m: mapboxgl.Map, gl: WebGL2RenderingContext) {
      map = m;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
        renderer.autoClear = false;
        renderer.localClippingEnabled = true;
      } catch (e) {
        debug.error = e instanceof Error ? e.message : String(e);
      }
    },

    // Mapbox passes extra arguments on globe: projection, projection-to-mercator matrix,
    // transition (0 = full globe, 1 = full mercator), centre, pixels per metre.
    render(_gl: WebGL2RenderingContext, matrix: number[], projection?: { name?: string }, globeToMercator?: number[], transition?: number) {
      debug.renderCalls += 1;
      debug.argCount = arguments.length;
      debug.projection = projection?.name ?? "not passed";
      debug.transition = typeof transition === "number" ? transition : null;
      if (!renderer || !map) return;
      // Eighth argument: per-frame render parameters, including the globe horizon plane.
      const params = arguments[7] as { globeClippingPlane?: readonly number[] | null } | undefined;
      const plane = params?.globeClippingPlane;
      debug.horizonPlane = Array.isArray(plane);
      if (plane && plane.length === 4) {
        horizon.normal.set(plane[0], plane[1], plane[2]);
        horizon.constant = plane[3];
      } else {
        horizon.normal.set(0, 0, 1);
        horizon.constant = 1e9;
      }
      try {
        camera.projectionMatrix.fromArray(matrix);
        if (projection?.name === "globe" && globeToMercator) {
          camera.projectionMatrix.multiply(globeToMercatorMatrix.fromArray(globeToMercator));
        }
        renderer.resetState();
        renderer.render(scene, camera);
      } catch (e) {
        debug.error = e instanceof Error ? e.message : String(e);
      }
      map.triggerRepaint();
    },

    onRemove() {
      dotGeometry.dispose();
      for (const mat of materials) mat.dispose();
      renderer = null;
      map = null;
    },
  };

  return {
    layer: layer as unknown as mapboxgl.CustomLayerInterface,
    debug,
    setDepthTest(on: boolean) {
      for (const mat of materials) {
        mat.depthTest = on;
        mat.needsUpdate = true;
      }
      map?.triggerRepaint();
    },
  };
}
