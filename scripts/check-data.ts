// Data integrity check. Run with: node scripts/check-data.ts  (Node 22.18+)
// Fails if any feature breaks the evidence-tier rules.

import { features, featureById } from '../src/data/features.ts';
import { sources, sourceById } from '../src/data/sources.ts';
import { scenes } from '../src/data/scenes.ts';
import { floodYearAM, patriarchYears, floodEvents, floodDay } from '../src/data/chronology.ts';

const errors: string[] = [];
const warnings: string[] = [];
const tierRank = { text: 0, scholarly: 1, model: 2 } as const;

for (const f of features) {
  if (f.verses.length === 0) errors.push(`${f.id}: no verses`);
  if (!f.note.trim()) errors.push(`${f.id}: no note`);
  if (f.tier !== 'text' && f.sources.length === 0) errors.push(`${f.id}: tier ${f.tier} needs a source`);
  if (f.tier === 'text' && f.confidence === 'proposed') errors.push(`${f.id}: text tier cannot be 'proposed'`);
  if (f.tier !== 'text' && f.confidence === 'stated') errors.push(`${f.id}: only the text tier can be 'stated'`);
  for (const s of f.sources) {
    const src = sourceById.get(s);
    if (!src) errors.push(`${f.id}: unknown source ${s}`);
    else if (src.status !== 'opened') warnings.push(`${f.id}: source ${s} is ${src.status}`);
  }
  for (const a of f.alternatives ?? []) {
    if (!featureById.has(a)) errors.push(`${f.id}: unknown alternative ${a}`);
  }
  if (f.noPin && f.approxCenter) errors.push(`${f.id}: noPin feature has coordinates`);
}

for (const sc of scenes) {
  if (sc.verses.length === 0) errors.push(`scene ${sc.id}: no verses`);
  let highest = 0;
  for (const id of sc.features) {
    const f = featureById.get(id);
    if (!f) { errors.push(`scene ${sc.id}: unknown feature ${id}`); continue; }
    highest = Math.max(highest, tierRank[f.tier]);
  }
  if (sc.features.length > 0 && tierRank[sc.tier] < highest) {
    errors.push(`scene ${sc.id}: labeled ${sc.tier} but shows a higher-tier feature`);
  }
}

console.log('Flood year (AM):  Masoretic', floodYearAM('masoretic'), ' Septuagint', floodYearAM('septuagint'));
const mt = patriarchYears('masoretic');
console.log('Masoretic births:', mt.map((p) => `${p.name} ${p.bornAM}`).join(', '));
console.log('Flood calendar:');
for (const e of floodEvents) {
  if (e.date) console.log(`  day ${String(floodDay(e.date)).padStart(3)}  ${e.verses.padEnd(10)} ${e.event}`);
}
console.log(`\n${features.length} features, ${scenes.length} scenes, ${sources.length} sources`);
console.log(`${warnings.length} citations rest on sources not yet read or cleared:`);
for (const w of warnings) console.log('  -', w);

if (floodYearAM('masoretic') !== 1656) errors.push('Masoretic flood year should be 1656');
if (errors.length) {
  console.error('\nFAILED:');
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log('\nAll tier rules pass.');
