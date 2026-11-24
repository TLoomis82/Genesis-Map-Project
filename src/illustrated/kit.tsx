import { useEffect, useRef, useState, type ReactNode } from "react";
import { clamp01 } from "./hand.ts";

// Shared parts of every hand-drawn scene:
//   useMoments   the scene's clock: it glides from moment to moment, plays on by itself, and gives a
//                "boil" number that changes a few times a second so living lines never sit still
//   useView      the part of the 1600 x 1000 drawing to show, so the subject stays in frame on a
//                wide screen and on a tall phone alike
//   Drawn        a line that draws itself in, as if by a hand, as its progress goes from 0 to 1
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

export function useMoments(count: number, onFrame?: (dt: number, time: number, t: number) => void): Moments {
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
      const gap = want.current - now.current;
      now.current += Math.max(-0.5, Math.min(0.5, gap * 2.4)) * dt;
      if (Math.abs(gap) < 0.012) {
        rested += dt;
        if (playing && rested > 1.3 && want.current < count) {
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
  }, [playing, count]);

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
