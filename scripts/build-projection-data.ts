#!/usr/bin/env node
// Builds src/data/projectionData.json: every team's 40-man roster with 3 seasons of MLB stats,
// 2 seasons of MiLB stats, league totals, the regular season schedule, MLB ids for free agents and
// Mets call-up candidates.
// Usage: node scripts/build-projection-data.ts [season]   (run `npm run refresh:fa` first)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSnapshot } from './lib/snapshot.ts';

const season = Number(process.argv[2]) || new Date().getFullYear() + 1;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let freeAgents = [];
try {
  freeAgents = JSON.parse(readFileSync(join(root, 'src/data/freeAgents.json'), 'utf8')).players;
} catch {
  console.warn('  src/data/freeAgents.json not found; run `npm run refresh:fa` to include free agents');
}

console.log(`Building projection data for ${season}`);
const data = await fetchSnapshot(season, { freeAgents, callUpOrgs: [121], log: console.log });

const outPath = join(root, 'src/data/projectionData.json');
mkdirSync(dirname(outPath), { recursive: true });
const json = JSON.stringify(data);
writeFileSync(outPath, json);
console.log(
  `Wrote ${Object.keys(data.players).length} players, ${data.schedule.length} games to ${outPath} ` +
    `(${(json.length / 1024).toFixed(0)} KB)`,
);
