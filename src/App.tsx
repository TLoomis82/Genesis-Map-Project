import { useState } from "react";
import OpeningPlayer from "./opening/OpeningPlayer.tsx";
import GlobeTest from "./spike/GlobeTest.tsx";

// Two views for now: the opening (Gen 1:1-8, in progress for M1) and the M0 globe test.
// Add ?view=globe to the address to start on the globe test.

type View = "opening" | "globe";

const initial: View = new URLSearchParams(window.location.search).get("view") === "globe" ? "globe" : "opening";

export default function App() {
  const [view, setView] = useState<View>(initial);
  return (
    <>
      {view === "opening" ? <OpeningPlayer /> : <GlobeTest />}
      <button className="view-switch" onClick={() => setView(view === "opening" ? "globe" : "opening")}>
        {view === "opening" ? "Globe test" : "Opening"}
      </button>
    </>
  );
}
