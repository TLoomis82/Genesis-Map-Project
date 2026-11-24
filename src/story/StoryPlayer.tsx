import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpaceOpening } from "../opening/spaceOpening.ts";
import { spaceSteps } from "../opening/spaceSteps.ts";
import { features } from "../data/features.ts";
import { scenes } from "../data/scenes.ts";
import type { MapFeature } from "../data/types.ts";
import { useFps } from "../useFps.ts";
import { beats, FIRST_GLOBE_BEAT, floodKeys, floodOn, LAST_FLOOD_DAY, MOON_ROUND, skyWith, UNDER_WATER } from "./beats.ts";
import { exploreModes } from "./explore.ts";
import GlobeStage from "./GlobeStage.tsx";
import InfoCard, { TIER_LABEL } from "./InfoCard.tsx";
import StoryTimeline from "./StoryTimeline.tsx";

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
// The waiting globe already stands where the first globe verse will show it, so nothing moves at the handover.
const WAITING_CAMERA = firstGlobe.camera ? { ...firstGlobe.camera, seconds: 0, driftDegrees: undefined } : null;
const NO_DRILLS: { scene: string; label: string }[] = [];
/** What the hand can do on the waters at each verse of the opening, and the label that says so. */
const HAND: Record<string, { mode: "swipe" | "light" | "vault"; hint: string }> = {
  swipe: { mode: "swipe", hint: "Swipe the waters" },
  light: { mode: "light", hint: "Drag sideways to carry the light round" },
  vault: { mode: "vault", hint: "Drag up to lift the sky off the waters" },
};
const FIRST_FLOOD_BEAT = floodKeys[0].beat;
const LAST_FLOOD_BEAT = floodKeys[floodKeys.length - 1].beat;

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exploring, setExploring] = useState(false);
  const fps = useFps();

  const beat = beats[index];
  const current = scenes.find((s) => s.id === beat.sceneId);
  const onGlobe = beat.camera !== undefined;
  const isLast = index === beats.length - 1;

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

  // What the viewer has set by hand on this verse. Each is null until touched, and is let go when the verse changes.
  const [drawn, setDrawn] = useState<number | null>(null); // day 3: how far the waters are drawn back, 0 to 1
  const [hour, setHour] = useState<number | null>(null); // day 4: how far the earth has been turned, in degrees
  const [month, setMonth] = useState<number | null>(null); // day 4: how far round from the sun the moon is
  const [floodDayByHand, setFloodDayByHand] = useState<number | null>(null);
  const sliding = useRef(false);
  useEffect(() => {
    setDrawn(null);
    setHour(null);
    setMonth(null);
    if (sliding.current) sliding.current = false;
    else setFloodDayByHand(null);
  }, [index]);

  const hand = beat.openingStep === undefined ? null : beat.sceneId === "day-2" ? HAND.vault : beat.sceneId === "day-1" && spaceSteps[beat.openingStep].targets.divide > 0 ? HAND.light : index > 0 ? HAND.swipe : null;
  useEffect(() => {
    if (scene.current && hand) scene.current.mode = hand.mode;
    setSwiped(false);
  }, [hand]);

  const inFlood = index >= FIRST_FLOOD_BEAT && index <= LAST_FLOOD_BEAT;
  const floodNow = floodDayByHand === null ? null : floodOn(floodDayByHand);
  const floodDayShown = floodDayByHand ?? floodKeys.reduce((day, k) => (k.beat <= index ? k.day : day), floodKeys[0].day);
  const onDayThree = onGlobe && beat.sceneId === "day-3" && beat.flood !== undefined;
  const drawnShown = drawn ?? (beat.flood ? 1 - Math.sqrt(beat.flood.level / UNDER_WATER) : 1);
  const skyNow = beat.sky && (hour !== null || month !== null) ? skyWith(beat.sky.sun[0] - (hour ?? 0), month ?? MOON_ROUND) : (beat.sky ?? null);
  const floodShown = floodNow ? floodNow.flood : drawn !== null ? { level: UNDER_WATER * (1 - drawn) ** 2, storm: 0 } : (beat.flood ?? null);

  const go = useCallback((to: number) => setIndex(Math.max(0, Math.min(to, beats.length - 1))), []);
  const setDisc = useCallback((disc: { x: number; y: number; r: number }) => scene.current?.setDisc(disc), []);
  const drillFromHere = useCallback((sceneId: string) => onDrill?.(sceneId, index), [onDrill, index]);

  // The timeline takes a strip along the bottom; everything else on the page makes room for it.
  useEffect(() => {
    document.documentElement.classList.add("has-timeline");
    return () => document.documentElement.classList.remove("has-timeline");
  }, []);

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
      {/* The globe is there from the start, out of sight under the opening, so the waters can sit exactly on it. */}
      {(
        <GlobeStage
          camera={beat.camera ?? WAITING_CAMERA}
          quiet={!onGlobe}
          bare={onGlobe ? beat.bare : true}
          onDisc={setDisc}
          hold={beat.hold}
          land={(beat.camera ? beat.land : firstGlobe.land) ?? null}
          flood={onGlobe ? floodShown : WAITING}
          stars={onGlobe ? beat.stars : 0}
          sky={onGlobe ? skyNow : null}
          drills={onGlobe ? beat.drills : NO_DRILLS}
          onDrill={drillFromHere}
          relief={beat.relief ?? null}
          startCenter={firstGlobe.camera?.center ?? [0, 0]}
          pins={onGlobe ? sceneFeatures : noPins}
          selectedId={selectedId}
          onSelect={setSelectedId}
          ark={onGlobe ? (floodNow?.ark ?? beat.ark ?? null) : null}
          arkQuick={floodNow !== null}
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
      {!onGlobe && hand && !swiped && (
        <p className="opening-hint" key={hand.mode}>
          {hand.hint}
        </p>
      )}

      <div className="story-top">
        {onHome && (
          <button className="story-button" onClick={onHome}>
            Storyboard
          </button>
        )}
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

      {/* What the hand can do on the globe at this verse. Always labelled. */}
      {(onDayThree || (onGlobe && beat.sky) || inFlood) && (
        <div className="hand-panel">
          {onDayThree && (
            <label>
              <span>Draw the waters back</span>
              <input type="range" min={0} max={1} step={0.005} value={drawnShown} onChange={(e) => (setPlaying(false), setDrawn(Number(e.target.value)))} />
            </label>
          )}
          {onGlobe && beat.sky && (
            <>
              <label>
                <span>Turn the earth under the sun</span>
                <input type="range" min={-180} max={180} step={1} value={hour ?? 0} onChange={(e) => (setPlaying(false), setHour(Number(e.target.value)))} />
              </label>
              <label>
                <span>Move the moon through its month</span>
                <input type="range" min={0} max={360} step={1} value={month ?? MOON_ROUND} onChange={(e) => (setPlaying(false), setMonth(Number(e.target.value)))} />
              </label>
            </>
          )}
          {inFlood && (
            <label>
              <span>
                Day {Math.round(floodDayShown)} of the flood: drag through the year
              </span>
              <input
                type="range"
                min={1}
                max={LAST_FLOOD_DAY}
                step={1}
                value={floodDayShown}
                onChange={(e) => {
                  const day = Number(e.target.value);
                  const at = floodOn(day).beat;
                  setPlaying(false);
                  sliding.current = at !== index;
                  setFloodDayByHand(day);
                  if (at !== index) setIndex(at);
                }}
              />
            </label>
          )}
        </div>
      )}

      <div className={`verse ${selected ? "is-behind-card" : ""} ${onDayThree || (onGlobe && beat.sky) || inFlood ? "has-hand" : ""}`} key={index}>
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

      <StoryTimeline index={index} onGo={go} />

      {Explore && exploring && <Explore onClose={() => setExploring(false)} />}
    </>
  );
}
