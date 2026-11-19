#!/usr/bin/env node
// Backtests the projection engine: projects past seasons from data available on Opening Day (prior
// 3 seasons of stats, Opening Day 40-man rosters) and compares to actual records. Also checks
// player-level bias for minor league translations. Optionally grid-searches TUNING.
// Usage: node scripts/backtest.ts [--search]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSnapshot, get, mapLimit } from './lib/snapshot.ts';
import { TUNING } from '../src/projection/constants.ts';
import { buildLeagueContext, playerRoles, projectHitter, projectPitcher, runValue } from '../src/projection/players.ts';
import { projectLeague } from '../src/projection/team.ts';
import { buildLeagueTotals, slimHitting, slimPitching } from '../src/projection/buildData.ts';
import type { LeagueTotals, ProjectionData } from '../src/types/projection.ts';

const SEASONS = [2024, 2025, 2026];
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, 'node_modules/.cache/mets-backtest');
mkdirSync(cacheDir, { recursive: true });

const cached = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  const file = join(cacheDir, `${name}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const value = await fn();
  writeFileSync(file, JSON.stringify(value));
  return value;
};

interface SeasonCase {
  data: ProjectionData;
  actualWins: Record<number, number>;
  /** Actual season stat lines for players, for player-level checks. */
  actual: Record<number, { hitting?: any; pitching?: any }>;
  actualLeague: LeagueTotals;
}

const loadSeason = async (season: number): Promise<SeasonCase> => {
  const data = await cached(`snapshot-${season}`, async () => {
    const sched = await get(`/schedule?sportId=1&season=${season}&gameType=R`);
    // First date with a full slate (skips international openers like the Tokyo Series).
    const opener = sched.dates.find((d: any) => d.games.length >= 8) ?? sched.dates[0];
    const first = new Date(`${opener.date}T12:00:00Z`);
    first.setUTCDate(first.getUTCDate() - 1);
    const rosterDate = first.toISOString().slice(0, 10);
    console.log(`Fetching ${season} snapshot (rosters as of ${rosterDate})…`);
    return fetchSnapshot(season, { rosterDate });
  });
  const actualWins = await cached(`standings-${season}`, async () => {
    const res = await get(`/standings?leagueId=103,104&season=${season}`);
    return Object.fromEntries(res.records.flatMap((r: any) => r.teamRecords.map((t: any) => [t.team.id, t.wins])));
  });
  const actualLeague = await cached(`league-${season}`, async () => {
    const res = await get(`/teams/stats?season=${season}&group=hitting,pitching&stats=season&sportIds=1`);
    const group = (name: string) => res.stats.find((g: any) => g.group.displayName === name)?.splits ?? [];
    return buildLeagueTotals(season, group('hitting'), group('pitching'));
  });
  const actual = await cached(`actual-${season}`, async () => {
    const ids = Object.keys(data.players).map(Number);
    const out: Record<number, any> = {};
    const batches = Array.from({ length: Math.ceil(ids.length / 50) }, (_, i) => ids.slice(i * 50, i * 50 + 50));
    await mapLimit(batches, 3, async (batch) => {
      const res = await get(
        `/people?personIds=${batch.join(',')}&hydrate=stats(type=season,season=${season},group=[hitting,pitching])`,
      );
      for (const p of res.people) {
        const g = (name: string) =>
          p.stats?.find((s: any) => s.group.displayName === name)?.splits?.find((sp: any) => !sp.team) ??
          p.stats?.find((s: any) => s.group.displayName === name)?.splits?.[0];
        const h = g('hitting');
        const pi = g('pitching');
        out[p.id] = {
          hitting: h ? slimHitting(season, h.stat) : undefined,
          pitching: pi ? slimPitching(season, pi.stat) : undefined,
        };
      }
    });
    return out;
  });
  return { data, actualWins, actual, actualLeague };
};

// ---------- Team-level evaluation ----------

const evaluateTeams = (cases: SeasonCase[]) => {
  const pairs: { proj: number; actual: number }[] = [];
  for (const c of cases) {
    const lg = buildLeagueContext(c.data.league, c.data.season);
    const inputs = c.data.teams.map((t) => ({
      teamId: t.id,
      players: (c.data.rosters[t.id] ?? []).map((id) => c.data.players[id]).filter(Boolean),
    }));
    for (const t of projectLeague(inputs, lg)) pairs.push({ proj: t.wins, actual: c.actualWins[t.teamId] });
  }
  const n = pairs.length;
  const rmse = Math.sqrt(pairs.reduce((s, p) => s + (p.proj - p.actual) ** 2, 0) / n);
  const naive = Math.sqrt(pairs.reduce((s, p) => s + (81 - p.actual) ** 2, 0) / n);
  const mean = (f: (p: (typeof pairs)[0]) => number) => pairs.reduce((s, p) => s + f(p), 0) / n;
  const mp = mean((p) => p.proj);
  const ma = mean((p) => p.actual);
  const cov = mean((p) => (p.proj - mp) * (p.actual - ma));
  const vp = mean((p) => (p.proj - mp) ** 2);
  const va = mean((p) => (p.actual - ma) ** 2);
  return {
    rmse,
    naive,
    r: cov / Math.sqrt(vp * va),
    slope: cov / vp, // > 1 means projections are too compressed
    projSd: Math.sqrt(vp),
    actualSd: Math.sqrt(va),
  };
};

// ---------- Player-level bias (MLB vets vs minor-league-driven projections) ----------

const evaluatePlayers = (cases: SeasonCase[]) => {
  const buckets: Record<string, { n: number; err: number; w: number }> = {};
  const add = (key: string, err: number, w: number) => {
    const b = (buckets[key] ??= { n: 0, err: 0, w: 0 });
    b.n++;
    b.err += err * w;
    b.w += w;
  };
  for (const c of cases) {
    const lg = buildLeagueContext(c.data.league, c.data.season);
    const actualLg = buildLeagueContext([c.actualLeague], c.data.season);
    for (const p of Object.values(c.data.players)) {
      const act = c.actual[p.id];
      if (!act) continue;
      const roles = playerRoles(p);
      const mlbPa = p.hitting.reduce((s, h) => s + h.pa, 0);
      const mlbBf = p.pitching.reduce((s, x) => s + x.bf, 0);
      if (roles.hitter && act.hitting && act.hitting.pa >= 150) {
        const proj = projectHitter(p, lg);
        const a = act.hitting;
        const rates = {
          single: (a.h - a.d - a.t - a.hr) / a.pa,
          double: a.d / a.pa,
          triple: a.t / a.pa,
          hr: a.hr / a.pa,
          ubb: (a.bb - a.ibb) / a.pa,
          hbp: a.hbp / a.pa,
          so: 0,
          sb: 0,
          cs: 0,
        };
        const actualRuns = runValue(rates) - actualLg.runValuePerPa;
        const projRuns = runValue(proj.rates) - lg.runValuePerPa;
        add(mlbPa < 150 ? 'hitters: MiLB-driven' : 'hitters: MLB vets', (projRuns - actualRuns) * 600, a.pa);
      }
      if (roles.pitcher && act.pitching && act.pitching.bf >= 120) {
        const proj = projectPitcher(p, lg);
        const a = act.pitching;
        const ip = a.outs / 3;
        const fipRa9 = (13 * a.hr + 3 * (a.bb + a.hbp - a.ibb) - 2 * a.so) / ip + actualLg.fipConstant;
        add(mlbBf < 150 ? 'pitchers: MiLB-driven' : 'pitchers: MLB vets', proj.ra9 - fipRa9, a.bf);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([k, b]) => [k, { n: b.n, bias: +(b.err / b.w).toFixed(3) }]),
  );
};

const fmt = (e: ReturnType<typeof evaluateTeams>) =>
  `RMSE ${e.rmse.toFixed(2)} (naive 81: ${e.naive.toFixed(2)}) · r ${e.r.toFixed(3)} · slope ${e.slope.toFixed(2)} · ` +
  `proj SD ${e.projSd.toFixed(1)} vs actual SD ${e.actualSd.toFixed(1)}`;

const setArg = process.argv.indexOf('--set');
if (setArg > 0) Object.assign(TUNING, JSON.parse(process.argv[setArg + 1]));

const cases = await Promise.all(SEASONS.map(loadSeason));
console.log(`Current TUNING: ${JSON.stringify(TUNING)}`);
console.log(`Teams:   ${fmt(evaluateTeams(cases))}`);
for (const c of cases) console.log(`  ${c.data.season}: ${fmt(evaluateTeams([c]))}`);
console.log('Players (bias = projected minus actual; hitters in runs/600 PA, pitchers in RA9; + = too optimistic for hitters, too pessimistic for pitchers):');
console.log(evaluatePlayers(cases));

if (process.argv.includes('--search')) {
  const base = structuredClone(TUNING);
  const grid: Record<string, number[]> = {
    hitterRegressionPa: [1200, 1600, 2000, 2600],
    pitcherRegressionBf: [150, 250, 400, 600],
    spReplacementRa9: [1.1, 1.2, 1.3],
    rpReplacementRa9: [1.1, 1.2, 1.3],
    oldDecline: [0.003, 0.006],
    youngGain: [0.003, 0.006],
  };
  const keys = Object.keys(grid);
  let best = { rmse: Infinity, params: {} as Record<string, number> };
  const walk = (i: number, params: Record<string, number>) => {
    if (i === keys.length) {
      Object.assign(TUNING, params);
      const e = evaluateTeams(cases);
      if (e.rmse < best.rmse) best = { rmse: e.rmse, params: { ...params } };
      return;
    }
    for (const v of grid[keys[i]]) walk(i + 1, { ...params, [keys[i]]: v });
  };
  walk(0, {});
  Object.assign(TUNING, base, best.params);
  console.log(`\nBest grid point: ${JSON.stringify(best.params)}`);
  console.log(`Teams:   ${fmt(evaluateTeams(cases))}`);
  for (const c of cases) console.log(`  ${c.data.season}: ${fmt(evaluateTeams([c]))}`);
}
