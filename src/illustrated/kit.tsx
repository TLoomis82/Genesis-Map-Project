import { useEffect, useRef, useState, type ReactNode } from "react";
import { clamp01 } from "./hand.ts";

// Shared parts of every hand-drawn scene:
//   useMoments   the scene's clock: it glides from moment to moment, plays on by itself, and gives a
//                "boil" number that changes a few times a second so living lines never sit still
//   useView      the part of the 1600 x 1000 drawing to show, so the subject stays in frame on a
//                wide screen and on a tall phone alike
//   Drawn        a line that draws itself in as its progress goes from 0 to 1 (no pencil or brush is
//                shown: it is understood that the scene is being drawn)
//   Painted      colour that is brushed in, stroke by stroke, over whatever is inside it
//   Hints        hand-lettered tags on the drawing that say what can be touched; each goes away once
//                the viewer has done it, and "Show tips" brings them all back
//   strokeTurn   gives each stroke in a set its own turn, so they are drawn one after another
//
// Every scene opens the way a drawing does: blank paper, a light pencil sketch, ink over the
// pencil, then colour brushed in. Only then does the scene begin to move.
//   SceneWords   the verse, its reference and the note that says what is illustration
//   MomentStrip  the strip of small drawings that is both the map of the scene and its control

export const INK = "#1d1a33";
export const CREAM = "#fbeecb";
export const GOLD = "#eeb04a";

export interface Moments {
  /** Where the scene is: 0 at the start, 1 at the end of the first moment, and so on. */
  t: number;
  /** Seconds since the scene opened. */
  time: number;
  boil: number;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  /** Glide to the end of a moment (1 = the first) and stop playing on. */
  goTo: (moment: number) => void;
  replay: () => void;
  /** For scenes that let the viewer drag through time. */
  position: () => number;
  seek: (t: number) => void;
}

/**
 * delay: seconds to wait before the first moment begins, while the artist draws the scene in.
 */
export function useMoments(count: number, onFrame?: (dt: number, time: number, t: number) => void, delay = 0): Moments {
  const [frame, setFrame] = useState({ t: 0, time: 0 });
  const [boil, setBoil] = useState(0);
  const [playing, setPlaying] = useState(true);
  const want = useRef(1);
  const now = useRef(0);
  const callback = useRef(onFrame);
  callback.current = onFrame;
  // When the scene opened. Kept across pauses, so pausing never makes the drawing-in start again.
  const opened = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    const start = opened.current;
    let last = performance.now();
    let rested = 0;
    let lastBoil = 0;
    const tick = (clock: number) => {
      const dt = Math.min((clock - last) / 1000, 0.1);
      last = clock;
      const waiting = (clock - start) / 1000 < delay;
      const gap = waiting ? 0 : want.current - now.current;
      now.current += Math.max(-0.5, Math.min(0.5, gap * 2.4)) * dt;
      if (Math.abs(gap) < 0.012) {
        rested += dt;
        if (!waiting && playing && rested > 1.3 && want.current < count) {
          want.current += 1;
          rested = 0;
        }
      } else rested = 0;
      const time = (clock - start) / 1000;
      callback.current?.(dt, time, now.current);
      setFrame({ t: now.current, time });
      if (clock - lastBoil > 150) {
        lastBoil = clock;
        setBoil((b) => (b + 1) % 3);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, count, delay]);

  return {
    t: frame.t,
    time: frame.time,
    boil,
    playing,
    setPlaying,
    goTo(moment) {
      want.current = moment;
      setPlaying(false);
    },
    replay() {
      now.current = 0;
      want.current = 1;
      setPlaying(true);
    },
    position: () => now.current,
    seek(t) {
      want.current = Math.max(0, Math.min(count, t));
    },
  };
}

export interface View {
  box: string;
  /** Drawing units per screen pixel, and the drawing position of the screen's top-left corner. */
  scale: number;
  x: number;
  y: number;
  width: number;
  small: boolean;
}

/** The view keeps (focusX, focusY) in frame and never shows less than minWidth of the drawing. */
export function useView(focusX: number, focusY: number, minWidth: number, focusDown = 0.56): View {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const aspect = size.w / size.h;
  const vw = Math.max(minWidth, Math.min(1600, 1000 * aspect));
  const vh = vw / aspect;
  const vx = Math.max(0, Math.min(1600 - vw, focusX - vw / 2));
  const vy = focusY - vh * focusDown;
  return { box: `${vx} ${vy} ${vw} ${vh}`, scale: vw / size.w, x: vx, y: vy, width: size.w, small: Math.min(size.w, size.h) < 600 };
}

/** A line that draws itself in. progress 0 = not started, 1 = whole. */
export function Drawn({ d, progress, ...rest }: { d: string; progress: number } & React.SVGProps<SVGPathElement>) {
  if (progress <= 0.001) return null;
  return <path d={d} pathLength={1} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - clamp01(progress)} {...rest} />;
}

/** The turn of stroke i out of n, as overall progress goes 0 to 1. Each overlaps the next a little. */
export function strokeTurn(progress: number, i: number, n: number, overlap = 1.25): number {
  const total = n + overlap - 1;
  return clamp01((progress * total - i) / overlap);
}

/**
 * Colour brushed in. What is inside appears under broad strokes that sweep down the visible part of
 * the drawing, Once the painting is done it costs nothing.
 */
export function Painted({ id, progress, view, children }: { id: string; progress: number; view: View; children: ReactNode }) {
  if (progress >= 0.999) return <>{children}</>;
  const [vx, vy, vw, vh] = view.box.split(" ").map(Number);
  const rows = 6;
  const gap = vh / rows;
  let sweep = `M ${vx - 80} ${vy + gap * 0.4}`;
  for (let r = 0; r < rows; r++) {
    const y = vy + gap * (r + 0.5);
    sweep += r % 2 === 0 ? ` L ${vx + vw + 80} ${y - gap * 0.12} L ${vx + vw + 80} ${y + gap * 0.88}` : ` L ${vx - 80} ${y - gap * 0.12} L ${vx - 80} ${y + gap * 0.88}`;
  }
  return (
    <>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={vx - 200} y={vy - 200} width={vw + 400} height={vh + 400}>
          <rect x={vx - 200} y={vy - 200} width={vw + 400} height={vh + 400} fill="black" />
          <Drawn d={sweep} progress={progress} stroke="white" strokeWidth={gap * 1.25} />
        </mask>
      </defs>
      <g mask={`url(#${id})`}>{children}</g>
    </>
  );
}

/** Blank paper, for a scene to be drawn on. */
export function Paper() {
  return <rect x="-400" y="-1800" width="2400" height="4600" fill="#f4ead2" />;
}

/** A light pencil line, sketched twice the way a hand finds a shape before committing to it. */
export function Pencil({ d, d2, progress, fade }: { d: string; d2?: string; progress: number; fade: number }) {
  if (fade <= 0.01) return null;
  return (
    <g opacity={fade}>
      <Drawn d={d} progress={progress} stroke="#7d83a8" strokeWidth={2.6} opacity={0.85} />
      {d2 && <Drawn d={d2} progress={clamp01(progress * 1.2 - 0.2)} stroke="#7d83a8" strokeWidth={2} opacity={0.6} />}
    </g>
  );
}

export interface Hint {
  id: string;
  /** Where on the drawing the tag sits. */
  x: number;
  y: number;
  text: string;
}

/** Which hints the viewer has already acted on. */
export function useHints() {
  const [used, setUsed] = useState<string[]>([]);
  const seen = useRef<string[]>([]);
  return {
    used,
    /** Call when the viewer does the thing a hint describes. Cheap to call on every drag event. */
    mark(id: string) {
      if (seen.current.includes(id)) return;
      seen.current = [...seen.current, id];
      setUsed(seen.current);
    },
    reset() {
      seen.current = [];
      setUsed([]);
    },
  };
}

/** Tags on the drawing that label what can be touched. They bob gently so the eye finds them. */
export function Hints({ hints, used, show, time }: { hints: Hint[]; used: string[]; show: number; time: number }) {
  if (show <= 0.01) return null;
  return (
    <g opacity={show} style={{ pointerEvents: "none" }}>
      {hints
        .filter((h) => !used.includes(h.id))
        .map((h, i) => {
          const w = h.text.length * 13.6 + 78;
          return (
            <g key={h.id} transform={`translate(${h.x - w / 2} ${h.y + Math.sin(time * 2.2 + i * 1.7) * 6})`}>
              <path d={`M 14 2 H ${w - 12} Q ${w} 4 ${w - 2} 20 V 40 Q ${w - 3} 56 ${w - 16} 55 H 12 Q -1 54 2 38 V 18 Q 1 3 14 2 Z`} fill={CREAM} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
              {/* a small hand: a fingertip with rings spreading from it */}
              <circle cx="30" cy="29" r="7" fill={INK} />
              <circle cx="30" cy="29" r={12 + ((time * 9 + i * 5) % 9)} fill="none" stroke={INK} strokeWidth="2" opacity={1 - ((time * 9 + i * 5) % 9) / 9} />
              <text x="54" y="37" fill={INK} fontSize="24" fontFamily="'Iowan Old Style', Palatino, Georgia, serif" fontStyle="italic">
                {h.text}
              </text>
            </g>
          );
        })}
    </g>
  );
}

export function SceneWords({ title, verse, reference, note, onHome, onTips }: { title: string; verse: string; reference: string; note: string; onHome: () => void; onTips?: () => void }) {
  return (
    <>
      <div className="story-top">
        <button className="story-button" onClick={onHome}>
          World
        </button>
        <span className="story-title">{title}</span>
        {onTips && (
          <button className="story-button" onClick={onTips}>
            Show tips
          </button>
        )}
      </div>
      <div className="hand-words" key={reference}>
        <p className="verse-text">{verse}</p>
        <p className="verse-ref">
          <span className="tier-badge">Text</span>
          {reference} (KJV)
        </p>
        <p className="verse-depiction">
          <span className="tier-badge tier-model">Illustration</span>
          {note}
        </p>
      </div>
    </>
  );
}

export function MomentStrip({ names, drawings, clock }: { names: string[]; drawings: ReactNode[]; clock: Moments }) {
  const { t, playing } = clock;
  const done = t > names.length - 0.05;
  const current = Math.min(names.length - 1, Math.max(0, Math.ceil(t - 0.02) - 1));
  return (
    <div className="moments" role="group" aria-label="Moments in this scene">
      <span className="moments-tip">Tap a moment to jump to it</span>
      <button className="moments-play" onClick={() => (done ? clock.replay() : clock.setPlaying(!playing))}>
        {done ? "Replay" : playing ? "Pause" : "Play"}
      </button>
      {names.map((name, i) => (
        <button key={name} className={`moment ${i === current && t > 0.02 ? "is-now" : ""} ${t >= i + 0.98 ? "is-done" : ""}`} onClick={() => clock.goTo(i + 1)}>
          <svg viewBox="0 0 120 56" className="moment-drawing" aria-hidden="true">
            {drawings[i]}
          </svg>
          <span className="moment-name">
            {i + 1}. {name}
          </span>
          <span className="moment-fill" style={{ transform: `scaleX(${clamp01(t - i)})` }} />
        </button>
      ))}
    </div>
  );
}
