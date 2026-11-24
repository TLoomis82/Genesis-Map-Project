import { useMemo, useRef } from "react";
import { kjv } from "../data/kjv.ts";
import { clamp01, ease, handLine, mix, rolling, seeded, type Point } from "./hand.ts";
import { CREAM, Drawn, GOLD, INK, MomentStrip, Painted, Paper, Pencil, SceneWords, strokeTurn, useMoments, useView } from "./kit.tsx";

// The days before there is an earth to look at, hand-drawn on the fly and live under the hand:
//
//   beginning  Genesis 1:1-2   darkness is scribbled in; the deep is drawn; wind moves over it
//   day-1      Genesis 1:3-5   light breaks; light and dark are divided; evening and morning
//   day-2      Genesis 1:6-8   the waters; a vault is drawn and lifts; waters above and below
//
// The water is a real, simple wave: a row of heights joined by springs. Swipe it and it sloshes,
// and because the ink lines are drawn from those heights every frame, the drawing itself sloshes.
// On day 1, dragging in the sky turns light and dark. On day 2, dragging lifts or lowers the vault.
//
// Each scene opens as a drawing does. The page is blank; the artist sketches the horizon in pencil,
// inks the water line by line, then brushes the colour in. In the beginning, the darkness itself is
// brushed across the blank page, stroke after stroke. Only when the drawing is made does it move.
//
// Text is as the verses give it. How any of it looked is illustration; the vault as a solid dome
// follows BibleProject's reading of the ancient picture of the world.

export type WatersChapter = "beginning" | "day-1" | "day-2";

const SURFACE = 620;
const COLUMNS = 72;
const X0 = -150;
const X1 = 1750;
const columnX = (i: number) => X0 + (i / (COLUMNS - 1)) * (X1 - X0);

const CHAPTERS: Record<WatersChapter, { title: string; reference: string; verses: string[]; moments: string[]; note: string }> = {
  beginning: {
    title: "In the beginning",
    reference: "Genesis 1:1-2",
    verses: ["1:1", "1:2", "1:2"],
    moments: ["Darkness", "The deep", "Wind over the water"],
    note: "How it looked. Swipe the water and it moves.",
  },
  "day-1": {
    title: "Day 1: light",
    reference: "Genesis 1:3-5",
    verses: ["1:3", "1:4", "1:5"],
    moments: ["Let there be light", "Light divided from dark", "Evening and morning"],
    note: "Light and dark as two halves of the sky. Drag the sky to turn them; swipe the water.",
  },
  "day-2": {
    title: "Day 2: the vault",
    reference: "Genesis 1:6-8",
    verses: ["1:6", "1:7", "1:8"],
    moments: ["The waters", "A vault opens", "Waters above and below"],
    note: "The vault as a dome follows a scholarly reading. Drag the sky to lift or lower it; swipe the water.",
  },
};

interface Props {
  chapter: WatersChapter;
  onHome: () => void;
}

export default function Waters({ chapter, onHome }: Props) {
  const info = CHAPTERS[chapter];
  const view = useView(800, 600, 900, 0.6);
  // The wave: a height and a speed for each column of water.
  const wave = useRef({ h: new Float32Array(COLUMNS), v: new Float32Array(COLUMNS) });
  const hand = useRef({ turn: 0, lift: 0 }); // what the viewer has changed by dragging the sky
  const pointer = useRef<{ x: number; y: number; inSky: boolean } | null>(null);

  // Seconds the artist takes to draw the scene in before it begins to move.
  const introSeconds = chapter === "beginning" ? 2.4 : 7;
  const clock = useMoments(info.moments.length, (dt, time, t) => {
    const { h, v } = wave.current;
    // Wind stirs the water in the beginning's last moment; otherwise there is only a faint swell.
    const wind = chapter === "beginning" ? ease(t, 2.1, 2.8) : 0.12;
    for (let step = 0; step < 2; step++) {
      const d = dt / 2;
      for (let i = 0; i < COLUMNS; i++) {
        const left = h[Math.max(i - 1, 0)];
        const right = h[Math.min(i + 1, COLUMNS - 1)];
        v[i] += (1500 * (left + right - 2 * h[i]) - 5 * h[i] + Math.sin(i * 0.45 - time * 2.6) * 55 * wind) * d;
        v[i] *= Math.exp(-0.9 * d);
      }
      for (let i = 0; i < COLUMNS; i++) h[i] = Math.max(-90, Math.min(90, h[i] + v[i] * d));
    }
  }, introSeconds);
  const { t, time, boil } = clock;
  const moment = Math.min(info.moments.length - 1, Math.max(0, Math.ceil(t - 0.02) - 1));
  // The drawing-in, 0 to 1: pencil first, then ink, then colour.
  const intro = clamp01(time / introSeconds);
  const sketch = ease(intro, 0, chapter === "beginning" ? 0.85 : 0.2);
  const sketchFade = chapter === "beginning" ? 1 - ease(t, 0.5, 1) : 1 - ease(intro, 0.72, 0.98);
  const inked = chapter === "beginning" ? clamp01((t - 0.95) / 0.75) : clamp01((intro - 0.16) / 0.4);
  const paint = chapter === "beginning" ? 1 : clamp01((intro - 0.5) / 0.48);

  const scenery = useMemo(() => {
    const rand = seeded(41);
    return {
      // Darkness, scribbled in with long strokes.
      // Darkness: broad strokes, each a little lower than the last, that between them cover the page.
      scribbles: Array.from({ length: 30 }, (_, i) => {
        const y = -860 + i * 82 + rand() * 16;
        const line = rolling(-260, 1860, y, 16, 60 + i, 110).map(([x, yy]) => [x, yy + (x / 1600) * 50] as Point);
        return handLine(i % 2 ? line.reverse() : line, 60 + i, 7); // back and forth, as a hand works
      }),
      sketchHorizon: handLine(rolling(-200, 1800, SURFACE, 7, 21, 100), 21, 5),
      sketchHorizon2: handLine(rolling(-200, 1800, SURFACE + 5, 9, 22, 120), 22, 6),
      sketchWave: handLine(rolling(-200, 1800, SURFACE + 86, 12, 23, 90), 23, 6),
      stars: Array.from({ length: 40 }, () => ({ x: (rand() - 0.5) * 2600, y: -80 - rand() * 1300, s: 4 + rand() * 5, cross: rand() < 0.5 })),
      rays: Array.from({ length: 19 }, (_, i) => {
        const a = Math.PI * (0.04 + (i / 18) * 0.92);
        const r0 = 90 + rand() * 40;
        const r1 = 520 + rand() * 520;
        return handLine(
          [0, 0.33, 0.66, 1].map((k) => [800 - Math.cos(a) * mix(r0, r1, k), SURFACE - Math.sin(a) * mix(r0, r1, k)] as Point),
          90 + i,
          5,
        );
      }),
      wind: Array.from({ length: 6 }, (_, i) => {
        const y = 380 + i * 34 + rand() * 12;
        const x = 120 + rand() * 900;
        return `M ${x} ${y} q 90 -22 180 0 t 170 -4 q 46 -6 40 -30 q -8 -22 -30 -10`;
      }),
    };
  }, []);

  // ---- what each part is doing at this point ----
  const begun = chapter !== "beginning";
  // Day 1: how much light there is, and where the turning line between light and dark stands.
  const light = chapter === "beginning" ? 0 : chapter === "day-1" ? ease(t, 0.35, 1) : 1;
  const divided = chapter === "day-1" ? ease(t, 1, 1.35) : 0;
  const turn = chapter === "day-1" ? mix(0, 90, ease(t, 1.05, 1.9)) + mix(0, 90, ease(t, 2.05, 2.45)) + mix(0, 180, ease(t, 2.5, 2.98)) + hand.current.turn : 0;
  // Day 2: how far the vault has been drawn, and how high it stands.
  const vaultDrawn = chapter === "day-2" ? ease(t, 1, 1.45) : 0;
  const vaultHeight = chapter === "day-2" ? Math.max(24, Math.min(470, mix(24, 380, ease(t, 1.35, 2.1)) + hand.current.lift)) : 0;
  const cleared = chapter === "day-2" ? ease(t, 1.6, 2.4) : 0;
  const vaultY = (x: number) => {
    const k = (x - 800) / 620;
    return Math.abs(k) >= 1 ? SURFACE : SURFACE - vaultHeight * Math.sqrt(1 - k * k);
  };

  // ---- the water, drawn from the wave every frame ----
  const { h } = wave.current;
  const waterLine = (layer: number): Point[] => {
    const out: Point[] = [];
    for (let i = 0; i < COLUMNS; i += 2) {
      const x = columnX(i);
      out.push([x, SURFACE + layer * 40 + h[i] * Math.pow(0.62, layer) + Math.sin(x / 70 + time * (1.1 + layer * 0.2) + layer * 2) * (5 - layer * 0.6)]);
    }
    return out;
  };
  const top = waterLine(0);
  const body = `${handLine(top, 200 + boil, 1.6)} L ${X1} 2600 L ${X0} 2600 Z`;
  // Day 2: the waters above ride on the vault, and slosh with the same wave.
  const upperLine = (layer: number): Point[] => {
    const out: Point[] = [];
    for (let i = 0; i < COLUMNS; i += 2) {
      const x = columnX(i);
      out.push([x, vaultY(x) - 30 - layer * 34 + h[i] * 0.35 + Math.sin(x / 80 - time * (0.9 + layer * 0.15) + layer) * 5]);
    }
    return out;
  };

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
          pointer.current = { x: e.clientX, y: e.clientY, inSky: p.y < SURFACE - 40 };
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
          const centre = Math.round(((p.x - X0) / (X1 - X0)) * (COLUMNS - 1));
          if (from.inSky && chapter === "day-1") hand.current.turn += dx * 0.22;
          if (from.inSky && chapter === "day-2") hand.current.lift -= dy;
          // The water answers every drag: hard under a swipe across it, gently when the sky is moved.
          const push = from.inSky ? dy * 2 + dx * 1.2 : dy * 9 - Math.abs(dx) * 3;
          for (let j = -4; j <= 4; j++) {
            const i = centre + j;
            if (i >= 0 && i < COLUMNS) wave.current.v[i] += push * (1 - Math.abs(j) / 5);
          }
        }}
        onPointerUp={() => (pointer.current = null)}
        onPointerCancel={() => (pointer.current = null)}
        role="img"
        aria-label={`${info.title}, drawn by hand`}
      >
        <defs>
          <pattern id="water-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
            <line x1="0" y1="8" x2="16" y2="8" stroke={INK} strokeWidth="1.6" opacity="0.22" />
          </pattern>
        </defs>

        {/* Blank paper, then the pencil finding the horizon. */}
        <Paper />
        <Pencil d={scenery.sketchHorizon} d2={scenery.sketchHorizon2} progress={sketch} fade={sketchFade} />
        <Pencil d={scenery.sketchWave} progress={clamp01(sketch * 1.4 - 0.5)} fade={sketchFade} />

        <Painted id={`paint-${chapter}`} progress={paint} view={view}>
          {/* The ground colour of the page once painted: night, or on day 2 the waters everywhere. */}
          {begun && <rect x="-400" y="-1800" width="2400" height="4600" fill={chapter === "day-2" ? "#2c6a8f" : "#1c1a3a"} />}
          {/* In the beginning the darkness is brushed across the blank page, one broad stroke after another. */}
          {chapter === "beginning" && (
            <>
              {scenery.scribbles.map((d, i) => (
                <Drawn key={i} d={d} progress={strokeTurn(clamp01((t - 0.02) / 0.86), i, scenery.scribbles.length, 1.3)} stroke={i % 3 === 0 ? "#141230" : "#1c1a3a"} strokeWidth={128} />
              ))}
              <rect x="-400" y="-1800" width="2400" height="4600" fill="#1c1a3a" opacity={ease(t, 0.84, 1)} />
            </>
          )}

          {/* Light: a pale sky, and rays drawn out from where it breaks. No sun: that is day 4. */}
          {chapter === "day-1" && light > 0 && (
            <>
              <rect x="-400" y="-1800" width="2400" height={1800 + SURFACE} fill="#f3e2b6" opacity={light} />
              {scenery.rays.map((d, i) => (
                <Drawn key={i} d={d} progress={chapter === "day-1" ? ease(t, 0.2 + i * 0.02, 0.7 + i * 0.02) : 1} stroke={GOLD} strokeWidth={i % 3 === 0 ? 7 : 4} opacity={chapter === "day-1" ? 0.85 : 0.35} />
              ))}
            </>
          )}

          {/* Day 1: the dark half of the sky, turning about the horizon. */}
          {divided > 0 && (
            <g transform={`rotate(${-turn} 800 ${SURFACE})`} opacity={divided}>
              <rect x="-2400" y={SURFACE} width="6400" height="3600" fill="#1b1940" />
              <g transform={`translate(800 ${SURFACE}) scale(1 -1)`}>
                {scenery.stars.map((s, i) =>
                  s.cross ? (
                    <path key={i} d={`M ${s.x - s.s} ${s.y} h ${2 * s.s} M ${s.x} ${s.y - s.s} v ${2 * s.s}`} stroke={CREAM} strokeWidth="2.4" strokeLinecap="round" />
                  ) : (
                    <circle key={i} cx={s.x} cy={s.y} r={s.s / 3} fill={CREAM} />
                  ),
                )}
              </g>
              <path d={handLine(rolling(-1800, 3400, SURFACE, 5, 300 + boil, 130), 300 + boil, 3)} fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
            </g>
          )}

          {/* Day 2: water above, and the vault drawn between. */}
          {chapter === "day-2" && (
            <>
            
              <path d={`M 180 ${SURFACE} A 620 ${vaultHeight} 0 0 1 1420 ${SURFACE} Z`} fill="#f3e2b6" opacity={cleared} />
              {[0, 1, 2, 3, 4].map((k) => (
                <Drawn key={k} d={handLine(upperLine(k), 400 + k * 7 + boil, 2)} progress={ease(t, 0.1 + k * 0.12, 0.7 + k * 0.12)} stroke={k === 0 ? INK : "#bfe3ee"} strokeWidth={k === 0 ? 5 : 3.5} opacity={k === 0 ? 1 : 0.75} />
              ))}
              <Drawn d={`M 180 ${SURFACE} A 620 ${vaultHeight} 0 0 1 1420 ${SURFACE}`} progress={vaultDrawn} stroke={INK} strokeWidth={15} />
              <Drawn d={`M 180 ${SURFACE} A 620 ${vaultHeight} 0 0 1 1420 ${SURFACE}`} progress={vaultDrawn} stroke={CREAM} strokeWidth={8} />
            </>
          )}

          {/* Wind over the water: curled strokes that drift. */}
          {chapter === "beginning" &&
            scenery.wind.map((d, i) => (
              <g key={i} transform={`translate(${((time * (50 + i * 9)) % 520) - 160} 0)`} opacity={ease(t, 2.05, 2.4)}>
                <Drawn d={d} progress={ease(t, 2.05 + i * 0.07, 2.6 + i * 0.07)} stroke={CREAM} strokeWidth={5} opacity={0.8} />
              </g>
            ))}

          {/* The body of the water: colour under the ink. */}
          <path d={body} fill="#16324f" opacity={begun ? 1 : ease(t, 1.5, 1.95)} />
          <path d={body} fill="#1f6f8b" opacity={(begun ? 1 : ease(t, 1.5, 1.95)) * light * 0.85} />
          <path d={body} fill="url(#water-hatch)" opacity={begun ? 1 : ease(t, 1.6, 2)} />
        </Painted>

        {/* The water's ink lines, drawn one after another with the pen, before any colour goes on. */}
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <Drawn
            key={k}
            d={handLine(k === 0 ? top : waterLine(k), 200 + k * 9 + boil, k === 0 ? 1.6 : 2.4)}
            progress={strokeTurn(inked, k, 6, 1.5)}
            stroke={k === 0 ? INK : paint < 0.6 ? "#4d7396" : light > 0.5 ? "#bfe3ee" : "#4d7396"}
            strokeWidth={k === 0 ? 6 : 3.5}
            opacity={k === 0 ? 1 : 0.8 - k * 0.09}
          />
        ))}
      </svg>
      <div className="hand-paper" aria-hidden="true" />

      <SceneWords title={info.title} verse={kjv(info.verses[moment])} reference={`Genesis ${info.verses[moment]}`} note={info.note} onHome={onHome} />
      <MomentStrip names={info.moments} drawings={DRAWINGS[chapter]} clock={clock} />
    </div>
  );
}

// The small drawings on the moment buttons.
const sea = <path d="M 4 40 q 9 -6 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 V 54 H 4 Z" fill="#1f6f8b" stroke={INK} strokeWidth="2" />;
const darkSea = <path d="M 4 40 q 9 -6 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 V 54 H 4 Z" fill="#16324f" stroke={CREAM} strokeWidth="1.6" />;
const DRAWINGS: Record<WatersChapter, JSX.Element[]> = {
  beginning: [
    <g key="a" stroke="#4a4780" strokeWidth="5" strokeLinecap="round">
      <path d="M 8 14 L 112 8 M 8 28 L 112 22 M 8 42 L 112 36" />
    </g>,
    <g key="b">{darkSea}</g>,
    <g key="c">
      {darkSea}
      <path d="M 16 22 q 22 -8 44 0 q 12 2 10 -8 M 54 30 q 20 -6 40 0" fill="none" stroke={CREAM} strokeWidth="2.6" strokeLinecap="round" />
    </g>,
  ],
  "day-1": [
    <g key="a">
      {sea}
      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
        <path key={k} d={`M ${60 - Math.cos(0.3 + k * 0.42) * 12} ${38 - Math.sin(0.3 + k * 0.42) * 12} L ${60 - Math.cos(0.3 + k * 0.42) * 32} ${38 - Math.sin(0.3 + k * 0.42) * 32}`} stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" />
      ))}
    </g>,
    <g key="b">
      <rect x="4" y="4" width="56" height="36" fill="#f3e2b6" />
      <rect x="60" y="4" width="56" height="36" fill="#1b1940" />
      <path d="M 60 3 V 40" stroke={INK} strokeWidth="2.5" />
      <circle cx="84" cy="16" r="1.6" fill={CREAM} />
      <circle cx="100" cy="26" r="1.6" fill={CREAM} />
      {sea}
    </g>,
    <g key="c">
      <path d="M 36 30 a 24 24 0 1 1 48 0" fill="none" stroke={CREAM} strokeWidth="3" strokeLinecap="round" strokeDasharray="3 6" />
      <path d="M 80 24 l 5 8 l 5 -9" fill="none" stroke={CREAM} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {sea}
    </g>,
  ],
  "day-2": [
    <g key="a">
      <path d="M 6 14 q 9 -6 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 M 6 26 q 9 -6 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0" fill="none" stroke="#bfe3ee" strokeWidth="2.4" />
      {sea}
    </g>,
    <g key="b">
      <path d="M 18 40 A 42 18 0 0 1 102 40" fill="#f3e2b6" stroke={INK} strokeWidth="3" />
      {sea}
    </g>,
    <g key="c">
      <path d="M 10 12 q 9 -5 18 0 t 18 0 t 18 0 t 18 0 t 18 0" fill="none" stroke="#bfe3ee" strokeWidth="2.4" />
      <path d="M 18 40 A 42 30 0 0 1 102 40" fill="#f3e2b6" stroke={INK} strokeWidth="3" />
      {sea}
    </g>,
  ],
};
