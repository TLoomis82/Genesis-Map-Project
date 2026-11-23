import { useEffect, useRef, useState } from "react";
import { OpeningScene } from "./openingScene.ts";
import { openingSteps } from "./steps.ts";
import { scenes } from "../data/scenes.ts";
import { useFps } from "../useFps.ts";
import HandoffGlobe from "./HandoffGlobe.tsx";

// Plays the opening (Gen 1:1-13) one verse at a time. At the end of day 3 the scene rises,
// whitens and fades away to show the globe underneath. Tap Next, use the arrow keys, or press Play.
// The verses are tier "text". Where the picture goes beyond the words (the divided sky, the vault),
// a short note under the verse says so and names the source.

export default function OpeningPlayer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<OpeningScene | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [faded, setFaded] = useState(false);
  const fps = useFps();

  const step = openingSteps[index];
  const sceneTitle = scenes.find((s) => s.id === step.sceneId)?.title ?? "";
  const isLast = index === openingSteps.length - 1;
  // Load the globe a few steps before it is needed, so it is ready for the fade.
  const globeNeeded = index >= openingSteps.length - 4;

  // Create the scene once.
  useEffect(() => {
    if (!canvas.current) return;
    const s = new OpeningScene(canvas.current);
    s.snapTo(openingSteps[0].targets);
    s.play();
    scene.current = s;
    window.addEventListener("resize", s.resize);
    return () => {
      window.removeEventListener("resize", s.resize);
      s.dispose();
      scene.current = null;
    };
  }, []);

  // Each step sets where the scene glides to.
  useEffect(() => {
    const s = openingSteps[index];
    scene.current?.setTargets(s.targets, { sweepSeconds: s.sweepSeconds, duskSeconds: s.duskSeconds, ascendAfter: s.ascendAfter });
  }, [index]);

  // The fade to the globe: only on a step that asks for it, and undone when leaving that step.
  useEffect(() => {
    setFaded(false);
    const after = openingSteps[index].fadeToGlobeAfter;
    if (after === undefined) return;
    const timer = window.setTimeout(() => setFaded(true), after * 1000);
    return () => window.clearTimeout(timer);
  }, [index]);

  // The scene keeps drawing only while it can be seen (the fade itself takes 3.5 seconds).
  useEffect(() => {
    if (!faded) {
      scene.current?.play();
      return;
    }
    const timer = window.setTimeout(() => scene.current?.pause(), 3600);
    return () => window.clearTimeout(timer);
  }, [faded]);

  // Auto-advance while playing; stop at the end.
  useEffect(() => {
    if (!playing) return;
    if (isLast) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex((i) => i + 1), step.hold * 1000);
    return () => window.clearTimeout(timer);
  }, [playing, index, isLast, step.hold]);

  // Arrow keys and space.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, openingSteps.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const togglePlay = () => {
    if (isLast) {
      setIndex(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  return (
    <>
      {globeNeeded && <HandoffGlobe />}
      <canvas ref={canvas} className={`opening-canvas ${faded ? "is-faded" : ""}`} />

      <div className="opening-meta">
        <span>{sceneTitle}</span>
        <span className="opening-fps">{fps} fps</span>
      </div>

      <div className="verse" key={index}>
        <p className="verse-text">{step.text}</p>
        <p className="verse-ref">
          <span className="tier-badge">Text</span>
          {step.reference} (KJV)
        </p>
        {step.depiction && (
          <p className="verse-depiction">
            {step.depiction.badge && <span className="tier-badge tier-scholarly">{step.depiction.badge}</span>}
            {step.depiction.note}
          </p>
        )}
      </div>

      <div className="opening-controls">
        <button onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={index === 0} aria-label="Previous verse">
          Back
        </button>
        <button onClick={togglePlay}>
          {isLast ? "Replay" : playing ? "Pause" : "Play"}
        </button>
        <button onClick={() => setIndex((i) => Math.min(i + 1, openingSteps.length - 1))} disabled={isLast} aria-label="Next verse">
          Next
        </button>
        <span className="opening-count">
          {index + 1} / {openingSteps.length}
        </span>
      </div>
    </>
  );
}
