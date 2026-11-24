import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { clamp01 } from "./hand.ts";

// Shared parts of every hand-drawn scene:
//   useMoments   the scene's clock: it glides from moment to moment, plays on by itself, and gives a
//                "boil" number that changes a few times a second so living lines never sit still
//   useView      the part of the 1600 x 1000 drawing to show, so the subject stays in frame on a
//                wide screen and on a tall phone alike
//   Drawn        a line that draws itself in as its progress goes from 0 to 1, with the artist's pencil,
//                pen or brush shown at the moving end of the stroke
//   Painted      colour that is brushed in, stroke by stroke, over whatever is inside it
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

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    let last = start;
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

export type Tool = "pencil" | "pen" | "brush";

/** The artist's tool, drawn with its point at 0,0 and its body up and to the right. */
function ToolMark({ kind }: { kind: Tool }) {
  const body = kind === "pencil" ? "#e9b949" : kind === "pen" ? "#2b2748" : "#8a5a3c";
  const point = kind === "pencil" ? "#3a3a4a" : kind === "pen" ? INK : "#c6704e";
  return (
    <g transform="scale(1.5)" strokeLinejoin="round">
      {kind === "brush" ? (
        <path d="M 0 0 q 2 -16 14 -22 l 10 10 q -6 12 -24 12 Z" fill={point} stroke={INK} strokeWidth="2" />
      ) : (
        <path d="M 0 0 L 8 -20 L 20 -8 Z" fill={CREAM} stroke={INK} strokeWidth="2" />
      )}
      {kind !== "brush" && <path d="M 0 0 L 3.5 -8.5 L 8.5 -3.5 Z" fill={point} />}
      <path d={kind === "brush" ? "M 14 -22 L 66 -74 L 76 -64 L 24 -12 Z" : "M 8 -20 L 62 -74 L 74 -62 L 20 -8 Z"} fill={body} stroke={INK} strokeWidth="2" />
      {kind === "pencil" && <path d="M 62 -74 L 70 -82 L 82 -70 L 74 -62 Z" fill="#d98b8b" stroke={INK} strokeWidth="2" />}
    </g>
  );
}

/**
 * A line that draws itself in. progress 0 = not started, 1 = whole. With a tool, the artist's pencil,
 * pen or brush is shown at the moving end while the stroke is being made.
 */
export function Drawn({ d, progress, tool, ...rest }: { d: string; progress: number; tool?: Tool } & React.SVGProps<SVGPathElement>) {
  const path = useRef<SVGPathElement>(null);
  const mark = useRef<SVGGElement>(null);
  const drawing = tool !== undefined && progress > 0.001 && progress < 0.995;
  useLayoutEffect(() => {
    if (!drawing || !path.current || !mark.current) return;
    const at = path.current.getPointAtLength(path.current.getTotalLength() * clamp01(progress));
    mark.current.setAttribute("transform", `translate(${at.x} ${at.y})`);
  });
  if (progress <= 0.001) return null;
  return (
    <>
      <path ref={path} d={d} pathLength={1} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - clamp01(progress)} {...rest} />
      {drawing && (
        <g ref={mark} style={{ pointerEvents: "none" }}>
          <ToolMark kind={tool} />
        </g>
      )}
    </>
  );
}

/** The turn of stroke i out of n, as overall progress goes 0 to 1. Each overlaps the next a little. */
export function strokeTurn(progress: number, i: number, n: number, overlap = 1.25): number {
  const total = n + overlap - 1;
  return clamp01((progress * total - i) / overlap);
}

/**
 * Colour brushed in. What is inside appears under broad strokes that sweep down the visible part of
 * the drawing, with the brush shown at work. Once the painting is done it costs nothing.
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
      <Drawn d={sweep} progress={progress} stroke="none" tool="brush" />
    </>
  );
}

/** Blank paper, for a scene to be drawn on. */
export function Paper() {
  return <rect x="-400" y="-1800" width="2400" height="4600" fill="#f4ead2" />;
}

/** A light pencil line, sketched twice the way a hand finds a shape before committing to it. */
export function Pencil({ d, d2, progress, fade, tool }: { d: string; d2?: string; progress: number; fade: number; tool?: boolean }) {
  if (fade <= 0.01) return null;
  return (
    <g opacity={fade}>
      <Drawn d={d} progress={progress} stroke="#7d83a8" strokeWidth={2.6} opacity={0.85} tool={tool ? "pencil" : undefined} />
      {d2 && <Drawn d={d2} progress={clamp01(progress * 1.2 - 0.2)} stroke="#7d83a8" strokeWidth={2} opacity={0.6} />}
    </g>
  );
}

export function SceneWords({ title, verse, reference, note, onHome }: { title: string; verse: string; reference: string; note: string; onHome: () => void }) {
  return (
    <>
      <div className="story-top">
        <button className="story-button" onClick={onHome}>
          World
        </button>
        <span className="story-title">{title}</span>
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
