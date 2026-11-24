import { sources } from "../data/sources.ts";

// "About and sources": what this piece is, how to read its labels, what it has drawn on, and what it
// may be used under. Opened from the title card, the end of the story and the storyboard.
// Only sources that have been read first-hand are listed as used; the rest are listed as still to read.

export default function About({ onClose }: { onClose: () => void }) {
  const read = sources.filter((s) => s.status === "opened");
  const waiting = sources.filter((s) => s.status !== "opened");
  return (
    <div className="about" role="dialog" aria-label="About and sources">
      <div className="about-page">
        <button className="story-button about-close" onClick={onClose}>
          Close
        </button>
        <h1>About this piece</h1>
        <p>Genesis 1:1 to 8:14, told verse by verse on the earth itself: from empty space to the ark at rest. It is a prototype.</p>

        <h2>The order of authority</h2>
        <p>The Bible comes first. Respected biblical scholars come second. Reconstructions from outside the text come third. Every picture that goes beyond the words says so, on the screen, where it does.</p>

        <h2>How to read the labels</h2>
        <dl>
          <dt>
            <span className="tier-badge">Text</span>
          </dt>
          <dd>Stated in Genesis. Every verse on screen is the King James Version, which is in the public domain.</dd>
          <dt>
            <span className="tier-badge tier-scholarly">Scholarly reading</span>
          </dt>
          <dd>A named scholar's reading of the text, with the source given.</dd>
          <dt>
            <span className="tier-badge tier-model">Model</span>
          </dt>
          <dd>A reconstruction from outside the text: the shape of the land before the flood, the sizes and places of the sun and moon.</dd>
          <dt>
            <span className="tier-badge tier-scholarly">Illustration</span>
          </dt>
          <dd>Drawn only so the verse can be shown: where the garden sits on the land, the flocks and herds, people as lights. No research stands behind the position or the look.</dd>
        </dl>
        <p>God is never drawn. People are shown as lights.</p>

        <h2>Sources read and used</h2>
        <ul>
          {read.map((s) => (
            <li key={s.id}>
              {s.author}
              {s.year ? ` (${s.year})` : ""}. <cite>{s.title}</cite>.{" "}
              {s.url && (
                <a href={s.url} target="_blank" rel="noreferrer">
                  Link
                </a>
              )}
            </li>
          ))}
        </ul>
        {waiting.length > 0 && (
          <>
            <h2>Listed, not yet read or awaiting permission</h2>
            <p>Nothing on screen rests on these yet.</p>
            <ul className="about-waiting">
              {waiting.map((s) => (
                <li key={s.id}>
                  {s.author}
                  {s.year ? ` (${s.year})` : ""}. <cite>{s.title}</cite>.
                </li>
              ))}
            </ul>
          </>
        )}

        <h2>Credits and licences</h2>
        <ul>
          <li>Bible text: King James Version, public domain.</li>
          <li>Land before the flood: PALEOMAP PaleoDEMs, Scotese and Wright (2018), CC BY 4.0. Used as a stand-in model, coloured and shaded here.</li>
          <li>Sun, earth and moon figures: NASA Space Science Data Coordinated Archive, planetary fact sheets.</li>
          <li>Globe: Mapbox GL JS; map data © Mapbox and © OpenStreetMap contributors.</li>
          <li>Drawings, water, sky and creatures: original to this piece.</li>
        </ul>
      </div>
    </div>
  );
}
