import { useState } from "react";
import StoryBoard from "./board/StoryBoard.tsx";
import { storyOrder } from "./board/board.ts";
import { HomeLabel, NextScene } from "./illustrated/kit.tsx";
import StoryPlayer from "./story/StoryPlayer.tsx";
import EdenMan from "./illustrated/EdenMan.tsx";
import Waters, { type WatersChapter } from "./illustrated/Waters.tsx";
import Ark from "./illustrated/Ark.tsx";
import Creatures, { type CreatureChapter } from "./illustrated/Creatures.tsx";
import Eden, { type EdenChapter } from "./illustrated/Eden.tsx";
import Generations from "./illustrated/Generations.tsx";
import Land, { type LandChapter } from "./illustrated/Land.tsx";
import GlobeTest from "./spike/GlobeTest.tsx";
import LifeTest from "./spike/LifeTest.tsx";
import SkyTest from "./spike/SkyTest.tsx";
import { beats } from "./story/beats.ts";

// Three views:
//   story  the main line and the front door: space, the deep, light, the firmament, then the globe (the default)
//   board  the storyboard: the plan for every scene, with ?view=board or the "Storyboard" button
//   scene  a hand-drawn scene, opened from a dot in the story (or from the storyboard)
//   globe  the M0 globe test, with ?view=globe

type View = "board" | "story" | "scene" | "globe";

const params = new URLSearchParams(window.location.search);
const asked = params.get("view");
const initial: View = asked === "globe" ? "globe" : asked === "scene" ? "scene" : asked === "board" ? "board" : "story";
const showSwitch = initial === "globe" || params.has("debug");

export default function App() {
  if (asked === "life") return <LifeTest />;
  if (asked === "sky") return <SkyTest />;
  const [view, setView] = useState<View>(initial);
  // A link can open the story at a verse: ?verse=7:11
  const [startBeat, setStartBeat] = useState(() => Math.max(0, beats.findIndex((b) => b.reference === `Genesis ${params.get("verse")}`)));
  // The handoff from the sketched creation to the detailed globe: the drawing swells and fades, the world fades in.
  // Where a hand-drawn scene was opened from, so leaving it goes back there.
  const [from, setFrom] = useState<"story" | "board">("board");
  const [leaving, setLeaving] = useState(false);
  const [arrived, setArrived] = useState(false);
  // Which hand-drawn scene is open: ?scene=day-1 opens one directly.
  const [scene, setScene] = useState(params.get("scene") ?? "eden-man");

  if (view === "board") {
    return (
      <StoryBoard
        arrived={arrived}
        onPlay={(sceneId) => {
          setArrived(false);
          setFrom("board");
          // Scenes drawn in the new hand-drawn style open on their own; the rest open in the story.
          if (sceneId.startsWith("illustrated:")) {
            setScene(sceneId.slice("illustrated:".length));
            return setView("scene");
          }
          // The timeline's flood days open the globe story at their verse.
          const at = sceneId.startsWith("verse:") ? beats.findIndex((b) => b.reference === `Genesis ${sceneId.slice("verse:".length)}`) : beats.findIndex((b) => b.sceneId === sceneId);
          setStartBeat(Math.max(0, at));
          setView("story");
        }}
      />
    );
  }
  if (view === "scene") {
    const home = () => setView(from);
    // Where this scene leads once it has played: the next hand-drawn scene in story order. Day 7 ends
    // the sketched creation, so it leads out to the finished world: the detailed globe of the front door.
    const drawn = storyOrder.map((s) => s.scene).filter((s) => s.sceneId?.startsWith("illustrated:"));
    const here = drawn.findIndex((s) => s.sceneId === `illustrated:${scene}`);
    const after = here >= 0 ? drawn[here + 1] : undefined;
    const toWorld = () => {
      setLeaving(true);
      window.setTimeout(() => {
        setLeaving(false);
        setArrived(true);
        setView("board");
      }, 900);
    };
    const next =
      from === "story"
        ? scene === "ark"
          ? null
          : { label: "Back to the story", go: home }
        : scene === "day-7"
        ? { label: "See the finished world", go: toWorld }
        : scene !== "ark" && after
          ? { label: `Next: ${after.title}`, go: () => setScene(after.sceneId!.slice("illustrated:".length)) }
          : null;
    let drawing;
    if (scene === "eden-man") drawing = <EdenMan onHome={home} />;
    else if (scene === "ark") {
      // The ark scene ends by handing over to the globe at the first verse of the flood.
      const toFlood = () => {
        setStartBeat(Math.max(0, beats.findIndex((b) => b.sceneId === "flood")));
        setView("story");
      };
      drawing = <Ark key={scene} onHome={home} onNext={toFlood} />;
    } else if (scene === "generations") drawing = <Generations key={scene} onHome={home} />;
    else if (["day-7", "eden-garden", "eden-river", "eden-naming", "eden-woman", "eden-fall", "exile"].includes(scene)) drawing = <Eden key={scene} chapter={scene as EdenChapter} onHome={home} />;
    else if (scene === "day-5" || scene === "day-6") drawing = <Creatures key={scene} chapter={scene as CreatureChapter} onHome={home} />;
    else if (scene === "day-3" || scene === "day-4") drawing = <Land key={scene} chapter={scene as LandChapter} onHome={home} />;
    else drawing = <Waters key={scene} chapter={scene as WatersChapter} onHome={home} />;
    return (
      <HomeLabel.Provider value={from === "story" ? "Back to the story" : "Storyboard"}>
        <NextScene.Provider value={next}>
          <div className={`scene-wrap ${leaving ? "is-leaving" : ""}`}>{drawing}</div>
        </NextScene.Provider>
      </HomeLabel.Provider>
    );
  }
  return (
    <>
      {view === "story" ? (
        <StoryPlayer
          key={startBeat}
          startBeat={startBeat}
          onHome={() => setView("board")}
          onDrill={(sceneId, beat) => {
            // Into the drawing, and back to this same verse afterwards.
            setScene(sceneId);
            setStartBeat(beat);
            setFrom("story");
            setView("scene");
          }}
        />
      ) : (
        <GlobeTest />
      )}
      {showSwitch && (
        <button className="view-switch" onClick={() => setView(view === "story" ? "globe" : "story")}>
          {view === "story" ? "Globe test" : "Story"}
        </button>
      )}
    </>
  );
}
