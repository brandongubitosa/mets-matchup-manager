// Candidate lists and helpers for the Season Builder screen.

import projectionJson from '../data/projectionData.json';
import type { ProjectionData, ProjectionPlayer } from '../types/projection';
import { leagueContextFor, marginalWins, type RosterMoves } from '../projection';
import { cachedHitter, cachedPitcher } from '../projection/team';
import { playerRoles } from '../projection/players';
import { getFreeAgents, type FreeAgent } from './projectionData';

export const seasonData = projectionJson as unknown as ProjectionData;

export type CandidateSource = 'freeAgent' | 'trade' | 'callUp';

export interface Candidate {
  key: string;
  source: CandidateSource;
  mlbId: number | null;
  name: string;
  position: string;
  age: number | null;
  /** Team abbreviation (trade), previous team (free agent) or minor league level (call-up). */
  from: string;
  /** Projected WAR in a full-time role from our model (or FanGraphs for unmatched free agents). */
  war: number | null;
  fangraphsWar?: number | null;
  medianAav?: number | null;
  /** Wins added to the team if acquired now. */
  winsAdded: number;
  /** Signings with no MLB record are added by FanGraphs projected WAR. */
  fixedWar?: { id: string; name: string; war: number; isPitcher: boolean };
}

const teamAbbr = (teamId: number) => seasonData.teams.find((t) => t.id === teamId)?.abbr ?? '';

/**
 * Expected WAR as a regular from our model: hitters over 600 PA (catchers 480), pitchers over a
 * standard role workload, both scaled by projected availability.
 */
export const playerWar = (p: ProjectionPlayer): { war: number; position: string } => {
  const lg = leagueContextFor(seasonData);
  const roles = playerRoles(p);
  const h = roles.hitter ? cachedHitter(p, lg) : null;
  const pit = roles.pitcher ? cachedPitcher(p, lg) : null;
  const hitWar = h ? h.warPer600 * h.availability * (h.position === 'C' ? 0.8 : 1) : 0;
  const pitWar = pit ? pit.warPerRole * pit.availability : 0;
  if (h && pit) return { war: hitWar + pitWar, position: 'TWP' };
  if (pit) return { war: pitWar, position: pit.role };
  return { war: hitWar, position: h!.position };
};

const ageOf = (p: ProjectionPlayer) => {
  if (!p.birthDate) return null;
  return cachedHitter(p, leagueContextFor(seasonData)).age;
};

const isOnTeam = (teamId: number, moves: RosterMoves, playerId: number) =>
  (moves.add ?? []).includes(playerId) ||
  ((seasonData.rosters[teamId] ?? []).includes(playerId) && !(moves.remove ?? []).includes(playerId));

/** Unsigned free agents, best first. Wins added computed for the first `limit`. */
export const freeAgentCandidates = (
  teamId: number,
  moves: RosterMoves,
  opts: { query?: string; pitchers?: boolean; limit?: number } = {},
): Candidate[] => {
  const q = opts.query?.trim().toLowerCase() ?? '';
  const signedHere = new Set((moves.addFixedWar ?? []).map((f) => f.id));
  const list = getFreeAgents({ unsignedOnly: true })
    .filter((fa) => !q || fa.name.toLowerCase().includes(q))
    .filter((fa) => opts.pitchers == null || fa.isPitcher === opts.pitchers)
    .filter((fa) => !(fa.mlbId != null && isOnTeam(teamId, moves, fa.mlbId)) && !signedHere.has(fa.fangraphsId))
    .map((fa) => toFreeAgentCandidate(fa));
  list.sort((a, b) => (b.war ?? -9) - (a.war ?? -9));
  return withWinsAdded(teamId, moves, list.slice(0, opts.limit ?? 40));
};

const toFreeAgentCandidate = (fa: FreeAgent): Candidate => {
  const p = fa.mlbId != null ? seasonData.players[fa.mlbId] : undefined;
  const ours = p ? playerWar(p) : null;
  return {
    key: `fa-${fa.fangraphsId}`,
    source: 'freeAgent',
    mlbId: p ? p.id : null,
    name: fa.name,
    position: fa.position,
    age: fa.age,
    from: fa.prevTeam ?? '',
    war: ours ? ours.war : fa.warProj,
    fangraphsWar: fa.warProj,
    medianAav: fa.medianAav,
    winsAdded: 0,
    fixedWar: p
      ? undefined
      : { id: fa.fangraphsId, name: fa.name, war: fa.warProj ?? 0, isPitcher: fa.isPitcher },
  };
};

/** Players on other teams' 40-man rosters, best first. */
export const tradeCandidates = (
  teamId: number,
  moves: RosterMoves,
  opts: { query?: string; limit?: number } = {},
): Candidate[] => {
  const q = opts.query?.trim().toLowerCase() ?? '';
  const list: Candidate[] = [];
  for (const [otherId, ids] of Object.entries(seasonData.rosters)) {
    if (Number(otherId) === teamId) continue;
    for (const id of ids) {
      const p = seasonData.players[id];
      if (!p || isOnTeam(teamId, moves, id) || (q && !p.name.toLowerCase().includes(q))) continue;
      const { war, position } = playerWar(p);
      list.push({
        key: `tr-${id}`,
        source: 'trade',
        mlbId: id,
        name: p.name,
        position,
        age: ageOf(p),
        from: teamAbbr(Number(otherId)),
        war,
        winsAdded: 0,
      });
    }
  }
  list.sort((a, b) => (b.war ?? -9) - (a.war ?? -9));
  return withWinsAdded(teamId, moves, list.slice(0, opts.limit ?? 40));
};

/** Organization minor leaguers not on the 40-man. */
export const callUpCandidates = (teamId: number, moves: RosterMoves): Candidate[] => {
  const list = (seasonData.callUps[teamId] ?? [])
    .map((id) => seasonData.players[id])
    .filter((p): p is ProjectionPlayer => !!p && !isOnTeam(teamId, moves, p.id))
    .map((p) => {
      const { war, position } = playerWar(p);
      const lastLevel = [...p.milbHitting, ...p.milbPitching].sort((a, b) => b.season - a.season)[0]?.level ?? 'MiLB';
      return {
        key: `cu-${p.id}`,
        source: 'callUp' as const,
        mlbId: p.id,
        name: p.name,
        position,
        age: ageOf(p),
        from: lastLevel,
        war,
        winsAdded: 0,
      };
    });
  list.sort((a, b) => (b.war ?? -9) - (a.war ?? -9));
  return withWinsAdded(teamId, moves, list.slice(0, 40));
};

const withWinsAdded = (teamId: number, moves: RosterMoves, list: Candidate[]): Candidate[] => {
  return list.map((c) => ({
    ...c,
    // Fixed-WAR signings add roughly one win per WAR.
    winsAdded: c.mlbId != null ? marginalWins(seasonData, teamId, moves, c.mlbId) : (c.fixedWar?.war ?? 0),
  }));
};

/** Applies a candidate to a set of moves. */
export const acquire = (moves: RosterMoves, c: Candidate): RosterMoves => {
  if (c.fixedWar) return { ...moves, addFixedWar: [...(moves.addFixedWar ?? []), c.fixedWar] };
  if (c.mlbId == null) return moves;
  return {
    ...moves,
    add: [...(moves.add ?? []).filter((id) => id !== c.mlbId), c.mlbId],
    remove: (moves.remove ?? []).filter((id) => id !== c.mlbId),
  };
};

/** Removes a player from the team: undoes an addition, or releases/trades away a rostered player. */
export const removePlayer = (moves: RosterMoves, playerId: number): RosterMoves => {
  if ((moves.add ?? []).includes(playerId)) {
    return { ...moves, add: moves.add!.filter((id) => id !== playerId) };
  }
  return { ...moves, remove: [...(moves.remove ?? []), playerId] };
};

/** Undoes a removal of an original roster player. */
export const restorePlayer = (moves: RosterMoves, playerId: number): RosterMoves => ({
  ...moves,
  remove: (moves.remove ?? []).filter((id) => id !== playerId),
});

export const removeFixedWar = (moves: RosterMoves, id: string): RosterMoves => ({
  ...moves,
  addFixedWar: (moves.addFixedWar ?? []).filter((f) => f.id !== id),
});

/** Human-readable list of moves for the summary chips. */
export const describeMoves = (moves: RosterMoves) => [
  ...(moves.add ?? []).map((id) => ({ kind: 'add' as const, id: String(id), name: seasonData.players[id]?.name ?? `#${id}` })),
  ...(moves.addFixedWar ?? []).map((f) => ({ kind: 'addFixed' as const, id: f.id ?? f.name, name: f.name })),
  ...(moves.remove ?? []).map((id) => ({ kind: 'remove' as const, id: String(id), name: seasonData.players[id]?.name ?? `#${id}` })),
];
