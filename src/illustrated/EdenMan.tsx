import { useEffect, useMemo, useRef, useState } from "react";
import { kjv } from "../data/kjv.ts";
import { clamp01, ease, handLine, mix, rolling, seeded, type Point } from "./hand.ts";

// Eden 1: the man formed from the dust (Genesis 2:7), as a live hand-drawn scene.
//
// Four moments, in the order the verse gives them: dust lifts, it gathers into a shape, breath
// enters, he sits up. The scene plays through them, and the strip of small drawings underneath is
// both the map of the scene and its control: tap a moment to go to it, or drag across the picture
// to move through the forming by hand.
//
// Text: formed of the dust of the ground; the breath of life breathed into his nostrils; man became
// a living soul; bare earth and a rising mist (2:5-6). Illustration: how the forming looked.
// God is never drawn: only what happens is shown.
//
// Drawing: everything is plain SVG shapes with hand-wobbled outlines made once in code (no filters
// on moving parts, which keeps it fast on a phone). Living things "boil": their lines are redrawn a
// few times a second, the way a hand-animated line never sits quite still.

const INK = "#1d1a33";
const CREAM = "#fbeecb";
const GOLD = "#eeb04a";

const MOMENTS = ["Dust lifts", "It gathers", "Breath enters", "He sits up"];
const HIP: Point = [800, 706];
const SHOULDER: Point = [975, 652];
const HEAD: Point = [1036, 634];
const BREATH = "M 1530 70 C 1370 150 1500 300 1330 384 S 1196 520 1086 612";

interface Props {
  onHome: () => void;
}

export default function EdenMan({ onHome }: Props) {
  // Where the scene is, 0 to 4: each whole number is the end of a moment.
  const [t, setT] = useState(0);
  const [boil, setBoil] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [box, setBox] = useState({ w: window.innerWidth, h: window.innerHeight });
  const want = useRef(1);
  const now = useRef(0);
  const drag = useRef<{ x: number; t: number } | null>(null);
  const small = Math.min(box.w, box.h) < 600;

  // The background is drawn once.
  const scenery = useMemo(() => {
    const rand = seeded(23);
    const stars = Array.from({ length: 38 }, () => ({ x: 40 + rand() * 1520, y: -260 + rand() * 660, s: 4 + rand() * 5, cross: rand() < 0.5 }));
    const flicks = Array.from({ length: 70 }, () => ({ x: 20 + rand() * 1560, y: 750 + rand() * 90, l: 8 + rand() * 14, k: (rand() - 0.5) * 6 }));
    const band = (y: number, seed: number) => `${handLine(rolling(-200, 1800, y, 16, seed), seed, 4)} L 1800 900 L -200 900 Z`;
    return {
      stars,
      flicks,
      bands: [band(300, 2), band(470, 3), band(560, 4)],
      hills: `${handLine(rolling(-200, 1800, 612, 26, 7), 7, 4)} L 1800 780 L -200 780 Z`,
      ground: `${handLine(rolling(-200, 1800, 722, 8, 9, 80), 9, 3)} L 1800 2600 L -200 2600 Z`,
    };
  }, []);

  // Each speck of dust: where it lies, where it lifts to, and where on the body it ends up.
  const dust = useMemo(() => {
    const rand = seeded(5);
    return Array.from({ length: small ? 90 : 160 }, () => {
      const gx = 420 + rand() * 470; // kept near the figure so a tall phone screen still shows it
      const along = rand();
      return {
        gx,
        gy: 726 + rand() * 12,
        lx: gx + (rand() - 0.5) * 60,
        ly: 716 - 20 - rand() * 130,
        bx: mix(585, 990, along),
        by: mix(716, 650, along) + (rand() - 0.5) * 34,
        r: 2 + rand() * 3.4,
        delay: rand(),
        colour: ["#e0b073", "#f3d79a", "#c08552", CREAM][Math.floor(rand() * 4)],
        spin: rand() * 6.28,
      };
    });
  }, [small]);

  // The scene glides toward the moment that is wanted. While playing, it moves on by itself.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let rested = 0;
    let lastBoil = 0;
    const tick = (time: number) => {
      const dt = Math.min((time - last) / 1000, 0.1);
      last = time;
      const gap = want.current - now.current;
      now.current += Math.max(-0.5, Math.min(0.5, gap * 2.4)) * dt;
      if (Math.abs(gap) < 0.012) {
        rested += dt;
        if (playing && rested > 1.1 && want.current < MOMENTS.length) {
          want.current += 1;
          rested = 0;
        }
      } else rested = 0;
      setT(now.current);
      if (time - lastBoil > 150) {
        lastBoil = time;
        setBoil((b) => (b + 1) % 3);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    const onResize = () => setBox({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const goTo = (moment: number) => {
    want.current = moment;
    setPlaying(false);
  };

  // The view: always keeps the figure in frame, wide screen or tall phone.
  const aspect = box.w / box.h;
  const vw = Math.max(760, Math.min(1600, 1000 * aspect));
  const vh = vw / aspect;
  const vx = Math.max(0, Math.min(1600 - vw, 810 - vw / 2));
  const vy = 650 - vh * 0.56;

  // What each part is doing at this point in the scene.
  const outline = ease(t, 0.9, 1.5) * (1 - ease(t, 1.8, 2.3)); // the dotted shape, before it is solid
  const solid = ease(t, 1.6, 2.3);
  const breath = ease(t, 2.0, 2.85);
  const alive = ease(t, 2.75, 3.05);
  const rise = ease(t, 3.1, 3.95);
  const breathFade = 1 - ease(t, 3.3, 3.9);
  const jitter = (n: number) => [0, 1.3, -1.1][(boil + n) % 3];
  const moment = Math.min(MOMENTS.length - 1, Math.max(0, Math.ceil(t - 0.02) - 1));

  return (
    <div className="hand-scene">
      <svg
        className="hand-canvas"
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid slice"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, t: now.current };
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const moved = ((e.clientX - drag.current.x) / box.w) * 4.4;
          if (Math.abs(moved) > 0.03) setPlaying(false);
          want.current = Math.max(0, Math.min(MOMENTS.length, drag.current.t + moved));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        role="img"
        aria-label="A figure of light is formed from the dust of the ground and receives the breath of life"
      >
        <defs>
          <pattern id="hatch-a" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
            <line x1="0" y1="7" x2="14" y2="7" stroke={INK} strokeWidth="1.6" opacity="0.26" />
          </pattern>
          <pattern id="hatch-b" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="5" x2="10" y2="5" stroke={INK} strokeWidth="1.4" opacity="0.2" />
          </pattern>
        </defs>

        {/* Sky in flat bands, like cut paper; stars as small crosses and dots. */}
        <rect x="-200" y="-1600" width="2000" height="2500" fill="#2a2752" />
        <path d={scenery.bands[0]} fill="#3a3466" />
        <path d={scenery.bands[1]} fill="#5a3f6b" />
        <path d={scenery.bands[2]} fill="#c6704e" />
        {scenery.stars.map((s, i) =>
          s.cross ? (
            <path key={i} d={`M ${s.x - s.s} ${s.y} h ${2 * s.s} M ${s.x} ${s.y - s.s} v ${2 * s.s}`} stroke={CREAM} strokeWidth="2.2" strokeLinecap="round" />
          ) : (
            <circle key={i} cx={s.x} cy={s.y} r={s.s / 3} fill={CREAM} />
          ),
        )}

        {/* Bare hills: no plant of the field was yet in the earth (2:5). */}
        <path d={scenery.hills} fill="#6b4762" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d={scenery.hills} fill="url(#hatch-b)" />
        {/* The mist that went up from the earth (2:6), drifting. */}
        {[170, 430, 1260, 1470].map((x, i) => (
          <g key={x} opacity="0.7" transform={`translate(${Math.sin(t * 0.6 + i) * 14} 0)`}>
            <path d={`M ${x - 90} ${690 + i * 5} q 30 -26 60 0 t 60 0 t 60 0`} fill="none" stroke={CREAM} strokeWidth="4" strokeLinecap="round" />
            <path d={`M ${x - 50} ${708 + i * 5} q 24 -18 48 0 t 48 0`} fill="none" stroke={CREAM} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          </g>
        ))}

        {/* The ground. */}
        <path d={scenery.ground} fill="#9a6240" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <rect x="-200" y="790" width="2000" height="1900" fill="url(#hatch-a)" />
        {scenery.flicks.map((f, i) => (
          <path key={i} d={`M ${f.x} ${f.y} l ${f.l} ${f.k}`} stroke={INK} strokeWidth="2" opacity="0.38" strokeLinecap="round" />
        ))}

        {/* The breath: a ribbon of light drawn down to the face. */}
        <g opacity={breathFade}>
          <path d={BREATH} pathLength={1} fill="none" stroke={INK} strokeWidth="30" strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - breath} />
          <path d={BREATH} pathLength={1} fill="none" stroke={CREAM} strokeWidth="21" strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - breath} />
          <path d={BREATH} fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round" strokeDasharray="26 18" strokeDashoffset={-t * 60} opacity={ease(breath, 0.85, 1)} transform="translate(4 3)" />
        </g>

        {/* The shape before it is solid: a dotted line where the body will be. */}
        <g opacity={outline} fill="none" stroke={CREAM} strokeWidth="7" strokeLinecap="round" strokeDasharray="4 16">
          <path d="M 585 706 C 660 690 730 680 800 676 C 880 660 940 640 990 628" />
          <path d="M 585 726 C 670 734 740 732 800 728 C 870 716 930 700 990 676" />
          <circle cx={HEAD[0]} cy={HEAD[1]} r="42" />
        </g>

        {/* The dust: lying, lifting, and drawing into the body. */}
        <g opacity={1 - ease(t, 1.75, 2.3)}>
          {dust.map((d, i) => {
            const lift = ease(t, d.delay * 0.55, d.delay * 0.55 + 0.45);
            const gather = ease(t, 1 + d.delay * 0.45, 1.5 + d.delay * 0.45);
            const swirl = Math.sin(t * 2.2 + d.spin) * 10 * lift * (1 - gather);
            const x = mix(mix(d.gx, d.lx, lift), d.bx, gather) + swirl;
            const y = mix(mix(d.gy, d.ly, lift), d.by, gather) + swirl * 0.4;
            return <circle key={i} cx={x} cy={y} r={d.r} fill={d.colour} stroke={INK} strokeWidth="1" />;
          })}
        </g>

        {/* The figure of light. The legs stay on the ground; the body and head rise when he sits up. */}
        <g opacity={solid} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${jitter(0) * 0.6} ${jitter(1) * 0.6})`}>
          <path d={`M 590 716 L ${HIP[0]} ${HIP[1] + 6}`} stroke={INK} strokeWidth="50" />
          <path d={`M 590 716 L ${HIP[0]} ${HIP[1] + 6}`} stroke={CREAM} strokeWidth="40" />
          <g transform={`rotate(${-74 * rise} ${HIP[0]} ${HIP[1]})`}>
            {/* Rays around the head once he lives: drawn, and never quite still. */}
            <g opacity={alive} transform={`rotate(${jitter(2) * 3} ${HEAD[0]} ${HEAD[1]})`}>
              {Array.from({ length: 20 }, (_, k) => {
                const a = (k / 20) * Math.PI * 2;
                const r0 = 62 + (k % 2) * 8;
                const r1 = 100 + ((k + boil) % 3) * 20;
                return (
                  <path
                    key={k}
                    d={`M ${HEAD[0] + r0 * Math.cos(a)} ${HEAD[1] + r0 * Math.sin(a)} L ${HEAD[0] + r1 * Math.cos(a)} ${HEAD[1] + r1 * Math.sin(a)}`}
                    stroke={GOLD}
                    strokeWidth="5"
                  />
                );
              })}
            </g>
            <path d={`M ${HIP[0]} ${HIP[1]} L ${SHOULDER[0]} ${SHOULDER[1]}`} stroke={INK} strokeWidth="62" />
            <path d={`M ${HIP[0]} ${HIP[1]} L ${SHOULDER[0]} ${SHOULDER[1]}`} stroke={CREAM} strokeWidth="52" />
            {/* The chest rises with the first breath. */}
            <circle cx={HEAD[0]} cy={HEAD[1]} r={42 + Math.sin(clamp01(alive) * Math.PI) * 3} fill={CREAM} stroke={INK} strokeWidth="5" />
          </g>
        </g>
      </svg>
      <div className="hand-paper" aria-hidden="true" />

      <div className="story-top">
        <button className="story-button" onClick={onHome}>
          World
        </button>
        <span className="story-title">Eden 1: the man from the dust</span>
      </div>

      <div className="hand-words">
        <p className="verse-text">{kjv("2:7")}</p>
        <p className="verse-ref">
          <span className="tier-badge">Text</span>
          Genesis 2:7 (KJV)
        </p>
        <p className="verse-depiction">
          <span className="tier-badge tier-model">Illustration</span>
          How the forming looked. God is shown only by what happens. Drag across the picture to move through it by hand.
        </p>
      </div>

      <div className="moments" role="group" aria-label="Moments in this scene">
        <button className="moments-play" onClick={() => (t > 3.95 && !playing ? ((want.current = 0), (now.current = 0), (want.current = 1), setPlaying(true)) : setPlaying((p) => !p))}>
          {playing && t < 3.95 ? "Pause" : t > 3.95 ? "Replay" : "Play"}
        </button>
        {MOMENTS.map((name, i) => (
          <button key={name} className={`moment ${i === moment && t > 0.02 ? "is-now" : ""} ${t >= i + 0.98 ? "is-done" : ""}`} onClick={() => goTo(i + 1)}>
            <MomentDrawing n={i} />
            <span className="moment-name">
              {i + 1}. {name}
            </span>
            <span className="moment-fill" style={{ transform: `scaleX(${clamp01(t - i)})` }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** The small drawing on each moment's button. */
function MomentDrawing({ n }: { n: number }) {
  return (
    <svg viewBox="0 0 120 56" className="moment-drawing" aria-hidden="true">
      <path d="M 4 46 Q 60 40 116 46 V 54 H 4 Z" fill="#9a6240" stroke={INK} strokeWidth="2" />
      {n === 0 && Array.from({ length: 12 }, (_, i) => <circle key={i} cx={14 + i * 8} cy={40 - (i % 4) * 7} r="2.2" fill="#f3d79a" stroke={INK} strokeWidth="0.6" />)}
      {n === 1 && (
        <>
          <path d="M 22 42 C 46 32 70 30 92 32" fill="none" stroke={CREAM} strokeWidth="6" strokeLinecap="round" strokeDasharray="2 7" />
          <circle cx="101" cy="30" r="7" fill="none" stroke={CREAM} strokeWidth="2.4" strokeDasharray="2 4" />
        </>
      )}
      {n === 2 && (
        <>
          <path d="M 22 42 C 46 33 70 31 92 33" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" />
          <path d="M 22 42 C 46 33 70 31 92 33" fill="none" stroke={CREAM} strokeWidth="7" strokeLinecap="round" />
          <circle cx="101" cy="30" r="7.5" fill={CREAM} stroke={INK} strokeWidth="2" />
          <path d="M 118 6 C 108 10 114 20 106 24" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {n === 3 && (
        <>
          <path d="M 34 43 H 66 L 72 22" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 34 43 H 66 L 72 22" fill="none" stroke={CREAM} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="74" cy="13" r="7.5" fill={CREAM} stroke={INK} strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((k) => (
            <path key={k} d={`M ${74 + 12 * Math.cos(-0.4 - k * 0.6)} ${13 + 12 * Math.sin(-0.4 - k * 0.6)} l ${5 * Math.cos(-0.4 - k * 0.6)} ${5 * Math.sin(-0.4 - k * 0.6)}`} stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          ))}
        </>
      )}
    </svg>
  );
}
