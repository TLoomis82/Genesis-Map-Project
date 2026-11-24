import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createCloudLayer } from "../story/cloudLayer.ts";
import { skyWith } from "../story/beats.ts";

// A check page for the globe's sky layer, without Mapbox: ?view=sky. It hands the layer a plain
// camera looking at a sphere the size of Mapbox's globe, in Mapbox's own coordinates (y points south),
// so the shader, the flood, the bare land and its greening, day and night, and the sums that place the
// sun, the moon and the globe's outline can all be seen. There is no map underneath: where the layer
// draws nothing, the page is black.
//   ?sky=bare    the land with nothing growing        ?sky=grow   green spreading
//   ?sky=flood   water over the land                  ?sky=night  the sun behind the earth, with sun and moon drawn
//   &lng=..&lat=..&far=..   where the camera looks from, and how far off (in globe radii)

const RADIUS = 8192 / Math.PI / 2;
const params = new URLSearchParams(window.location.search);

export default function SkyTest() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current!;
    const holder = box.current!;
    el.width = holder.clientWidth;
    el.height = holder.clientHeight;
    const gl = el.getContext("webgl2")!;
    const mode = params.get("sky") ?? "bare";
    const lng = Number(params.get("lng") ?? -5);
    const lat = Number(params.get("lat") ?? 5);
    const far = Number(params.get("far") ?? 4.6);
    const base = import.meta.env.BASE_URL;
    const sky = createCloudLayer();
    const fakeMap = { getCanvas: () => el, getZoom: () => 1.5, getContainer: () => holder, triggerRepaint: () => {} };
    (sky.layer as unknown as { onAdd: (m: unknown, g: WebGL2RenderingContext) => void }).onAdd(fakeMap, gl);
    sky.setHeights(`${base}land/height/scotese-200ma.jpg`);
    if (mode === "bare") sky.setGrowth("bare", `${base}land/scotese-200ma-bare.jpg`);
    if (mode === "grow") {
      sky.setGrowth("growing", `${base}land/scotese-200ma-bare.jpg`);
      [[-20, 14], [26, -12], [4, 34], [-34, -26], [44, 22], [-8, -44]].forEach(([dx, dy], i) => sky.seed(lng + dx, lat + dy, 1 + i * 1.3));
    }
    if (mode === "flood") sky.setFlood({ level: 1400, storm: 0.6 });
    if (mode === "night") sky.setSky(skyWith(lng + 185));
    if (mode === "moon") sky.setSky(skyWith(lng + 3));

    // The outline and the lights, drawn as plain marks so the sums can be checked against the picture.
    const ring = document.createElement("div");
    ring.style.cssText = "position:absolute;border:1px dashed #f0f;border-radius:50%;pointer-events:none";
    const sun = document.createElement("div");
    sun.style.cssText = "position:absolute;left:0;top:0;color:#ff0;font:12px sans-serif;white-space:nowrap";
    const moon = document.createElement("div");
    moon.style.cssText = "position:absolute;left:0;top:0;color:#9cf;font:12px sans-serif;white-space:nowrap";
    holder.append(ring, sun, moon);
    sky.onDisc = (d) => {
      ring.style.left = `${d.x - d.r}px`;
      ring.style.top = `${d.y - d.r}px`;
      ring.style.width = ring.style.height = `${d.r * 2}px`;
    };
    sky.onLights = (l) => {
      if (!l) return;
      sun.style.transform = `translate(${l.sun.x}px, ${l.sun.y}px)`;
      sun.textContent = `● sun r=${l.sun.r.toFixed(1)} show=${l.sun.show.toFixed(2)}`;
      moon.style.transform = `translate(${l.moon.x}px, ${l.moon.y}px)`;
      moon.textContent = `● moon r=${l.moon.r.toFixed(1)} show=${l.moon.show.toFixed(2)} lit=${l.moon.lit.toFixed(2)}`;
    };

    const camera = new THREE.PerspectiveCamera(36.87, el.width / el.height, 1, 1e12);
    const la = (lat * Math.PI) / 180;
    const lo = (lng * Math.PI) / 180;
    camera.position.set(Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo)).multiplyScalar(RADIUS * far);
    camera.up.set(0, -1, 0); // north is up, in coordinates whose y points south
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const whole = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const identity = new THREE.Matrix4().toArray();
    // The plane beyond which the globe's own far side lies, as Mapbox gives it.
    const toEye = camera.position.clone().normalize();
    const plane = [toEye.x, toEye.y, toEye.z, -(RADIUS * RADIUS) / camera.position.length()];
    const render = sky.layer as unknown as { render: (...args: unknown[]) => void };
    let raf = 0;
    const frame = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      render.render(gl, whole.toArray(), { name: "globe" }, identity, 0, 0, 0, { globeClippingPlane: plane });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    (window as unknown as { sky: unknown }).sky = sky;
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={box} style={{ position: "fixed", inset: 0, background: "#000" }}>
      <canvas ref={canvas} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}
