import { useMemo, useRef, useState } from "react";
import { kjv } from "../data/kjv.ts";
import { clamp01, ease, handLine, mix, rolling, seeded, type Point } from "./hand.ts";
import { CREAM, Drawn, GOLD, Hints, INK, MomentStrip, Painted, Paper, Pencil, SceneWords, strokeTurn, useHints, useMoments, useView, type Hint } from "./kit.tsx";
import { AnimalDrawing, SHAPES, type Animal } from "./Creatures.tsx";
import { landY } from "./Land.tsx";

// Day 7, the Eden scenes after the forming of the man, and east of Eden. Hand-drawn and live.
//
//   day-7        Genesis 2:1-3          finished; rest; blessed
//   eden-garden  Genesis 2:8-9, 15-17   a garden planted; every tree; two trees in the midst; to dress and keep it
//   eden-river   Genesis 2:10-14        a river rises; it waters the garden; it parts into four
//   eden-naming  Genesis 2:19-20        brought to the man; he names them; no match found
//   eden-woman   Genesis 2:21-22        a deep sleep; from his side; a woman; brought to the man
//   eden-fall    Genesis 3:1-21         the serpent; she eats, he eats; eyes opened; hiding; clothed
//   exile        Genesis 3:23-24; 4:16-17  sent out; the way guarded; east to Nod; a city
//
// Every scene says on the drawing what can be touched. Text is as the verses give it. The look of
// the garden, the trees, the serpent, the fruit, the guard and the city, which animals come, and
// the figures of light, are illustration. God is never drawn: in 3:8 the presence is a light that
// moves through the trees.

export type EdenChapter = "day-7" | "eden-garden" | "eden-river" | "eden-naming" | "eden-woman" | "eden-fall" | "exile";

const GROUND = 640;

const CHAPTERS: Record<EdenChapter, { title: string; verses: string[]; moments: string[]; note: string }> = {
  "day-7": {
    title: "Day 7: rest",
    verses: ["2:1", "2:2", "2:3"],
    moments: ["Finished", "Rest", "Blessed"],
    note: "The small round world and the gold light. Drag to turn the heavens; nothing else moves.",
  },
  "eden-garden": {
    title: "Eden 2: the garden",
    verses: ["2:8", "2:9", "2:9", "2:15"],
    moments: ["A garden planted", "Every tree", "Two trees in the midst", "To dress and keep it"],
    note: "How the garden and the two trees look. Tap either tree in the midst; drag along the garden and the man walks with you.",
  },
  "eden-river": {
    title: "Eden 3: the river",
    verses: ["2:10", "2:10", "2:10"],
    moments: ["A river rises", "It waters the garden", "It parts into four"],
    note: "The river's course. Where the four ran on earth is not shown here. Tap any of the four for its name.",
  },
  "eden-naming": {
    title: "Eden 4: the naming",
    verses: ["2:19", "2:19", "2:20"],
    moments: ["Brought to the man", "He names them", "No match found"],
    note: "Which creatures came, and the names shown: the text gives none of the names. Tap a creature to name it.",
  },
  "eden-woman": {
    title: "Eden 5: the woman",
    verses: ["2:21", "2:21", "2:22", "2:22"],
    moments: ["A deep sleep", "From his side", "A woman", "Brought to the man"],
    note: "How it looked. Drag left or right to move through the scene.",
  },
  "eden-fall": {
    title: "Eden 6: the fall",
    verses: ["3:1", "3:6", "3:7", "3:8", "3:21"],
    moments: ["The serpent", "She eats, he eats", "Eyes opened", "Hiding", "Clothed"],
    note: "The serpent's and the fruit's look (the text names no kind of fruit), and the dimming light. Drag left or right to move through the scene.",
  },
  exile: {
    title: "East of Eden",
    verses: ["3:23", "3:24", "4:16", "4:17"],
    moments: ["Sent out", "The way guarded", "East to Nod", "A city"],
    note: "The look of the guard, the flame and the city. Swipe the flaming sword to turn it.",
  },
};

const RIVERS = [
  { name: "Pison", verse: "2:11", end: [440, 770] as Point },
  { name: "Gihon", verse: "2:13", end: [680, 790] as Point },
  { name: "Hiddekel", verse: "2:14", end: [920, 790] as Point },
  { name: "Euphrates", verse: "2:14", end: [1160, 770] as Point },
];
const MIDST = [
  { name: "The tree of life", verse: "2:9", x: 752 },
  { name: "The tree of the knowledge of good and evil", verse: "2:17", x: 858 },
];
const NAMED = [
  { type: "cow", name: "ox", home: 660 },
  { type: "sheep", name: "sheep", home: 820 },
  { type: "lion", name: "lion", home: 980 },
  { type: "deer", name: "deer", home: 1150 },
];

function mixColour(a: string, b: string, t: number): string {
  const n = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(mix(n(a, i), n(b, i), clamp01(t)))).join(",")})`;
}

/** A person, as a figure of light. light 1 = shining, 0 = dimmed. */
export function Figure({ x, y, s = 1, on = 1, light = 1, apron = 0, coat = 0, lying = 0, time, k = 0 }: { x: number; y: number; s?: number; on?: number; light?: number; apron?: number; coat?: number; lying?: number; time: number; k?: number }) {
  if (on < 0.01) return null;
  const body = "M -15 -84 Q 0 -96 15 -84 L 19 0 L -19 0 Z";
  const fill = mixColour("#cdbf9c", "#fff6d8", light);
  const line = mixColour("#5c4f3d", GOLD, light);
  return (
    <g>
      <circle cx={x + 60 * lying} cy={y - 70 * s * (1 - lying) - 16 * lying} r={(120 + Math.sin(time * 1.6 + k) * 10) * on * s} fill="url(#glow)" opacity={light} />
      <g transform={`translate(${x} ${y - 19 * s * lying}) rotate(${90 * lying}) scale(${s})`}>
        <path d={body} fill={fill} opacity={ease(on, 0.4, 0.8)} />
        <circle cx="0" cy="-108" r="14" fill={fill} opacity={ease(on, 0.4, 0.8)} />
        {apron > 0.01 && <path d="M -17 -46 L 17 -46 L 18 -22 L -18 -22 Z" fill="#4c8f45" stroke={INK} strokeWidth="2" opacity={apron * (1 - coat)} />}
        {coat > 0.01 && <path d="M -15 -84 Q 0 -96 15 -84 L 19 -8 L -19 -8 Z" fill="#8a5a3c" stroke={INK} strokeWidth="2.4" opacity={coat} />}
        <Drawn d={body} progress={on} stroke={line} strokeWidth={3.4} />
        <Drawn d="M 14 -108 a 14 14 0 1 0 -0.1 0.1" progress={clamp01(on * 1.5 - 0.5)} stroke={line} strokeWidth={3.4} />
      </g>
    </g>
  );
}

function Tree({ x, y, s, g, leaf = "#3f8a3e", fruit, k = 0, glow = 0 }: { x: number; y: number; s: number; g: number; leaf?: string; fruit?: string; k?: number; glow?: number }) {
  if (g < 0.02) return null;
  const top = y - 86 * s;
  return (
    <g>
      {glow > 0.01 && <circle cx={x} cy={top} r={96 * s} fill="url(#glow)" opacity={glow} />}
      <Drawn d={`M ${x} ${y} v ${-74 * s} M ${x} ${y - 46 * s} l ${-16 * s} ${-18 * s} M ${x} ${y - 54 * s} l ${15 * s} ${-16 * s}`} progress={clamp01(g * 1.8)} stroke={INK} strokeWidth={6} />
      <circle cx={x} cy={top} r={42 * s * ease(g, 0.35, 0.85)} fill={leaf} stroke={INK} strokeWidth="4.5" opacity={ease(g, 0.3, 0.5)} />
      {fruit && [0, 1, 2, 3, 4].map((j) => <circle key={j} cx={x + Math.cos(j * 1.9 + k) * 22 * s} cy={top + Math.sin(j * 2.3 + k) * 20 * s} r={6.2 * s * ease(g, 0.78 + j * 0.03, 0.98)} fill={fruit} stroke={INK} strokeWidth="1.6" />)}
    </g>
  );
}

/** A hand-lettered name on the drawing. */
function Name({ x, y, text, on }: { x: number; y: number; text: string; on: number }) {
  if (on < 0.02) return null;
  const w = text.length * 12.4 + 34;
  return (
    <g transform={`translate(${x - w / 2} ${y - 6 * (1 - on)})`} opacity={on} style={{ pointerEvents: "none" }}>
      <rect width={w} height="42" rx="12" fill={CREAM} stroke={INK} strokeWidth="3" />
      <text x={w / 2} y="29" textAnchor="middle" fill={INK} fontSize="23" fontFamily="'Iowan Old Style', Palatino, Georgia, serif" fontStyle="italic">
        {text}
      </text>
    </g>
  );
}

const FRUIT = ["#d2452f", "#f0a13a", "#f2d24b", "#f2a07b", "#b8334a", "#7a4a8a", "#e8782e"];

interface Props {
  chapter: EdenChapter;
  onHome: () => void;
}

export default function Eden({ chapter, onHome }: Props) {
  const info = CHAPTERS[chapter];
  const count = info.moments.length;
  const tips = useHints();
  const pointer = useRef<{ x: number; y: number; moved: number; onSword: boolean } | null>(null);
  const now = useRef(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [named, setNamed] = useState<number[]>([]);

  // What the hand has set going.
  const spin = useRef(0);
  const lure = useRef({ x: 560, s: 0 });
  const walker = useRef({ x: 560, vx: 0 });
  const sword = useRef({ a: 0, v: 0 });
  const pan = useRef(0);

  const world = useMemo(() => {
    const rand = seeded(chapter.length * 31 + 7);
    const trees = Array.from({ length: 13 }, (_, i) => {
      let x = 290 + (i / 12) * 1020 + (rand() - 0.5) * 40;
      if (x > 690 && x < 910) x += x < 800 ? -110 : 110;
      return { x, s: 0.7 + rand() * 0.45, fruit: FRUIT[i % FRUIT.length], order: rand() };
    });
    const herd: Animal[] = NAMED.flatMap((n, pair) =>
      [0, 1].map((twin) => ({ type: n.type, kind: 0 as const, home: n.home + twin * 52, size: 0.8 - twin * 0.08, at: 0.1 + pair * 0.18, x: 1700 + pair * 120 + twin * 52, vx: 0, dir: -1, hop: 0, hopV: 0, side: pair })),
    );
    const stars = Array.from({ length: 30 }, () => ({ x: rand() * 2000 - 200, y: rand() * 520 - 120, s: 3 + rand() * 4 }));
    const thorns = Array.from({ length: 12 }, () => ({ x: 980 + rand() * 600, s: 0.7 + rand() * 0.6 }));
    return { trees, herd, stars, thorns };
  }, [chapter]);

  const introSeconds = 6;
  const clock = useMoments(
    count,
    (dt, time, t) => {
      now.current = t;
      lure.current.s *= Math.exp(-dt * 0.45);
      if (chapter === "day-7") spin.current += dt * 0.22 * (1 - ease(t, 1, 1.7));
      if (chapter === "eden-garden") {
        const target = lure.current.s > 0.06 ? lure.current.x : 560 + (t > 3 ? Math.sin(time * 0.35) * 110 : 0);
        const want = Math.max(-95, Math.min(95, (target - walker.current.x) * 1.6));
        walker.current.vx += (want - walker.current.vx) * (1 - Math.exp(-dt * 3));
        walker.current.x = Math.max(300, Math.min(1300, walker.current.x + walker.current.vx * dt));
      }
      if (chapter === "eden-naming") {
        world.herd.forEach((a, i) => {
          const leaving = ease(t, 2.1 + a.side * 0.12, 2.5 + a.side * 0.12);
          const coming = t > a.at ? 1 : 0;
          const target = leaving > 0 ? 1900 + i * 30 : coming ? a.home + Math.sin(time * 0.3 + i) * 8 : a.x;
          const speed = SHAPES[a.type].speed * 1.5;
          const want = Math.max(-speed, Math.min(speed, (target - a.x) * 1.4));
          a.vx += (want - a.vx) * (1 - Math.exp(-dt * 3));
          a.x += a.vx * dt;
          if (Math.abs(a.vx) > 5) a.dir = a.vx > 0 ? 1 : -1;
          if (a.hop > 0 || a.hopV > 0) {
            a.hopV -= 1100 * dt;
            a.hop = Math.max(0, a.hop + a.hopV * dt);
            if (a.hop === 0) a.hopV = 0;
          }
        });
      }
      if (chapter === "exile") {
        sword.current.a += (2.4 + sword.current.v) * dt;
        sword.current.v *= Math.exp(-dt * 0.7);
      }
    },
    introSeconds,
  );
  const { t, time, boil } = clock;
  const moment = Math.min(count - 1, Math.max(0, Math.ceil(t - 0.02) - 1));

  const exile = chapter === "exile";
  const view = useView(exile ? mix(560, 1180, ease(t, 0.4, 3.3)) + pan.current : 800, 560, 900, 0.6);
  const narrow = view.width * view.scale < 1500;

  const intro = clamp01(time / introSeconds);
  const sketch = ease(intro, 0, 0.22);
  const sketchFade = 1 - ease(intro, 0.72, 0.98);
  const inked = clamp01((intro - 0.18) / 0.36);
  const paint = clamp01((intro - 0.5) / 0.48);

  // The ground: the height of day 3 on a wide land. East of Eden the height stands to the west.
  const ground = (x: number) => landY(exile ? x + 450 : x, 1) - 6;
  const scenery = useMemo(() => {
    const points: Point[] = Array.from({ length: 54 }, (_, i) => [-200 + i * 38, landY(exile ? -200 + i * 38 + 450 : -200 + i * 38, 1) - 6] as Point);
    return { line: handLine(points, 520, 2.2), pencil: handLine(points, 33, 7), horizon: handLine(rolling(-200, 1800, GROUND + 60, 5, 31, 110), 31, 4) };
  }, [exile]);
  const landBody = `${scenery.line} L 1900 2600 L -300 2600 Z`;

  // Sky: night for the deep sleep, dusk for the cool of the day.
  const night = chapter === "eden-woman" ? ease(t, 0.1, 0.9) * (1 - ease(t, 3.05, 3.8)) : 0;
  const dusk = chapter === "eden-fall" ? ease(t, 2.6, 3.4) * 0.5 : exile ? 0.35 : 0;
  const still = chapter === "day-7" ? ease(t, 1, 1.7) : 0;
  const jitter = still > 0.5 ? 0 : boil;

  // ---- what can be touched, by scene
  const scrub = chapter === "eden-woman" || chapter === "eden-fall";
  const swordAt = { x: 905, y: ground(905) - 150 };
  const hints: Hint[] =
    chapter === "day-7"
      ? [{ id: "turn", x: 800, y: 255, text: "Drag to turn the heavens" }]
      : chapter === "eden-garden"
        ? [
            ...(t > 2.6 ? [{ id: "tree", x: 800, y: 255, text: "Tap either tree in the midst" }] : []),
            { id: "walk", x: 800, y: 715, text: "Drag along the garden and the man walks with you" },
          ]
        : chapter === "eden-river"
          ? t > 2.6
            ? [{ id: "river", x: 800, y: 600, text: "Tap one of the four rivers" }]
            : []
          : chapter === "eden-naming"
            ? [{ id: "name", x: 800, y: 255, text: "Tap a creature and the man names it" }]
            : scrub
              ? [{ id: "scrub", x: 800, y: 255, text: "Drag left or right to move through the scene" }]
              : [
                  ...(t > 1.7 ? [{ id: "sword", x: Math.max(view.x + 290, swordAt.x), y: swordAt.y - 170, text: "Swipe the flaming sword to turn it" }] : []),
                  ...(narrow ? [{ id: "look", x: view.x + (view.width * view.scale) / 2, y: 760, text: "Drag to look back toward the garden" }] : []),
                ];

  const toDrawing = (clientX: number, clientY: number) => ({ x: view.x + clientX * view.scale, y: view.y + clientY * view.scale });
  const verse = chapter === "eden-garden" && picked !== null ? MIDST[picked].verse : chapter === "eden-river" && picked !== null ? RIVERS[picked].verse : info.verses[moment];

  // ---- scene-by-scene values
  const riverStem = `M 800 ${ground(800) + 4} C 760 ${ground(800) + 50} 850 ${ground(800) + 90} 800 ${GROUND + 40}`;
  const riverHead = (i: number) => {
    const [ex, ey] = RIVERS[i].end;
    return `M 800 ${GROUND + 36} C 800 ${GROUND + 90} ${mix(800, ex, 0.7)} ${GROUND + 80} ${ex} ${ey}`;
  };

  return (
    <div className="hand-scene" style={{ background: "#f4ead2" }}>
      <svg
        className="hand-canvas"
        viewBox={view.box}
        preserveAspectRatio="xMidYMid slice"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          const p = toDrawing(e.clientX, e.clientY);
          pointer.current = { x: e.clientX, y: e.clientY, moved: 0, onSword: exile && Math.hypot(p.x - swordAt.x, p.y - swordAt.y) < 190 };
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
          if (chapter === "day-7") {
            spin.current += dx * 0.004;
            tips.mark("turn");
          } else if (chapter === "eden-garden") {
            if (now.current > 0.6) {
              lure.current = { x: p.x, s: 1 };
              tips.mark("walk");
            }
          } else if (scrub) {
            clock.setPlaying(false);
            clock.seek(clock.position() + dx * 0.006);
            tips.mark("scrub");
          } else if (exile) {
            if (from.onSword && now.current > 1.5) {
              sword.current.v = Math.min(26, sword.current.v + (Math.abs(dx) + Math.abs(dy)) * 0.12);
              tips.mark("sword");
            } else if (narrow) {
              pan.current = Math.max(-700, Math.min(500, pan.current - dx));
              tips.mark("look");
            }
          }
        }}
        onPointerUp={(e) => {
          const from = pointer.current;
          pointer.current = null;
          if (!from || from.moved >= 10) return;
          const p = toDrawing(e.clientX, e.clientY);
          if (chapter === "eden-garden" && now.current > 2.5) {
            const hit = MIDST.findIndex((m) => Math.abs(p.x - m.x) < 55 && p.y > ground(m.x) - 230 && p.y < ground(m.x) + 20);
            setPicked(hit < 0 ? null : hit);
            if (hit >= 0) tips.mark("tree");
          }
          if (chapter === "eden-river" && now.current > 2.5) {
            let hit = -1;
            let best = 150;
            RIVERS.forEach((r, i) => {
              const d = Math.min(Math.hypot(p.x - r.end[0], p.y - r.end[1]), Math.hypot(p.x - mix(800, r.end[0], 0.6), p.y - (GROUND + 100)));
              if (d < best) {
                best = d;
                hit = i;
              }
            });
            setPicked(hit < 0 ? null : hit);
            if (hit >= 0) tips.mark("river");
          }
          if (chapter === "eden-naming") {
            const hit = world.herd.find((a) => now.current > a.at && Math.hypot(p.x - a.x, p.y - (ground(a.x) - 30)) < 90);
            if (hit) {
              world.herd.filter((a) => a.side === hit.side).forEach((a) => ((a.hopV = 380), (a.hop = 0.01)));
              setNamed((list) => (list.includes(hit.side) ? list : [...list, hit.side]));
              tips.mark("name");
            }
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
          <radialGradient id="glow">
            <stop offset="0" stopColor="#fff6d8" stopOpacity="0.95" />
            <stop offset="0.45" stopColor={GOLD} stopOpacity="0.45" />
            <stop offset="1" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="east" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.5" stopColor="#b9a06a" stopOpacity="0" />
            <stop offset="0.75" stopColor="#b9a06a" stopOpacity="0.9" />
          </linearGradient>
          <clipPath id="world-disc">
            <circle cx="800" cy="500" r="190" />
          </clipPath>
        </defs>

        <Paper />
        {chapter === "day-7" ? (
          <Pencil d="M 610 500 a 190 190 0 1 0 380 0 a 190 190 0 1 0 -380 0" progress={sketch} fade={sketchFade} />
        ) : (
          <>
            <Pencil d={scenery.pencil} progress={sketch} fade={sketchFade} />
            <Pencil d={scenery.horizon} progress={clamp01(sketch * 1.4 - 0.4)} fade={sketchFade * 0.6} />
          </>
        )}

        <Painted id={`paint-${chapter}`} progress={paint} view={view}>
          <rect x="-400" y="-1800" width="2600" height="4600" fill="#f1e2bb" />
          <rect x="-400" y="-1800" width="2600" height="4600" fill="#e59a5a" opacity={dusk * 0.6} />
          <rect x="-400" y="-1800" width="2600" height="4600" fill="#1c1a3a" opacity={night} />
          {chapter === "day-7" ? (
            <>
              {/* Blessed: a gold light over the whole. */}
              <circle cx="800" cy="500" r={mix(200, 620, ease(t, 2.05, 2.9))} fill="url(#glow)" opacity={ease(t, 2.05, 2.7)} />
              <g clipPath="url(#world-disc)">
                <rect x="600" y="300" width="400" height="400" fill="#1f6f8b" />
                <path d="M 610 520 Q 700 400 800 410 Q 900 400 990 520 Q 900 500 800 508 Q 700 500 610 520 Z" fill="#8fb863" />
                <path d="M 610 520 Q 700 400 800 410 Q 900 400 990 520 Q 900 500 800 508 Q 700 500 610 520 Z" fill="url(#land-hatch)" />
              </g>
            </>
          ) : (
            <>
              <path d={landBody} fill="#8fb863" />
              {exile && <path d={landBody} fill="url(#east)" />}
              <path d={landBody} fill="url(#land-hatch)" />
              <path d={landBody} fill="#1c1a3a" opacity={night * 0.5} />
            </>
          )}
        </Painted>

        {chapter !== "day-7" && <Drawn d={scenery.line} progress={strokeTurn(inked, 0, 2, 1.2)} stroke={INK} strokeWidth={5} />}

        {/* ------------------------------------------------------------------ day 7 */}
        {chapter === "day-7" && (
          <>
            <g clipPath="url(#world-disc)">
              {[0, 1, 2].map((k) => (
                <Drawn key={k} d={handLine(rolling(590, 1010, 548 + k * 38, 5, 40 + k, 50).map(([x, y]) => [x, y + Math.sin(x / 40 + spin.current * 6 + k) * 4] as Point), 60 + k + jitter, 1.6)} progress={inked} stroke="#bfe3ee" strokeWidth={3} opacity={0.8} />
              ))}
              {[700, 760, 830, 900].map((x, k) => (
                <g key={x} opacity={inked}>
                  <path d={`M ${x} ${462 - (k % 2) * 16} v -26`} stroke={INK} strokeWidth="3.4" />
                  <circle cx={x} cy={426 - (k % 2) * 16} r="13" fill={paint > 0.5 ? "#3f8a3e" : "none"} stroke={INK} strokeWidth="3" />
                </g>
              ))}
            </g>
            <Drawn d={handLine(Array.from({ length: 41 }, (_, i) => [800 + 190 * Math.cos((i / 40) * Math.PI * 2), 500 + 190 * Math.sin((i / 40) * Math.PI * 2)] as Point), 90 + jitter, 1.4)} progress={inked} stroke={INK} strokeWidth={6} />
            {/* The lights of day 4, on their round. */}
            {Array.from({ length: 14 }, (_, k) => {
              const a = spin.current + (k / 14) * Math.PI * 2;
              const x = 800 + Math.cos(a) * 330;
              const y = 500 + Math.sin(a) * 290;
              const on = strokeTurn(inked, k, 14, 3);
              if (k === 0) {
                return (
                  <g key={k} opacity={on}>
                    {Array.from({ length: 12 }, (_, j) => {
                      const ray = (j / 12) * Math.PI * 2 + (jitter % 2) * 0.12;
                      return <path key={j} d={`M ${x + 46 * Math.cos(ray)} ${y + 46 * Math.sin(ray)} L ${x + (62 + ((j + jitter) % 3) * 8) * Math.cos(ray)} ${y + (62 + ((j + jitter) % 3) * 8) * Math.sin(ray)}`} stroke={GOLD} strokeWidth="5" strokeLinecap="round" />;
                    })}
                    <circle cx={x} cy={y} r="38" fill={GOLD} stroke={INK} strokeWidth="4.5" />
                  </g>
                );
              }
              if (k === 7) return <circle key={k} cx={x} cy={y} r="28" fill={CREAM} stroke={INK} strokeWidth="4.5" opacity={on} />;
              return <Drawn key={k} d={`M ${x - 9} ${y} h 18 M ${x} ${y - 9} v 18`} progress={on} stroke={INK} strokeWidth={3} />;
            })}
          </>
        )}

        {/* ------------------------------------------------------------------ the garden's trees */}
        {chapter !== "day-7" &&
          !exile &&
          world.trees.map((tree, i) => {
            if (chapter === "eden-river" && Math.abs(tree.x - 800) < 120) return null;
            if (chapter === "eden-fall" && Math.abs(tree.x - 800) < 150) return null;
            const g = chapter === "eden-garden" ? (i % 2 ? ease(t, 1.05 + tree.order * 0.6, 1.4 + tree.order * 0.6) : ease(t, 0.1 + tree.order * 0.5, 0.45 + tree.order * 0.5)) : chapter === "eden-river" ? ease(t, 1.1 + tree.order * 0.6, 1.5 + tree.order * 0.6) : inked;
            const hide = chapter === "eden-fall" && tree.x > 1000;
            return hide ? null : <Tree key={i} x={tree.x} y={ground(tree.x) + 2} s={tree.s} g={g} fruit={chapter === "eden-woman" ? undefined : tree.fruit} k={i} leaf={night > 0.5 ? "#2f5d44" : "#3f8a3e"} />;
          })}

        {/* ------------------------------------------------------------------ Eden 2: the garden */}
        {chapter === "eden-garden" && (
          <>
            <Tree x={MIDST[0].x} y={ground(MIDST[0].x) + 2} s={1.25} g={ease(t, 2.05, 2.5)} leaf="#6fae52" fruit={GOLD} k={3} glow={ease(t, 2.3, 2.8) * 0.9} />
            <Tree x={MIDST[1].x} y={ground(MIDST[1].x) + 2} s={1.25} g={ease(t, 2.4, 2.9)} leaf="#2f6d4a" fruit="#b8334a" k={8} />
            <Figure x={walker.current.x} y={ground(walker.current.x) + 2} on={ease(t, 0.55, 0.95)} time={time} />
            {MIDST.map((m, i) => (
              <Name key={m.name} x={Math.max(view.x + 280, Math.min(view.x + view.width * view.scale - 280, m.x))} y={ground(m.x) - 250} text={m.name} on={picked === i ? 1 : 0} />
            ))}
          </>
        )}

        {/* ------------------------------------------------------------------ Eden 3: the river */}
        {chapter === "eden-river" && (
          <>
            {[riverStem, ...RIVERS.map((_, i) => riverHead(i))].map((d, i) => {
              const on = i === 0 ? ease(t, 0.1, 0.95) : ease(t, 2.05 + i * 0.08, 2.75 + i * 0.08);
              const chosen = i > 0 && picked === i - 1;
              return (
                <g key={i}>
                  <Drawn d={d} progress={on} stroke={INK} strokeWidth={i === 0 ? 40 : 32} />
                  <Drawn d={d} progress={on} stroke={chosen ? "#3f9bc0" : "#1f6f8b"} strokeWidth={i === 0 ? 31 : 23} />
                  {on > 0.95 && <path d={d} fill="none" stroke="#bfe3ee" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="16 40" strokeDashoffset={-time * 46} opacity="0.85" />}
                </g>
              );
            })}
            {/* The spring. */}
            <Drawn d={`M 772 ${ground(800) - 2} q 28 -26 56 0 M 786 ${ground(800) - 22} q 14 -18 28 0`} progress={ease(t, 0.05, 0.4)} stroke="#3f9bc0" strokeWidth={5} />
            {RIVERS.map((r, i) => (
              <Name key={r.name} x={r.end[0]} y={r.end[1] - 96} text={r.name} on={picked === i ? 1 : 0} />
            ))}
          </>
        )}

        {/* ------------------------------------------------------------------ Eden 4: the naming */}
        {chapter === "eden-naming" && (
          <>
            <Figure x={500} y={ground(500) + 2} time={time} on={inked} />
            {world.herd.map((a, i) => (
              <AnimalDrawing key={i} a={a} y={ground(a.x) + 3} grown={ease(t, a.at, a.at + 0.3)} boil={boil + i} />
            ))}
            {NAMED.map((n, pair) => {
              const a = world.herd[pair * 2];
              const on = named.includes(pair) ? 1 : ease(t, 1.15 + pair * 0.2, 1.4 + pair * 0.2);
              return <Name key={n.name} x={a.x + 26} y={ground(a.x) - 150 - a.hop} text={n.name} on={on * (1 - ease(t, 2.5, 2.9))} />;
            })}
          </>
        )}

        {/* ------------------------------------------------------------------ Eden 5: the woman */}
        {chapter === "eden-woman" && (
          <>
            <g opacity={night}>
              {world.stars.map((s, i) => (
                <Drawn key={i} d={`M ${s.x - s.s} ${s.y} h ${2 * s.s} M ${s.x} ${s.y - s.s} v ${2 * s.s}`} progress={strokeTurn(ease(t, 0.3, 0.95), i, 30, 3)} stroke={CREAM} strokeWidth={2.4} />
              ))}
            </g>
            <Figure x={640} y={ground(640) + 2} time={time} on={inked} lying={ease(t, 0.25, 0.9) * (1 - ease(t, 3.05, 3.5))} light={1 - 0.45 * ease(t, 0.5, 0.95) * (1 - ease(t, 3.05, 3.5))} />
            {/* One line of light, from his side. */}
            <g opacity={1 - ease(t, 2.4, 2.95)}>
              <Drawn d={`M 700 ${ground(700) - 22} C 730 ${ground(700) - 190} 880 ${ground(900) - 250} 900 ${ground(900) - 60}`} progress={ease(t, 1.08, 1.9)} stroke="#fff6d8" strokeWidth={9} opacity={0.5} />
              <Drawn d={`M 700 ${ground(700) - 22} C 730 ${ground(700) - 190} 880 ${ground(900) - 250} 900 ${ground(900) - 60}`} progress={ease(t, 1.08, 1.9)} stroke={GOLD} strokeWidth={3.6} />
            </g>
            {(() => {
              const x = mix(900, 742, ease(t, 3.3, 3.9));
              return <Figure x={x} y={ground(x) + 2} s={0.96} time={time} k={1} on={ease(t, 2.05, 2.9)} />;
            })()}
          </>
        )}

        {/* ------------------------------------------------------------------ Eden 6: the fall */}
        {chapter === "eden-fall" &&
          (() => {
            const base = ground(800) + 2;
            const light = 1 - 0.85 * ease(t, 2.05, 2.6);
            const hide = ease(t, 3.05, 3.5) * (1 - ease(t, 4.05, 4.5));
            const out = ease(t, 4.05, 4.5);
            const her = mix(mix(900, 1150, hide), 1010, out);
            const him = mix(mix(975, 1215, hide), 1085, out);
            const coat = ease(t, 4.3, 4.85);
            const apron = ease(t, 2.5, 2.9);
            // The fruit: from the tree, to her, to him.
            const toHer = ease(t, 1.08, 1.4);
            const toHim = ease(t, 1.5, 1.82);
            const fx = mix(mix(842, 884, toHer), 958, toHim);
            const fy = mix(mix(base - 150, base - 62, toHer), base - 62, toHim) - Math.sin(Math.PI * (toHim > 0 ? toHim : toHer)) * 26;
            const presence = mix(150, 860, ease(t, 3.1, 3.95));
            return (
              <>
                {/* The presence: a light moving among the trees. Never a figure. */}
                {t > 3.02 && t < 4.3 && <ellipse cx={presence} cy={base - 150} rx="150" ry="330" fill="url(#glow)" opacity={ease(t, 3.05, 3.3) * (1 - ease(t, 4.0, 4.3)) * 0.9} />}
                <Figure x={her} y={ground(her) + 2} s={0.96} time={time} k={1} on={inked} light={light} apron={apron} coat={coat} />
                <Figure x={him} y={ground(him) + 2} time={time} on={inked} light={light} apron={apron} coat={coat} />
                {/* The trees they hide among. */}
                {[1120, 1190, 1262].map((x, i) => (
                  <Tree key={x} x={x} y={ground(x) + 14} s={1.05 + (i % 2) * 0.2} g={inked} k={i} fruit={FRUIT[i]} />
                ))}
                <Tree x={800} y={base} s={1.7} g={inked} leaf="#2f6d4a" fruit="#b8334a" k={8} />
                {/* The serpent, up the trunk and along a bough. */}
                <Drawn d={`M 770 ${base - 4} q 60 -14 30 -34 q -50 -18 0 -40 q 50 -18 6 -42 q -30 -16 10 -34 q 30 -8 44 4`} progress={ease(t, 0.12, 0.8)} stroke={INK} strokeWidth={15} />
                <Drawn d={`M 770 ${base - 4} q 60 -14 30 -34 q -50 -18 0 -40 q 50 -18 6 -42 q -30 -16 10 -34 q 30 -8 44 4`} progress={ease(t, 0.12, 0.8)} stroke="#7fa35a" strokeWidth={9} />
                <g opacity={ease(t, 0.75, 0.9)}>
                  <circle cx="852" cy={base - 152} r="2.4" fill={INK} />
                  <path d={`M 862 ${base - 148} l ${10 + Math.sin(time * 9) * 4} 3 M 862 ${base - 148} l ${9 + Math.sin(time * 9) * 4} -4`} stroke="#b8334a" strokeWidth="2" strokeLinecap="round" />
                </g>
                {toHer > 0.01 && t < 2.6 && <circle cx={fx} cy={fy} r="9" fill="#b8334a" stroke={INK} strokeWidth="2" opacity={1 - ease(t, 2.0, 2.5)} />}
              </>
            );
          })()}

        {/* ------------------------------------------------------------------ east of Eden */}
        {exile &&
          (() => {
            const walk = ease(t, 0.12, 0.95);
            const a = mix(760, 1090, walk);
            const b = mix(700, 1035, walk);
            const cain = mix(1090, 1290, ease(t, 2.1, 2.95));
            const guard = ease(t, 1.08, 1.7);
            const city = ease(t, 3.08, 3.9);
            const cy = ground(1450) + 4;
            const blade = sword.current.a;
            return (
              <>
                {world.trees.slice(0, 9).map((tree, i) => {
                  const x = 60 + i * 92 + (tree.x % 30);
                  return <Tree key={i} x={x} y={ground(x) + 2} s={tree.s} g={inked} fruit={tree.fruit} k={i} />;
                })}
                {world.thorns.map((th, i) => (
                  <Drawn key={i} d={`M ${th.x} ${ground(th.x) + 4} l ${-8 * th.s} ${-20 * th.s} M ${th.x} ${ground(th.x) + 4} l ${2 * th.s} ${-26 * th.s} M ${th.x} ${ground(th.x) + 4} l ${11 * th.s} ${-17 * th.s} M ${th.x - 5 * th.s} ${ground(th.x) - 10 * th.s} l ${-7 * th.s} ${-2 * th.s} M ${th.x + 6 * th.s} ${ground(th.x) - 8 * th.s} l ${7 * th.s} ${-4 * th.s}`} progress={inked} stroke="#6b5a3a" strokeWidth={2.6} />
                ))}
                {/* The guard: two winged forms of light, and the flame that turns every way. */}
                {[-74, 74].map((off, k) => {
                  const x = swordAt.x + off;
                  const y = ground(x);
                  const side = k ? 1 : -1;
                  const beat = Math.sin(time * 1.4 + k) * 8;
                  return (
                    <g key={off}>
                      <circle cx={x} cy={y - 110} r={150 * guard} fill="url(#glow)" opacity="0.8" />
                      <Drawn d={`M ${x} ${y - 6} Q ${x - 20} ${y - 100} ${x} ${y - 190} Q ${x + 20} ${y - 100} ${x} ${y - 6}`} progress={guard} stroke={GOLD} strokeWidth={4} />
                      <Drawn d={`M ${x} ${y - 150} Q ${x + side * 70} ${y - 250 - beat} ${x + side * 120} ${y - 150 - beat} Q ${x + side * 70} ${y - 170} ${x} ${y - 110} M ${x} ${y - 130} Q ${x + side * 60} ${y - 120} ${x + side * 96} ${y - 60 + beat} Q ${x + side * 50} ${y - 80} ${x} ${y - 90}`} progress={clamp01(guard * 1.5 - 0.4)} stroke={GOLD} strokeWidth={3.4} />
                    </g>
                  );
                })}
                {guard > 0.5 && (
                  <g transform={`rotate(${(blade * 180) / Math.PI} ${swordAt.x} ${swordAt.y})`} opacity={ease(guard, 0.5, 1)}>
                    {[0.5, 0.3, 0.14].map((lag, j) => (
                      <path key={j} d={`M ${swordAt.x} ${swordAt.y + 20} L ${swordAt.x} ${swordAt.y - 120}`} stroke={j === 2 ? "#f2d24b" : "#e8782e"} strokeWidth={12 - j * 2} strokeLinecap="round" opacity={0.25 + j * 0.2} transform={`rotate(${-lag * (60 + sword.current.v * 8)} ${swordAt.x} ${swordAt.y})`} />
                    ))}
                    <path d={`M ${swordAt.x - 9} ${swordAt.y + 10} L ${swordAt.x} ${swordAt.y - 132} L ${swordAt.x + 9} ${swordAt.y + 10} Z`} fill="#f2d24b" stroke="#d2452f" strokeWidth="3.4" strokeLinejoin="round" />
                    <path d={`M ${swordAt.x - 20} ${swordAt.y + 12} h 40 M ${swordAt.x} ${swordAt.y + 12} v 26`} stroke={INK} strokeWidth="5" strokeLinecap="round" />
                    <path d={`M ${swordAt.x - 12} ${swordAt.y - 40} q ${-14 - (boil % 2) * 6} -30 4 -52 M ${swordAt.x + 12} ${swordAt.y - 70} q ${14 + (boil % 3) * 5} -26 -2 -50`} fill="none" stroke="#e8782e" strokeWidth="4" strokeLinecap="round" />
                  </g>
                )}
                {/* The two, sent out; later one goes on further east. */}
                <Figure x={b} y={ground(b) + 2} s={0.96} time={time} k={1} on={inked} light={0.15} coat={1} />
                <Figure x={a} y={ground(a) + 2} time={time} on={inked} light={0.15} coat={1} />
                <Figure x={cain} y={ground(cain) + 2} s={0.92} time={time} k={2} on={ease(t, 2.02, 2.3)} light={0.1} coat={1} />
                {/* A city. */}
                {[0, 1, 2, 3, 4].map((k) => {
                  const x = 1372 + k * 43;
                  const h = 50 + ((k * 37) % 40);
                  const on = strokeTurn(city, k, 5, 1.6);
                  return (
                    <g key={k}>
                      <rect x={x} y={cy - h} width="40" height={h} fill="#d9c08a" opacity={ease(on, 0.5, 0.9)} />
                      <Drawn d={`M ${x} ${cy} v ${-h} h 40 v ${h} M ${x + 14} ${cy} v -18 h 12 v 18 M ${x + 8} ${cy - h + 14} h 8`} progress={on} stroke={INK} strokeWidth={3.4} />
                    </g>
                  );
                })}
              </>
            );
          })()}

        <Hints hints={hints} used={tips.used} show={ease(t, 0.5, 0.8)} time={time} />
      </svg>
      <div className="hand-paper" aria-hidden="true" />

      <SceneWords title={info.title} verse={kjv(verse)} reference={`Genesis ${verse}`} note={info.note} onHome={onHome} onTips={tips.reset} />
      <MomentStrip names={info.moments} drawings={DRAWINGS[chapter]} clock={clock} />
    </div>
  );
}

// The small drawings on the moment buttons.
const hill = <path d="M 4 50 Q 60 26 116 50 Z" fill="#8fb863" stroke={INK} strokeWidth="2.4" />;
const tree = (x: number, y: number, leaf = "#3f8a3e", fruit?: string) => (
  <g key={`${x}-${leaf}`}>
    <path d={`M ${x} ${y} v -12`} stroke={INK} strokeWidth="2.2" />
    <circle cx={x} cy={y - 18} r="8" fill={leaf} stroke={INK} strokeWidth="1.8" />
    {fruit && <circle cx={x + 2} cy={y - 19} r="2.2" fill={fruit} />}
  </g>
);
const person = (x: number, y: number, fill = CREAM, line = GOLD, lying = false) => (
  <g key={`${x}-${y}-${fill}`} transform={`translate(${x} ${y}) rotate(${lying ? 90 : 0})`}>
    <path d="M -4 -18 L 4 -18 L 6 0 L -6 0 Z" fill={fill} stroke={line} strokeWidth="1.6" />
    <circle cx="0" cy="-23" r="4.4" fill={fill} stroke={line} strokeWidth="1.6" />
  </g>
);
const smallAnimal = (type: string, x: number, scale: number) => {
  const shape = SHAPES[type];
  return (
    <g key={`${type}-${x}`} transform={`translate(${x} 44) scale(${scale})`}>
      <path d={shape.legs.map((lx) => `M ${lx} ${shape.legTop} V 0`).join(" ")} stroke={INK} strokeWidth="4" />
      <path d={shape.body} fill={shape.fill} stroke={INK} strokeWidth="4" />
      {shape.parts?.map((p, k) => <path key={k} d={p.d} fill={p.fill} stroke={INK} strokeWidth="3" />)}
    </g>
  );
};
const disc = (
  <>
    <circle cx="60" cy="30" r="17" fill="#1f6f8b" stroke={INK} strokeWidth="2.4" />
    <path d="M 45 32 Q 60 18 75 32 Z" fill="#8fb863" stroke={INK} strokeWidth="1.6" />
  </>
);
const night = <rect x="4" y="4" width="112" height="50" fill="#1c1a3a" />;
const DRAWINGS: Record<EdenChapter, JSX.Element[]> = {
  "day-7": [
    <g key="a">
      {disc}
      <circle cx="24" cy="16" r="6" fill={GOLD} stroke={INK} strokeWidth="1.6" />
      <circle cx="98" cy="42" r="5" fill={CREAM} stroke={INK} strokeWidth="1.6" />
    </g>,
    <g key="b">{disc}</g>,
    <g key="c">
      <circle cx="60" cy="30" r="27" fill={GOLD} opacity="0.45" />
      {disc}
    </g>,
  ],
  "eden-garden": [
    <g key="a">
      {hill}
      {[tree(40, 42), tree(82, 42)]}
    </g>,
    <g key="b">
      {hill}
      {[tree(28, 46, "#3f8a3e", "#d2452f"), tree(48, 40, "#3f8a3e", "#f2d24b"), tree(72, 40, "#3f8a3e", "#f0a13a"), tree(94, 46, "#3f8a3e", "#7a4a8a")]}
    </g>,
    <g key="c">
      {hill}
      <circle cx="50" cy="20" r="14" fill={GOLD} opacity="0.4" />
      {[tree(50, 40, "#6fae52", GOLD), tree(72, 40, "#2f6d4a", "#b8334a")]}
    </g>,
    <g key="d">
      {hill}
      {[tree(36, 44), tree(88, 44)]}
      {person(62, 40)}
    </g>,
  ],
  "eden-river": [
    <g key="a">
      {hill}
      <path d="M 60 34 q -6 8 0 16" fill="none" stroke="#1f6f8b" strokeWidth="5" strokeLinecap="round" />
    </g>,
    <g key="b">
      {hill}
      <path d="M 60 34 q -6 8 0 16" fill="none" stroke="#1f6f8b" strokeWidth="5" strokeLinecap="round" />
      {[tree(40, 44), tree(82, 44)]}
    </g>,
    <g key="c">
      <path d="M 60 6 v 16 M 60 22 Q 56 40 22 52 M 60 22 Q 58 42 48 54 M 60 22 Q 62 42 72 54 M 60 22 Q 64 40 98 52" fill="none" stroke="#1f6f8b" strokeWidth="5" strokeLinecap="round" />
    </g>,
  ],
  "eden-naming": [
    <g key="a">
      {hill}
      {person(26, 46)}
      {[smallAnimal("cow", 66, 0.3), smallAnimal("sheep", 98, 0.3)]}
    </g>,
    <g key="b">
      {hill}
      {person(30, 46)}
      {smallAnimal("lion", 76, 0.34)}
      <rect x="58" y="6" width="38" height="13" rx="5" fill={CREAM} stroke={INK} strokeWidth="1.6" />
    </g>,
    <g key="c">
      {hill}
      {person(60, 40)}
    </g>,
  ],
  "eden-woman": [
    <g key="a">
      {night}
      {hill}
      {person(48, 38, CREAM, GOLD, true)}
    </g>,
    <g key="b">
      {night}
      {hill}
      {person(40, 38, CREAM, GOLD, true)}
      <path d="M 54 34 Q 62 8 84 26" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
    </g>,
    <g key="c">
      {night}
      {hill}
      {person(40, 38, CREAM, GOLD, true)}
      {person(84, 42)}
    </g>,
    <g key="d">
      {hill}
      {[person(52, 40), person(68, 40)]}
    </g>,
  ],
  "eden-fall": [
    <g key="a">
      {hill}
      {tree(60, 42, "#2f6d4a", "#b8334a")}
      <path d="M 52 42 q 12 -4 6 -9 q -8 -4 4 -9" fill="none" stroke="#7fa35a" strokeWidth="3" strokeLinecap="round" />
    </g>,
    <g key="b">
      {hill}
      {tree(40, 44, "#2f6d4a", "#b8334a")}
      {[person(66, 42), person(84, 44)]}
      <circle cx="75" cy="28" r="3" fill="#b8334a" stroke={INK} strokeWidth="1" />
    </g>,
    <g key="c">
      {hill}
      {[person(52, 40, "#cdbf9c", "#5c4f3d"), person(68, 40, "#cdbf9c", "#5c4f3d")]}
    </g>,
    <g key="d">
      {hill}
      <ellipse cx="30" cy="26" rx="14" ry="24" fill={GOLD} opacity="0.45" />
      {[person(78, 44, "#cdbf9c", "#5c4f3d")]}
      {[tree(72, 46), tree(88, 46)]}
    </g>,
    <g key="e">
      {hill}
      {[person(52, 40, "#8a5a3c", INK), person(68, 40, "#8a5a3c", INK)]}
    </g>,
  ],
  exile: [
    <g key="a">
      {hill}
      {tree(24, 46)}
      {[person(70, 44, "#8a5a3c", INK), person(84, 46, "#8a5a3c", INK)]}
    </g>,
    <g key="b">
      {hill}
      <circle cx="60" cy="26" r="20" fill={GOLD} opacity="0.4" />
      <path d="M 56 40 L 60 10 L 64 40 Z" fill="#f2d24b" stroke="#d2452f" strokeWidth="1.8" />
    </g>,
    <g key="c">
      <path d="M 4 50 H 116" stroke={INK} strokeWidth="2.4" />
      {person(84, 50, "#8a5a3c", INK)}
      <path d="M 30 34 h 34 m -8 -6 l 8 6 l -8 6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </g>,
    <g key="d">
      <path d="M 4 50 H 116" stroke={INK} strokeWidth="2.4" />
      <path d="M 38 50 v -18 h 14 v 18 M 54 50 v -28 h 14 v 28 M 70 50 v -14 h 14 v 14" fill="#d9c08a" stroke={INK} strokeWidth="2" />
    </g>,
  ],
};
