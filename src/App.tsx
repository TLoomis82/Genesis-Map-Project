import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createGlobeTestLayer, type GlobeTestLayer } from "./spike/globeLayerTest.ts";
import { WaterScene } from "./spike/waterScene.ts";

// M0 globe test. Answers two questions before any scene work:
//   1. Does a three.js custom layer draw correctly on the Mapbox globe? (rings and dots)
//   2. Can a separate three.js scene crossfade smoothly into the globe? (water view)
// The panel at the top shows frame rate and what Mapbox passed to the custom layer.

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

type View = "globe" | "water";

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const waterCanvas = useRef<HTMLCanvasElement>(null);
  const test = useRef<GlobeTestLayer | null>(null);
  const water = useRef<WaterScene | null>(null);

  const [view, setView] = useState<View>("globe");
  const [lit, setLit] = useState(false);
  const [depth, setDepth] = useState(false);
  const [fps, setFps] = useState(0);
  const [readout, setReadout] = useState("waiting for the map");
  const [error, setError] = useState<string | null>(null);

  // The globe and the custom layer.
  useEffect(() => {
    if (!TOKEN || !mapContainer.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      projection: "globe",
      center: [43.5, 30.0],
      zoom: 1.6,
    });
    map.on("style.load", () => {
      map.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.02,
        "space-color": "rgb(0, 0, 0)",
        "star-intensity": 0.6,
      });
      const t = createGlobeTestLayer();
      test.current = t;
      try {
        map.addLayer(t.layer);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
    map.on("error", (e) => setError(e.error?.message ?? "Map failed to load."));
    return () => {
      test.current = null;
      map.remove();
    };
  }, []);

  // The standalone water scene on its own canvas.
  useEffect(() => {
    if (!waterCanvas.current) return;
    const scene = new WaterScene(waterCanvas.current);
    water.current = scene;
    window.addEventListener("resize", scene.resize);
    return () => {
      window.removeEventListener("resize", scene.resize);
      scene.dispose();
      water.current = null;
    };
  }, []);

  // Run the water scene only while it is visible or fading out.
  useEffect(() => {
    const scene = water.current;
    if (!scene) return;
    if (view === "water") {
      scene.resize();
      scene.play();
      return;
    }
    const stop = window.setTimeout(() => scene.pause(), 2600);
    return () => window.clearTimeout(stop);
  }, [view]);

  useEffect(() => water.current?.setLight(lit ? 1 : 0), [lit]);
  useEffect(() => test.current?.setDepthTest(depth), [depth]);

  // Frame rate, averaged over half a second, plus the custom layer readout.
  useEffect(() => {
    let frames = 0;
    let since = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames += 1;
      if (now - since >= 500) {
        setFps(Math.round((frames * 1000) / (now - since)));
        frames = 0;
        since = now;
        const d = test.current?.debug;
        if (d) {
          setReadout(
            d.error
              ? `layer error: ${d.error}`
              : `layer draws: ${d.renderCalls} | args: ${d.argCount} | projection: ${d.projection} | transition: ${
                  d.transition === null ? "n/a" : d.transition.toFixed(2)
                } | horizon plane: ${d.horizonPlane ? "yes" : "no"} | dots: ${d.markers}`,
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!TOKEN) {
    return (
      <div className="notice">
        <p>
          No Mapbox token found. Copy <code>.env.example</code> to <code>.env.local</code> and set{" "}
          <code>VITE_MAPBOX_TOKEN</code>.
        </p>
      </div>
    );
  }

  return (
    <>
      <div ref={mapContainer} className="globe" />
      <canvas ref={waterCanvas} className={`water ${view === "water" ? "is-visible" : ""}`} />

      <div className="hud">
        <div className="hud-row">
          <strong>{fps} fps</strong>
          <span>M0 globe test</span>
        </div>
        <div className="hud-row hud-buttons">
          <button onClick={() => setView(view === "globe" ? "water" : "globe")}>
            {view === "globe" ? "Show water" : "Fade to globe"}
          </button>
          <button onClick={() => setLit(!lit)} disabled={view !== "water"}>
            {lit ? "Darkness" : "Let there be light"}
          </button>
          <button onClick={() => setDepth(!depth)}>Depth test: {depth ? "on" : "off"}</button>
        </div>
        <div className="hud-readout">{error ?? readout}</div>
      </div>
    </>
  );
}
