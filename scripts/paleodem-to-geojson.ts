// Turns one PALEOMAP PaleoDEM text file (Scotese and Wright 2018, CC BY 4.0,
// https://zenodo.org/records/5460860) into a small GeoJSON file of land the globe can draw.
//
//   node scripts/paleodem-to-geojson.ts <input.csv> <output.geojson> [name]
//
// The input lists one grid point per line: longitude, latitude, elevation in metres, in either
// column order for the first two (the script works out which is which). Header lines are skipped.
// Every point above sea level becomes land. Land is grouped into three bands by height, and
// neighbouring points in a row are merged into one strip, so the file stays small.
//
// Positions are those of the reconstruction, not today's. Nothing here is a claim from the text:
// every feature written is tier "model".

import { readFileSync, writeFileSync } from "node:fs";

const [input, output, name = "land"] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/paleodem-to-geojson.ts <input.csv> <output.geojson> [name]");
  process.exit(1);
}

/** Height bands in metres: lowland, upland, mountain. */
const BANDS = [
  { band: "lowland", from: 0 },
  { band: "upland", from: 500 },
  { band: "mountain", from: 1500 },
] as const;
const bandOf = (elevation: number) => (elevation >= 1500 ? 2 : elevation >= 500 ? 1 : 0);

// Read the points.
const rows: [number, number, number][] = [];
for (const line of readFileSync(input, "utf8").split(/\r\n|\n|\r/)) {
  const parts = line.trim().split(/[,\s;]+/).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) continue; // header or blank
  rows.push([parts[0], parts[1], parts[2]]);
}
if (rows.length === 0) throw new Error(`No "number, number, number" lines found in ${input}`);

// Latitude never passes 90, so the column that does is longitude.
const firstIsLng = rows.some((r) => Math.abs(r[0]) > 90);
const secondIsLng = rows.some((r) => Math.abs(r[1]) > 90);
if (firstIsLng === secondIsLng) throw new Error("Cannot tell which column is longitude.");
const points = rows.map(([a, b, elevation]) => (firstIsLng ? { lng: a, lat: b, elevation } : { lng: b, lat: a, elevation }));

// Grid spacing: the smallest gap between two different longitudes.
const lngs = [...new Set(points.map((p) => p.lng))].sort((a, b) => a - b);
const step = Math.min(...lngs.slice(1).map((v, i) => v - lngs[i]));
const half = step / 2;
const clampLat = (lat: number) => Math.max(-90, Math.min(90, lat));
const clampLng = (lng: number) => Math.max(-180, Math.min(180, lng));

// Group land points by latitude row, then merge runs of neighbours in the same height band.
const byRow = new Map<number, { lng: number; band: number }[]>();
let landPoints = 0;
for (const p of points) {
  if (p.elevation <= 0) continue;
  landPoints++;
  if (!byRow.has(p.lat)) byRow.set(p.lat, []);
  byRow.get(p.lat)!.push({ lng: p.lng, band: bandOf(p.elevation) });
}

const features: unknown[] = [];
for (const [lat, cells] of byRow) {
  cells.sort((a, b) => a.lng - b.lng);
  let start = 0;
  for (let i = 1; i <= cells.length; i++) {
    const joined = i < cells.length && cells[i].band === cells[start].band && Math.abs(cells[i].lng - cells[i - 1].lng - step) < step * 0.01;
    if (joined) continue;
    const west = clampLng(cells[start].lng - half);
    const east = clampLng(cells[i - 1].lng + half);
    const south = clampLat(lat - half);
    const north = clampLat(lat + half);
    if (east > west && north > south) {
      features.push({
        type: "Feature",
        properties: { band: BANDS[cells[start].band].band, tier: "model" },
        geometry: { type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] },
      });
    }
    start = i;
  }
}

writeFileSync(
  output,
  JSON.stringify({
    type: "FeatureCollection",
    name,
    credit: "Scotese, C.R. and Wright, N. (2018), PALEOMAP Paleodigital Elevation Models (PaleoDEMs) for the Phanerozoic. CC BY 4.0.",
    source: input.split("/").pop(),
    features,
  }),
);
console.log(`${points.length} grid points at ${step} degree spacing, ${landPoints} on land, written as ${features.length} strips to ${output}`);
