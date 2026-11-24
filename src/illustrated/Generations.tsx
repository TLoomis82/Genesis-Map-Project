import { useRef, useState } from "react";
import { floodYearAM, patriarchYears, type Tradition } from "../data/chronology.ts";
import { kjv } from "../data/kjv.ts";
import { clamp01, ease, handLine, type Point } from "./hand.ts";
import { CREAM, Drawn, GOLD, Hints, INK, MomentStrip, Paper, Pencil, SceneWords, strokeTurn, useHints, useMoments, useView, type Hint } from "./kit.tsx";

// The generations, Genesis 5: ten lives as ten drawn lines, each as long as the years the text gives.
// Drag along the years to see who was alive together. The Hebrew (Masoretic) and Greek (Septuagint)
// counts differ; both are textual traditions and the viewer can switch between them.
//
// Text: the ages in Genesis 5 and Noah's age at the flood (7:6). The chart itself is illustration.

const X0 = 390;
const X1 = 1210;
const TOP = 330;
const ROW = 38;
const MOMENTS = ["Adam to Seth", "Ten generations", "Noah"];
const VERSES = ["5:3", "5:5", "5:29"];
const COUNTS: { id: Tradition; label: string }[] = [
  { id: "masoretic", label: "Hebrew count" },
  { id: "septuagint", label: "Greek count" },
];

export default function Generations({ onHome }: { onHome: () => void }) {
  const view = useView(800, 560, 900, 0.6);
  const tips = useHints();
  const [tradition, setTradition] = useState<Tradition>("masoretic");
  const [cursor, setCursor] = useState<number | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const introSeconds = 4;
  const clock = useMoments(MOMENTS.length, undefined, introSeconds);
  const { t, time, boil } = clock;
  const moment = Math.min(MOMENTS.length - 1, Math.max(0, Math.ceil(t - 0.02) - 1));
  const intro = clamp01(time / introSeconds);

  const lives = patriarchYears(tradition);
  const flood = floodYearAM(tradition);
  const last = Math.max(...lives.map((l) => l.diedAM));
  const xOf = (year: number) => X0 + (year / last) * (X1 - X0);
  const yearOf = (x: number) => Math.max(0, Math.min(last, ((x - X0) / (X1 - X0)) * last));
  const alive = cursor === null ? [] : lives.filter((l) => cursor >= l.bornAM && cursor <= l.diedAM);

  const hints: Hint[] = [{ id: "drag", x: 800, y: 262, text: "Drag along the years to see who lived together" }];
  const toDrawing = (clientX: number) => view.x + clientX * view.scale;
  const bottom = TOP + ROW * 10 + 6;

  return (
    <div className="hand-scene" style={{ background: "#f4ead2" }}>
      <svg
        className="hand-canvas"
        viewBox={view.box}
        preserveAspectRatio="xMidYMid slice"
        style={{ cursor: "ew-resize" }}
        onPointerDown={(e) => {
          pointer.current = { x: e.clientX, y: e.clientY };
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          setCursor(yearOf(toDrawing(e.clientX)));
        }}
        onPointerMove={(e) => {
          if (!pointer.current) return;
          setCursor(yearOf(toDrawing(e.clientX)));
          if (Math.abs(e.clientX - pointer.current.x) > 8) tips.mark("drag");
        }}
        onPointerUp={() => (pointer.current = null)}
        onPointerCancel={() => (pointer.current = null)}
        role="img"
        aria-label="The generations from Adam to Noah, drawn by hand"
      >
        <Paper />
        {/* Pencil rulings first, as an artist would set out a chart. */}
        {lives.map((_, i) => (
          <Pencil key={i} d={`M ${X0 - 10} ${TOP + i * ROW + 22} H ${X1 + 10}`} progress={strokeTurn(ease(intro, 0, 0.6), i, 10, 2)} fade={0.55} />
        ))}

        {/* The years, counted from Adam. */}
        <Drawn d={handLine([[X0, bottom], [(X0 + X1) / 2, bottom + 2], [X1, bottom]] as Point[], 7, 2)} progress={ease(intro, 0.4, 0.9)} stroke={INK} strokeWidth={4} />
        {Array.from({ length: Math.floor(last / 500) + 1 }, (_, k) => k * 500).map((year) => (
          <g key={year} opacity={ease(intro, 0.6, 1)}>
            <path d={`M ${xOf(year)} ${bottom} v 12`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <text x={xOf(year)} y={bottom + 36} textAnchor="middle" fill={INK} fontSize="19" fontFamily="'Iowan Old Style', Palatino, Georgia, serif" fontStyle="italic">
              {year === 0 ? "Adam" : year}
            </text>
          </g>
        ))}

        {/* Ten lives. */}
        {lives.map((life, i) => {
          const on = i < 2 ? ease(t, 0.1 + i * 0.4, 0.5 + i * 0.4) : i < 9 ? ease(t, 1.05 + (i - 2) * 0.11, 1.35 + (i - 2) * 0.11) : ease(t, 2.05, 2.5);
          if (on < 0.01) return null;
          const y = TOP + i * ROW + 24;
          const x0 = xOf(life.bornAM);
          const x1 = xOf(life.diedAM);
          const lit = cursor === null || alive.includes(life);
          const line = handLine([[x0, y], [(x0 + x1) / 2, y + (i % 2 ? 2 : -2)], [x1, y]] as Point[], 200 + i + (lit ? boil : 0), 1.2);
          const taken = life.name === "Enoch";
          return (
            <g key={life.name} opacity={lit ? 1 : 0.42}>
              <Drawn d={line} progress={on} stroke={INK} strokeWidth={17} />
              <Drawn d={line} progress={on} stroke={lit ? GOLD : "#d8c9a0"} strokeWidth={10.5} />
              {/* Enoch "was not; for God took him" (5:24): his line lifts instead of ending. */}
              {taken && <Drawn d={`M ${x1} ${y} q 14 -8 18 -34`} progress={clamp01(on * 2 - 1)} stroke={GOLD} strokeWidth={5} />}
              <text x={x0 + 2} y={y - 12} fill={INK} fontSize="19" fontFamily="'Iowan Old Style', Palatino, Georgia, serif" fontStyle="italic" opacity={on}>
                {life.name}
                {cursor !== null && lit ? `, ${Math.round(cursor - life.bornAM)}` : ""}
              </text>
            </g>
          );
        })}

        {/* The flood, by Noah's age (7:6). */}
        <g opacity={ease(t, 2.4, 2.9)}>
          <Drawn d={handLine(Array.from({ length: 12 }, (_, k) => [xOf(flood) + (k % 2 ? 5 : -5), TOP - 12 + k * ((bottom - TOP + 12) / 11)] as Point), 31 + boil, 1.5)} progress={ease(t, 2.4, 2.9)} stroke="#1f6f8b" strokeWidth={5} />
          <text x={xOf(flood) - 10} y={TOP - 10} textAnchor="end" fill="#1f6f8b" fontSize="21" fontFamily="'Iowan Old Style', Palatino, Georgia, serif" fontStyle="italic">
            The flood, year {flood}
          </text>
        </g>

        {/* The year under the hand. */}
        {cursor !== null && (
          <g style={{ pointerEvents: "none" }}>
            <path d={`M ${xOf(cursor)} ${TOP - 6} V ${bottom}`} stroke={INK} strokeWidth="3" strokeDasharray="3 9" strokeLinecap="round" />
            <g transform={`translate(${Math.max(X0 + 20, Math.min(X1 - 20, xOf(cursor))) - 150} ${TOP - 92})`}>
              <rect width="300" height="44" rx="12" fill={CREAM} stroke={INK} strokeWidth="3" />
              <text x="150" y="30" textAnchor="middle" fill={INK} fontSize="22" fontFamily="'Iowan Old Style', Palatino, Georgia, serif" fontStyle="italic">
                Year {Math.round(cursor)}: {alive.length} alive
              </text>
            </g>
          </g>
        )}
        <Hints hints={hints} used={tips.used} show={ease(t, 0.5, 0.8)} time={time} />
      </svg>
      <div className="hand-paper" aria-hidden="true" />

      <SceneWords title="The generations" verse={kjv(VERSES[moment])} reference={`Genesis ${VERSES[moment]}`} note="The chart. The ages are the text's; the Hebrew and Greek manuscripts count them differently. Drag along the years; tap a count." onHome={onHome} onTips={tips.reset} />
      <div className="season-tabs" role="group" aria-label="Which count">
        <span className="season-label" style={{ color: INK, textShadow: "none" }}>Tap a count</span>
        {COUNTS.map((c) => (
          <button key={c.id} className={tradition === c.id ? "is-on" : ""} onClick={() => setTradition(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <MomentStrip names={MOMENTS} drawings={DRAWINGS} clock={clock} />
    </div>
  );
}

const bar = (x0: number, x1: number, y: number) => (
  <g key={`${x0}-${y}`}>
    <path d={`M ${x0} ${y} H ${x1}`} stroke={INK} strokeWidth="7" strokeLinecap="round" />
    <path d={`M ${x0} ${y} H ${x1}`} stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
  </g>
);
const DRAWINGS = [
  <g key="a">{[bar(12, 70, 20), bar(22, 80, 34)]}</g>,
  <g key="b">{[bar(10, 60, 12), bar(18, 68, 22), bar(26, 76, 32), bar(38, 70, 42), bar(50, 104, 52)]}</g>,
  <g key="c">
    {[bar(14, 60, 18), bar(40, 106, 34)]}
    <path d="M 88 6 q 5 8 0 16 t 0 16 t 0 16" fill="none" stroke="#1f6f8b" strokeWidth="3" strokeLinecap="round" />
  </g>,
];
