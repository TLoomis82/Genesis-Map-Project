import { useState } from "react";
import StoryBoard from "./board/StoryBoard.tsx";
import StoryPlayer from "./story/StoryPlayer.tsx";
import EdenMan from "./illustrated/EdenMan.tsx";
import Waters, { type WatersChapter } from "./illustrated/Waters.tsx";
import Ark from "./illustrated/Ark.tsx";
import Creatures, { type CreatureChapter } from "./illustrated/Creatures.tsx";
import Eden, { type EdenChapter } from "./illustrated/Eden.tsx";
import Generations from "./illustrated/Generations.tsx";
import Land, { type LandChapter } from "./illustrated/Land.tsx";
import GlobeTest from "./spike/GlobeTest.tsx";
import { beats } from "./story/beats.ts";

// Three views:
//   board  the interactive storyboard and front door: the world as Genesis pictures it (the default)
//   story  the playable story, opened from the board or with ?view=story (and with ?debug, for checks)
//   scene  a finished hand-drawn scene, opened from the board (so far: Eden 1, the man from the dust)
//   globe  the M0 globe test, with ?view=globe

type View = "board" | "story" | "scene" | "globe";

const params = new URLSearchParams(window.location.search);
const asked = params.get("view");
const initial: View = asked === "globe" ? "globe" : asked === "scene" ? "scene" : asked === "story" || params.has("debug") ? "story" : "board";
const showSwitch = initial === "globe" || params.has("debug");

export default function App() {
  const [view, setView] = useState<View>(initial);
  const [startBeat, setStartBeat] = useState(0);
  // Which hand-drawn scene is open: ?scene=day-1 opens one directly.
  const [scene, setScene] = useState(params.get("scene") ?? "eden-man");

  if (view === "board") {
    return (
      <StoryBoard
        onPlay={(sceneId) => {
          // Scenes drawn in the new hand-drawn style open on their own; the rest open in the story.
          if (sceneId.startsWith("illustrated:")) {
            setScene(sceneId.slice("illustrated:".length));
            return setView("scene");
          }
          setStartBeat(Math.max(0, beats.findIndex((b) => b.sceneId === sceneId)));
          setView("story");
        }}
      />
    );
  }
  if (view === "scene") {
    const home = () => setView("board");
    if (scene === "eden-man") return <EdenMan onHome={home} />;
    if (scene === "ark") {
      // The ark scene ends by handing over to the globe at the first verse of the flood.
      const toFlood = () => {
        setStartBeat(Math.max(0, beats.findIndex((b) => b.sceneId === "flood")));
        setView("story");
      };
      return <Ark key={scene} onHome={home} onNext={toFlood} />;
    }
    if (scene === "generations") return <Generations key={scene} onHome={home} />;
    if (["day-7", "eden-garden", "eden-river", "eden-naming", "eden-woman", "eden-fall", "exile"].includes(scene)) return <Eden key={scene} chapter={scene as EdenChapter} onHome={home} />;
    if (scene === "day-5" || scene === "day-6") return <Creatures key={scene} chapter={scene as CreatureChapter} onHome={home} />;
    if (scene === "day-3" || scene === "day-4") return <Land key={scene} chapter={scene as LandChapter} onHome={home} />;
    return <Waters key={scene} chapter={scene as WatersChapter} onHome={home} />;
  }
  return (
    <>
      {view === "story" ? <StoryPlayer key={startBeat} startBeat={startBeat} onHome={() => setView("board")} /> : <GlobeTest />}
      {showSwitch && (
        <button className="view-switch" onClick={() => setView(view === "story" ? "globe" : "story")}>
          {view === "story" ? "Globe test" : "Story"}
        </button>
      )}
    </>
  );
}
