import { useEffect, useRef, useState } from "react";
import { floodDay, floodEvents, floodYearAM, type Tradition } from "../data/chronology.ts";
import { storyOrder, targets } from "./board.ts";

// The story's timeline, under the globe. One cell per scene, in story order; cells are grouped into the
// parts of the story (the rings on the globe), and the parts into four eras. Tapping a part moves the
// globe to its ring and opens its scene; tapping a ring lights its part here. "Play the story" walks
// through the scenes in order, and the slider scrubs through them.
//
// Widths are by scene, not by time: seven days, then many centuries, then one year dated to the day,
// cannot share one scale. The real spans are given as labels, and only where the text gives them:
//   - creation: "the beginning", then seven days (Genesis 1:1-2:3)
//   - Eden: no length is given
//   - Adam to the flood: the sum of the Genesis 5 ages and Noah's age at the flood (7:6), which
//     differs between the Hebrew (Masoretic) and Greek (Septuagint) manuscripts
//   - the flood: from 7:11 to 8:14 by the text's own dates
// When the flood is open a second track appears, true to scale by day, with the dated events.

const ERAS: { id: string; label: string; targets: string[] }[] = [
  { id: "creation", label: "Creation", targets: ["deep", "light", "vault", "land", "lights", "sea", "life", "rest"] },
  { id: "eden", label: "Eden", targets: ["garden"] },
  { id: "east", label: "East of Eden", targets: ["east"] },
  { id: "flood", label: "The flood", targets: ["flood", "ararat"] },
];
const SHORT: Record<string, string> = {
  deep: "Begin",
  light: "Day 1",
  vault: "Day 2",
  land: "Day 3",
  lights: "Day 4",
  sea: "Day 5",
  life: "Day 6",
  rest: "Day 7",
  garden: "The garden",
  east: "Way east",
  flood: "Ark, flood",
  ararat: "Ararat",
};
const dated = floodEvents.filter((e) => e.date).map((e) => ({ ...e, day: floodDay(e.date!) }));
const lastDay = Math.max(...dated.map((e) => e.day));
const eraOf = (targetId: string) => ERAS.find((e) => e.targets.includes(targetId))!;

interface Props {
  /** Position in story order, or null for the whole world. */
  at: number | null;
  onAt: (at: number | null) => void;
  /** Open the globe story at a verse. */
  onVerse: (verse: string) => void;
}

export default function Timeline({ at, onAt, onVerse }: Props) {
  const [playing, setPlaying] = useState(false);
  const [tradition, setTradition] = useState<Tradition>("masoretic");
  const total = storyOrder.length;
  const current = at === null ? null : storyOrder[at];

  // Play the story: one scene after another, at a reading pace. Any tap elsewhere leaves it running;
  // it stops by itself at the end.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (at !== null && at >= total - 1) return setPlaying(false);
      onAt(at === null ? 0 : at + 1);
    }, at === null ? 600 : 7000);
    return () => window.clearTimeout(timer);
  }, [playing, at, total, onAt]);

  const years = floodYearAM(tradition).toLocaleString("en-US");
  const spans: Record<string, string> = {
    creation: "The beginning, then seven days",
    eden: "Length not given",
    east: `${years} years`,
    flood: `${lastDay} days`,
  };
  // On a narrow screen the track scrolls sideways; keep the open part in view.
  const track = useRef<HTMLDivElement>(null);
  const openId = current?.target.id;
  useEffect(() => {
    track.current?.querySelector(".timeline-part.is-open")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [openId]);
  const showFlood = current ? eraOf(current.target.id).id === "flood" : false;

  return (
    <section className="timeline" aria-label="The story's timeline">
      <div className="timeline-head">
        <button className="timeline-play" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "▶ Play the story"}
        </button>
        <span className="timeline-range">Genesis 1:1 to 8:14</span>
        <span className="timeline-years">Adam to the flood: {years} years</span>
        <span className="timeline-counts" role="group" aria-label="Which count of years">
          {(["masoretic", "septuagint"] as Tradition[]).map((t) => (
            <button key={t} className={tradition === t ? "is-on" : ""} onClick={() => setTradition(t)}>
              {t === "masoretic" ? "Hebrew count" : "Greek count"}
            </button>
          ))}
        </span>
        <span className="timeline-count">{at === null ? `${total} scenes` : `${at + 1} of ${total}`}</span>
      </div>

      <div className="timeline-scroll">
        <div className="timeline-track" ref={track} style={{ gridTemplateColumns: `repeat(${total}, minmax(var(--cell), 1fr))` }}>
          {ERAS.map((era) => {
            const first = storyOrder.findIndex((s) => era.targets.includes(s.target.id));
            const count = storyOrder.filter((s) => era.targets.includes(s.target.id)).length;
            return (
              <div key={era.id} className={`timeline-era era-${era.id}`} style={{ gridColumn: `${first + 1} / span ${count}`, gridRow: 1 }}>
                <strong>{era.label}</strong>
                <span>{spans[era.id]}</span>
              </div>
            );
          })}
          {targets.map((t) => {
            const first = storyOrder.findIndex((s) => s.target.id === t.id);
            const open = current?.target.id === t.id;
            return (
              <div key={t.id} className={`timeline-part era-${eraOf(t.id).id} ${open ? "is-open" : ""}`} style={{ gridColumn: `${first + 1} / span ${t.scenes.length}`, gridRow: 2 }}>
                <button className="timeline-part-name" onClick={() => onAt(first)} title={t.label}>
                  {SHORT[t.id] ?? t.label}
                </button>
                {t.scenes.length > 1 && (
                  <span className="timeline-scenes">
                    {t.scenes.map((scene, k) => (
                      <button key={scene.id} className={at === first + k ? "is-on" : ""} onClick={() => onAt(first + k)} title={scene.title} aria-label={scene.title} />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>

      </div>

        {showFlood && (
          <div className="timeline-flood" aria-label="The flood, day by day">
            <span className="timeline-flood-line" />
            {dated.map((e, i) => (
              <button key={e.id} className={`timeline-day ${i % 2 ? "is-low" : ""}`} style={{ left: `${((e.day - 1) / (lastDay - 1)) * 100}%` }} onClick={() => onVerse(e.verses.replace("Gen ", ""))} title={`${e.event} (${e.verses}). Tap to open it on the globe.`}>
                <i />
                <b>Day {e.day}</b>
                <span>{e.verses.replace("Gen ", "")}</span>
              </button>
            ))}
          </div>
        )}
      {showFlood && <p className="timeline-note">Tap a day to open it on the globe. Day numbers count thirty-day months, as the text's own arithmetic does (7:24, 8:3-4).</p>}

      <input className="timeline-slider" type="range" min={0} max={total} step={1} value={at === null ? 0 : at + 1} onChange={(e) => onAt(Number(e.target.value) === 0 ? null : Number(e.target.value) - 1)} aria-label="Move through the story" />
      <p className="timeline-note">Blocks are sized by scene, not by time. Drag the slider to move through the story.</p>
    </section>
  );
}
