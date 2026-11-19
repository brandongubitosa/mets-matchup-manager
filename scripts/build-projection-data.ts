#!/usr/bin/env node
// Builds src/data/projectionData.json: every team's 40-man roster with 3 seasons of MLB stats,
// 2 seasons of MiLB stats, league totals, the regular season schedule, and MLB ids for free agents.
// Usage: node scripts/build-projection-data.ts [season]   (run `npm run refresh:fa` first)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLeagueTotals, buildPlayer, matchFreeAgents } from '../src/projection/buildData.ts';
import type { ProjectionData, ProjectionPlayer, ProjectionTeam, ScheduledGame } from '../src/types/projection.ts';

const API = 'https://statsapi.mlb.com/api/v1';
const season = Number(process.argv[2]) || new Date().getFullYear() + 1;
const mlbSeasons = [season - 3, season - 2, season - 1];
const milbSeasons = [season - 2, season - 1];
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const get = async (path: string, attempt = 1): Promise<any> => {
  const res = await fetch(`${API}${path}`);
  if (res.ok) return res.json();
  if (attempt < 4 && res.status >= 500) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return get(path, attempt + 1);
  }
  throw new Error(`${res.status} ${path}`);
};

const statsHydrate = (extra: string) =>
  `stats(type=yearByYear,group=[hitting,pitching,fielding]${extra})`;
const MLB_HYDRATE = statsHydrate('');
const MILB_HYDRATE = `stats(type=yearByYear,group=[hitting,pitching],leagueListId=milb_all)`;

/** Runs fn over items with limited concurrency to stay polite to the API. */
const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
};

const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

console.log(`Building projection data for ${season} (MLB ${mlbSeasons.join(', ')}; MiLB ${milbSeasons.join(', ')})`);

// Teams
const teamsRes = await get(`/teams?sportId=1&season=${season}`);
const teams: ProjectionTeam[] = teamsRes.teams
  .map((t: any) => ({
    id: t.id,
    abbr: t.abbreviation,
    name: t.name,
    league: t.league?.name ?? '',
    division: t.division?.name ?? '',
  }))
  .sort((a: ProjectionTeam, b: ProjectionTeam) => a.abbr.localeCompare(b.abbr));

// 40-man rosters with MLB and MiLB stats (two calls per team)
const players: Record<string, ProjectionPlayer> = {};
const rosters: Record<string, number[]> = {};
const rosterSeason = season - 1; // current offseason 40-man is filed under the prior season
await mapLimit(teams, 5, async (team) => {
  const base = `/teams/${team.id}/roster?rosterType=40Man&season=${rosterSeason}`;
  const [mlb, milb] = await Promise.all([
    get(`${base}&hydrate=person(${MLB_HYDRATE})`),
    get(`${base}&hydrate=person(${MILB_HYDRATE})`),
  ]);
  const milbById = new Map<number, any>(milb.roster.map((e: any) => [e.person.id, e.person]));
  rosters[team.id] = mlb.roster.map((e: any) => {
    players[e.person.id] = buildPlayer(e.person, milbById.get(e.person.id), mlbSeasons, milbSeasons);
    return e.person.id;
  });
  console.log(`  ${team.abbr}: ${rosters[team.id].length} players`);
});

// Call-up candidates: Mets upper-minors players (AAA, AA, High-A) who are not on the 40-man.
const CALLUP_ORGS = [121];
const callUps: Record<string, number[]> = {};
await mapLimit(CALLUP_ORGS, 1, async (orgId) => {
  const aff = await get(`/teams/affiliates?teamIds=${orgId}&season=${rosterSeason}`);
  const clubs = aff.teams.filter((t: any) => [11, 12, 13].includes(t.sport?.id)).map((t: any) => t.id);
  const ids = new Set<number>();
  for (const club of clubs) {
    const r = await get(`/teams/${club}/roster?rosterType=active&season=${rosterSeason}`);
    for (const e of r.roster ?? []) if (!players[e.person.id]) ids.add(e.person.id);
  }
  const list = [...ids];
  await mapLimit(chunk(list, 50), 3, async (batch) => {
    const q = `personIds=${batch.join(',')}`;
    const [mlb, milb] = await Promise.all([
      get(`/people?${q}&hydrate=${MLB_HYDRATE}`),
      get(`/people?${q}&hydrate=${MILB_HYDRATE}`),
    ]);
    const milbById = new Map<number, any>(milb.people.map((p: any) => [p.id, p]));
    for (const p of mlb.people) players[p.id] = buildPlayer(p, milbById.get(p.id), mlbSeasons, milbSeasons);
  });
  callUps[orgId] = list;
  console.log(`  Call-up candidates for ${orgId}: ${list.length}`);
});

// League totals per season
const league = await mapLimit(mlbSeasons, 3, async (s) => {
  const res = await get(`/teams/stats?season=${s}&group=hitting,pitching&stats=season&sportIds=1`);
  const group = (name: string) => res.stats.find((g: any) => g.group.displayName === name)?.splits ?? [];
  return buildLeagueTotals(s, group('hitting'), group('pitching'));
});

// Regular season schedule
const scheduleRes = await get(`/schedule?sportId=1&season=${season}&gameType=R`);
const schedule: ScheduledGame[] = scheduleRes.dates.flatMap((d: any) =>
  d.games.map((g: any) => ({
    gamePk: g.gamePk,
    date: d.date,
    home: g.teams.home.team.id,
    away: g.teams.away.team.id,
  })),
);

// Free agents: match FanGraphs names to MLB ids, then fetch stats for those not on a 40-man.
let freeAgentIds: Record<string, number> = {};
try {
  const fa = JSON.parse(readFileSync(join(root, 'src/data/freeAgents.json'), 'utf8'));
  const pool = (await Promise.all(mlbSeasons.map((s) => get(`/sports/1/players?season=${s}`)))).flatMap(
    (r) => r.people,
  );
  freeAgentIds = matchFreeAgents(fa.players, pool);
  const missing = [...new Set(Object.values(freeAgentIds))].filter((id) => !players[id]);
  await mapLimit(chunk(missing, 50), 3, async (ids) => {
    const q = `personIds=${ids.join(',')}`;
    const [mlb, milb] = await Promise.all([
      get(`/people?${q}&hydrate=${MLB_HYDRATE}`),
      get(`/people?${q}&hydrate=${MILB_HYDRATE}`),
    ]);
    const milbById = new Map<number, any>(milb.people.map((p: any) => [p.id, p]));
    for (const p of mlb.people) players[p.id] = buildPlayer(p, milbById.get(p.id), mlbSeasons, milbSeasons);
  });
  console.log(`  Free agents: matched ${Object.keys(freeAgentIds).length} of ${fa.players.length}`);
} catch (err) {
  console.warn(`  Skipping free agent matching: ${(err as Error).message}`);
}

const data: ProjectionData = {
  season,
  statSeasons: mlbSeasons,
  generatedAt: new Date().toISOString(),
  teams,
  rosters,
  players,
  league,
  schedule,
  freeAgentIds,
  callUps,
};

const outPath = join(root, 'src/data/projectionData.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(data));
console.log(
  `Wrote ${Object.keys(players).length} players, ${schedule.length} games to ${outPath} ` +
    `(${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`,
);
