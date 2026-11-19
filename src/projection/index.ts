// Entry point for season projections: apply roster moves, project every team, return standings.

import type { ProjectionData } from '../types/projection';
import type { FixedWarPlayer, TeamInput, TeamProjection } from './team.ts';
import { buildLeagueContext } from './players.ts';
import { projectLeague } from './team.ts';

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

export const projectSeason = (data: ProjectionData, moves: Record<number, RosterMoves> = {}): TeamProjection[] =>
  projectLeague(buildTeamInputs(data, moves), buildLeagueContext(data.league, data.season));

export type { FixedWarPlayer, TeamProjection };
