// Shared data types for Genesis Map.
// Rule: nothing is drawn unless it is a MapFeature, and every MapFeature carries a tier.

/** How well a feature is supported. Drives styling and the "text only" switch. */
export type Tier =
  | 'text' // stated directly in Genesis
  | 'scholarly' // a named scholar's reading of the text
  | 'model'; // a reconstruction from outside the text

export type Confidence =
  | 'stated' // the text says it
  | 'proposed' // a named source argues for it
  | 'illustration'; // placed only so the scene can be shown; no research behind the position

export type SourceStatus = 'opened' | 'to-read' | 'permission-needed';

export interface Source {
  id: string;
  author: string;
  title: string;
  year?: number;
  url?: string;
  /** Has this been read first-hand? Nothing ships on a 'to-read' source. */
  status: SourceStatus;
}

/** [longitude, latitude] in degrees, present-day coordinates. */
export type LngLat = [number, number];

export interface MapFeature {
  id: string;
  name: string;
  tier: Tier;
  confidence: Confidence;
  /** Required for every tier, e.g. ['Gen 2:10']. */
  verses: string[];
  /** Source ids. Required when tier is 'scholarly' or 'model'. */
  sources: string[];
  /** One plain sentence shown on the info card. */
  note: string;
  /** Reasons for and against, shown when alternatives exist. */
  reasonsFor?: string[];
  reasonsAgainst?: string[];
  /** Ids of competing features shown side by side. */
  alternatives?: string[];
  /** Approximate present-day position, when one can be given at all. */
  approxCenter?: LngLat;
  /** True when the feature is explained on a card but never pinned. */
  noPin?: boolean;
}

export type Renderer = 'three' | 'handoff' | 'mapbox';

export interface Scene {
  id: string;
  title: string;
  verses: string[];
  /** What the viewer sees, in one or two sentences. */
  shows: string;
  renderer: Renderer;
  /** Highest tier of anything visible in the scene. */
  tier: Tier;
  /** Feature ids visible in this scene. */
  features: string[];
}
