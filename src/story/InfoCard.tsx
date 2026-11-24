import { features } from "../data/features.ts";
import { sources } from "../data/sources.ts";
import type { Confidence, MapFeature, SourceStatus, Tier } from "../data/types.ts";

// The card for one feature: what it is, how well it is supported, and what competes with it.

export const TIER_LABEL: Record<Tier, string> = {
  text: "Text",
  scholarly: "Scholarly reading",
  model: "Model",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  stated: "Stated in the text.",
  proposed: "Proposed by the sources below. Not stated in the text.",
  illustration: "Illustration only. There is no research behind this position.",
};

const STATUS_NOTE: Record<SourceStatus, string> = {
  opened: "",
  "to-read": "not yet read first-hand",
  "permission-needed": "permission to use not yet given",
};

interface Props {
  feature: MapFeature;
  /** When on, features above tier "text" cannot be opened from here. */
  textOnly: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function InfoCard({ feature, textOnly, onSelect, onClose }: Props) {
  const cited = feature.sources.map((id) => sources.find((s) => s.id === id)).filter((s) => s !== undefined);
  const alternatives = (feature.alternatives ?? [])
    .map((id) => features.find((f) => f.id === id))
    .filter((f): f is MapFeature => f !== undefined && (!textOnly || f.tier === "text"));

  return (
    <aside className="card" aria-label={feature.name}>
      <button className="card-close" onClick={onClose} aria-label="Close">
        Close
      </button>
      <p className="card-tier">
        <span className={`tier-badge tier-${feature.tier}`}>{TIER_LABEL[feature.tier]}</span>
        {feature.verses.join(", ")}
      </p>
      <h2 className="card-name">{feature.name}</h2>
      <p className="card-note">{feature.note}</p>
      <p className={`card-confidence ${feature.confidence === "illustration" ? "is-illustration" : ""}`}>
        {CONFIDENCE_LABEL[feature.confidence]}
        {!feature.approxCenter && " No position is shown on the map."}
      </p>

      {feature.reasonsFor && feature.reasonsFor.length > 0 && (
        <>
          <h3>For</h3>
          <ul>
            {feature.reasonsFor.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
      {feature.reasonsAgainst && feature.reasonsAgainst.length > 0 && (
        <>
          <h3>Against</h3>
          <ul>
            {feature.reasonsAgainst.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}

      {alternatives.length > 0 && (
        <>
          <h3>Other readings</h3>
          <div className="chips">
            {alternatives.map((f) => (
              <button key={f.id} className={`chip chip-${f.tier}`} onClick={() => onSelect(f.id)}>
                {f.name}
              </button>
            ))}
          </div>
        </>
      )}

      {cited.length > 0 && (
        <>
          <h3>Sources</h3>
          <ul className="card-sources">
            {cited.map((s) => (
              <li key={s.id}>
                {s.author}, <em>{s.title}</em>
                {s.year ? ` (${s.year})` : ""}
                {STATUS_NOTE[s.status] && <span className="card-status"> ({STATUS_NOTE[s.status]})</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
