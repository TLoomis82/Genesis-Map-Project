import { useCallback, useEffect, useMemo, useState } from "react";
import GlobeStage, { type Door } from "../story/GlobeStage.tsx";
import type { GlobeCamera } from "../story/beats.ts";
import type { MapFeature } from "../data/types.ts";
import hubPicture from "./hub.svg?raw";
import { moments, storyOrder, targets, type BoardScene } from "./board.ts";
import { kjv } from "../data/kjv.ts";
import Timeline from "./Timeline.tsx";

// The interactive storyboard. You see the world as Genesis pictures it; tap a ring (or a line in the
// list) and the view moves in to that part and opens its scene card: the verse, a line of narration,
// what you watch, what you can touch, and which parts are text, a scholar's reading or illustration.
// Scenes that can already be played have a button that opens them in the story.
//
// This is the plan for the finished piece and a rough of its front door. The hub here is a flat
// picture; in the finished piece it is a live 3D scene.

// With a Mapbox token the front door is the detailed globe, with a ring on it for each part of the
// story. Without one (or with ?hub=flat) it is the flat picture of the world as Genesis pictures it.
const ON_GLOBE = Boolean(import.meta.env.VITE_MAPBOX_TOKEN) && new URLSearchParams(window.location.search).get("hub") !== "flat";
const HOME: [number, number] = [42, 22];
const DOORS: Door[] = targets.map((t) => ({ id: t.id, label: t.label, at: t.at, side: t.side }));
const NO_PINS: MapFeature[] = [];
const nothing = () => {};

const W = 1600;
const H = 1000;
/** How far the view moves in on a tapped part. */
const ZOOM = 2.4;

interface Props {
  /** Open a scene in the playable story. */
  onPlay: (sceneId: string) => void;
}

export default function StoryBoard({ onPlay }: Props) {
  // Position in story order, or null for the whole hub.
  const [at, setAt] = useState<number | null>(null);
  const current = at === null ? null : storyOrder[at];
  const target = current?.target ?? null;

  const go = (sceneId: string) => setAt(storyOrder.findIndex((s) => s.scene.id === sceneId));
  const openTarget = useCallback((targetId: string) => setAt(storyOrder.findIndex((s) => s.target.id === targetId)), []);
  // One eased move in to the tapped ring, and one back out.
  const targetId = target?.id ?? null;
  const camera = useMemo<GlobeCamera>(() => {
    const door = DOORS.find((d) => d.id === targetId);
    return door ? { center: door.at, zoom: 3.3, seconds: 2.4 } : { center: HOME, zoom: 1.4, seconds: 2.4 };
  }, [targetId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAt(null);
      if (e.key === "ArrowRight") setAt((a) => (a === null ? 0 : Math.min(a + 1, storyOrder.length - 1)));
      if (e.key === "ArrowLeft") setAt((a) => (a === null || a === 0 ? null : a - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The picture is moved and enlarged so the tapped part sits in the middle of the view. One eased move.
  const move = useMemo(() => {
    if (!target) return "translate(0%, 0%) scale(1)";
    const dx = (0.5 - target.x / W) * 100 * ZOOM;
    const dy = (0.42 - target.y / H) * 100 * ZOOM;
    return `translate(${dx}%, ${dy}%) scale(${ZOOM})`;
  }, [target]);

  return (
    <div className="board">
      <header className="board-head">
        <h1>{ON_GLOBE ? "Genesis, from the beginning to the ark at rest" : "The world as Genesis pictures it"}</h1>
        <p>
          {ON_GLOBE
            ? "Tap a ring on the earth to move in to a scene; drag to turn the globe. The rings for the days of creation and the flood are placed for layout, not as locations."
            : "Tap a ring to move in to a scene. This is the storyboard: the plan for each scene, and a way into the ones already built."}
        </p>
      </header>

      <div className="board-left">
      <div className={`board-stage ${ON_GLOBE ? "is-globe" : ""}`}>
        {ON_GLOBE && <GlobeStage camera={camera} hold={20} land={null} flood={null} relief={null} startCenter={HOME} pins={NO_PINS} selectedId={null} onSelect={nothing} doors={DOORS} openDoor={targetId} onDoor={openTarget} lift={0} />}
        <div className="board-picture" style={{ transform: move, display: ON_GLOBE ? "none" : undefined }}>
          <div className="board-art" dangerouslySetInnerHTML={{ __html: hubPicture }} />
          <svg className="board-rings" viewBox={`0 0 ${W} ${H}`} aria-label="Parts of the world to tap">
            {targets.map((t) => (
              <g
                key={t.id}
                className={`ring ${target?.id === t.id ? "is-open" : ""}`}
                transform={`translate(${t.x} ${t.y})`}
                onClick={() => openTarget(t.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openTarget(t.id)}
                aria-label={t.label}
              >
                <circle r="34" className="ring-hit" />
                <circle r="13" className="ring-pulse" />
                <circle r="11" className="ring-line" />
                <circle r="4" className="ring-dot" />
                {!target && (
                  <text y="-22" textAnchor="middle" className="ring-label">
                    {t.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
        {target && (
          <button className="board-back" onClick={() => setAt(null)}>
            Whole world
          </button>
        )}
      </div>
      <Timeline at={at} onAt={setAt} onVerse={(verse) => onPlay(`verse:${verse}`)} />
      </div>

      {current ? (
        <SceneCard
          scene={current.scene}
          place={current.target.label}
          siblings={current.target.scenes}
          onSibling={go}
          onPrev={at! > 0 ? () => setAt(at! - 1) : null}
          onNext={at! < storyOrder.length - 1 ? () => setAt(at! + 1) : null}
          count={`${at! + 1} / ${storyOrder.length}`}
          onPlay={onPlay}
        />
      ) : (
        <nav className="board-list" aria-label="Scenes in story order">
          {storyOrder.map(({ scene, target: t }, i) => (
            <button key={scene.id} className="board-row" onClick={() => setAt(i)}>
              <span className="board-row-n">{i + 1}</span>
              <span className="board-row-title">{scene.title}</span>
              <span className="board-row-ref">{scene.passage}</span>
              <span className={`board-status status-${scene.built.split(" ")[0]}`} title={`${t.label}: ${scene.built}`}>
                {scene.built === "storyboard only" ? "Board" : scene.built === "playable" ? "Built" : "Rough"}
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

interface CardProps {
  scene: BoardScene;
  place: string;
  siblings: BoardScene[];
  onSibling: (id: string) => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  count: string;
  onPlay: (sceneId: string) => void;
}

function SceneCard({ scene, place, siblings, onSibling, onPrev, onNext, count, onPlay }: CardProps) {
  return (
    <article className="board-card" key={scene.id}>
      <p className="board-card-place">
        {place} · {scene.passage}
      </p>
      <h2>{scene.title}</h2>

      {siblings.length > 1 && (
        <div className="chips board-siblings">
          {siblings.map((s) => (
            <button key={s.id} className={`chip ${s.id === scene.id ? "is-selected" : ""}`} onClick={() => onSibling(s.id)}>
              {s.title.replace(/^Eden \d: /, "")}
            </button>
          ))}
        </div>
      )}

      {scene.frame && (
        <figure className="board-frame">
          <img src={`${import.meta.env.BASE_URL}style/${scene.frame}`} alt={`Style frame: ${scene.title}`} loading="lazy" />
          <figcaption>Style frame: how this scene is meant to look.</figcaption>
        </figure>
      )}

      <blockquote className="board-verse">
        {scene.verses.map((v) => (
          <p key={v}>
            <span className="board-verse-ref">{v}</span> {kjv(v)}
          </p>
        ))}
        <cite>King James Version</cite>
      </blockquote>

      <p className="board-narration">{scene.narration}</p>

      <ol className="board-moments" aria-label="Moments in this scene">
        {(moments[scene.id] ?? []).map((m, i) => (
          <li key={m}>
            <span>{i + 1}</span>
            {m}
          </li>
        ))}
      </ol>

      <dl className="board-plan">
        <dt>Watch</dt>
        <dd>{scene.watch}</dd>
        <dt>Touch</dt>
        <dd>{scene.touch ?? "Nothing. This scene is only watched."}</dd>
      </dl>

      <dl className="board-labels">
        <dt>
          <span className="tier-badge">Text</span>
        </dt>
        <dd>{scene.text}</dd>
        {scene.reading && (
          <>
            <dt>
              <span className="tier-badge tier-scholarly">Scholarly reading</span>
            </dt>
            <dd>{scene.reading}</dd>
          </>
        )}
        {scene.illustration && (
          <>
            <dt>
              <span className="tier-badge tier-model">Illustration</span>
            </dt>
            <dd>{scene.illustration}</dd>
          </>
        )}
      </dl>

      <div className="board-card-foot">
        <button onClick={onPrev ?? undefined} disabled={!onPrev}>
          Back
        </button>
        {scene.sceneId ? (
          <button className="board-play" onClick={() => onPlay(scene.sceneId!)}>
            {scene.built === "playable" ? "Play this scene" : "Play the rough version"}
          </button>
        ) : (
          <span className="board-notyet">Not built yet</span>
        )}
        <button onClick={onNext ?? undefined} disabled={!onNext}>
          Next
        </button>
        <span className="opening-count">{count}</span>
      </div>
    </article>
  );
}
