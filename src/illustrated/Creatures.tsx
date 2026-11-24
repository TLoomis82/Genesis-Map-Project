import { useMemo, useRef } from "react";
import { kjv } from "../data/kjv.ts";
import { clamp01, ease, handLine, mix, rolling, seeded, type Point } from "./hand.ts";
import { CREAM, Drawn, GOLD, Hints, INK, MomentStrip, Painted, Paper, Pencil, SceneWords, strokeTurn, useHints, useMoments, useView, type Hint } from "./kit.tsx";
import { landY } from "./Land.tsx";

// Day 5 and day 6, hand-drawn and live.
//
//   day-5  Genesis 1:20-22  the waters swarm; birds above; great whales; be fruitful
//   day-6  Genesis 1:24-27  cattle; creeping things; beasts of the earth; humankind
//
// Day 5: a cut through the sea. Shoals swim under the surface and scatter from the hand; birds fly
// over it and follow the hand; the great creature breaches when tapped; at "be fruitful" both
// multiply. Day 6: the land of day 3, now with animals that follow the hand along the land and leap
// when tapped, and then humankind as two figures of light.
//
// Text is as the verses give it. Which creatures stand for each kind, their shapes, colours and
// numbers, and the figures of light, are illustration. God is not drawn.

export type CreatureChapter = "day-5" | "day-6";

const COLUMNS = 72;
const X0 = -150;
const X1 = 1750;
const columnX = (i: number) => X0 + (i / (COLUMNS - 1)) * (X1 - X0);
const SURFACE = { "day-5": 430, "day-6": 640 };
const BED = 910;

const CHAPTERS: Record<CreatureChapter, { title: string; verses: string[]; moments: string[]; note: string }> = {
  "day-5": {
    title: "Day 5: sea and sky",
    verses: ["1:20", "1:20", "1:21", "1:22"],
    moments: ["The waters swarm", "Birds above", "Great whales", "Be fruitful"],
    note: "Which creatures, their shapes and their numbers. Swipe the water, drag the sky, tap the great creature.",
  },
  "day-6": {
    title: "Day 6: animals and humankind",
    verses: ["1:24", "1:24", "1:25", "1:27"],
    moments: ["Cattle", "Creeping things", "Beasts of the earth", "Humankind"],
    note: "Which animals stand for each kind, and the figures of light for humankind. Drag along the land, tap an animal.",
  },
};

// ---------------------------------------------------------------------------------------------
// Land animals. Each is drawn facing right with its feet at 0,0.

interface Shape {
  fill: string;
  body: string;
  /** Filled parts on top of the body: head, mane, shell. */
  parts?: { d: string; fill: string }[];
  /** Loose ink: horns, tail, antlers. */
  ink?: string;
  legs: number[];
  legTop: number;
  speed: number;
}

export const SHAPES: Record<string, Shape> = {
  cow: {
    fill: "#f1e3c4",
    body: "M -50 -34 Q -54 -66 -20 -66 L 30 -66 Q 52 -66 52 -44 L 52 -36 Q 30 -26 0 -28 Q -30 -26 -50 -34 Z",
    parts: [
      { d: "M -30 -64 Q -10 -50 -22 -36 Q -44 -38 -46 -56 Z", fill: "#8a5a3c" },
      { d: "M 14 -66 Q 30 -56 20 -44 Q 6 -50 14 -66 Z", fill: "#8a5a3c" },
      { d: "M 46 -62 Q 48 -84 68 -82 Q 86 -78 84 -60 Q 82 -46 66 -46 Q 50 -46 46 -62 Z", fill: "#f1e3c4" },
    ],
    ink: "M 58 -82 q -4 -12 -13 -12 M 73 -82 q 6 -12 15 -10 M -50 -58 q -15 8 -11 32 M 74 -64 h 0.1",
    legs: [-36, -24, 24, 36],
    legTop: -32,
    speed: 110,
  },
  sheep: {
    fill: "#fbf4e2",
    body: "M -30 -24 a 12 12 0 0 1 2 -20 a 14 14 0 0 1 24 -8 a 14 14 0 0 1 26 2 a 12 12 0 0 1 8 20 a 12 12 0 0 1 -10 14 a 14 14 0 0 1 -24 3 a 14 14 0 0 1 -22 -2 a 9 9 0 0 1 -4 -9 Z",
    parts: [{ d: "M 26 -40 Q 30 -54 42 -50 Q 52 -44 48 -34 Q 40 -26 30 -30 Z", fill: "#3a3350" }],
    legs: [-18, -8, 10, 20],
    legTop: -14,
    speed: 100,
  },
  lizard: {
    fill: "#7fa35a",
    body: "M -50 -6 Q -20 -22 10 -20 Q 34 -20 48 -14 Q 60 -9 48 -4 Q 20 -1 0 -3 Q -24 -3 -50 -6 Z",
    ink: "M -50 -6 q -22 4 -40 -8 M 46 -13 h 0.1 M -14 -19 l 5 -5 M -2 -20 l 5 -5 M 10 -20 l 5 -5",
    legs: [-30, -22, 20, 28],
    legTop: -6,
    speed: 70,
  },
  beetle: {
    fill: "#b8433a",
    body: "M -16 -5 Q -16 -26 0 -26 Q 16 -26 16 -5 Z",
    parts: [{ d: "M 14 -6 Q 15 -17 23 -15 Q 29 -11 25 -5 Z", fill: "#3a3350" }],
    ink: "M 0 -26 V -5 M 24 -15 l 7 -9 M 26 -12 l 10 -4 M -7 -16 h 0.1 M 8 -13 h 0.1",
    legs: [-10, -2, 6, 12],
    legTop: -5,
    speed: 45,
  },
  snail: {
    fill: "#ead9b0",
    body: "M -26 -2 Q -4 -10 22 -6 Q 30 -16 28 -24 Q 36 -22 34 -10 Q 34 -2 26 -1 Z",
    parts: [{ d: "M -20 -8 Q -22 -32 -2 -32 Q 16 -30 14 -12 Q 10 -4 -6 -5 Q -18 -5 -20 -8 Z", fill: "#c98d4f" }],
    ink: "M -3 -12 q -9 -2 -7 -10 q 4 -8 12 -4 q 6 5 0 11 M 28 -24 l -2 -9 M 32 -23 l 4 -8",
    legs: [],
    legTop: 0,
    speed: 16,
  },
  lion: {
    fill: "#e2b25a",
    body: "M -50 -34 Q -52 -62 -20 -62 L 26 -62 Q 46 -60 46 -40 Q 26 -28 0 -32 Q -28 -28 -50 -34 Z",
    parts: [
      { d: "M 26 -62 Q 24 -90 50 -92 Q 76 -90 76 -64 Q 74 -40 50 -40 Q 28 -42 26 -62 Z", fill: "#b5762e" },
      { d: "M 42 -66 Q 42 -82 58 -82 Q 74 -80 72 -64 Q 70 -52 56 -52 Q 44 -54 42 -66 Z", fill: "#eac878" },
    ],
    ink: "M -50 -54 q -26 -6 -26 20 M -76 -34 q -4 6 2 8 M 62 -70 h 0.1 M 60 -60 q 6 4 10 0",
    legs: [-36, -24, 22, 34],
    legTop: -32,
    speed: 190,
  },
  deer: {
    fill: "#c98d4f",
    body: "M -40 -46 Q -42 -72 -14 -72 L 22 -72 Q 40 -72 40 -54 Q 20 -44 0 -46 Q -20 -44 -40 -46 Z",
    parts: [{ d: "M 26 -66 Q 34 -96 42 -106 Q 60 -112 66 -98 Q 62 -88 48 -90 Q 46 -76 40 -56 Z", fill: "#c98d4f" }],
    ink: "M 46 -108 q -4 -20 -14 -26 M 42 -122 l 10 -8 M 52 -108 q 8 -16 18 -18 M 62 -118 l 2 -12 M -40 -66 q -8 -2 -8 8 M 54 -100 h 0.1",
    legs: [-30, -20, 22, 32],
    legTop: -46,
    speed: 200,
  },
};

export interface Animal {
  type: string;
  kind: 0 | 1 | 2;
  home: number;
  size: number;
  /** When it is drawn in, in moments. */
  at: number;
  x: number;
  vx: number;
  dir: number;
  hop: number;
  hopV: number;
  side: number;
}

const HERD: [string, 0 | 1 | 2, number, number][] = [
  ["cow", 0, 540, 1],
  ["sheep", 0, 665, 0.95],
  ["cow", 0, 960, 0.9],
  ["sheep", 0, 1075, 0.85],
  ["lizard", 1, 450, 0.9],
  ["beetle", 1, 610, 1],
  ["snail", 1, 905, 1],
  ["lizard", 1, 1190, 0.8],
  ["lion", 2, 380, 1],
  ["deer", 2, 1250, 0.95],
  ["deer", 2, 1010, 0.85],
];

export function AnimalDrawing({ a, y, grown, boil }: { a: Animal; y: number; grown: number; boil: number }) {
  if (grown < 0.02) return null;
  const shape = SHAPES[a.type];
  const phase = a.x / 13;
  const legLength = -shape.legTop;
  const legs = shape.legs
    .map((lx, k) => {
      const swing = Math.sin(phase + k * 1.9) * Math.min(12, legLength * 0.4) * (a.hop > 2 ? 0.3 : 1);
      return `M ${lx} ${shape.legTop} L ${lx + swing} 0`;
    })
    .join(" ");
  const wobble = (boil % 3) * 0.5 - 0.5;
  return (
    <g transform={`translate(${a.x} ${y - a.hop}) scale(${a.dir * a.size * 0.9} ${a.size * 0.9}) rotate(${wobble + (a.hop > 2 ? -6 : 0)})`}>
      {legs && <Drawn d={legs} progress={clamp01(grown * 1.5)} stroke={INK} strokeWidth={4.5} />}
      <path d={shape.body} fill={shape.fill} opacity={ease(grown, 0.45, 0.85)} />
      <Drawn d={shape.body} progress={grown} stroke={INK} strokeWidth={3.6} />
      {shape.parts?.map((p, k) => (
        <g key={k}>
          <path d={p.d} fill={p.fill} opacity={ease(grown, 0.55, 0.9)} />
          <Drawn d={p.d} progress={clamp01(grown * 1.4 - 0.3)} stroke={INK} strokeWidth={3} />
        </g>
      ))}
      {shape.ink && <Drawn d={shape.ink} progress={clamp01(grown * 1.5 - 0.5)} stroke={INK} strokeWidth={3.4} />}
    </g>
  );
}

// ---------------------------------------------------------------------------------------------

interface Swimmer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  group: number;
  ox: number;
  oy: number;
  size: number;
  at: number;
}

const FISH_COLOURS = ["#f0a13a", "#e9e2c0", "#e86a4a"];
const WHALE = "M -190 0 C -150 -72 60 -84 170 -34 C 198 -20 198 14 170 24 C 80 62 -100 52 -190 0 Z";
const FLUKE = "M -180 0 L -256 -50 Q -234 0 -258 46 Z";

interface Props {
  chapter: CreatureChapter;
  onHome: () => void;
}

export default function Creatures({ chapter, onHome }: Props) {
  const info = CHAPTERS[chapter];
  const day5 = chapter === "day-5";
  const SEA = SURFACE[chapter];
  const view = useView(800, 560, 900, 0.6);
  const wave = useRef({ h: new Float32Array(COLUMNS), v: new Float32Array(COLUMNS) });
  const pointer = useRef<{ x: number; y: number; moved: number } | null>(null);
  const tips = useHints();
  const now = useRef({ t: 0, time: 0 });

  // Where the hand last was: fish flee it, birds and land animals come to it. Each fades with time.
  const fear = useRef({ x: 0, y: 0, s: 0 });
  const lure = useRef({ x: 800, y: 240, s: 0 });
  const whale = useRef({ x: 800, y: 745, dir: 1, breach: -1, done: false, splashed: false });

  const life = useMemo(() => {
    const rand = seeded(505);
    const fish: Swimmer[] = Array.from({ length: 46 }, (_, i) => ({
      x: 300 + rand() * 1000,
      y: 520 + rand() * 300,
      vx: 80 * (rand() - 0.5),
      vy: 0,
      group: i % 3,
      ox: (rand() - 0.5) * 230,
      oy: (rand() - 0.5) * 120,
      size: 1.3 + rand() * 0.8,
      at: i < 18 ? 0.12 + rand() * 0.7 : 3.05 + rand() * 0.75,
    }));
    const birds: Swimmer[] = Array.from({ length: 15 }, (_, i) => ({
      x: 500 + rand() * 600,
      y: 150 + rand() * 180,
      vx: 120,
      vy: 0,
      group: 0,
      ox: (rand() - 0.5) * 520,
      oy: (rand() - 0.5) * 170,
      size: 0.8 + rand() * 0.4,
      at: i < 6 ? 1.05 + rand() * 0.6 : 3.1 + rand() * 0.7,
    }));
    const herd: Animal[] = HERD.map(([type, kind, home, size], i) => ({ type, kind, home, size, at: kind + 0.12 + rand() * 0.55, x: home, vx: 0, dir: i % 2 ? -1 : 1, hop: 0, hopV: 0, side: (((i * 7) % 11) - 5) * 64 }));
    const weeds = Array.from({ length: 16 }, () => ({ x: 120 + rand() * 1400, tall: 70 + rand() * 120, lean: rand() * 6 }));
    const trees = [450, 600, 1000, 1150].map((x) => ({ x: x + (rand() - 0.5) * 30, size: 0.75 + rand() * 0.4 }));
    return { fish, birds, herd, weeds, trees };
  }, []);

  const introSeconds = 6;
  const clock = useMoments(
    info.moments.length,
    (dt, time, t) => {
      now.current = { t, time };
      const { h, v } = wave.current;
      for (let step = 0; step < 2; step++) {
        const d = dt / 2;
        for (let i = 0; i < COLUMNS; i++) {
          const left = h[Math.max(i - 1, 0)];
          const right = h[Math.min(i + 1, COLUMNS - 1)];
          v[i] += (1500 * (left + right - 2 * h[i]) - 5 * h[i] + Math.sin(i * 0.45 - time * 2.4) * 8) * d;
          v[i] *= Math.exp(-0.9 * d);
        }
        for (let i = 0; i < COLUMNS; i++) h[i] = Math.max(-80, Math.min(80, h[i] + v[i] * d));
      }
      fear.current.s *= Math.exp(-dt * 1.6);
      lure.current.s *= Math.exp(-dt * 0.45);

      if (day5) {
        // Shoals: each fish keeps its place in a shoal that wanders, and bolts from the hand.
        const { fish, birds } = life;
        fish.forEach((f, i) => {
          const cx = 800 + Math.cos(time * 0.23 + f.group * 2.1) * 330 + f.ox;
          const cy = 560 + f.group * 105 + Math.sin(time * 0.31 + f.group) * 50 + f.oy * 0.8;
          let ax = (cx - f.x) * 0.7;
          let ay = (cy - f.y) * 0.9;
          for (let j = 0; j < fish.length; j++) {
            if (j === i) continue;
            const dx = f.x - fish[j].x;
            const dy = f.y - fish[j].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 1300 && d2 > 0.01) {
              ax += (dx / d2) * 900;
              ay += (dy / d2) * 900;
            }
          }
          if (fear.current.s > 0.02) {
            const dx = f.x - fear.current.x;
            const dy = f.y - fear.current.y;
            const d = Math.hypot(dx, dy) + 1;
            if (d < 300) {
              const push = (fear.current.s * 2600 * (1 - d / 300)) / d;
              ax += dx * push;
              ay += dy * push;
            }
          }
          f.vx += ax * dt;
          f.vy += ay * dt;
          const damp = Math.exp(-dt * 1.3);
          f.vx *= damp;
          f.vy *= damp;
          const speed = Math.hypot(f.vx, f.vy);
          if (speed > 520) {
            f.vx *= 520 / speed;
            f.vy *= 520 / speed;
          }
          f.x += f.vx * dt;
          f.y = Math.max(SEA + 46, Math.min(BED - 50, f.y + f.vy * dt));
        });
        // The flock circles, or comes to the hand.
        const calling = lure.current.s > 0.06;
        birds.forEach((b, i) => {
          const tx = (calling ? lure.current.x : 800 + Math.cos(time * 0.42) * 400) + b.ox * (calling ? 0.5 : 1) + Math.cos(time * 1.3 + i) * 50;
          const ty = (calling ? lure.current.y : 230 + Math.sin(time * 0.7) * 80) + b.oy * (calling ? 0.5 : 1) + Math.sin(time * 1.7 + i * 2) * 30;
          b.vx += (tx - b.x) * 1.5 * dt;
          b.vy += (ty - b.y) * 1.5 * dt;
          const damp = Math.exp(-dt * 0.9);
          b.vx *= damp;
          b.vy *= damp;
          b.x += b.vx * dt;
          b.y = Math.min(SEA - 50, b.y + b.vy * dt);
        });
        // The great creature crosses slowly, and breaches when tapped (and once on its own).
        const w = whale.current;
        if (t < 2) w.done = false;
        if (t > 2.6 && !w.done && w.breach < 0) {
          w.done = true;
          w.breach = 0;
          w.splashed = false;
        }
        w.x = 800 + Math.sin(time * 0.13) * 430;
        w.dir = Math.cos(time * 0.13) >= 0 ? 1 : -1;
        if (w.breach >= 0) {
          w.breach += dt / 3.2;
          if (w.breach > 0.42 && !w.splashed) {
            w.splashed = true;
            const centre = Math.round(((w.x - X0) / (X1 - X0)) * (COLUMNS - 1));
            for (let j = -5; j <= 5; j++) if (centre + j >= 0 && centre + j < COLUMNS) v[centre + j] -= 150 * (1 - Math.abs(j) / 6);
          }
          if (w.breach >= 1) w.breach = -1;
        }
        w.y = mix(745, SEA + 34, w.breach < 0 ? 0 : Math.pow(Math.sin(Math.PI * w.breach), 1.4));
      } else {
        // The animals drift about their places, or come to where the hand is on the land.
        const calling = lure.current.s > 0.06;
        life.herd.forEach((a, i) => {
          const shape = SHAPES[a.type];
          const target = calling ? lure.current.x + a.side : a.home + Math.sin(time * 0.21 + i * 1.7) * 46;
          const want = Math.max(-shape.speed, Math.min(shape.speed, (target - a.x) * 1.6));
          a.vx += (want - a.vx) * (1 - Math.exp(-dt * 3));
          a.x = Math.max(300, Math.min(1300, a.x + a.vx * dt));
          if (Math.abs(a.vx) > 5) a.dir = a.vx > 0 ? 1 : -1;
          if (a.hop > 0 || a.hopV > 0) {
            a.hopV -= 1100 * dt;
            a.hop = Math.max(0, a.hop + a.hopV * dt);
            if (a.hop === 0) a.hopV = 0;
          }
        });
      }
    },
    introSeconds,
  );
  const { t, time, boil } = clock;
  const moment = Math.min(info.moments.length - 1, Math.max(0, Math.ceil(t - 0.02) - 1));

  const intro = clamp01(time / introSeconds);
  const sketch = ease(intro, 0, 0.22);
  const sketchFade = 1 - ease(intro, 0.72, 0.98);
  const inked = clamp01((intro - 0.18) / 0.36);
  const paint = clamp01((intro - 0.5) / 0.48);

  const scenery = useMemo(
    () => ({
      horizon: handLine(rolling(-200, 1800, SEA, 6, 31, 100), 31, 5),
      horizon2: handLine(rolling(-200, 1800, SEA + 6, 8, 32, 120), 32, 6),
      hump: handLine(Array.from({ length: 22 }, (_, i) => [220 + i * 56, landY(220 + i * 56, 1)] as Point), 33, 7),
      bed: rolling(-200, 1800, BED, 16, 61, 90),
      isle: handLine([[1010, 436], [1070, 398], [1150, 380], [1240, 392], [1310, 436]] as Point[], 71, 3),
    }),
    [SEA],
  );
  const bedLine = handLine(scenery.bed, 61, 4);

  const { h } = wave.current;
  const seaLine = (layer: number): Point[] => {
    const out: Point[] = [];
    for (let i = 0; i < COLUMNS; i += 2) {
      const x = columnX(i);
      out.push([x, SEA + layer * 40 + h[i] * Math.pow(0.62, layer) + Math.sin(x / 70 + time * (1.1 + layer * 0.2) + layer * 2) * (5 - layer * 0.6)]);
    }
    return out;
  };
  const seaTop = seaLine(0);
  const seaBody = `${handLine(seaTop, 500 + boil, 1.6)} L ${X1} 2600 L ${X0} 2600 Z`;
  const landPoints: Point[] = Array.from({ length: 33 }, (_, i) => [190 + i * 38.2, landY(190 + i * 38.2, 1)] as Point);
  const landLine = handLine(landPoints, 520, 2.2);
  const landBody = `${landLine} L 1420 ${SEA + 60} L 190 ${SEA + 60} Z`;

  const w = whale.current;
  const whaleShown = day5 ? ease(t, 2.05, 2.6) : 0;
  const spout = w.breach > 0.36 && w.breach < 0.7 ? Math.sin(((w.breach - 0.36) / 0.34) * Math.PI) : 0;
  const people = day5 ? 0 : ease(t, 3.08, 3.7);

  const hints: Hint[] = day5
    ? [
        { id: "sky", x: 800, y: 250, text: "Drag the sky and the birds follow" },
        { id: "water", x: 800, y: 520, text: "Swipe the water to scatter the shoal" },
        ...(whaleShown > 0.9 ? [{ id: "whale", x: Math.max(500, Math.min(1100, w.x)), y: w.y - 140, text: "Tap the great creature" }] : []),
      ]
    : [
        { id: "tap", x: 800, y: 250, text: "Tap an animal and it leaps" },
        { id: "land", x: 800, y: 325, text: "Drag along the land and the animals follow" },
        { id: "sea", x: 800, y: 705, text: "Swipe the sea" },
      ];

  const toDrawing = (clientX: number, clientY: number) => ({ x: view.x + clientX * view.scale, y: view.y + clientY * view.scale });
  const slosh = (x: number, dx: number, dy: number) => {
    const centre = Math.round(((x - X0) / (X1 - X0)) * (COLUMNS - 1));
    for (let j = -4; j <= 4; j++) {
      const i = centre + j;
      if (i >= 0 && i < COLUMNS) wave.current.v[i] += (dy * 9 - Math.abs(dx) * 3) * (1 - Math.abs(j) / 5);
    }
  };

  return (
    <div className="hand-scene" style={{ background: "#f4ead2" }}>
      <svg
        className="hand-canvas"
        viewBox={view.box}
        preserveAspectRatio="xMidYMid slice"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          pointer.current = { x: e.clientX, y: e.clientY, moved: 0 };
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const from = pointer.current;
          if (!from) return;
          const dx = (e.clientX - from.x) * view.scale;
          const dy = (e.clientY - from.y) * view.scale;
          from.x = e.clientX;
          from.y = e.clientY;
          from.moved += Math.abs(dx) + Math.abs(dy);
          if (from.moved < 10) return;
          const p = toDrawing(e.clientX, e.clientY);
          if (day5) {
            if (p.y < SEA - 20) {
              lure.current = { x: p.x, y: Math.min(p.y, SEA - 70), s: 1 };
              tips.mark("sky");
            } else {
              fear.current = { x: p.x, y: p.y, s: 1 };
              tips.mark("water");
              if (p.y < SEA + 90) slosh(p.x, dx * 0.4, dy * 0.4);
            }
          } else if (p.y > SEA - 10 || p.x < 230 || p.x > 1380) {
            slosh(p.x, dx, dy);
            tips.mark("sea");
          } else if (p.y > landY(p.x, 1) - 190) {
            lure.current = { x: p.x, y: p.y, s: 1 };
            tips.mark("land");
          }
        }}
        onPointerUp={(e) => {
          const from = pointer.current;
          pointer.current = null;
          if (!from || from.moved >= 10) return;
          // A tap.
          const p = toDrawing(e.clientX, e.clientY);
          if (day5) {
            if (now.current.t > 2.3 && Math.hypot(p.x - w.x, p.y - w.y) < 230 && w.breach < 0) {
              w.breach = 0;
              w.splashed = false;
              tips.mark("whale");
            }
            return;
          }
          let best: Animal | null = null;
          let bestD = 110;
          life.herd.forEach((a) => {
            if (now.current.t < a.at) return;
            const d = Math.hypot(p.x - a.x, p.y - (landY(a.x, 1) - 30));
            if (d < bestD) {
              bestD = d;
              best = a;
            }
          });
          if (best) {
            (best as Animal).hopV = 430;
            (best as Animal).hop = 0.01;
            tips.mark("tap");
          }
        }}
        onPointerCancel={() => (pointer.current = null)}
        role="img"
        aria-label={`${info.title}, drawn by hand`}
      >
        <defs>
          <pattern id="land-hatch" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
            <line x1="0" y1="6" x2="13" y2="6" stroke={INK} strokeWidth="1.4" opacity="0.2" />
          </pattern>
          <pattern id="sea-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
            <line x1="0" y1="8" x2="16" y2="8" stroke={INK} strokeWidth="1.6" opacity="0.22" />
          </pattern>
          <linearGradient id="deep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#16324f" stopOpacity="0" />
            <stop offset="1" stopColor="#16324f" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#fff6d8" stopOpacity="0.95" />
            <stop offset="0.45" stopColor={GOLD} stopOpacity="0.45" />
            <stop offset="1" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
        </defs>

        <Paper />
        <Pencil d={scenery.horizon} d2={scenery.horizon2} progress={sketch} fade={sketchFade} />
        <Pencil d={day5 ? bedLine : scenery.hump} progress={clamp01(sketch * 1.4 - 0.4)} fade={sketchFade} />

        <Painted id={`paint-${chapter}`} progress={paint} view={view}>
          <rect x="-400" y="-1800" width="2400" height="4600" fill="#f1e2bb" />
          {day5 ? (
            <>
              <path d={`${scenery.isle} Z`} fill="#8fb863" />
              <path d={`${scenery.isle} Z`} fill="url(#land-hatch)" />
            </>
          ) : (
            <>
              <path d={landBody} fill="#8fb863" />
              <path d={landBody} fill="url(#land-hatch)" />
            </>
          )}
          <path d={seaBody} fill="#1f6f8b" />
          {day5 && <rect x="-400" y={SEA} width="2400" height={BED - SEA + 200} fill="url(#deep)" />}
          <path d={seaBody} fill="url(#sea-hatch)" />
          {day5 && <path d={`${bedLine} L 1800 2600 L -200 2600 Z`} fill="#16324f" />}
        </Painted>

        {day5 ? (
          <>
            {/* The far shore, so this is still the world of day 3. */}
            <Drawn d={scenery.isle} progress={strokeTurn(inked, 0, 3, 1.2)} stroke={INK} strokeWidth={4} />
            {[1090, 1160, 1235].map((x, k) => (
              <g key={x} opacity={inked}>
                <path d={`M ${x} ${392 + Math.abs(k - 1) * 6} v -34`} stroke={INK} strokeWidth="4" />
                <circle cx={x} cy={344 + Math.abs(k - 1) * 6} r={17} fill={paint > 0.5 ? "#3f8a3e" : "none"} stroke={INK} strokeWidth="3.4" />
              </g>
            ))}

            {/* The sea floor and its weeds. */}
            <Drawn d={bedLine} progress={strokeTurn(inked, 1, 3, 1.2)} stroke={INK} strokeWidth={5} />
            {life.weeds.map((weed, i) => {
              const sway = Math.sin(time * 1.2 + i) * 14 + weed.lean;
              return <Drawn key={i} d={`M ${weed.x} ${BED + 6} q ${sway} ${-weed.tall * 0.5} ${sway * 0.3} ${-weed.tall} M ${weed.x + 12} ${BED + 6} q ${-sway} ${-weed.tall * 0.35} ${sway * 0.5} ${-weed.tall * 0.7}`} progress={strokeTurn(inked, 2, 3, 1.2)} stroke="#5fae7a" strokeWidth={5} />;
            })}

            {/* The great creature. */}
            {whaleShown > 0.01 && (
              <g transform={`translate(${w.x} ${w.y}) scale(${w.dir} 1) rotate(${w.breach < 0 ? Math.sin(time * 0.8) * 2 : -Math.cos(Math.PI * w.breach) * 16})`}>
                <path d={WHALE} fill="#4a6d8c" opacity={ease(whaleShown, 0.5, 0.9)} />
                <path d={FLUKE} fill="#4a6d8c" opacity={ease(whaleShown, 0.5, 0.9)} />
                <path d="M -150 14 C -60 52 80 58 168 24 C 90 42 -60 40 -150 14 Z" fill="#cfe0e6" opacity={ease(whaleShown, 0.6, 0.95)} />
                <Drawn d={WHALE} progress={clamp01(whaleShown * 1.3)} stroke={INK} strokeWidth={6} />
                <Drawn d={FLUKE} progress={clamp01(whaleShown * 1.6 - 0.5)} stroke={INK} strokeWidth={5} />
                <Drawn d="M 190 2 q -40 22 -92 18 M 60 34 q -18 46 -66 46 q 28 -18 28 -50 M 128 -14 h 0.1 M -120 22 q 60 22 130 20" progress={clamp01(whaleShown * 1.6 - 0.6)} stroke={INK} strokeWidth={4.5} />
                {spout > 0.02 && (
                  <g opacity={spout} stroke="#bfe3ee" strokeWidth="6" strokeLinecap="round" fill="none">
                    <path d={`M 96 -74 q -6 ${-60 * spout} -40 ${-96 * spout}`} />
                    <path d={`M 100 -76 q 0 ${-70 * spout} 4 ${-118 * spout}`} />
                    <path d={`M 104 -74 q 8 ${-60 * spout} 44 ${-92 * spout}`} />
                  </g>
                )}
              </g>
            )}

            {/* The shoals. */}
            {life.fish.map((f, i) => {
              const on = ease(t, f.at, f.at + 0.22);
              if (on < 0.02) return null;
              const angle = (Math.atan2(f.vy, f.vx) * 180) / Math.PI;
              const wag = Math.sin(time * (7 + Math.hypot(f.vx, f.vy) * 0.03) + i) * 22;
              return (
                <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${angle}) scale(${f.size * mix(0.3, 1, on)})`} opacity={on}>
                  <path d="M -9 0 l -10 -7 v 14 Z" fill={FISH_COLOURS[f.group]} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" transform={`rotate(${wag} -9 0)`} />
                  <path d="M 16 0 Q 4 -10 -10 0 Q 4 10 16 0 Z" fill={FISH_COLOURS[f.group]} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="9" cy="-1.5" r="1.3" fill={INK} />
                </g>
              );
            })}
          </>
        ) : (
          <>
            <Drawn d={landLine} progress={strokeTurn(inked, 0, 2, 1.2)} stroke={INK} strokeWidth={5} />
            {life.trees.map((tree, i) => {
              const y = landY(tree.x, 1) + 2;
              const s = tree.size;
              return (
                <g key={i}>
                  <Drawn d={`M ${tree.x} ${y} v ${-74 * s} M ${tree.x} ${y - 46 * s} l ${-16 * s} ${-18 * s} M ${tree.x} ${y - 54 * s} l ${15 * s} ${-16 * s}`} progress={inked} stroke={INK} strokeWidth={6} />
                  <circle cx={tree.x} cy={y - 86 * s} r={42 * s} fill="#3f8a3e" stroke={INK} strokeWidth="4.5" opacity={ease(paint, 0.3, 0.7)} />
                </g>
              );
            })}
            {/* The animals, smaller kinds in front. */}
            {[2, 0, 1].flatMap((kind) =>
              life.herd.filter((a) => a.kind === kind).map((a, i) => <AnimalDrawing key={`${kind}-${i}`} a={a} y={landY(a.x, 1) + 3 + (kind === 1 ? 5 : 0)} grown={ease(t, a.at, a.at + 0.32)} boil={boil + i} />),
            )}
            {/* Humankind: two figures of light, side by side. */}
            {people > 0.01 &&
              [772, 836].map((x, k) => {
                const y = landY(x, 1) + 2;
                const s = k ? 0.95 : 1;
                const figure = `M ${x - 15 * s} ${y - 84 * s} Q ${x} ${y - 96 * s} ${x + 15 * s} ${y - 84 * s} L ${x + 19 * s} ${y} L ${x - 19 * s} ${y} Z`;
                const on = clamp01(people * 1.3 - k * 0.3);
                return (
                  <g key={x}>
                    <circle cx={x} cy={y - 70 * s} r={(120 + Math.sin(time * 1.6 + k) * 10) * on} fill="url(#glow)" />
                    <path d={figure} fill="#fff6d8" opacity={ease(on, 0.4, 0.8)} />
                    <circle cx={x} cy={y - 108 * s} r={14 * s} fill="#fff6d8" opacity={ease(on, 0.4, 0.8)} />
                    <Drawn d={figure} progress={on} stroke={GOLD} strokeWidth={3.4} />
                    <Drawn d={`M ${x + 14 * s} ${y - 108 * s} a ${14 * s} ${14 * s} 0 1 0 -0.1 0.1 M ${x + (k ? -16 : 16) * s} ${y - 74 * s} q ${(k ? -14 : 14) * s} ${14 * s} ${(k ? -32 : 32) * s * 0.5} ${30 * s}`} progress={clamp01(on * 1.5 - 0.5)} stroke={GOLD} strokeWidth={3.4} />
                  </g>
                );
              })}
          </>
        )}

        {/* Ink: the sea's lines. */}
        {(day5 ? [0, 1, 2] : [0, 1, 2, 3, 4, 5]).map((k) => (
          <Drawn key={k} d={handLine(k === 0 ? seaTop : seaLine(k), 500 + k * 9 + boil, k === 0 ? 1.6 : 2.4)} progress={strokeTurn(inked, k, 6, 1.5)} stroke={k === 0 ? INK : paint < 0.6 ? "#4d7396" : "#bfe3ee"} strokeWidth={k === 0 ? 6 : 3.5} opacity={k === 0 ? 1 : 0.8 - k * 0.09} />
        ))}

        {/* The birds, over everything. */}
        {day5 &&
          life.birds.map((b, i) => {
            const on = ease(t, b.at, b.at + 0.22);
            if (on < 0.02) return null;
            const flap = Math.sin(time * 9 + i * 1.3) * 9;
            return (
              <g key={i} transform={`translate(${b.x} ${b.y}) scale(${(b.vx < 0 ? -1 : 1) * b.size * 1.15} ${b.size * 1.15})`} opacity={on}>
                <Drawn d={`M -17 ${-flap} Q -8 ${-7 - flap * 0.4} 0 0 Q 8 ${-7 - flap * 0.4} 17 ${-flap} M -3 1 l 9 1`} progress={on} stroke={INK} strokeWidth={2.8} />
              </g>
            );
          })}

        <Hints hints={hints} used={tips.used} show={ease(t, 0.5, 0.8)} time={time} />
      </svg>
      <div className="hand-paper" aria-hidden="true" />

      <SceneWords title={info.title} verse={kjv(info.verses[moment])} reference={`Genesis ${info.verses[moment]}`} note={info.note} onHome={onHome} onTips={tips.reset} />
      <MomentStrip names={info.moments} drawings={DRAWINGS[chapter]} clock={clock} />
    </div>
  );
}

// The small drawings on the moment buttons.
const sea = <path d="M 4 42 q 9 -6 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 V 54 H 4 Z" fill="#1f6f8b" stroke={INK} strokeWidth="2" />;
const deepSea = <rect x="4" y="14" width="112" height="40" fill="#1f6f8b" stroke={INK} strokeWidth="2" />;
const hill = <path d="M 8 50 Q 60 26 112 50 Z" fill="#8fb863" stroke={INK} strokeWidth="2.4" />;
const smallFish = (x: number, y: number, fill: string) => (
  <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
    <path d="M -6 0 l -6 -4 v 8 Z M 10 0 Q 2 -6 -6 0 Q 2 6 10 0 Z" fill={fill} stroke={INK} strokeWidth="1.2" />
  </g>
);
const smallBird = (x: number, y: number) => <path key={`${x}-${y}`} d={`M ${x - 9} ${y - 3} Q ${x - 4} ${y - 7} ${x} ${y} Q ${x + 4} ${y - 7} ${x + 9} ${y - 3}`} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />;
const small = (type: string, x: number, scale: number) => {
  const shape = SHAPES[type];
  return (
    <g key={`${type}-${x}`} transform={`translate(${x} 44) scale(${scale})`}>
      <path d={shape.legs.map((lx) => `M ${lx} ${shape.legTop} V 0`).join(" ")} stroke={INK} strokeWidth="4" />
      <path d={shape.body} fill={shape.fill} stroke={INK} strokeWidth="4" />
      {shape.parts?.map((p, k) => <path key={k} d={p.d} fill={p.fill} stroke={INK} strokeWidth="3" />)}
    </g>
  );
};
const DRAWINGS: Record<CreatureChapter, JSX.Element[]> = {
  "day-5": [
    <g key="a">
      {deepSea}
      {[smallFish(34, 30, FISH_COLOURS[0]), smallFish(58, 40, FISH_COLOURS[1]), smallFish(84, 28, FISH_COLOURS[2])]}
    </g>,
    <g key="b">
      {[smallBird(36, 20), smallBird(62, 12), smallBird(86, 24)]}
      {sea}
    </g>,
    <g key="c">
      {deepSea}
      <g transform="translate(62 34) scale(0.2)">
        <path d={WHALE} fill="#4a6d8c" stroke={INK} strokeWidth="10" />
        <path d={FLUKE} fill="#4a6d8c" stroke={INK} strokeWidth="10" />
      </g>
    </g>,
    <g key="d">
      {deepSea}
      {[smallBird(30, 8), smallBird(60, 6), smallBird(92, 9)]}
      {[smallFish(22, 26, FISH_COLOURS[0]), smallFish(46, 34, FISH_COLOURS[2]), smallFish(70, 24, FISH_COLOURS[1]), smallFish(94, 36, FISH_COLOURS[0]), smallFish(60, 46, FISH_COLOURS[1]), smallFish(28, 44, FISH_COLOURS[2])]}
    </g>,
  ],
  "day-6": [
    <g key="a">
      {hill}
      {[small("cow", 42, 0.34), small("sheep", 84, 0.34)]}
    </g>,
    <g key="b">
      {hill}
      {[small("lizard", 40, 0.4), small("beetle", 74, 0.5), small("snail", 98, 0.4)]}
    </g>,
    <g key="c">
      {hill}
      {[small("lion", 40, 0.34), small("deer", 86, 0.32)]}
    </g>,
    <g key="d">
      {hill}
      <circle cx="60" cy="24" r="22" fill={GOLD} opacity="0.35" />
      {[52, 68].map((x) => (
        <g key={x}>
          <path d={`M ${x - 5} 22 L ${x + 5} 22 L ${x + 7} 42 L ${x - 7} 42 Z`} fill={CREAM} stroke={GOLD} strokeWidth="1.6" />
          <circle cx={x} cy="16" r="5" fill={CREAM} stroke={GOLD} strokeWidth="1.6" />
        </g>
      ))}
    </g>,
  ],
};
