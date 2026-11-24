import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpaceOpening } from "../opening/spaceOpening.ts";
import { spaceSteps } from "../opening/spaceSteps.ts";
import { features } from "../data/features.ts";
import { scenes } from "../data/scenes.ts";
import type { MapFeature } from "../data/types.ts";
import { useFps } from "../useFps.ts";
import { beats, chapters, FIRST_GLOBE_BEAT, UNDER_WATER } from "./beats.ts";
import { exploreModes } from "./explore.ts";
import GlobeStage from "./GlobeStage.tsx";
import InfoCard, { TIER_LABEL } from "./InfoCard.tsx";

// Plays the whole story, one verse (a "beat") at a time. This is the main line of the piece.
// It opens on empty space; then the deep, seen from far off where the earth will be, which can be
// swiped and sloshes; light; the firmament. At day 3 that picture fades and the Mapbox globe is
// underneath it, under water, and the land comes up. From there the story is on the globe.
// Each part of the story shows dots for the hand-drawn scenes that belong to it: tap one to go in
// and see it drawn, and come back to the same verse.
//
// Every verse is tier "text". Where the picture goes beyond the words, a short note under the
// verse says so. On the globe, each pin and card carries its own tier, and the "Text only"
// switch hides everything that is not stated in Genesis.

/** Load the globe this many beats before it is first shown, so it is ready for the fade. */
const GLOBE_LEAD = 4;

// For checks and screenshots only: with ?debug in the address, the page exposes a way to jump
// to a beat and run the opening scene forward without waiting.
const DEBUG = new URLSearchParams(window.location.search).has("debug");
// While a land model is being tested (?land=...), the "today's continents" placeholder note would be wrong;
// the globe shows its own note about the model instead.
const LAND_TEST = new URLSearchParams(window.location.search).has("land");
/** The beat the opening hands over to. The globe is prepared for it while the opening is still playing. */
const firstGlobe = beats[FIRST_GLOBE_BEAT];
/** While the opening plays, the globe waits underneath it with all its land under water. */
const WAITING = { level: UNDER_WATER, storm: 0 };
const NO_DRILLS: { scene: string; label: string }[] = [];

interface Props {
  /** The beat to open on. */
  startBeat?: number;
  /** Go back to the storyboard. */
  onHome?: () => void;
  /** Open a hand-drawn scene from the beat that is on screen. */
  onDrill?: (scene: string, beat: number) => void;
}

export default function StoryPlayer({ startBeat = 0, onHome, onDrill }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<SpaceOpening | null>(null);
  const [swiped, setSwiped] = useState(false);
  const previous = useRef(0);
  const [index, setIndex] = useState(startBeat);
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
  const drillFromHere = useCallback((sceneId: string) => onDrill?.(sceneId, index), [onDrill, index]);

  // Create the opening once.
  useEffect(() => {
    if (!canvas.current) return;
    const s = new SpaceOpening(canvas.current);
    s.snapTo(spaceSteps[beats[startBeat].openingStep ?? spaceSteps.length - 1].targets);
    s.onTouch = () => setSwiped(true);
    s.play();
    scene.current = s;
    if (DEBUG) {
      (window as unknown as { genesis: unknown }).genesis = {
        go(step: number, seconds: number) {
          setIndex(step);
          if (spaceSteps[step]) s.setTargets(spaceSteps[step].targets);
          s.debugAdvance(seconds);
        },
        advance: (seconds: number) => s.debugAdvance(seconds),
      };
    }
    window.addEventListener("resize", s.resize);
    return () => {
      window.removeEventListener("resize", s.resize);
      s.dispose();
      scene.current = null;
    };
    // The opening is made once, for the beat the player opened on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each opening beat sets where the picture glides to. Stepping to the next or previous verse
  // glides; jumping from further away cuts straight there.
  useEffect(() => {
    const from = previous.current;
    previous.current = index;
    const stepIndex = beats[index].openingStep;
    const s = scene.current;
    if (stepIndex === undefined || !s) return;
    if (Math.abs(index - from) > 1) s.snapTo(spaceSteps[stepIndex].targets);
    else s.setTargets(spaceSteps[stepIndex].targets);
  }, [index]);

  // The fade to the globe: for good on globe beats.
  useEffect(() => {
    setFaded(beats[index].openingStep === undefined);
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
          land={(beat.camera ? beat.land : firstGlobe.land) ?? null}
          flood={onGlobe ? (beat.flood ?? null) : WAITING}
          stars={onGlobe ? beat.stars : 0}
          sky={onGlobe ? (beat.sky ?? null) : null}
          drills={onGlobe ? beat.drills : NO_DRILLS}
          onDrill={drillFromHere}
          relief={beat.relief ?? null}
          startCenter={firstGlobe.camera?.center ?? [0, 0]}
          pins={onGlobe ? sceneFeatures : noPins}
          selectedId={selectedId}
          onSelect={setSelectedId}
          ark={onGlobe ? (beat.ark ?? null) : null}
        />
      )}
      <canvas ref={canvas} className={`opening-canvas ${faded ? "is-faded" : ""}`} />
      {/* Before the globe: the same dots, set beside the waters, and a label for what the hand can do. */}
      {!onGlobe && (
        <div className="opening-dots">
          {beat.drills.map((drill) => (
            <button key={drill.scene} className="door drill door-right" onClick={() => drillFromHere(drill.scene)} aria-label={drill.label}>
              <span className="door-pulse" />
              <span className="door-ring" />
              <span className="door-label">{drill.label}</span>
            </button>
          ))}
        </div>
      )}
      {!onGlobe && index > 0 && !swiped && <p className="opening-hint">Swipe the waters</p>}

      <div className="story-top">
        {onHome && (
          <button className="story-button" onClick={onHome}>
            Storyboard
          </button>
        )}
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
