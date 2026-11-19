#!/usr/bin/env node
// Refreshes src/data/freeAgents.json from the FanGraphs RosterResource free agent tracker.
// FanGraphs blocks plain HTTP clients, so the page is fetched through String (usestring.ai).
// Usage: node scripts/refresh-free-agents.mjs [season]
// Optional: STRING_API_KEY env var (keyless works within String's free daily allowance).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const season = Number(process.argv[2]) || new Date().getFullYear() + 1;
const sourceUrl = `https://www.fangraphs.com/roster-resource/free-agent-tracker?season=${season}`;
const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'freeAgents.json');

const headers = { 'Content-Type': 'application/json' };
if (process.env.STRING_API_KEY) headers.Authorization = `Bearer ${process.env.STRING_API_KEY}`;

const res = await fetch('https://request.usestring.ai/v1/fetch', {
  method: 'POST',
  headers,
  body: JSON.stringify({ url: sourceUrl, format: 'raw' }),
});
if (!res.ok) throw new Error(`String fetch failed: ${res.status} ${await res.text()}`);
const html = await res.text();

const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (!match) throw new Error('__NEXT_DATA__ not found; page layout may have changed');
const queries = JSON.parse(match[1])?.props?.pageProps?.dehydratedState?.queries ?? [];
const rows = queries
  .map((q) => q?.state?.data)
  .find((d) => Array.isArray(d) && d[0] && 'war_proj' in d[0]);
if (!rows) throw new Error('Free agent rows not found in page data');

const round = (n, d = 1) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

const players = rows.map((r) => ({
  fangraphsId: r.playerId,
  name: r.playerName,
  position: r.position,
  isPitcher: /P$/.test(r.position ?? ''),
  bats: r.Bats,
  throws: r.Throws,
  age: r.age,
  prevTeam: r.team_prev,
  serviceTime: r.servicetime,
  warPrev: round(r.war_prev),
  warProj: round(r.war_proj),
  qualifyingOffer: r.qo ?? null,
  medianYears: r.med_years ?? null,
  medianAav: r.med_aav ?? null,
  signed: Boolean(r.team_new),
  signingTeam: r.team_new_shortname ?? r.team_new ?? null,
  contractYears: r.contract_years ?? r.YearsTotal ?? null,
  contractTotal: r.ContractTotal ?? r.fullvalue ?? null,
  contractAav: r.aav ?? null,
}));

players.sort((a, b) => (b.warProj ?? -99) - (a.warProj ?? -99));

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify({ season, source: sourceUrl, updatedAt: new Date().toISOString(), players }, null, 2) + '\n',
);
console.log(`Wrote ${players.length} free agents (${players.filter((p) => p.signed).length} signed) to ${outPath}`);
