import { useEffect, useRef } from "react";
import { Life, NO_LIFE, NO_MARKS, type LifeWant } from "../story/lifeLayer.ts";

// A check page for the life layer, without Mapbox: ?view=life. The globe is a plain disc seen straight
// on, with the land roughly marked, so flocks, shoals, whales and herds can be seen moving and tapped.
// ?life=5 (day 5), 6 (day 6), 7 (day 7, calm).

const CENTRE: [number, number] = [-5, 5];
const rad = (d: number) => (d * Math.PI) / 180;

export default function LifeTest() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const back = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current!;
    const disc = () => ({ x: el.clientWidth / 2, y: el.clientHeight / 2, r: Math.min(el.clientWidth, el.clientHeight) * 0.42 });
    const project = (lng: number, lat: number) => {
      const d = disc();
      const dl = rad(lng - CENTRE[0]);
      const la = rad(lat);
      const c = rad(CENTRE[1]);
      const x = Math.cos(la) * Math.sin(dl);
      const y = Math.cos(c) * Math.sin(la) - Math.sin(c) * Math.cos(la) * Math.cos(dl);
      const z = Math.sin(c) * Math.sin(la) + Math.cos(c) * Math.cos(la) * Math.cos(dl);
      return { x: d.x + x * d.r, y: d.y - y * d.r, visible: z > 0.12 };
    };
    const unproject = (px: number, py: number): [number, number] | null => {
      const d = disc();
      const x = (px - d.x) / d.r;
      const y = -(py - d.y) / d.r;
      if (x * x + y * y >= 1) return null;
      const z = Math.sqrt(1 - x * x - y * y);
      const c = rad(CENTRE[1]);
      const lat = Math.asin(y * Math.cos(c) + z * Math.sin(c));
      const lng = CENTRE[0] + (Math.atan2(x, z * Math.cos(c) - y * Math.sin(c)) * 180) / Math.PI;
      return [lng, (lat * 180) / Math.PI];
    };
    const life = new Life(el, { project, disc }, `${import.meta.env.BASE_URL}land/height/scotese-200ma.jpg`);
    life.home = CENTRE;
    const which = new URLSearchParams(window.location.search).get("life") ?? "5";
    const wants: Record<string, LifeWant> = {
      "5": { flocks: 16, shoals: 22, whales: 4, herds: [0, 0, 0], people: false, calm: false },
      "6": { flocks: 12, shoals: 16, whales: 3, herds: [7, 7, 7], people: true, calm: false },
      "7": { flocks: 12, shoals: 16, whales: 3, herds: [7, 7, 7], people: true, calm: true },
      eden: { ...NO_LIFE, marks: { ...NO_MARKS, anchor: CENTRE, garden: 1, pair: 2, rivers: true } },
      east: { ...NO_LIFE, marks: { ...NO_MARKS, anchor: CENTRE, garden: 0.6, pair: 2, pairLight: 0.25, pairEast: true, flame: true, cain: true, city: true, peoples: 14 } },
      noah: { ...NO_LIFE, marks: { ...NO_MARKS, anchor: CENTRE, garden: 0.4, flame: true, city: true, peoples: 80, dulled: 1, noah: true } },
    };
    life.set(wants[which] ?? wants["5"]);
    life.start();
    // The land, roughly, so the realms can be told apart.
    const paint = window.setInterval(() => {
      const b = back.current!;
      b.width = el.clientWidth;
      b.height = el.clientHeight;
      const c = b.getContext("2d")!;
      const d = disc();
      c.fillStyle = "#12305a";
      c.beginPath();
      c.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#6f9a55";
      for (let py = d.y - d.r; py < d.y + d.r; py += 4)
        for (let px = d.x - d.r; px < d.x + d.r; px += 4) {
          const at = unproject(px, py);
          if (at && life.isLand(at[0], at[1])) c.fillRect(px, py, 4, 4);
        }
    }, 1500);
    el.addEventListener("click", (e) => {
      const at = unproject(e.offsetX, e.offsetY);
      if (at) life.tap(at[0], at[1], which === "5" ? null : 0);
    });
    (window as unknown as { life: unknown }).life = life;
    return () => {
      window.clearInterval(paint);
      life.dispose();
    };
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <canvas ref={back} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <canvas ref={canvas} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}
