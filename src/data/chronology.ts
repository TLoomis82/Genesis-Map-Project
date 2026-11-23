// Pre-flood chronology from Genesis 5 and the flood calendar from Genesis 7-8.
// Years are data, not a claim: the Masoretic count is the default and the
// Septuagint count is a toggle. Both are labeled on screen as textual traditions.
//
// AM = Anno Mundi, years counted from Adam's creation (year 0).

export type Tradition = 'masoretic' | 'septuagint';

export interface Patriarch {
  name: string;
  verses: string;
  /** Age when the named son was born, per tradition. */
  ageAtSon: Record<Tradition, number>;
  /** Total lifespan, per tradition. Enoch's is the age at which God took him. */
  lifespan: Record<Tradition, number>;
}

// Septuagint figures follow the common reading (Codex Alexandrinus) with
// Methuselah at 187. Codex Vaticanus reads 167, which moves the flood to 2242.
export const patriarchs: Patriarch[] = [
  { name: 'Adam', verses: 'Gen 5:3-5', ageAtSon: { masoretic: 130, septuagint: 230 }, lifespan: { masoretic: 930, septuagint: 930 } },
  { name: 'Seth', verses: 'Gen 5:6-8', ageAtSon: { masoretic: 105, septuagint: 205 }, lifespan: { masoretic: 912, septuagint: 912 } },
  { name: 'Enosh', verses: 'Gen 5:9-11', ageAtSon: { masoretic: 90, septuagint: 190 }, lifespan: { masoretic: 905, septuagint: 905 } },
  { name: 'Kenan', verses: 'Gen 5:12-14', ageAtSon: { masoretic: 70, septuagint: 170 }, lifespan: { masoretic: 910, septuagint: 910 } },
  { name: 'Mahalalel', verses: 'Gen 5:15-17', ageAtSon: { masoretic: 65, septuagint: 165 }, lifespan: { masoretic: 895, septuagint: 895 } },
  { name: 'Jared', verses: 'Gen 5:18-20', ageAtSon: { masoretic: 162, septuagint: 162 }, lifespan: { masoretic: 962, septuagint: 962 } },
  { name: 'Enoch', verses: 'Gen 5:21-24', ageAtSon: { masoretic: 65, septuagint: 165 }, lifespan: { masoretic: 365, septuagint: 365 } },
  { name: 'Methuselah', verses: 'Gen 5:25-27', ageAtSon: { masoretic: 187, septuagint: 187 }, lifespan: { masoretic: 969, septuagint: 969 } },
  { name: 'Lamech', verses: 'Gen 5:28-31', ageAtSon: { masoretic: 182, septuagint: 188 }, lifespan: { masoretic: 777, septuagint: 753 } },
  // Noah's "son" entry is not used for the count: the flood is dated by his own age (Gen 7:6).
  { name: 'Noah', verses: 'Gen 5:32; 7:6; 9:29', ageAtSon: { masoretic: 500, septuagint: 500 }, lifespan: { masoretic: 950, septuagint: 950 } },
];

/** Noah's age when the flood began (Gen 7:6, 7:11). Same in both traditions. */
export const NOAH_AGE_AT_FLOOD = 600;

export interface PatriarchYears {
  name: string;
  bornAM: number;
  diedAM: number;
}

/** Birth and death years for each patriarch under one tradition. */
export function patriarchYears(tradition: Tradition): PatriarchYears[] {
  let born = 0;
  return patriarchs.map((p) => {
    const row = { name: p.name, bornAM: born, diedAM: born + p.lifespan[tradition] };
    born += p.ageAtSon[tradition];
    return row;
  });
}

/** Year of the flood, counted from Adam. Masoretic 1656, Septuagint 2262. */
export function floodYearAM(tradition: Tradition): number {
  const noah = patriarchYears(tradition).find((p) => p.name === 'Noah');
  if (!noah) throw new Error('Noah missing from patriarch list');
  return noah.bornAM + NOAH_AGE_AT_FLOOD;
}

// ---------------------------------------------------------------------------
// Flood calendar. Dates are given in the text as year of Noah's life, month, day.
// Day numbers assume 30-day months, which is what the text's own arithmetic
// implies: month 2 day 17 to month 7 day 17 is called 150 days (Gen 7:24, 8:3-4).
// ---------------------------------------------------------------------------

export interface FloodDate {
  noahYear: number;
  month: number;
  day: number;
}

export interface FloodEvent {
  id: string;
  verses: string;
  /** Null when the text gives a duration but no calendar date. */
  date: FloodDate | null;
  event: string;
}

export const FLOOD_START: FloodDate = { noahYear: 600, month: 2, day: 17 };

/** Day of the flood, where the day it began is day 1. */
export function floodDay(d: FloodDate): number {
  const abs = (x: FloodDate) => x.noahYear * 360 + (x.month - 1) * 30 + x.day;
  return abs(d) - abs(FLOOD_START) + 1;
}

export const floodEvents: FloodEvent[] = [
  { id: 'start', verses: 'Gen 7:11', date: { noahYear: 600, month: 2, day: 17 }, event: 'Fountains of the great deep broken up; windows of heaven opened' },
  { id: 'rain', verses: 'Gen 7:12, 7:17', date: null, event: 'Rain on the earth forty days and forty nights' },
  { id: 'covered', verses: 'Gen 7:19-20', date: null, event: 'All the high hills covered; waters fifteen cubits above them' },
  { id: 'prevailed', verses: 'Gen 7:24', date: null, event: 'Waters prevailed a hundred and fifty days' },
  { id: 'rested', verses: 'Gen 8:4', date: { noahYear: 600, month: 7, day: 17 }, event: 'The ark rested on the mountains of Ararat' },
  { id: 'tops-seen', verses: 'Gen 8:5', date: { noahYear: 600, month: 10, day: 1 }, event: 'Tops of the mountains seen' },
  { id: 'raven-dove', verses: 'Gen 8:6-12', date: null, event: 'After forty days a raven, then a dove three times at seven-day intervals' },
  { id: 'waters-dried', verses: 'Gen 8:13', date: { noahYear: 601, month: 1, day: 1 }, event: 'Waters dried from off the earth; covering of the ark removed' },
  { id: 'earth-dry', verses: 'Gen 8:14', date: { noahYear: 601, month: 2, day: 27 }, event: 'The earth was dry' },
];

/** The demo stops here: the ark at rest on dry ground, before Noah leaves (Gen 8:15). */
export const DEMO_END_EVENT = 'earth-dry';
