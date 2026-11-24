import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapFeature } from "../data/types.ts";
import type { GlobeCamera } from "./beats.ts";
import { cloudStatus, createCloudLayer, type FloodState, type SkyLayer } from "./cloudLayer.ts";

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

// The land on the globe.
//
// Each story beat says which land it is shown on (see beats.ts): a land model, or today's map.
// A model is one picture draped over the globe plus height tiles for 3D relief, both made by
// scripts/land-texture.py from the Scotese and Wright PaleoDEMs (CC BY 4.0).
//
// For checks, the address can override the story's choice:
//   ?land=000 | 085 | 200 | 250 | 540   one of the models, by its age in millions of years on the
//                                       conventional scale, on every globe beat
//   ?land=none                          today's map on every globe beat
//   ?land=cw                            the Clarey and Werner (2023, Fig. 17) pre-flood map, traced from their
//                                       figure. Its picture is NOT in this repository: permission from the
//                                       copyright holders is pending. It shows only if
//                                       public/land/private/clarey-werner-2023.jpg exists on this machine,
//                                       VITE_SHOW_PRIVATE=1 is set in .env.local, and the app runs with `npm run dev`.
//   &relief=30                          how many times taller than life the land stands (default 30, 0 for
//                                       flat). Real mountains are too low to see from space, so the height is
//                                       exaggerated; the shape comes from the data.
const LAND_OVERRIDE = new URLSearchParams(window.location.search).get("land");
// Private material shows only on a developer's machine (`npm run dev`) with VITE_SHOW_PRIVATE=1 in .env.local.
const SHOW_PRIVATE = import.meta.env.DEV && import.meta.env.VITE_SHOW_PRIVATE === "1";
const RELIEF = Number(new URLSearchParams(window.location.search).get("relief") ?? 30);
const MERCATOR_EDGE = 85.0511; // the furthest north and south a Mapbox picture can reach
const WORLD = {
  type: "Feature" as const,
  properties: {},
  geometry: { type: "Polygon" as const, coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]] },
};

/** Lands that have a picture of their heights for the flood (public/land/height/scotese-<age>ma.jpg). */
const HEIGHT_PICTURES = ["000", "200"];
/** Lands that have a double-size picture (public/land/scotese-<age>ma-8k.jpg). */
const SHARP_LANDS = ["200"];
/**
 * How close the camera may come to a land model. The models hold one height every 11 km or so, so
 * closer than this they are only blur. Close views of the land are the job of our own 3D landscape.
 */
const MODEL_MAX_ZOOM = 4.4;

/** The land to draw: the address's override if it names one, otherwise the story's choice. */
function chooseLand(fromStory: string | null): string | null {
  if (LAND_OVERRIDE === null) return fromStory;
  if (LAND_OVERRIDE === "cw") return SHOW_PRIVATE ? "cw" : fromStory;
  return /^\d{3}$/.test(LAND_OVERRIDE) ? LAND_OVERRIDE : null; // "none" or anything unknown: today's map
}

/** Swap the land on the globe. null puts today's map back. */
function showLand(m: mapboxgl.Map, land: string | null) {
  if (m.getTerrain()) m.setTerrain(null);
  for (const id of ["model-land", "model-sea"]) if (m.getLayer(id)) m.removeLayer(id);
  for (const id of ["model-land", "model-sea", "model-dem"]) if (m.getSource(id)) m.removeSource(id);
  if (!land) return;

  const isPrivate = land === "cw";
  // The story's main land has a double-size picture for larger screens; phones use the standard one.
  const sharp = SHARP_LANDS.includes(land) && Math.min(window.innerWidth, window.innerHeight) >= 600;
  const file = isPrivate ? "private/clarey-werner-2023.jpg" : `scotese-${land}ma${sharp ? "-8k" : ""}.jpg`;
  const under = m.getLayer("story-clouds") ? "story-clouds" : undefined; // keep the land beneath the clouds
  // Deep-sea colour underneath, so today's map does not show around the picture's edges.
  m.addSource("model-sea", { type: "geojson", data: WORLD });
  m.addLayer({ id: "model-sea", type: "fill", source: "model-sea", paint: { "fill-color": "#0c2a4e", "fill-emissive-strength": 1 } }, under);
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
  m.addLayer(
    { id: "model-land", type: "raster", source: "model-land", paint: { "raster-fade-duration": 0, "raster-emissive-strength": 1 } },
    under,
  );
  // 3D relief from the model's own heights (the private map has no heights).
  if (!isPrivate && RELIEF > 0) {
    m.addSource("model-dem", {
      type: "raster-dem",
      tiles: [`${window.location.origin}${import.meta.env.BASE_URL}land/dem/scotese-${land}ma/{z}/{x}/{y}.png`],
      tileSize: 256,
      encoding: "mapbox",
      maxzoom: 3,
    });
    m.setTerrain({ source: "model-dem", exaggeration: RELIEF });
  }
}

/** The on-screen note that goes with a land model. */
function landNote(land: string): string {
  const heights = RELIEF > 0 ? ` Heights drawn ${RELIEF} times taller than life.` : "";
  if (land === "cw") {
    return "Private test, not for publication: pre-flood land after Clarey and Werner (2023), Fig. 17. Permission pending. The zones are theirs; the surface texture and the position on the globe are ours.";
  }
  if (LAND_OVERRIDE !== null) {
    return `Land test: ${Number(land)} million years ago on the conventional scale.${heights} Scotese and Wright (2018), CC BY 4.0.`;
  }
  if (land === "000") {
    return `Today's land, drawn from a model of its heights and sea depths.${heights} Scotese and Wright (2018), CC BY 4.0.`;
  }
  return `The land is a model, not from the text: a Pangaea-like land standing in for the pre-flood world.${heights} Scotese and Wright (2018), CC BY 4.0.`;
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
        `flood: level ${cloudStatus.level.toFixed(0)} m; storm ${cloudStatus.storm.toFixed(2)}`,
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
  /** The land model for the current beat, or null for today's map. */
  land: string | null;
  /** The flood for the current beat, or null for none. */
  flood: FloodState | null;
  /** How many times taller than life the land stands for this beat, or null for the usual amount. */
  relief: number | null;
  /** Where the globe faces before the first beat arrives. */
  startCenter: [number, number];
  /** Features to pin for the current scene (already filtered by the "text only" switch). */
  pins: MapFeature[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function GlobeStage({ camera, hold, land, flood, relief, startCenter, pins, selectedId, onSelect }: Props) {
  const sky = useRef<SkyLayer | null>(null);
  const shownLand = chooseLand(land);
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
      center: startCenter,
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
      // Slow clouds around the globe, seen from far out. Add ?clouds=0 to the address to switch them off.
      try {
        if (CLOUDS_ON) {
          sky.current = createCloudLayer();
          m.addLayer(sky.current.layer);
        }
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
    m.setMaxZoom(shownLand ? MODEL_MAX_ZOOM : 22);
    const box = m.getContainer();
    const lift = box.clientHeight * 0.26; // room for the verse underneath
    const fitted = Math.log2((0.86 * Math.min(box.clientWidth, box.clientHeight - lift) * Math.PI) / 512);
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
  }, [camera, hold, ready, shownLand]);

  // The land for the current beat. Clouds are added first (above), so the land always sits beneath them.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    try {
      showLand(m, shownLand);
      globeStatus.land = shownLand ? `model ${shownLand}` : "today's map";
      // The flood is measured against this land's heights, where a height picture exists for it.
      sky.current?.setHeights(shownLand && HEIGHT_PICTURES.includes(shownLand) ? `${import.meta.env.BASE_URL}land/height/scotese-${shownLand}ma.jpg` : null);
    } catch (e) {
      globeStatus.land = `failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }, [shownLand, ready]);

  // The flood and the weather for the current beat glide to their new values inside the sky layer.
  useEffect(() => {
    if (!ready) return;
    sky.current?.setFlood(flood ?? { level: 0, storm: 0 });
  }, [flood, ready]);

  // How tall the land stands. Lower during the flood, so that no mountain pokes through the water.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !m.getSource("model-dem")) return;
    const times = relief ?? RELIEF;
    if (times > 0) m.setTerrain({ source: "model-dem", exaggeration: times });
    else if (m.getTerrain()) m.setTerrain(null);
  }, [relief, shownLand, ready]);

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
      {shownLand && camera && (
        <p className="land-credit">
          <span className="tier-badge tier-model">Model</span>
          {landNote(shownLand)}
        </p>
      )}
    </>
  );
}
