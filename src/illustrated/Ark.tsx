import { useMemo, useRef, useState } from "react";
import { kjv } from "../data/kjv.ts";
import { clamp01, ease, handLine, mix, rolling, seeded, type Point } from "./hand.ts";
import { CREAM, Drawn, Hints, INK, MomentStrip, Painted, Paper, Pencil, SceneWords, strokeTurn, useHints, useMoments, useView, type Hint } from "./kit.tsx";
import { AnimalDrawing, type Animal } from "./Creatures.tsx";
import { Figure } from "./Eden.tsx";

// The ark, built on the page to the numbers the text gives (Genesis 6:14-16), then loaded (7:9), then
// the flood comes (7:10) and the story hands over to the globe, where the ark is carried over the
// waters and comes to rest on the mountains of Ararat.
//
// Text: gopher wood, pitch within and without; 300 cubits long, 50 wide, 30 high; a window finished
// to a cubit above; a door in the side; lower, second and third stories; two and two.
// The side view and the end view are drawn to those proportions exactly (one cubit = CUBIT units).
// Illustration: the box shape (the text gives sizes, not a hull form), where the door sits and how
// big it is, the even spacing of the three stories, the ramp, which animals, and the size of the
// animals and the man, which are not to scale. No building site is shown.

const CUBIT = 2.8;
const LENGTH = 300 * CUBIT;
const HEIGHT = 30 * CUBIT;
const BREADTH = 50 * CUBIT;
const X0 = 800 - LENGTH / 2;
const X1 = 800 + LENGTH / 2;
const BASE = 640;
const TOP = BASE - HEIGHT;
const DOOR = { x: 830, w: 26, h: 44 };
const END = { x: 470, y: 446 }; // the end view: its lower left corner

const MOMENTS = ["Gopher wood and pitch", "300 by 50 by 30", "Window, door, three stories", "Two and two", "The flood comes"];
const VERSES = ["6:14", "6:15", "6:16", "7:9", "7:10"];
const PARTS = [
  { name: "The length: three hundred cubits", verse: "6:15" },
  { name: "The breadth fifty cubits, the height thirty", verse: "6:15" },
  { name: "A window, finished to a cubit above", verse: "6:16" },
  { name: "The door, set in the side", verse: "6:16" },
  { name: "Lower, second and third stories", verse: "6:16" },
];
const PAIRS = ["cow", "sheep", "lion", "deer"];
const lettering = { fontFamily: "'Iowan Old Style', Palatino, Georgia, serif", fontStyle: "italic" as const };

export default function Ark({ onHome, onNext }: { onHome: () => void; onNext: () => void }) {
  const view = useView(800, 560, 900, 0.6);
  const tips = useHints();
  const pointer = useRef<{ x: number; y: number; moved: number } | null>(null);
  const now = useRef(0);
  const [picked, setPicked] = useState<number | null>(null);

  const world = useMemo(() => {
    const rand = seeded(616);
    const herd: Animal[] = PAIRS.flatMap((type, pair) => [0, 1].map((twin) => ({ type, kind: 0 as const, home: DOOR.x + 20, size: 0.34 - twin * 0.03, at: 3.05 + pair * 0.2, x: 1320 + pair * 70 + twin * 26, vx: 0, dir: -1, hop: 0, hopV: 0, side: pair })));
    const rain = Array.from({ length: 70 }, () => ({ x: rand() * 2000 - 200, y: rand() * 900, v: 700 + rand() * 400 }));
    return { herd, rain };
  }, []);

  const introSeconds = 5;
  const clock = useMoments(
    MOMENTS.length,
    (dt, _time, t) => {
      now.current = t;
      world.herd.forEach((a, i) => {
        // Each pair sets out in turn and goes in at the door. Scrubbing back brings them out again.
        const target = t > a.at ? a.home : 1320 + a.side * 70 + (i % 2) * 26;
        const want = Math.max(-150, Math.min(150, (target - a.x) * 1.5));
        a.vx += (want - a.vx) * (1 - Math.exp(-dt * 3));
        a.x += a.vx * dt;
        if (Math.abs(a.vx) > 4) a.dir = a.vx > 0 ? 1 : -1;
      });
    },
    introSeconds,
  );
  const { t, time, boil } = clock;
  const moment = Math.min(MOMENTS.length - 1, Math.max(0, Math.ceil(t - 0.02) - 1));

  const intro = clamp01(time / introSeconds);
  const sketch = ease(intro, 0, 0.3);
  const sketchFade = 1 - ease(intro, 0.7, 0.98);
  const inked = clamp01((intro - 0.2) / 0.4);
  const paint = clamp01((intro - 0.5) / 0.48);

  const frame = ease(t, 0.05, 0.45); // keel, ribs, rail
  const planks = ease(t, 0.4, 0.78);
  const pitch = ease(t, 0.75, 0.98);
  const measured = ease(t, 1.08, 1.9);
  const fitted = ease(t, 2.08, 2.9);
  const ramp = ease(t, 2.95, 3.2) * (1 - ease(t, 4.05, 4.4));
  const storm = ease(t, 4.05, 4.7);
  const water = mix(BASE + 120, BASE + 14, ease(t, 4.2, 4.95));

  const scenery = useMemo(
    () => ({
      ground: handLine(rolling(-200, 1800, BASE + 2, 3, 21, 120), 21, 3),
      pencilHull: `M ${X0} ${BASE} H ${X1} V ${TOP} H ${X0} Z`,
    }),
    [],
  );
  const hull = `M ${X0} ${TOP} H ${X1} V ${BASE} H ${X0} Z`;
  const ribs = Array.from({ length: 29 }, (_, i) => X0 + ((i + 1) / 30) * LENGTH);
  const endBox = `M ${END.x} ${END.y} h ${BREADTH} v ${-HEIGHT} h ${-BREADTH} Z`;
  const waterLine: Point[] = Array.from({ length: 40 }, (_, i) => [-200 + i * 52, water + Math.sin(i * 0.9 + time * 2.2) * 7 + Math.sin(i * 0.37 - time * 1.3) * 5] as Point);

  const hints: Hint[] = [
    ...(t > 1.7 ? [{ id: "part", x: 800, y: 262, text: "Tap a number or a part of the ark" }] : []),
    { id: "scrub", x: 800, y: 722, text: "Drag left or right to build or unbuild it" },
  ];
  const toDrawing = (clientX: number, clientY: number) => ({ x: view.x + clientX * view.scale, y: view.y + clientY * view.scale });
  const verse = picked !== null ? PARTS[picked].verse : VERSES[moment];
  const dim = (on: number) => ({ fill: INK, fontSize: 22, opacity: on, ...lettering });

  return (
    <div className="hand-scene" style={{ background: "#f4ead2" }}>
      <svg
        className="hand-canvas"
        viewBox={view.box}
        preserveAspectRatio="xMidYMid slice"
        style={{ cursor: "ew-resize" }}
        onPointerDown={(e) => {
          pointer.current = { x: e.clientX, y: e.clientY, moved: 0 };
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const from = pointer.current;
          if (!from) return;
          const dx = (e.clientX - from.x) * view.scale;
          from.moved += Math.abs(dx) + Math.abs(e.clientY - from.y) * view.scale;
          from.x = e.clientX;
          from.y = e.clientY;
          if (from.moved < 10) return;
          clock.setPlaying(false);
          clock.seek(clock.position() + dx * 0.006);
          tips.mark("scrub");
        }}
        onPointerUp={(e) => {
          const from = pointer.current;
          pointer.current = null;
          if (!from || from.moved >= 10 || now.current < 1.5) return;
          const p = toDrawing(e.clientX, e.clientY);
          let hit: number | null = null;
          if (p.x > END.x - 30 && p.x < END.x + BREADTH + 150 && p.y > END.y - HEIGHT - 30 && p.y < END.y + 50) hit = 1;
          else if (p.x > X0 - 10 && p.x < X1 + 10 && p.y > TOP - 70 && p.y < TOP - 18) hit = 0;
          else if (p.x > X0 && p.x < X1 && p.y >= TOP - 18 && p.y <= BASE + 10) {
            if (now.current < 2.5) hit = 0;
            else if (Math.abs(p.x - (DOOR.x + DOOR.w / 2)) < 34 && p.y > BASE - DOOR.h - 12) hit = 3;
            else if (p.y < TOP + 16) hit = 2;
            else hit = 4;
          }
          setPicked(hit);
          if (hit !== null) tips.mark("part");
        }}
        onPointerCancel={() => (pointer.current = null)}
        role="img"
        aria-label="The ark, drawn by hand to the measures of Genesis 6:15"
      >
        <defs>
          <pattern id="wood-hatch" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            <line x1="0" y1="5" x2="11" y2="5" stroke={INK} strokeWidth="1.2" opacity="0.22" />
          </pattern>
          <pattern id="sea-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
            <line x1="0" y1="8" x2="16" y2="8" stroke={INK} strokeWidth="1.6" opacity="0.22" />
          </pattern>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#fff6d8" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#eeb04a" stopOpacity="0.45" />
            <stop offset="1" stopColor="#eeb04a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <Paper />
        <Pencil d={scenery.ground} d2={scenery.pencilHull} progress={sketch} fade={sketchFade} />

        <Painted id="paint-ark" progress={paint} view={view}>
          <rect x="-400" y="-1800" width="2600" height="4600" fill="#f1e2bb" />
          <rect x="-400" y="-1800" width="2600" height="4600" fill="#4a5568" opacity={storm * 0.75} />
          <path d={`${scenery.ground} L 1900 2600 L -300 2600 Z`} fill="#b9a878" />
        </Painted>
        <Drawn d={scenery.ground} progress={inked} stroke={INK} strokeWidth={5} />

        {/* The end view: 50 cubits by 30, to the same scale. */}
        <g opacity={measured}>
          <path d={endBox} fill="#a9763f" opacity={ease(measured, 0.3, 0.8)} />
          <path d={endBox} fill="url(#wood-hatch)" />
          <Drawn d={endBox} progress={measured} stroke={INK} strokeWidth={4} />
          <Drawn d={`M ${END.x} ${END.y + 18} h ${BREADTH} m 0 -7 v 14 M ${END.x} ${END.y + 11} v 14 M ${END.x + BREADTH + 18} ${END.y} v ${-HEIGHT} m -7 0 h 14 M ${END.x + BREADTH + 11} ${END.y} h 14`} progress={measured} stroke={INK} strokeWidth={2.4} />
          <text x={END.x + BREADTH / 2} y={END.y + 46} textAnchor="middle" {...dim(1)}>
            50 cubits wide
          </text>
          <text x={END.x + BREADTH + 34} y={END.y - HEIGHT / 2 + 7} {...dim(1)}>
            30 cubits high
          </text>
          <text x={END.x} y={END.y - HEIGHT - 12} {...dim(0.7)} fontSize={18}>
            seen from the end
          </text>
        </g>

        {/* The side view: 300 cubits by 30. Frame first, then planks, then pitch. */}
        <path d={hull} fill="#a9763f" opacity={planks} />
        <path d={hull} fill="#3b2a22" opacity={pitch * 0.55} />
        <path d={hull} fill="url(#wood-hatch)" opacity={planks} />
        <Drawn d={`M ${X0} ${BASE} H ${X1}`} progress={clamp01(frame * 3)} stroke={INK} strokeWidth={5} />
        {ribs.map((x, i) => (
          <Drawn key={i} d={`M ${x} ${BASE} V ${TOP}`} progress={strokeTurn(clamp01(frame * 1.4 - 0.2), i, ribs.length, 4)} stroke={INK} strokeWidth={2.2} opacity={1 - planks * 0.75} />
        ))}
        {[0.25, 0.5, 0.75].map((f, k) => (
          <Drawn key={k} d={handLine([[X0, TOP + HEIGHT * f], [800, TOP + HEIGHT * f + (k - 1)], [X1, TOP + HEIGHT * f]] as Point[], 310 + k, 1)} progress={strokeTurn(planks, k, 3, 1.4)} stroke={INK} strokeWidth={1.8} opacity={0.5} />
        ))}
        <Drawn d={hull} progress={clamp01(frame * 1.6 - 0.5)} stroke={INK} strokeWidth={5} />

        {/* 6:16: the window, the door, the three stories. */}
        <g>
          <Drawn d={`M ${X0 + 14} ${TOP + CUBIT + 1.5} H ${X1 - 14}`} progress={strokeTurn(fitted, 0, 3, 1.3)} stroke={CREAM} strokeWidth={CUBIT} />
          <path d={`M ${DOOR.x} ${BASE} v ${-DOOR.h} h ${DOOR.w} v ${DOOR.h} Z`} fill="#2a1d18" opacity={ease(fitted, 0.4, 0.7)} />
          <Drawn d={`M ${DOOR.x} ${BASE} v ${-DOOR.h} h ${DOOR.w} v ${DOOR.h}`} progress={strokeTurn(fitted, 1, 3, 1.3)} stroke={INK} strokeWidth={3.4} />
          {[1, 2].map((k) => (
            <path key={k} d={`M ${X0 + 6} ${TOP + (HEIGHT * k) / 3} H ${X1 - 6}`} stroke={CREAM} strokeWidth="2.6" strokeDasharray="10 9" opacity={strokeTurn(fitted, 2, 3, 1.3) * 0.9} />
          ))}
        </g>

        {/* 6:15: the length. */}
        <g opacity={measured}>
          <Drawn d={`M ${X0} ${TOP - 34} H ${X1} M ${X0} ${TOP - 44} v 20 M ${X1} ${TOP - 44} v 20`} progress={measured} stroke={INK} strokeWidth={2.6} />
          <rect x={800 - 112} y={TOP - 52} width="224" height="34" rx="10" fill={CREAM} stroke={INK} strokeWidth="2.4" />
          <text x="800" y={TOP - 28} textAnchor="middle" {...dim(1)}>
            300 cubits long
          </text>
        </g>

        {/* The ramp, and two and two. Not to scale. */}
        <Drawn d={`M ${DOOR.x + DOOR.w} ${BASE - 2} l 70 0`} progress={ramp} stroke={INK} strokeWidth={4} opacity={ramp} />
        {world.herd.map((a, i) => {
          const inside = ease(a.x, DOOR.x + 30, DOOR.x + 90);
          return (
            <g key={i} opacity={inside}>
              <AnimalDrawing a={a} y={BASE} grown={ease(t, 2.95, 3.1)} boil={boil + i} />
            </g>
          );
        })}
        {(() => {
          const x = mix(1010, DOOR.x + 14, ease(t, 3.75, 3.98));
          return (
            <g opacity={inked * (1 - ease(t, 3.9, 4.0))}>
              <Figure x={x} y={BASE} s={0.36} time={time} light={0.15} coat={1} />
            </g>
          );
        })()}

        {/* 7:10: the waters of the flood were upon the earth. */}
        {storm > 0.01 && (
          <>
            <g opacity={storm} stroke="#bfe3ee" strokeWidth="2.4" strokeLinecap="round">
              {world.rain.map((r, i) => {
                const y = ((r.y + time * r.v) % 1100) - 250;
                return <path key={i} d={`M ${r.x - y * 0.12} ${y} l -5 34`} opacity="0.75" />;
              })}
            </g>
            <path d={`${handLine(waterLine, 700 + boil, 1.4)} L 1900 2600 L -300 2600 Z`} fill="#1f6f8b" opacity="0.92" />
            <path d={`${handLine(waterLine, 700 + boil, 1.4)} L 1900 2600 L -300 2600 Z`} fill="url(#sea-hatch)" />
            <path d={handLine(waterLine, 700 + boil, 1.4)} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          </>
        )}

        {picked !== null && (
          <g transform={`translate(${800 - (PARTS[picked].name.length * 12.4 + 34) / 2} 268)`} style={{ pointerEvents: "none" }}>
            <rect width={PARTS[picked].name.length * 12.4 + 34} height="42" rx="12" fill={CREAM} stroke={INK} strokeWidth="3" />
            <text x={(PARTS[picked].name.length * 12.4 + 34) / 2} y="29" textAnchor="middle" fill={INK} fontSize="23" {...lettering}>
              {PARTS[picked].name}
            </text>
          </g>
        )}
        <Hints hints={hints} used={tips.used} show={ease(t, 0.5, 0.8)} time={time} />
      </svg>
      <div className="hand-paper" aria-hidden="true" />

      <SceneWords title="The ark" verse={kjv(verse)} reference={`Genesis ${verse}`} note="Drawn to the text's numbers: side and end views share one scale. The box shape, the door's place, the ramp and the animals (not to scale) are illustration." onHome={onHome} onTips={tips.reset} />
      {t > 4.5 && (
        <button className="scene-next" onClick={onNext}>
          Follow the ark across the waters
        </button>
      )}
      <MomentStrip names={MOMENTS} drawings={DRAWINGS} clock={clock} />
    </div>
  );
}

const box = (fill: string) => <rect x="14" y="30" width="92" height="10" fill={fill} stroke={INK} strokeWidth="2" />;
const groundLine = <path d="M 4 41 H 116" stroke={INK} strokeWidth="2.2" />;
const DRAWINGS = [
  <g key="a">
    {groundLine}
    <path d="M 14 40 H 106 M 14 40 v -10 M 29 40 v -10 M 44 40 v -10 M 60 40 v -10 M 75 40 v -10 M 91 40 v -10 M 106 40 v -10" stroke={INK} strokeWidth="2" fill="none" />
  </g>,
  <g key="b">
    {groundLine}
    {box("#a9763f")}
    <path d="M 14 22 H 106 M 14 18 v 8 M 106 18 v 8" stroke={INK} strokeWidth="1.6" />
    <text x="60" y="15" textAnchor="middle" fontSize="10" fill={INK} {...lettering}>
      300
    </text>
  </g>,
  <g key="c">
    {groundLine}
    {box("#7a5536")}
    <path d="M 18 32 H 102" stroke={CREAM} strokeWidth="1.4" />
    <rect x="62" y="33" width="5" height="7" fill="#2a1d18" />
  </g>,
  <g key="d">
    {groundLine}
    {box("#7a5536")}
    <circle cx="84" cy="24" r="3" fill="#f1e3c4" stroke={INK} strokeWidth="1.2" />
    <circle cx="94" cy="24" r="3" fill="#f1e3c4" stroke={INK} strokeWidth="1.2" />
  </g>,
  <g key="e">
    <rect x="4" y="4" width="112" height="50" fill="#4a5568" />
    {box("#7a5536")}
    <path d="M 4 42 q 9 -6 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 V 54 H 4 Z" fill="#1f6f8b" stroke={INK} strokeWidth="2" />
    <path d="M 30 10 l -3 10 M 60 8 l -3 10 M 90 12 l -3 10" stroke="#bfe3ee" strokeWidth="1.6" strokeLinecap="round" />
  </g>,
];
