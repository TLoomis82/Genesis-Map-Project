import { useEffect, useRef, useState } from "react";
import { Life, type LifeWant } from "./lifeLayer.ts";
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
/** Lands that have a bare picture, with nothing growing yet (public/land/scotese-<age>ma-bare.jpg). */
const BARE_LANDS = ["200"];
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
  for (const id of ["model-bare", "model-land", "model-sea"]) if (m.getLayer(id)) m.removeLayer(id);
  for (const id of ["model-bare", "model-land", "model-sea", "model-dem"]) if (m.getSource(id)) m.removeSource(id);
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
  /** Where the ark is for the current beat, or null when it is not shown. */
  ark?: { at: [number, number]; afloat: boolean } | null;
  /** The land's cover: bare (before Genesis 1:11), growing (green spreads, and from where it is tapped), or green. */
  growth?: "bare" | "growing" | "green";
  /** Day 7: clouds and creatures slow. */
  calm?: boolean;
  /** What is alive on the globe for this verse, or null for nothing. */
  lifeWant?: LifeWant | null;
  /** Which kind of herd a tap on the land sets running, or null when taps make flocks and shoals. */
  herdKind?: number | null;
  /** Called when a tap on the globe did something. */
  onTouch?: () => void;
  /** Goes up by one each time the story skips to another part, so nothing glides in from the part just left. */
  skips?: number;
  /** True while the globe waits out of sight under the opening: no notes or credits are shown. */
  quiet?: boolean;
  /** Told, every frame, where the globe's disc is on the screen: its centre and radius in CSS pixels. */
  onDisc?: (disc: { x: number; y: number; r: number }) => void;
  /** True while the ark is being moved by hand: it then follows closely instead of taking the whole beat. */
  arkQuick?: boolean;
  /** Rings to tap, for the front door: each opens a part of the story. */
  doors?: Door[];
  openDoor?: string | null;
  onDoor?: (id: string) => void;
  /** Share of the height kept clear under the globe for words. The story keeps about a quarter. */
  lift?: number;
  /** How bright the stars are behind the globe, 0 to 1. */
  stars?: number;
  /** The sun and moon in their true places (the points on earth beneath them), or null to draw neither. */
  sky?: { sun: [number, number]; moon: [number, number] } | null;
  /** Hand-drawn scenes that can be opened from this beat. Each is a dot near the middle of the view. */
  drills?: { scene: string; label: string }[];
  onDrill?: (scene: string) => void;
}

export interface Door {
  id: string;
  label: string;
  at: [number, number];
  side: "top" | "bottom" | "left" | "right";
}

const ARK_DRAWING =
  '<svg viewBox="0 0 116 52" aria-hidden="true"><path d="M 6 20 H 110 Q 108 40 96 44 H 20 Q 8 40 6 20 Z" fill="#a9763f" stroke="#1d1a33" stroke-width="4" stroke-linejoin="round"/><path d="M 30 20 V 8 H 86 V 20" fill="#c79a5e" stroke="#1d1a33" stroke-width="4" stroke-linejoin="round"/><path d="M 14 30 H 102" stroke="#1d1a33" stroke-width="2" opacity="0.5"/></svg>';

export default function GlobeStage({ camera, hold, land, flood, relief, startCenter, pins, selectedId, onSelect, ark = null, arkQuick = false, growth = "green", calm = false, lifeWant = null, herdKind = null, onTouch, skips = 0, quiet = false, onDisc, doors, openDoor = null, onDoor, lift: liftShare = 0.26, stars = 0.6, drills, onDrill, sky: lights = null }: Props) {
  const arkMarker = useRef<{ marker: mapboxgl.Marker; el: HTMLDivElement; at: [number, number] } | null>(null);
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
      m.setFog({ color: "rgb(186, 210, 235)", "high-color": "rgb(36, 92, 223)", "horizon-blend": 0.02, "space-color": "rgb(0, 0, 0)", "star-intensity": stars });
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
    const lift = box.clientHeight * liftShare; // room for the verse underneath
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
  }, [camera, hold, ready, shownLand, liftShare]);

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

  // The land's cover (bare, growing, green) and the calm of the seventh day, both drawn by the sky layer.
  useEffect(() => {
    const layer = sky.current;
    if (!layer || !ready) return;
    const state = shownLand && BARE_LANDS.includes(shownLand) ? growth : "green";
    layer.setGrowth(state, shownLand ? `${import.meta.env.BASE_URL}land/scotese-${shownLand}ma-bare.jpg` : undefined);
    if (state !== "growing" || !camera) return;
    // A few places where the green begins by itself, round the middle of the view, one after another.
    const [lng, lat] = camera.center;
    [[-20, 14], [26, -12], [4, 34], [-34, -26], [44, 22], [-8, -44]].forEach(([dx, dy], i) => layer.seed(lng + dx, lat + dy, 1.5 + i * 1.3));
    // Only when the cover changes, not on every camera move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growth, shownLand, ready]);
  useEffect(() => {
    if (ready) sky.current?.setCalm(calm);
  }, [calm, ready]);

  const discRadius = useRef(200);
  // Life on the globe: a canvas over the map, and each creature put on it by the map's own projection.
  const edge = useRef(0.2);
  const life = useRef<Life | null>(null);
  const alive = lifeWant !== null && (lifeWant.flocks + lifeWant.shoals + lifeWant.whales + lifeWant.herds[0] + lifeWant.herds[1] + lifeWant.herds[2] > 0 || lifeWant.people || lifeWant.marks !== undefined);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !alive) return;
    const canvas = document.createElement("canvas");
    canvas.className = "life-canvas";
    m.getContainer().append(canvas);
    const unit = (lng: number, lat: number) => {
      const la = (lat * Math.PI) / 180;
      const lo = (lng * Math.PI) / 180;
      return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
    };
    const made = new Life(
      canvas,
      {
        project(lng, lat) {
          const c = m.getCenter();
          const a = unit(lng, lat);
          const b = unit(c.lng, c.lat);
          const facing = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
          if (facing < edge.current + 0.03) return { x: 0, y: 0, visible: false };
          const p = m.project([lng, lat]);
          return { x: p.x, y: p.y, visible: true };
        },
        disc() {
          const p = m.project(m.getCenter());
          return { x: p.x, y: p.y, r: discRadius.current };
        },
      },
      `${import.meta.env.BASE_URL}land/height/scotese-200ma.jpg`,
    );
    made.start();
    life.current = made;
    return () => {
      made.dispose();
      canvas.remove();
      life.current = null;
    };
  }, [alive, ready]);
  useEffect(() => {
    if (!life.current || !lifeWant) return;
    if (camera) life.current.home = camera.center;
    life.current.set(lifeWant);
  }, [lifeWant, alive, camera, ready]);

  // A tap on the globe: green starts there while the land is growing; a shoal, flock or herd while there is life.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const onTap = (e: mapboxgl.MapMouseEvent) => {
      let did = false;
      if (growth === "growing") {
        sky.current?.seed(e.lngLat.lng, e.lngLat.lat);
        did = true;
      }
      if (life.current?.tap(e.lngLat.lng, e.lngLat.lat, herdKind)) did = true;
      if (did) onTouch?.();
    };
    m.on("click", onTap);
    return () => {
      m.off("click", onTap);
    };
  }, [growth, herdKind, onTouch, ready]);

  // Where the globe's disc is on the screen, for the opening to sit its waters exactly on it.
  useEffect(() => {
    const layer = sky.current;
    if (!layer || !ready) return;
    layer.onDisc = (disc) => {
      edge.current = disc.edge;
      discRadius.current = disc.r;
      onDisc?.(disc);
    };
    return () => {
      layer.onDisc = null;
    };
  }, [onDisc, ready]);

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

  // The sun and the moon. The sky layer works out where they fall on the screen at their true distance
  // and size; here they are drawn there. The sun's glare and the two name tags are added; its disc and
  // the moon's disc and phase are to scale for the view.
  const sunLng = lights?.sun[0];
  const sunLat = lights?.sun[1];
  const moonLng = lights?.moon[0];
  const moonLat = lights?.moon[1];
  useEffect(() => {
    const m = map.current;
    const layer = sky.current;
    if (!m || !ready || !layer) return;
    if (sunLng === undefined || sunLat === undefined || moonLng === undefined || moonLat === undefined) {
      layer.setSky(null);
      return;
    }
    const box = m.getContainer();
    const sun = document.createElement("div");
    sun.className = "sky-light sky-sun";
    sun.innerHTML = '<i class="sky-glare"></i><i class="sky-disc"></i><span>Sun</span>';
    const moon = document.createElement("div");
    moon.className = "sky-light sky-moon";
    moon.innerHTML = '<svg viewBox="-1.1 -1.1 2.2 2.2"><circle r="1" fill="#2a2f3d"/><path fill="#f3efe2"/></svg><span>Moon</span>';
    box.append(sun, moon);
    const disc = sun.querySelector<HTMLElement>(".sky-disc")!;
    const picture = moon.querySelector("svg")!;
    const face = moon.querySelector("path")!;
    layer.onLights = (l) => {
      if (!l) return;
      sun.style.opacity = String(l.sun.show);
      sun.style.transform = `translate(${l.sun.x}px, ${l.sun.y}px)`;
      const sunSize = Math.max(l.sun.r * 2, 3);
      disc.style.width = disc.style.height = `${sunSize}px`;
      moon.style.opacity = String(l.moon.show);
      moon.style.transform = `translate(${l.moon.x}px, ${l.moon.y}px)`;
      const moonSize = Math.max(l.moon.r * 2, 5);
      picture.style.width = picture.style.height = `${moonSize * 1.1}px`;
      // The lit part: half a disc on the sunward side, out to an ellipse that is the edge of the light.
      const k = Math.min(Math.max(l.moon.lit, 0), 1);
      const bulge = Math.abs(1 - 2 * k);
      face.setAttribute("d", `M 0 -1 A 1 1 0 0 1 0 1 A ${bulge} 1 0 0 ${k < 0.5 ? 0 : 1} 0 -1 Z`);
      face.setAttribute("transform", `rotate(${(l.moon.angle * 180) / Math.PI})`);
    };
    layer.setSky({ sun: [sunLng, sunLat], moon: [moonLng, moonLat] });
    m.triggerRepaint();
    return () => {
      layer.onLights = null;
      sun.remove();
      moon.remove();
    };
  }, [sunLng, sunLat, moonLng, moonLat, ready]);

  // The stars come out on day 4, not before.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.setFog({ color: "rgb(186, 210, 235)", "high-color": "rgb(36, 92, 223)", "horizon-blend": 0.02, "space-color": "rgb(0, 0, 0)", "star-intensity": stars });
  }, [stars, ready]);

  // The dots that say there is more to see here: one for each hand-drawn scene that belongs to this
  // beat. They sit around the middle of the view (a layout choice, not a location) and go when the
  // story moves on.
  const drillLng = camera?.center[0];
  const drillLat = camera?.center[1];
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !drills?.length || drillLng === undefined || drillLat === undefined) return;
    // Laid out on the screen, then pinned to the globe: a ring round the middle of the view, names on the
    // outside so they never cover each other. Done once the camera has come to rest.
    const many = drills.length > 1;
    const spots = drills.map((_, i) => {
      const angle = many ? -Math.PI / 3 + (i / drills.length) * Math.PI * 2 : Math.PI * 0.2;
      return { x: Math.cos(angle) * (many ? 124 : 96), y: Math.sin(angle) * (many ? 112 : 96) + (many ? 26 : 0), left: Math.cos(angle) < -0.1 };
    });
    const markers = drills.map((drill, i) => {
      const el = document.createElement("button");
      el.className = `door drill door-${spots[i].left ? "left" : "right"}`;
      el.setAttribute("aria-label", drill.label);
      el.innerHTML = '<span class="door-pulse"></span><span class="door-ring"></span><span class="door-label"></span>';
      el.querySelector(".door-label")!.textContent = drill.label;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onDrill?.(drill.scene);
      });
      return new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([drillLng, drillLat]).addTo(m);
    });
    const place = () => {
      const middle = m.project([drillLng, drillLat]);
      markers.forEach((marker, i) => marker.setLngLat(m.unproject([middle.x + spots[i].x, middle.y + spots[i].y])));
    };
    // Placed now, and again every time the camera comes to rest: the first placing happens while the
    // camera is still on its way from the last verse, and would leave the ring the wrong size.
    place();
    m.on("moveend", place);
    return () => {
      m.off("moveend", place);
      markers.forEach((marker) => marker.remove());
    };
  }, [drills, onDrill, drillLng, drillLat, ready]);

  // The front door's rings.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !doors) return;
    const markers = doors.map((door) => {
      const el = document.createElement("button");
      el.className = `door door-${door.side} ${door.id === openDoor ? "is-open" : ""}`;
      el.setAttribute("aria-label", door.label);
      el.innerHTML = '<span class="door-pulse"></span><span class="door-ring"></span><span class="door-label"></span>';
      el.querySelector(".door-label")!.textContent = door.label;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onDoor?.(door.id);
      });
      return new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(door.at).addTo(m);
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [doors, openDoor, onDoor, ready]);

  // The ark. One marker, moved to its place for each beat: carried over the water while the flood
  // is up, then at rest in the mountains of Ararat. The marker moves; the camera is not touched.
  const arkLng = ark?.at[0];
  const arkLat = ark?.at[1];
  const arkAfloat = ark?.afloat ?? false;
  const arkSeconds = arkQuick ? 0.7 : Math.max(camera?.seconds ?? 8, hold);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    if (arkLng === undefined || arkLat === undefined) {
      arkMarker.current?.marker.remove();
      arkMarker.current = null;
      return;
    }
    if (!arkMarker.current) {
      const el = document.createElement("div");
      el.className = "ark-marker";
      el.innerHTML = `${ARK_DRAWING}<span></span>`;
      arkMarker.current = { el, at: [arkLng, arkLat], marker: new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([arkLng, arkLat]).addTo(m) };
    }
    const held = arkMarker.current;
    held.el.classList.toggle("is-afloat", arkAfloat);
    held.el.querySelector("span")!.textContent = arkAfloat ? "The ark (its track is illustration)" : "The ark";
    const from = held.at;
    const start = performance.now();
    let raf = 0;
    const step = (clock: number) => {
      const k = Math.min(1, (clock - start) / (arkSeconds * 1000));
      const e = k * k * (3 - 2 * k);
      held.at = [from[0] + (arkLng - from[0]) * e, from[1] + (arkLat - from[1]) * e];
      held.marker.setLngLat(held.at);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [arkLng, arkLat, arkAfloat, arkSeconds, ready]);

  // A skip to another part of the story. This runs after the effects above have set what the new verse
  // wants, and puts everything there at once: no flood draining away, no creatures or lights left over.
  useEffect(() => {
    if (!ready || skips === 0) return;
    sky.current?.snap();
    life.current?.snap();
  }, [skips, ready]);

  if (!TOKEN) {
    return camera && !quiet ? <div className="notice globe-notice">The globe needs a Mapbox token in VITE_MAPBOX_TOKEN (.env.local).</div> : null;
  }
  return (
    <>
      <div ref={container} className="globe" />
      {DEBUG && camera && !quiet && <GlobeReadout map={map.current} />}
      {shownLand && camera && !quiet && (
        <p className="land-credit">
          <span className="tier-badge tier-model">Model</span>
          {landNote(shownLand)}
        </p>
      )}
    </>
  );
}
