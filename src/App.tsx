import { useState } from "react";
import StoryPlayer from "./story/StoryPlayer.tsx";
import GlobeTest from "./spike/GlobeTest.tsx";

// The story is the app. The M0 globe test is kept for checks: add ?view=globe to the address
// to open it, or ?debug to get a button that switches between the two.

type View = "story" | "globe";

const params = new URLSearchParams(window.location.search);
const initial: View = params.get("view") === "globe" ? "globe" : "story";
const showSwitch = initial === "globe" || params.has("debug");

export default function App() {
  const [view, setView] = useState<View>(initial);
  return (
    <>
      {view === "story" ? <StoryPlayer /> : <GlobeTest />}
      {showSwitch && (
        <button className="view-switch" onClick={() => setView(view === "story" ? "globe" : "story")}>
          {view === "story" ? "Globe test" : "Story"}
        </button>
      )}
    </>
  );
}
