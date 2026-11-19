// Typed access to the bundled projection snapshot (built by scripts/build-projection-data.ts)
// and free agent list (built by scripts/refresh-free-agents.mjs).

import projectionJson from '../data/projectionData.json';
import freeAgentsJson from '../data/freeAgents.json';
import type { ProjectionData, ProjectionPlayer, ProjectionTeam, ScheduledGame } from '../types/projection';

export const METS_TEAM_ID = 121;

export interface FreeAgent {
  fangraphsId: string;
  mlbId: number | null;
  name: string;
  position: string;
  isPitcher: boolean;
  bats: string | null;
  throws: string | null;
  age: number | null;
  prevTeam: string | null;
  warPrev: number | null;
  warProj: number | null;
  medianYears: number | null;
  medianAav: number | null;
  signed: boolean;
  signingTeam: string | null;
}

const data = projectionJson as unknown as ProjectionData;

export const projectionSeason = data.season;
export const projectionGeneratedAt = data.generatedAt;

export const getTeams = (): ProjectionTeam[] => data.teams;

export const getTeam = (teamId: number): ProjectionTeam | undefined => data.teams.find((t) => t.id === teamId);

export const getPlayer = (playerId: number): ProjectionPlayer | undefined => data.players[playerId];

export const getRoster = (teamId: number): ProjectionPlayer[] =>
  (data.rosters[teamId] ?? []).map((id) => data.players[id]).filter((p): p is ProjectionPlayer => !!p);

export const getSchedule = (teamId?: number): ScheduledGame[] =>
  teamId == null ? data.schedule : data.schedule.filter((g) => g.home === teamId || g.away === teamId);

export const getLeagueTotals = () => data.league;

export const getFreeAgents = (opts: { unsignedOnly?: boolean } = {}): FreeAgent[] =>
  (freeAgentsJson.players as Omit<FreeAgent, 'mlbId'>[])
    .filter((fa) => !opts.unsignedOnly || !fa.signed)
    .map((fa) => ({ ...fa, mlbId: data.freeAgentIds[fa.fangraphsId] ?? null }));

/** Stats history for a free agent, if matched to an MLB id. */
export const getFreeAgentPlayer = (fa: FreeAgent): ProjectionPlayer | undefined =>
  fa.mlbId != null ? data.players[fa.mlbId] : undefined;

/** Searches all players in the snapshot (40-man rosters + matched free agents) by name. */
export const searchProjectionPlayers = (query: string, limit = 20): ProjectionPlayer[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return Object.values(data.players)
    .filter((p) => p.name.toLowerCase().includes(q))
    .slice(0, limit);
};

/** Team id each player is on (40-man), for trade targets. */
export const getPlayerTeamId = (playerId: number): number | undefined => {
  for (const [teamId, ids] of Object.entries(data.rosters)) if (ids.includes(playerId)) return Number(teamId);
  return undefined;
};
