import { useState } from "react";
import StoryBoard from "./board/StoryBoard.tsx";
import StoryPlayer from "./story/StoryPlayer.tsx";
import EdenMan from "./illustrated/EdenMan.tsx";
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

  if (view === "board") {
    return (
      <StoryBoard
        onPlay={(sceneId) => {
          // Scenes drawn in the new hand-drawn style open on their own; the rest open in the story.
          if (sceneId.startsWith("illustrated:")) return setView("scene");
          setStartBeat(Math.max(0, beats.findIndex((b) => b.sceneId === sceneId)));
          setView("story");
        }}
      />
    );
  }
  if (view === "scene") return <EdenMan onHome={() => setView("board")} />;
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
