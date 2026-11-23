import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// The globe the opening fades into at the end of day 3. It sits underneath the opening
// canvas and stays live and spinnable once revealed.
//
// Placeholder: it shows today's continents with labels turned off. The pre-flood land
// model (tier "model") replaces this in M2.

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// Labels and borders belong to the modern world, not to Genesis 1.
const HIDDEN = ["showPlaceLabels", "showRoadLabels", "showPointOfInterestLabels", "showTransitLabels", "showAdminBoundaries"];

export default function HandoffGlobe() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TOKEN || !container.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/standard",
      projection: "globe",
      center: [43.5, 28.0],
      zoom: 1.4,
    });
    map.on("style.load", () => {
      for (const key of HIDDEN) {
        try {
          map.setConfigProperty("basemap", key, false);
        } catch {
          // Older or newer style versions may not have every setting; skip the ones that are missing.
        }
      }
      map.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.02,
        "space-color": "rgb(0, 0, 0)",
        "star-intensity": 0, // no stars until day 4
      });
    });
    return () => map.remove();
  }, []);

  return <div ref={container} className="globe" />;
}
