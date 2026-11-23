import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { scenes } from "./data/scenes.ts";

// M0 shell: a bare globe that proves the token, the build and the phone frame rate.
// Scenes, tiers and the three.js opening are added from M1 onward.

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export default function App() {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!TOKEN || !container.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      projection: "globe",
      center: [43.5, 39.0],
      zoom: 1.6,
      attributionControl: true,
    });
    map.on("style.load", () => {
      map.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.02,
        "space-color": "rgb(0, 0, 0)",
        "star-intensity": 0.6,
      });
    });
    map.on("error", (e) => setError(e.error?.message ?? "Map failed to load."));
    return () => map.remove();
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
      <div ref={container} className="globe" />
      <div className="caption">{error ?? `Genesis Map: setup check. ${scenes.length} scenes defined.`}</div>
    </>
  );
}
