// Entry point for season projections: apply roster moves, project every team, return standings.

import type { ProjectionData } from '../types/projection';
import type { FixedWarPlayer, TeamInput, TeamProjection } from './team.ts';
import type { LeagueContext } from './players.ts';
import { buildLeagueContext } from './players.ts';
import { projectLeague, projectTeam } from './team.ts';

export interface RosterMoves {
  /** Players to add to the team (free agents, trade targets, call-ups). Removed from their old team. */
  add?: number[];
  /** Players to remove from the team (traded away, released, non-tendered). */
  remove?: number[];
  /** Players with no MLB stats added by projected WAR (e.g. NPB/KBO signings). */
  addFixedWar?: FixedWarPlayer[];
}

/** Builds team inputs from the snapshot after applying moves for any number of teams. */
export const buildTeamInputs = (data: ProjectionData, moves: Record<number, RosterMoves> = {}): TeamInput[] => {
  const rosters = new Map<number, Set<number>>(data.teams.map((t) => [t.id, new Set(data.rosters[t.id] ?? [])]));
  for (const [teamId, m] of Object.entries(moves)) {
    for (const id of m.add ?? []) {
      for (const set of rosters.values()) set.delete(id); // a player can only be on one team
      rosters.get(Number(teamId))?.add(id);
    }
    for (const id of m.remove ?? []) rosters.get(Number(teamId))?.delete(id);
  }
  return data.teams.map((t) => ({
    teamId: t.id,
    players: [...(rosters.get(t.id) ?? [])].map((id) => data.players[id]).filter(Boolean),
    fixedWar: moves[t.id]?.addFixedWar,
  }));
};

// One league context per snapshot so cached player projections are reused across calls.
const contexts = new WeakMap<ProjectionData, LeagueContext>();
export const leagueContextFor = (data: ProjectionData): LeagueContext => {
  let lg = contexts.get(data);
  if (!lg) contexts.set(data, (lg = buildLeagueContext(data.league, data.season)));
  return lg;
};

export const projectSeason = (data: ProjectionData, moves: Record<number, RosterMoves> = {}): TeamProjection[] =>
  projectLeague(buildTeamInputs(data, moves), leagueContextFor(data));

/**
 * Wins a player would add to a team, projected in isolation (fast enough to rank a whole list).
 * Accounts for who he displaces in the depth chart.
 */
export const marginalWins = (
  data: ProjectionData,
  teamId: number,
  moves: RosterMoves,
  playerId: number,
): number => {
  const lg = leagueContextFor(data);
  const inputs = buildTeamInputs(data, { [teamId]: moves });
  const team = inputs.find((t) => t.teamId === teamId)!;
  const base = projectTeam(team, lg).wins;
  if (team.players.some((p) => p.id === playerId)) return 0;
  const player = data.players[playerId];
  if (!player) return 0;
  return projectTeam({ ...team, players: [...team.players, player] }, lg).wins - base;
};

export type { FixedWarPlayer, TeamProjection };

export { buildLeagueContext } from './players.ts';
export { simulateSeason, teamGameOutlook, summarizeOutlook, SIM_DEFAULTS } from './simulate.ts';
export type { SeasonSimResult, TeamSimResult, GameOutlook, SimOptions } from './simulate.ts';
