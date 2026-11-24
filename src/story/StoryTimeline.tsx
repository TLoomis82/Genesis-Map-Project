import { useEffect, useRef } from "react";
import { floodDay, floodEvents, floodYearAM } from "../data/chronology.ts";
import { beats, chapters } from "./beats.ts";

// The story's timeline, along the bottom of the story: the four eras, a block for each part, and inside
// each block a fill that shows how far through it the story is. Tap a block to go to that part.
// It is the same idea as the timeline on the storyboard, cut down to one strip so it can stay on screen.
//
// Blocks are sized by the number of verses shown, not by time. The spans under the era names are the
// real ones, and only where the text gives them: no length is given for Eden; the years from Adam to
// the flood are the sum of the Genesis 5 ages and Noah's age at the flood, by the Hebrew (Masoretic)
// count; the flood's days are the text's own dates.

const ERAS: { id: string; label: string; span: string; parts: string[] }[] = [
  { id: "creation", label: "Creation", span: "The beginning, then seven days", parts: ["before", "day-1", "day-2", "day-3", "day-4", "day-5", "day-6", "day-7"] },
  { id: "eden", label: "Eden", span: "no length given", parts: ["eden"] },
  { id: "east", label: "East of Eden", span: `${floodYearAM("masoretic").toLocaleString("en-US")} years, Hebrew count`, parts: ["exile", "cain", "seth-to-noah", "nephilim"] },
  { id: "flood", label: "The flood", span: `${floodDay(floodEvents.find((e) => e.id === "earth-dry")!.date!)} days`, parts: ["ark", "flood", "end-grounding", "end-receding", "end-pullback", "end-return"] },
];
const SHORT: Record<string, string> = {
  before: "Beginning",
  "day-1": "Day 1",
  "day-2": "Day 2",
  "day-3": "Day 3",
  "day-4": "Day 4",
  "day-5": "Day 5",
  "day-6": "Day 6",
  "day-7": "Day 7",
  eden: "Eden",
  exile: "Exile",
  cain: "Cain",
  "seth-to-noah": "Generations",
  nephilim: "Nephilim",
  ark: "The ark",
  flood: "The flood",
  "end-grounding": "At rest",
  "end-receding": "Receding",
  "end-pullback": "Dry",
  "end-return": "Ararat",
};

export default function StoryTimeline({ index, onGo }: { index: number; onGo: (beat: number) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  const current = beats[index].sceneId;
  // On a narrow screen the strip scrolls sideways; keep the part that is playing in view.
  useEffect(() => {
    strip.current?.querySelector(".timeline-part.is-open")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [current]);

  // One column for each part: at least as wide as its name, and wider the more verses it holds.
  const placed = chapters.map((c, i) => {
    const end = chapters[i + 1]?.first ?? beats.length;
    return { ...c, end, at: i + 1, span: end - c.first };
  });
  return (
    <nav className="story-timeline" aria-label="The story's timeline" ref={strip}>
      <div className="timeline-track" style={{ gridTemplateColumns: placed.map((p) => `minmax(max-content, ${p.span}fr)`).join(" ") }}>
        {ERAS.map((era) => {
          const mine = placed.filter((p) => era.parts.includes(p.scene.id));
          if (!mine.length) return null;
          return (
            <div key={era.id} className={`timeline-era era-${era.id}`} style={{ gridColumn: `${mine[0].at} / span ${mine.length}`, gridRow: 1 }} title={`${era.label}: ${era.span}`}>
              <strong>
                {era.label} <span>{era.span}</span>
              </strong>
            </div>
          );
        })}
        {placed.map((p) => {
          const era = ERAS.find((e) => e.parts.includes(p.scene.id)) ?? ERAS[0];
          const done = Math.max(0, Math.min(index + 1, p.end) - p.first) / p.span;
          return (
            <button key={p.scene.id} className={`timeline-part era-${era.id} ${p.scene.id === current ? "is-open" : ""}`} style={{ gridColumn: p.at, gridRow: 2 }} onClick={() => onGo(p.first)} title={`${p.scene.title} (${p.scene.verses.join(", ")})`}>
              <span className="timeline-part-fill" style={{ transform: `scaleX(${done})` }} />
              <span className="timeline-part-name">{SHORT[p.scene.id] ?? p.scene.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
