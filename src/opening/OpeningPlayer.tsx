import { useEffect, useRef, useState } from "react";
import { OpeningScene } from "./openingScene.ts";
import { openingSteps } from "./steps.ts";
import { scenes } from "../data/scenes.ts";
import { useFps } from "../useFps.ts";

// Plays the opening (Gen 1:1-8) one verse at a time. Tap Next, use the arrow keys, or press Play.
// The verses are tier "text". Where the picture goes beyond the words (the divided sky, the vault),
// a short note under the verse says so and names the source.

export default function OpeningPlayer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<OpeningScene | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const fps = useFps();

  const step = openingSteps[index];
  const sceneTitle = scenes.find((s) => s.id === step.sceneId)?.title ?? "";
  const isLast = index === openingSteps.length - 1;

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
    scene.current?.setTargets(s.targets, s.sweepSeconds, s.duskSeconds);
  }, [index]);

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
      <canvas ref={canvas} className="opening-canvas" />

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
            {step.depiction.tier === "scholarly" && <span className="tier-badge tier-scholarly">Scholarly reading</span>}
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
