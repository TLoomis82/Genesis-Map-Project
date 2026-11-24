import { useMemo, useRef, useState } from "react";
import { kjv } from "../data/kjv.ts";
import { clamp01, ease, handLine, mix, rolling, seeded, type Point } from "./hand.ts";
import { CREAM, Drawn, GOLD, Hints, INK, MomentStrip, Painted, Paper, Pencil, SceneWords, strokeTurn, useHints, useMoments, useView, type Hint } from "./kit.tsx";

// Day 3 and day 4, hand-drawn and live.
//
//   day-3  Genesis 1:9-13   the waters gather; dry land; grass and herbs; fruit trees
//   day-4  Genesis 1:14-19  the sun; moon and stars; a month; a year
//
// Day 3: the sea draws back from a rising land, and plants are drawn onto it. Drag along the land
// and the grass, herbs and trees are drawn in under the hand. The sea still sloshes when swiped.
// Day 4: the lights cross the sky over that same land. Drag the sky to move the day along, and use
// the season tabs to turn the year.
//
// Text is as the verses give it. The land's shape, the kinds of fruit, the paths and sizes of the
// lights and the colours of the seasons are illustration. "Seasons" in 1:14 can also be translated
// "festivals" (Rudolph, Tyndale Bulletin, 2003), and the scene says so.

export type LandChapter = "day-3" | "day-4";

const SEA = 640;
const COLUMNS = 72;
const X0 = -150;
const X1 = 1750;
const columnX = (i: number) => X0 + (i / (COLUMNS - 1)) * (X1 - X0);

/** The top of the land at x, when it has risen by `rise` (0 = still under the sea, 1 = fully up). */
export function landY(x: number, rise: number): number {
  const k = (x - 800) / 590;
  const bump = Math.pow(Math.max(0, 1 - k * k), 1.15);
  return SEA + 34 - rise * bump * (158 + 22 * Math.sin(x / 83) + 12 * Math.sin(x / 31));
}

const SEASONS = [
  { name: "Spring", land: "#8fb863", leaf: "#6fae52" },
  { name: "Summer", land: "#6f9f4c", leaf: "#3f8a3e" },
  { name: "Autumn", land: "#c39a4a", leaf: "#d98a36" },
  { name: "Winter", land: "#a3a78c", leaf: "#8f9a78" },
];
const FRUIT = ["#d2452f", "#f0a13a", "#f2d24b", "#f2a07b", "#b8334a", "#7a4a8a", "#e8782e"];

const CHAPTERS: Record<LandChapter, { title: string; verses: string[]; moments: string[]; note: string }> = {
  "day-3": {
    title: "Day 3: land and plants",
    verses: ["1:9", "1:10", "1:11", "1:12"],
    moments: ["The waters gather", "Dry land", "Grass and herbs", "Fruit trees"],
    note: "The land's shape and the kinds of fruit. Drag along the land to draw the plants in; swipe the sea.",
  },
  "day-4": {
    title: "Day 4: lights",
    verses: ["1:14", "1:16", "1:17", "1:14"],
    moments: ["The sun", "Moon and stars", "A month", "A year"],
    note: "The lights' paths and sizes, and the seasons' colours. \"Seasons\" can also be read \"festivals\". Drag the sky to move the day.",
  },
};

function mixColour(a: string, b: string, t: number): string {
  const n = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(mix(n(a, i), n(b, i), t))).join(",")})`;
}

interface Props {
  chapter: LandChapter;
  onHome: () => void;
}

export default function Land({ chapter, onHome }: Props) {
  const info = CHAPTERS[chapter];
  const day4 = chapter === "day-4";
  const view = useView(800, 560, 900, 0.6);
  const wave = useRef({ h: new Float32Array(COLUMNS), v: new Float32Array(COLUMNS) });
  const pointer = useRef<{ x: number; y: number; inSky: boolean } | null>(null);
  const hand = useRef({ hours: 0 });
  const [pickedSeason, setPickedSeason] = useState<number | null>(null);
  const tips = useHints();
  const hints: Hint[] = day4
    ? [
        { id: "sky", x: 800, y: 300, text: "Drag the sky to move the day" },
        { id: "sea", x: 800, y: 770, text: "Swipe the sea" },
      ]
    : [
        { id: "land", x: 800, y: 400, text: "Drag along the land to draw the plants in" },
        { id: "sea", x: 800, y: 770, text: "Swipe the sea" },
      ];

  // Every plant: where it stands, what it is, and how far it has grown (0..1), eased each frame.
  const plants = useMemo(() => {
    const rand = seeded(77);
    const list: { x: number; kind: "tuft" | "herb" | "tree"; size: number; lean: number; fruit: string; order: number }[] = [];
    for (let i = 0; i < 46; i++) list.push({ x: 300 + rand() * 1000, kind: rand() < 0.3 ? "herb" : "tuft", size: 0.8 + rand() * 0.6, lean: (rand() - 0.5) * 8, fruit: "", order: rand() });
    [430, 560, 690, 800, 920, 1050, 1180].forEach((x, i) => list.push({ x: x + (rand() - 0.5) * 40, kind: "tree", size: 0.8 + rand() * 0.5, lean: (rand() - 0.5) * 6, fruit: FRUIT[i], order: rand() }));
    return list.sort((a, b) => (a.kind === "tree" ? 1 : 0) - (b.kind === "tree" ? 1 : 0) || a.x - b.x);
  }, []);
  const grown = useRef(new Float32Array(60));
  const touched = useRef(new Float32Array(60));

  const introSeconds = 6;
  const clock = useMoments(
    info.moments.length,
    (dt, time, t) => {
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
      // Plants grow when their moment comes, or at once where the viewer has drawn along the land.
      plants.forEach((p, i) => {
        const auto = day4 ? 1 : p.kind === "tree" ? ease(t, 3.05 + p.order * 0.5, 3.45 + p.order * 0.5) : ease(t, 2.05 + p.order * 0.6, 2.4 + p.order * 0.6);
        const target = Math.max(auto, touched.current[i]);
        grown.current[i] += (target - grown.current[i]) * (1 - Math.exp(-dt * 3.2));
      });
    },
    introSeconds,
  );
  const { t, time, boil } = clock;
  const moment = Math.min(info.moments.length - 1, Math.max(0, Math.ceil(t - 0.02) - 1));

  // The drawing-in: pencil, ink, colour.
  const intro = clamp01(time / introSeconds);
  const sketch = ease(intro, 0, 0.22);
  const sketchFade = 1 - ease(intro, 0.72, 0.98);
  const inked = clamp01((intro - 0.18) / 0.36);
  const paint = clamp01((intro - 0.5) / 0.48);

  // Day 3: how far the land has risen out of the sea.
  const rise = day4 ? 1 : mix(0, 0.34, ease(t, 0.2, 0.95)) + mix(0, 0.66, ease(t, 1.05, 1.7));
  const landInked = day4 ? strokeTurn(inked, 0, 2, 1.2) : ease(t, 1.1, 1.75);

  // Day 4: the hour, the moon's phase, the turning of the stars, and the time of year.
  const hour = day4 ? mix(6.2, 11.5, ease(t, 0.05, 0.95)) + mix(0, 10.5, ease(t, 1.05, 1.85)) + mix(0, 10.5, ease(t, 3.05, 3.7)) + hand.current.hours : 9;
  const sunAngle = ((hour - 6) / 12) * Math.PI;
  const year = day4 ? ease(t, 3.3, 3.98) : 0;
  const seasonAt = pickedSeason ?? (day4 ? Math.min(3.999, year * 4) : 0);
  const season = SEASONS[Math.floor(seasonAt) % 4];
  const nextSeason = SEASONS[(Math.floor(seasonAt) + 1) % 4];
  const seasonBlend = pickedSeason === null ? ease(seasonAt % 1, 0.55, 1) : 0;
  const landColour = mixColour(season.land, nextSeason.land, seasonBlend);
  const leafColour = mixColour(season.leaf, nextSeason.leaf, seasonBlend);
  const sunX = 800 - Math.cos(sunAngle) * 620 + (day4 ? Math.sin(seasonAt * (Math.PI / 2)) * 110 : 0);
  const sunY = SEA - Math.sin(sunAngle) * 440;
  const night = day4 ? ease(-Math.sin(sunAngle), -0.12, 0.3) : 0;
  const moonAngle = sunAngle - Math.PI + 0.35;
  const moonX = 800 - Math.cos(moonAngle) * 520;
  const moonY = SEA - Math.sin(moonAngle) * 400;
  const phase = day4 ? ease(t, 2.05, 2.95) : 0; // 0 and 1 = full, 0.5 = new
  const moonShade = (phase < 0.5 ? 1 : -1) * 92 * Math.abs(2 * phase - 1);

  const scenery = useMemo(() => {
    const rand = seeded(13);
    return {
      horizon: handLine(rolling(-200, 1800, SEA, 6, 31, 100), 31, 5),
      horizon2: handLine(rolling(-200, 1800, SEA + 6, 8, 32, 120), 32, 6),
      hump: handLine(Array.from({ length: 22 }, (_, i) => [220 + i * 56, landY(220 + i * 56, 1)] as Point), 33, 7),
      stars: Array.from({ length: 34 }, () => ({ x: (rand() - 0.5) * 2200, y: (rand() - 0.5) * 1500, s: 4 + rand() * 5, cross: rand() < 0.5 })),
    };
  }, []);

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
  const landPoints: Point[] = Array.from({ length: 33 }, (_, i) => [190 + i * 38.2, landY(190 + i * 38.2, rise)] as Point);
  const landLine = handLine(landPoints, 520, 2.2);
  const landBody = `${landLine} L 1420 ${SEA + 60} L 190 ${SEA + 60} Z`;

  const toDrawing = (clientX: number, clientY: number) => ({ x: view.x + clientX * view.scale, y: view.y + clientY * view.scale });

  return (
    <div className="hand-scene" style={{ background: "#f4ead2" }}>
      <svg
        className="hand-canvas"
        viewBox={view.box}
        preserveAspectRatio="xMidYMid slice"
        style={{ cursor: "grab" }}
        onPointerDown={(e) => {
          const p = toDrawing(e.clientX, e.clientY);
          pointer.current = { x: e.clientX, y: e.clientY, inSky: p.y < landY(p.x, rise) - 70 };
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const from = pointer.current;
          if (!from) return;
          const dx = (e.clientX - from.x) * view.scale;
          const dy = (e.clientY - from.y) * view.scale;
          from.x = e.clientX;
          from.y = e.clientY;
          const p = toDrawing(e.clientX, e.clientY);
          if (from.inSky && day4) {
            hand.current.hours += dx * 0.012;
            tips.mark("sky");
          }
          // Along the land: whatever is near the hand is drawn in.
          if (!from.inSky && rise > 0.9 && p.y < SEA + 30) {
            plants.forEach((plant, i) => Math.abs(plant.x - p.x) < 70 && (touched.current[i] = 1));
            tips.mark("land");
          }
          // On the sea: it sloshes.
          if (p.y > SEA - 10 || p.x < 200 || p.x > 1400) {
            tips.mark("sea");
            const centre = Math.round(((p.x - X0) / (X1 - X0)) * (COLUMNS - 1));
            for (let j = -4; j <= 4; j++) {
              const i = centre + j;
              if (i >= 0 && i < COLUMNS) wave.current.v[i] += (dy * 9 - Math.abs(dx) * 3) * (1 - Math.abs(j) / 5);
            }
          }
        }}
        onPointerUp={() => (pointer.current = null)}
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
          <clipPath id="moon-disc">
            <circle cx={moonX} cy={moonY} r="46" />
          </clipPath>
        </defs>

        <Paper />
        <Pencil d={scenery.horizon} d2={scenery.horizon2} progress={sketch} fade={sketchFade} />
        <Pencil d={scenery.hump} progress={clamp01(sketch * 1.4 - 0.4)} fade={sketchFade * (day4 ? 1 : 0.5)} />

        <Painted id={`paint-${chapter}`} progress={paint} view={view}>
          {/* The sky: day, and on day 4 night as the sun goes under. */}
          <rect x="-400" y="-1800" width="2400" height="4600" fill="#f1e2bb" />
          <rect x="-400" y="-1800" width="2400" height="4600" fill="#1c1a3a" opacity={night} />
          {day4 && (
            <>
              {/* Stars, drawn one after another, turning about a point in the sky. */}
              <g transform={`rotate(${phase * 42 + hour * 1.5} 800 180)`} opacity={night}>
                {scenery.stars.map((s, i) => {
                  const on = t < 1 ? 0 : strokeTurn(clamp01((t - 1.2) / 0.7), i, scenery.stars.length, 3);
                  const d = s.cross ? `M ${800 + s.x - s.s} ${180 + s.y} h ${2 * s.s} M ${800 + s.x} ${180 + s.y - s.s} v ${2 * s.s}` : `M ${800 + s.x} ${180 + s.y} h 0.1`;
                  return <Drawn key={i} d={d} progress={on} stroke={CREAM} strokeWidth={s.cross ? 2.6 : s.s * 0.7} />;
                })}
              </g>
              {/* The moon, waning and waxing through a month. */}
              <g opacity={night * ease(t, 1.1, 1.5)}>
                <circle cx={moonX} cy={moonY} r="46" fill={CREAM} stroke={INK} strokeWidth="5" />
                <circle cx={moonX + moonShade} cy={moonY} r="46" fill="#1c1a3a" clipPath="url(#moon-disc)" opacity={phase > 0.02 && phase < 0.98 ? 1 : 0} />
                <circle cx={moonX} cy={moonY} r="46" fill="none" stroke={INK} strokeWidth="5" />
              </g>
              {/* The sun: a drawn disc with rays that never sit still. */}
              <g opacity={ease(t, 0.05, 0.3)}>
                {Array.from({ length: 16 }, (_, k) => {
                  const a = (k / 16) * Math.PI * 2 + (boil % 2) * 0.1;
                  const r1 = 96 + ((k + boil) % 3) * 16;
                  return <path key={k} d={`M ${sunX + 70 * Math.cos(a)} ${sunY + 70 * Math.sin(a)} L ${sunX + r1 * Math.cos(a)} ${sunY + r1 * Math.sin(a)}`} stroke={GOLD} strokeWidth="6" strokeLinecap="round" />;
                })}
                <circle cx={sunX} cy={sunY} r="56" fill={GOLD} stroke={INK} strokeWidth="5" />
              </g>
            </>
          )}

          {/* The land, rising out of the sea. */}
          <path d={landBody} fill="#c9a66a" opacity={ease(rise, 0.05, 0.3)} />
          <path d={landBody} fill={landColour} opacity={day4 ? 1 : ease(t, 2.05, 2.9)} />
          <path d={landBody} fill="url(#land-hatch)" opacity={ease(rise, 0.3, 0.8)} />
          <path d={landBody} fill="#1c1a3a" opacity={night * 0.45} />

          {/* The sea. */}
          <path d={seaBody} fill="#1f6f8b" />
          <path d={seaBody} fill="#16324f" opacity={night * 0.7} />
          <path d={seaBody} fill="url(#sea-hatch)" />
        </Painted>

        {/* Ink: the land's outline, then everything that grows on it. */}
        <Drawn d={landLine} progress={landInked} stroke={INK} strokeWidth={5} />
        {plants.map((p, i) => {
          const g = grown.current[i];
          if (g < 0.02 || rise < 0.85) return null;
          const y = landY(p.x, 1) + 2;
          const s = p.size;
          if (p.kind === "tuft") {
            return <Drawn key={i} d={`M ${p.x - 7 * s} ${y} l ${-5 + p.lean} ${-17 * s} M ${p.x} ${y} l ${p.lean} ${-23 * s} M ${p.x + 7 * s} ${y} l ${6 + p.lean} ${-16 * s}`} progress={g} stroke={day4 ? leafColour : "#3f7a3c"} strokeWidth={3.2} />;
          }
          if (p.kind === "herb") {
            return (
              <g key={i}>
                <Drawn d={`M ${p.x} ${y} q ${p.lean} ${-20 * s} ${p.lean * 1.4} ${-38 * s}`} progress={g} stroke={INK} strokeWidth={2.6} />
                <Drawn d={`M ${p.x + p.lean * 0.6} ${y - 18 * s} q -12 -8 -16 -2 M ${p.x + p.lean} ${y - 28 * s} q 12 -8 16 -2`} progress={clamp01(g * 1.6 - 0.6)} stroke={day4 ? leafColour : "#4c8f45"} strokeWidth={4} />
              </g>
            );
          }
          const top = y - 86 * s;
          return (
            <g key={i}>
              <Drawn d={`M ${p.x} ${y} q ${p.lean} ${-40 * s} ${p.lean * 0.6} ${-74 * s} M ${p.x + p.lean * 0.5} ${y - 46 * s} l ${-16 * s} ${-18 * s} M ${p.x + p.lean * 0.5} ${y - 54 * s} l ${15 * s} ${-16 * s}`} progress={clamp01(g * 1.8)} stroke={INK} strokeWidth={6} />
              <circle cx={p.x + p.lean * 0.6} cy={top} r={42 * s * ease(g, 0.35, 0.85)} fill={leafColour} stroke={INK} strokeWidth="4.5" opacity={ease(g, 0.3, 0.5)} />
              {[0, 1, 2, 3, 4].map((k) => (
                <circle key={k} cx={p.x + p.lean * 0.6 + Math.cos(k * 1.9 + i) * 22 * s} cy={top + Math.sin(k * 2.3 + i) * 20 * s} r={6.2 * s * ease(g, 0.78 + k * 0.03, 0.98)} fill={p.fruit} stroke={INK} strokeWidth="1.6" />
              ))}
            </g>
          );
        })}

        {/* Ink: the sea's lines, drawn one after another before the colour goes on. */}
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <Drawn key={k} d={handLine(k === 0 ? seaTop : seaLine(k), 500 + k * 9 + boil, k === 0 ? 1.6 : 2.4)} progress={strokeTurn(inked, k, 6, 1.5)} stroke={k === 0 ? INK : paint < 0.6 ? "#4d7396" : "#bfe3ee"} strokeWidth={k === 0 ? 6 : 3.5} opacity={k === 0 ? 1 : 0.8 - k * 0.09} />
        ))}
        <Hints hints={hints} used={tips.used} show={day4 ? ease(t, 0.9, 1.2) : ease(t, 1.9, 2.2)} time={time} />
      </svg>
      <div className="hand-paper" aria-hidden="true" />

      <SceneWords title={info.title} verse={kjv(info.verses[moment])} reference={`Genesis ${info.verses[moment]}`} note={info.note} onHome={onHome} onTips={tips.reset} />
      {day4 && (
        <div className="season-tabs" role="group" aria-label="Season">
          <span className="season-label">Tap a season</span>
          {SEASONS.map((s, i) => (
            <button key={s.name} className={pickedSeason === i ? "is-on" : ""} onClick={() => setPickedSeason(pickedSeason === i ? null : i)}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      <MomentStrip names={info.moments} drawings={DRAWINGS[chapter]} clock={clock} />
    </div>
  );
}

// The small drawings on the moment buttons.
const sea = <path d="M 4 42 q 9 -6 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 V 54 H 4 Z" fill="#1f6f8b" stroke={INK} strokeWidth="2" />;
const hill = (fill: string) => <path d="M 22 44 Q 60 8 98 44 Z" fill={fill} stroke={INK} strokeWidth="2.4" />;
const DRAWINGS: Record<LandChapter, JSX.Element[]> = {
  "day-3": [
    <g key="a">
      <path d="M 40 44 Q 60 34 80 44 Z" fill="#c9a66a" stroke={INK} strokeWidth="2" />
      {sea}
    </g>,
    <g key="b">
      {hill("#c9a66a")}
      {sea}
    </g>,
    <g key="c">
      {hill("#8fb863")}
      <path d="M 44 30 l -3 -8 M 48 27 l 0 -9 M 60 22 l 0 -9 M 72 27 l 3 -8" stroke="#3f7a3c" strokeWidth="2.4" strokeLinecap="round" />
      {sea}
    </g>,
    <g key="d">
      {hill("#8fb863")}
      <path d="M 50 26 v -10 M 72 27 v -10" stroke={INK} strokeWidth="2.4" />
      <circle cx="50" cy="12" r="8" fill="#3f8a3e" stroke={INK} strokeWidth="2" />
      <circle cx="72" cy="13" r="8" fill="#3f8a3e" stroke={INK} strokeWidth="2" />
      <circle cx="48" cy="11" r="2" fill="#d2452f" />
      <circle cx="74" cy="14" r="2" fill="#f2d24b" />
      {sea}
    </g>,
  ],
  "day-4": [
    <g key="a">
      <circle cx="60" cy="24" r="11" fill={GOLD} stroke={INK} strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
        <path key={k} d={`M ${60 + 15 * Math.cos(k * 0.785)} ${24 + 15 * Math.sin(k * 0.785)} l ${5 * Math.cos(k * 0.785)} ${5 * Math.sin(k * 0.785)}`} stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
      ))}
      {sea}
    </g>,
    <g key="b">
      <rect x="4" y="4" width="112" height="38" fill="#1c1a3a" />
      <circle cx="46" cy="22" r="10" fill={CREAM} stroke={INK} strokeWidth="2" />
      <path d="M 78 14 h 8 M 82 10 v 8 M 96 28 h 6 M 99 25 v 6" stroke={CREAM} strokeWidth="2" strokeLinecap="round" />
      {sea}
    </g>,
    <g key="c">
      <rect x="4" y="4" width="112" height="38" fill="#1c1a3a" />
      {[26, 50, 74, 98].map((x, k) => (
        <g key={x}>
          <circle cx={x} cy="22" r="8" fill={CREAM} />
          <circle cx={x + [16, 7, -7, -16][k]} cy="22" r="8" fill="#1c1a3a" />
        </g>
      ))}
      {sea}
    </g>,
    <g key="d">
      {SEASONS.map((s, k) => (
        <path key={s.name} d={`M ${8 + k * 27} 44 Q ${21 + k * 27} 18 ${34 + k * 27} 44 Z`} fill={s.land} stroke={INK} strokeWidth="2" />
      ))}
      {sea}
    </g>,
  ],
};
