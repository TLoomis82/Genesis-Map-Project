import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapFeature } from "../data/types.ts";
import type { GlobeCamera } from "./beats.ts";
import { cloudStatus, createCloudLayer } from "./cloudLayer.ts";

// The one Mapbox globe used by the whole story. It is created a little before the opening
// fades away, sits underneath the opening canvas, and from day 5 on it is the stage: each beat
// eases the camera to a resting position and shows that scene's pins.
//
// Placeholder: it shows today's continents with labels turned off. The pre-flood land model
// (tier "model") replaces this in M2.

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// Labels and borders belong to the modern world, not to Genesis.
const HIDDEN = ["showPlaceLabels", "showRoadLabels", "showPointOfInterestLabels", "showTransitLabels", "showAdminBoundaries"];

/** The zoom the story's whole-globe views were written at; they are rescaled to fit the screen. */
const WHOLE_GLOBE_ZOOM = 1.4;

const easeInOut = (t: number) => t * t * (3 - 2 * t);

// M2 test: add ?land=200 to the address to cover today's map with a land model.
//
//   ?land=000 | 085 | 200 | 250 | 540   Scotese and Wright PaleoDEMs (CC BY 4.0), by age in millions of
//                                       years on the conventional scale. 200 and 250 are the Pangaea-like
//                                       shapes the pre-flood land layer will start from.
//   ?land=cw                            The Clarey and Werner (2023, Fig. 17) pre-flood map, traced from their
//                                       figure. Its picture is NOT in this repository: permission from the
//                                       copyright holders is pending. It shows only if
//                                       public/land/private/clarey-werner-2023.jpg exists on this machine,
//                                       VITE_SHOW_PRIVATE=1 is set in .env.local, and the app runs with `npm run dev`.
//
//   &relief=30                          How many times taller than life the Scotese land stands (default 30,
//                                       0 for flat). Real mountains are too low to see from space, so the
//                                       height is exaggerated; the shape comes from the data.
//
// Each model is one picture draped over the globe, plus height tiles for 3D relief, both made by
// scripts/land-texture.py. This proves the drawing method; no scene uses it yet.
const TEST_LAND = new URLSearchParams(window.location.search).get("land");
// Private material shows only on a developer's machine (`npm run dev`) with VITE_SHOW_PRIVATE=1 in .env.local.
const SHOW_PRIVATE = import.meta.env.DEV && import.meta.env.VITE_SHOW_PRIVATE === "1";
const PRIVATE_LAND = TEST_LAND === "cw" && SHOW_PRIVATE;
/** True when a land model should be drawn: a known age, or the private map with private material switched on. */
const LAND_ON = TEST_LAND !== null && (PRIVATE_LAND || /^\d{3}$/.test(TEST_LAND));
const RELIEF = Number(new URLSearchParams(window.location.search).get("relief") ?? 30);
const MERCATOR_EDGE = 85.0511; // the furthest north and south a Mapbox picture can reach
const WORLD = {
  type: "Feature" as const,
  properties: {},
  geometry: { type: "Polygon" as const, coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]] },
};

function addTestLand(m: mapboxgl.Map, age: string) {
  const file = PRIVATE_LAND ? "private/clarey-werner-2023.jpg" : `scotese-${age}ma.jpg`;
  // Deep-sea colour underneath, so today's map does not show around the picture's edges.
  m.addSource("model-sea", { type: "geojson", data: WORLD });
  m.addLayer({ id: "model-sea", type: "fill", source: "model-sea", paint: { "fill-color": "#0c2a4e", "fill-emissive-strength": 1 } });
  m.addSource("model-land", {
    type: "image",
    url: `${import.meta.env.BASE_URL}land/${file}`,
    coordinates: [
      [-180, MERCATOR_EDGE],
      [180, MERCATOR_EDGE],
      [180, -MERCATOR_EDGE],
      [-180, -MERCATOR_EDGE],
    ],
  });
  m.addLayer({
    id: "model-land",
    type: "raster",
    source: "model-land",
    paint: { "raster-fade-duration": 0, "raster-emissive-strength": 1 },
  });
  // 3D relief from the model's own heights (Scotese only; the private map has no heights).
  if (!PRIVATE_LAND && RELIEF > 0) {
    m.addSource("model-dem", {
      type: "raster-dem",
      tiles: [`${window.location.origin}${import.meta.env.BASE_URL}land/dem/scotese-${age}ma/{z}/{x}/{y}.png`],
      tileSize: 256,
      encoding: "mapbox",
      maxzoom: 3,
    });
    m.setTerrain({ source: "model-dem", exaggeration: RELIEF });
  }
}

const CLOUDS_ON = new URLSearchParams(window.location.search).get("clouds") !== "0";
const DEBUG = new URLSearchParams(window.location.search).has("debug");
/** What happened when the land and the clouds were added, for the ?debug readout. */
const globeStatus = { land: "style not loaded yet", clouds: "style not loaded yet", errors: [] as string[] };

/** With ?debug: a small readout of what the globe is doing, so a screenshot shows what went wrong. */
function GlobeReadout({ map }: { map: mapboxgl.Map | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(timer);
  }, []);
  const terrain = map?.getTerrain();
  return (
    <pre className="globe-readout">
      {[
        `zoom ${map ? map.getZoom().toFixed(2) : "-"}  pitch ${map ? map.getPitch().toFixed(0) : "-"}  projection ${map?.getProjection()?.name ?? "-"}`,
        `land: ${globeStatus.land}`,
        `relief: ${terrain ? `on, ${terrain.exaggeration} times` : "off"}`,
        `clouds: ${globeStatus.clouds}; frames ${cloudStatus.frames}; strength ${cloudStatus.opacity.toFixed(2)}; seen as "${cloudStatus.projection}"`,
        cloudStatus.error ? `cloud error: ${cloudStatus.error}` : "",
        ...globeStatus.errors.map((e) => `map error: ${e}`),
      ]
        .filter(Boolean)
        .join("\n")}
    </pre>
  );
}

interface Props {
  /** Camera for the current beat, or null while the opening is still on screen. */
  camera: GlobeCamera | null;
  /** Seconds the current beat holds, used to time a slow drift. */
  hold: number;
  /** Features to pin for the current scene (already filtered by the "text only" switch). */
  pins: MapFeature[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function GlobeStage({ camera, hold, pins, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!TOKEN || !container.current) return;
    mapboxgl.accessToken = TOKEN;
    const m = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/standard",
      projection: "globe",
      center: [43.5, 28.0],
      zoom: 1.4,
    });
    m.on("style.load", () => {
      for (const key of HIDDEN) {
        try {
          m.setConfigProperty("basemap", key, false);
        } catch {
          // Older or newer style versions may not have every setting; skip the ones that are missing.
        }
      }
      m.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.02,
        "space-color": "rgb(0, 0, 0)",
        "star-intensity": 0.6, // the globe is first shown at the end of day 4, when the stars are there
      });
      // Each addition is tried on its own, so one failing does not stop the rest, and the reason is kept
      // for the ?debug readout.
      try {
        if (LAND_ON && TEST_LAND) addTestLand(m, TEST_LAND);
        globeStatus.land = LAND_ON ? "added" : TEST_LAND ? `not shown ("${TEST_LAND}" is not a known land)` : "none asked for (add ?land=200)";
      } catch (e) {
        globeStatus.land = `failed: ${e instanceof Error ? e.message : String(e)}`;
      }
      // Slow clouds around the globe, seen from far out. Add ?clouds=0 to the address to switch them off.
      try {
        if (CLOUDS_ON) m.addLayer(createCloudLayer());
        globeStatus.clouds = CLOUDS_ON ? "added" : "switched off";
      } catch (e) {
        globeStatus.clouds = `failed: ${e instanceof Error ? e.message : String(e)}`;
      }
      setReady(true);
    });
    m.on("error", (e) => {
      globeStatus.errors = [...globeStatus.errors, e.error?.message ?? "unknown map error"].slice(-3);
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // One eased move per beat. A drift, where asked for, is a second single eased move that starts
  // when the first one ends. The viewer can still spin the globe by hand at any time.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !camera) return;
    // Whole-globe views are sized to the screen: the globe fills about four fifths of the space above
    // the verse, on a wide monitor and on a phone alike. Close views keep the zoom they were given.
    const box = m.getContainer();
    const lift = box.clientHeight * 0.2; // room for the verse underneath
    const fitted = Math.log2((0.8 * Math.min(box.clientWidth, box.clientHeight - lift) * Math.PI) / 512);
    const wide = 1 - Math.min(Math.max((camera.zoom - 2.5) / 1.5, 0), 1); // 1 for whole-globe views, 0 from zoom 4
    m.easeTo({
      center: camera.center,
      zoom: camera.zoom + (fitted - WHOLE_GLOBE_ZOOM) * wide,
      padding: { top: 0, left: 0, right: 0, bottom: lift * wide },
      pitch: camera.pitch ?? 0,
      bearing: camera.bearing ?? 0,
      duration: camera.seconds * 1000,
      easing: easeInOut,
    });
    if (!camera.driftDegrees) return;
    const driftSeconds = Math.max(hold - camera.seconds, 6);
    const timer = window.setTimeout(() => {
      m.easeTo({
        center: [camera.center[0] + camera.driftDegrees!, camera.center[1]],
        duration: driftSeconds * 1000,
        easing: easeInOut,
      });
    }, camera.seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [camera, hold, ready]);

  // Pins for the current scene. The tier decides the outline: solid for the text, dashed for a
  // scholar's reading, dotted for a model. A position with no research behind it is hollow.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const markers = pins
      .filter((f) => f.approxCenter && !f.noPin)
      .map((f) => {
        const el = document.createElement("button");
        el.className = `pin pin-${f.tier} ${f.confidence === "illustration" ? "pin-illustration" : ""} ${f.id === selectedId ? "is-selected" : ""}`;
        el.setAttribute("aria-label", f.name);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(f.id);
        });
        const label = document.createElement("span");
        label.className = "pin-label";
        label.textContent = f.name;
        el.appendChild(label);
        return new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(f.approxCenter!).addTo(m);
      });
    return () => markers.forEach((marker) => marker.remove());
  }, [pins, selectedId, onSelect, ready]);

  if (!TOKEN) {
    return camera ? <div className="notice globe-notice">The globe needs a Mapbox token in VITE_MAPBOX_TOKEN (.env.local).</div> : null;
  }
  return (
    <>
      <div ref={container} className="globe" />
      {DEBUG && camera && <GlobeReadout map={map.current} />}
      {LAND_ON && camera && (
        <p className="land-credit">
          <span className="tier-badge tier-model">Model</span>
          {PRIVATE_LAND
            ? "Private test, not for publication: pre-flood land after Clarey and Werner (2023), Fig. 17. Permission pending. The zones are theirs; the surface texture and the position on the globe are ours."
            : `Land test: ${Number(TEST_LAND)} million years ago on the conventional scale. Heights drawn ${RELIEF > 0 ? `${RELIEF} times taller than life` : "flat"}. A test of the drawing method only. Scotese and Wright (2018), CC BY 4.0.`}
        </p>
      )}
    </>
  );
}
