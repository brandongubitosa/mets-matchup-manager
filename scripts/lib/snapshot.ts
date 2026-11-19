// Fetches a projection snapshot from the MLB Stats API. Used by build-projection-data.ts (current
// offseason) and backtest.ts (past seasons as of Opening Day).

import { buildLeagueTotals, buildPlayer, matchFreeAgents } from '../../src/projection/buildData.ts';
import type { ProjectionData, ProjectionPlayer, ProjectionTeam, ScheduledGame } from '../../src/types/projection.ts';

const API = 'https://statsapi.mlb.com/api/v1';

export const get = async (path: string, attempt = 1): Promise<any> => {
  const res = await fetch(`${API}${path}`);
  if (res.ok) return res.json();
  if (attempt < 4 && res.status >= 500) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return get(path, attempt + 1);
  }
  throw new Error(`${res.status} ${path}`);
};

const MLB_HYDRATE = `stats(type=yearByYear,group=[hitting,pitching,fielding])`;
const MILB_HYDRATE = `stats(type=yearByYear,group=[hitting,pitching],leagueListId=milb_all)`;

/** Runs fn over items with limited concurrency to stay polite to the API. */
export const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
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

export interface SnapshotOptions {
  /** Roster date (YYYY-MM-DD). Omit for the current offseason 40-man (filed under the prior season). */
  rosterDate?: string;
  /** Free agents to match to MLB ids (from src/data/freeAgents.json). */
  freeAgents?: { fangraphsId: string; name: string; age: number | null }[];
  /** MLB orgs whose upper-minors players to include as call-up candidates. */
  callUpOrgs?: number[];
  log?: (msg: string) => void;
}

export const fetchSnapshot = async (season: number, opts: SnapshotOptions = {}): Promise<ProjectionData> => {
  const log = opts.log ?? (() => undefined);
  const mlbSeasons = [season - 3, season - 2, season - 1];
  const milbSeasons = [season - 2, season - 1];
  const players: Record<string, ProjectionPlayer> = {};

  // Builds players for ids not yet in the snapshot, 50 at a time.
  const addPeople = async (ids: number[]) => {
    const missing = [...new Set(ids)].filter((id) => !players[id]);
    await mapLimit(chunk(missing, 50), 3, async (batch) => {
      const q = `personIds=${batch.join(',')}`;
      const [mlb, milb] = await Promise.all([
        get(`/people?${q}&hydrate=${MLB_HYDRATE}`),
        get(`/people?${q}&hydrate=${MILB_HYDRATE}`),
      ]);
      const milbById = new Map<number, any>(milb.people.map((p: any) => [p.id, p]));
      for (const p of mlb.people) players[p.id] = buildPlayer(p, milbById.get(p.id), mlbSeasons, milbSeasons);
    });
  };

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

  // 40-man rosters (two calls per team: MLB and MiLB stats hydrated)
  const rosters: Record<string, number[]> = {};
  const rosterQuery = opts.rosterDate ? `date=${opts.rosterDate}` : `season=${season - 1}`;
  await mapLimit(teams, 5, async (team) => {
    const base = `/teams/${team.id}/roster?rosterType=40Man&${rosterQuery}`;
    const [mlb, milb] = await Promise.all([
      get(`${base}&hydrate=person(${MLB_HYDRATE})`),
      get(`${base}&hydrate=person(${MILB_HYDRATE})`),
    ]);
    const milbById = new Map<number, any>(milb.roster.map((e: any) => [e.person.id, e.person]));
    rosters[team.id] = mlb.roster.map((e: any) => {
      players[e.person.id] = buildPlayer(e.person, milbById.get(e.person.id), mlbSeasons, milbSeasons);
      return e.person.id;
    });
    log(`  ${team.abbr}: ${rosters[team.id].length} players`);
  });

  // Call-up candidates: upper-minors (AAA, AA, High-A) players not on the 40-man.
  const callUps: Record<string, number[]> = {};
  for (const orgId of opts.callUpOrgs ?? []) {
    const aff = await get(`/teams/affiliates?teamIds=${orgId}&season=${season - 1}`);
    const clubs = aff.teams.filter((t: any) => [11, 12, 13].includes(t.sport?.id)).map((t: any) => t.id);
    const ids = new Set<number>();
    for (const club of clubs) {
      const r = await get(`/teams/${club}/roster?rosterType=active&season=${season - 1}`);
      for (const e of r.roster ?? []) if (!players[e.person.id]) ids.add(e.person.id);
    }
    await addPeople([...ids]);
    callUps[orgId] = [...ids];
    log(`  Call-up candidates for ${orgId}: ${ids.size}`);
  }

  const league = await mapLimit(mlbSeasons, 3, async (s) => {
    const res = await get(`/teams/stats?season=${s}&group=hitting,pitching&stats=season&sportIds=1`);
    const group = (name: string) => res.stats.find((g: any) => g.group.displayName === name)?.splits ?? [];
    return buildLeagueTotals(s, group('hitting'), group('pitching'));
  });

  const scheduleRes = await get(`/schedule?sportId=1&season=${season}&gameType=R`);
  const schedule: ScheduledGame[] = scheduleRes.dates.flatMap((d: any) =>
    d.games
      .filter((g: any) => g.resumedFrom == null) // suspended games appear twice
      .map((g: any) => ({ gamePk: g.gamePk, date: d.date, home: g.teams.home.team.id, away: g.teams.away.team.id })),
  );

  let freeAgentIds: Record<string, number> = {};
  if (opts.freeAgents?.length) {
    const pool = (await Promise.all(mlbSeasons.map((s) => get(`/sports/1/players?season=${s}`)))).flatMap(
      (r) => r.people,
    );
    freeAgentIds = matchFreeAgents(opts.freeAgents, pool);
    await addPeople(Object.values(freeAgentIds));
    log(`  Free agents: matched ${Object.keys(freeAgentIds).length} of ${opts.freeAgents.length}`);
  }

  return {
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
};
