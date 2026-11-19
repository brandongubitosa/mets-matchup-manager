#!/usr/bin/env node
// Refreshes src/data/payroll.json from FanGraphs RosterResource payroll pages (one per team).
// FanGraphs blocks plain HTTP clients, so pages are fetched through String (usestring.ai).
// Usage: node scripts/refresh-payroll.mjs [season]
// Optional: STRING_API_KEY env var (keyless works within String's free daily allowance: 30 credits).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Default: next season during the offseason (October onward), otherwise the current season.
const season = Number(process.argv[2]) || new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0);
const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'payroll.json');

// FanGraphs RosterResource slug -> MLB Stats API team id.
const TEAMS = {
  angels: 108, diamondbacks: 109, orioles: 110, 'red-sox': 111, cubs: 112, reds: 113, guardians: 114,
  rockies: 115, tigers: 116, astros: 117, royals: 118, dodgers: 119, nationals: 120, mets: 121,
  athletics: 133, pirates: 134, padres: 135, mariners: 136, giants: 137, cardinals: 138, rays: 139,
  rangers: 140, 'blue-jays': 141, twins: 142, phillies: 143, braves: 144, 'white-sox': 145,
  marlins: 146, yankees: 147, brewers: 158,
};

const MIN_SALARY = 780_000; // 2026 league minimum

const headers = { 'Content-Type': 'application/json' };
if (process.env.STRING_API_KEY) headers.Authorization = `Bearer ${process.env.STRING_API_KEY}`;

const fetchTeam = async (slug) => {
  const url = `https://www.fangraphs.com/roster-resource/payroll/${slug}?season=${season}`;
  const res = await fetch('https://request.usestring.ai/v1/fetch', {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, format: 'raw' }),
  });
  if (!res.ok) throw new Error(`${slug}: String fetch failed ${res.status} ${await res.text()}`);
  const html = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`${slug}: __NEXT_DATA__ not found; page layout may have changed`);
  const queries = JSON.parse(match[1])?.props?.pageProps?.dehydratedState?.queries ?? [];
  const data = queries.map((q) => q?.state?.data).find((d) => d && Array.isArray(d.dataContract));
  if (!data) throw new Error(`${slug}: payroll data not found`);

  const overall = (data.dataOverall ?? []).find((o) => o.Season === season) ?? {};
  const players = {};
  for (const c of data.dataContract) {
    const id = c.contractSummary?.MLBAMID;
    const year = (c.contractYears ?? []).find((y) => y.Season === season);
    if (!id || !year) continue;
    // Arbitration years list only a projected salary; pre-arb years list nothing (league minimum).
    const salary = year.Salary || year.ArbSalaryProjection || MIN_SALARY;
    players[id] = {
      name: c.contractSummary.playerName,
      salary,
      cbt: year.TotalCBTHit || year.AAV || salary,
      type: year.Type ?? c.contractSummary.ContractType ?? null,
      estimate: Boolean(year.isEstimate || year.ArbSalaryProjection),
    };
  }
  return {
    payroll: overall.estPayroll ?? overall.TotalPayroll ?? null,
    cbtPayroll: overall.estLuxuryTaxPayroll ?? null,
    players,
  };
};

const teams = {};
for (const [slug, id] of Object.entries(TEAMS)) {
  teams[id] = await fetchTeam(slug);
  console.log(
    `  ${slug.padEnd(13)} payroll $${(teams[id].payroll / 1e6).toFixed(1)}M · CBT $${(teams[id].cbtPayroll / 1e6).toFixed(1)}M · ${Object.keys(teams[id].players).length} contracts`,
  );
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify({ season, source: 'FanGraphs RosterResource', updatedAt: new Date().toISOString(), teams }) + '\n',
);
console.log(`Wrote payroll for ${Object.keys(teams).length} teams to ${outPath}`);
