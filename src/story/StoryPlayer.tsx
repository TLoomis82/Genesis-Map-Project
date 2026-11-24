import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OpeningScene } from "../opening/openingScene.ts";
import { openingSteps } from "../opening/steps.ts";
import { features } from "../data/features.ts";
import { scenes } from "../data/scenes.ts";
import type { MapFeature } from "../data/types.ts";
import { useFps } from "../useFps.ts";
import { beats, chapters, FIRST_GLOBE_BEAT } from "./beats.ts";
import { exploreModes } from "./explore.ts";
import GlobeStage from "./GlobeStage.tsx";
import InfoCard, { TIER_LABEL } from "./InfoCard.tsx";

// Plays the whole story, one verse (a "beat") at a time: the opening in three.js, then the globe.
// Tap Next, use the arrow keys, press Play, or pick a chapter. At the end of day 4 the opening
// rises and fades away to show the globe underneath, and the same controls carry on.
//
// Every verse is tier "text". Where the picture goes beyond the words, a short note under the
// verse says so. On the globe, each pin and card carries its own tier, and the "Text only"
// switch hides everything that is not stated in Genesis.

const FIRST_LAND_STEP = openingSteps.findIndex((s) => s.sceneId === "day-3");
/** Load the globe this many beats before it is first shown, so it is ready for the fade. */
const GLOBE_LEAD = 4;

// For checks and screenshots only: with ?debug in the address, the page exposes a way to jump
// to a beat and run the opening scene forward without waiting.
const DEBUG = new URLSearchParams(window.location.search).has("debug");
// While a land model is being tested (?land=...), the "today's continents" placeholder note would be wrong;
// the globe shows its own note about the model instead.
const LAND_TEST = new URLSearchParams(window.location.search).has("land");

export default function StoryPlayer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<OpeningScene | null>(null);
  const previous = useRef(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [faded, setFaded] = useState(false);
  const [textOnly, setTextOnly] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exploring, setExploring] = useState(false);
  const fps = useFps();

  const beat = beats[index];
  const current = scenes.find((s) => s.id === beat.sceneId);
  const onGlobe = beat.camera !== undefined;
  const isLast = index === beats.length - 1;
  const globeNeeded = index >= FIRST_GLOBE_BEAT - GLOBE_LEAD;

  // What this scene may show: its features, less anything above tier "text" when the switch is on.
  const sceneFeatures = useMemo(() => {
    const ids = scenes.find((s) => s.id === beat.sceneId)?.features ?? [];
    return ids
      .map((id) => features.find((f) => f.id === id))
      .filter((f): f is MapFeature => f !== undefined && (!textOnly || f.tier === "text"));
  }, [beat.sceneId, textOnly]);
  const noPins = useMemo<MapFeature[]>(() => [], []);
  const selected = sceneFeatures.find((f) => f.id === selectedId) ?? features.find((f) => f.id === selectedId && (!textOnly || f.tier === "text"));
  const Explore = exploreModes[beat.sceneId];

  const go = useCallback((to: number) => setIndex(Math.max(0, Math.min(to, beats.length - 1))), []);

  // Create the opening scene once.
  useEffect(() => {
    if (!canvas.current) return;
    const s = new OpeningScene(canvas.current);
    s.snapTo(openingSteps[0].targets);
    s.play();
    scene.current = s;
    if (DEBUG) {
      (window as unknown as { genesis: unknown }).genesis = {
        async go(step: number, seconds: number) {
          setIndex(step);
          const target = openingSteps[step];
          if (!target) return;
          if (step >= FIRST_LAND_STEP - 2) await s.ensureLandscape();
          s.setTargets(target.targets, {
            sweepSeconds: target.sweepSeconds,
            duskSeconds: target.duskSeconds,
            ascendAfter: target.ascendAfter,
          });
          s.debugAdvance(seconds);
        },
        advance: (seconds: number) => s.debugAdvance(seconds),
        info: () => s.debugInfo(),
      };
    }
    window.addEventListener("resize", s.resize);
    return () => {
      window.removeEventListener("resize", s.resize);
      s.dispose();
      scene.current = null;
    };
  }, []);

  // Each opening beat sets where the scene glides to. Stepping to the next or previous verse
  // glides; jumping from further away (the chapter list, or back from the globe) cuts straight
  // there, because gliding across several verses would mean a long wait.
  useEffect(() => {
    const from = previous.current;
    previous.current = index;
    const stepIndex = beats[index].openingStep;
    const s = scene.current;
    if (stepIndex === undefined || !s) return;
    const step = openingSteps[stepIndex];
    const events = { sweepSeconds: step.sweepSeconds, duskSeconds: step.duskSeconds, ascendAfter: step.ascendAfter };
    const jumped = Math.abs(index - from) > 1;
    const needsLand = stepIndex >= FIRST_LAND_STEP - 2;
    if (!jumped) {
      if (needsLand) void s.ensureLandscape();
      s.setTargets(step.targets, events);
      return;
    }
    let cancelled = false;
    void (needsLand ? s.ensureLandscape() : Promise.resolve()).then(() => {
      if (cancelled) return;
      s.snapTo(step.targets);
      s.setTargets(step.targets, events);
    });
    return () => {
      cancelled = true;
    };
  }, [index]);

  // The fade to the globe: partway through the last opening beat, and for good on globe beats.
  useEffect(() => {
    const stepIndex = beats[index].openingStep;
    if (stepIndex === undefined) {
      setFaded(true);
      return;
    }
    setFaded(false);
    const after = openingSteps[stepIndex].fadeToGlobeAfter;
    if (after === undefined) return;
    const timer = window.setTimeout(() => setFaded(true), after * 1000);
    return () => window.clearTimeout(timer);
  }, [index]);

  // The opening keeps drawing only while it can be seen (the fade itself takes 3.5 seconds).
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
    const timer = window.setTimeout(() => setIndex((i) => i + 1), beat.hold * 1000);
    return () => window.clearTimeout(timer);
  }, [playing, index, isLast, beat.hold]);

  // A card belongs to its scene; close it when the scene changes.
  useEffect(() => {
    setSelectedId(null);
    setExploring(false);
  }, [beat.sceneId]);

  // Arrow keys, space and escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, beats.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") {
        setSelectedId(null);
        setChaptersOpen(false);
      }
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
      go(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  return (
    <>
      {globeNeeded && (
        <GlobeStage
          camera={beat.camera ?? null}
          hold={beat.hold}
          pins={onGlobe ? sceneFeatures : noPins}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}
      <canvas ref={canvas} className={`opening-canvas ${faded ? "is-faded" : ""}`} />

      <div className="story-top">
        <button className="story-button" onClick={() => setChaptersOpen((o) => !o)} aria-expanded={chaptersOpen}>
          Chapters
        </button>
        <span className="story-title">{current?.title}</span>
        <button
          className={`story-button ${textOnly ? "is-on" : ""}`}
          onClick={() => setTextOnly((t) => !t)}
          aria-pressed={textOnly}
          title="Hide everything that is not stated in Genesis"
        >
          Text only: {textOnly ? "on" : "off"}
        </button>
        {Explore && (
          <button className="story-button" onClick={() => setExploring(true)}>
            Explore
          </button>
        )}
        {DEBUG && <span className="opening-fps">{fps} fps</span>}
      </div>

      {chaptersOpen && (
        <nav className="chapters" aria-label="Chapters">
          {chapters.map(({ scene: s, first }) => (
            <button
              key={s.id}
              className={`chapter ${s.id === beat.sceneId ? "is-current" : ""}`}
              onClick={() => {
                go(first);
                setChaptersOpen(false);
              }}
            >
              <span className="chapter-title">{s.title}</span>
              <span className="chapter-verses">{s.verses.join(", ")}</span>
            </button>
          ))}
        </nav>
      )}

      {onGlobe && sceneFeatures.length > 0 && (
        <div className="scene-features">
          <span className="scene-features-label">In this scene</span>
          <div className="chips">
            {sceneFeatures.map((f) => (
              <button
                key={f.id}
                className={`chip chip-${f.tier} ${f.id === selectedId ? "is-selected" : ""}`}
                onClick={() => setSelectedId(f.id === selectedId ? null : f.id)}
                title={TIER_LABEL[f.tier]}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && <InfoCard feature={selected} textOnly={textOnly} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />}

      <div className={`verse ${selected ? "is-behind-card" : ""}`} key={index}>
        <p className="verse-text">{beat.text}</p>
        <p className="verse-ref">
          <span className="tier-badge">Text</span>
          {beat.reference} (KJV)
        </p>
        {beat.depiction && !(onGlobe && LAND_TEST) && (
          <p className="verse-depiction">
            {beat.depiction.badge && <span className="tier-badge tier-scholarly">{beat.depiction.badge}</span>}
            {beat.depiction.note}
          </p>
        )}
      </div>

      <div className="opening-controls">
        <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous verse">
          Back
        </button>
        <button onClick={togglePlay}>{isLast ? "Replay" : playing ? "Pause" : "Play"}</button>
        <button onClick={() => go(index + 1)} disabled={isLast} aria-label="Next verse">
          Next
        </button>
        <span className="opening-count">
          {index + 1} / {beats.length}
        </span>
      </div>

      <div className="progress" aria-hidden="true">
        {chapters.map(({ scene: s, first }, i) => {
          const end = chapters[i + 1]?.first ?? beats.length;
          const done = Math.max(0, Math.min(index + 1, end) - first) / (end - first);
          return (
            <span key={s.id} className="progress-part" style={{ flexGrow: end - first }}>
              <span className="progress-fill" style={{ transform: `scaleX(${done})` }} />
            </span>
          );
        })}
      </div>

      {Explore && exploring && <Explore onClose={() => setExploring(false)} />}
    </>
  );
}
