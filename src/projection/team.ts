// Team projection: build a depth chart from a roster, allocate playing time, and turn player
// projections into runs scored, runs allowed, WAR and a projected record.

import type { ProjectionPlayer } from '../types/projection';
import {
  BENCH_PA,
  BULLPEN_IP,
  HITTER_REPLACEMENT_RUNS_PER_600,
  LINEUP_SLOTS,
  ROTATION_IP,
  TEAM_IP,
  TEAM_PA,
} from './constants.ts';
import type { HitterProjection, LeagueContext, PitcherProjection } from './players.ts';
import {
  hitterRunsAboveAverage,
  hitterWar,
  pitcherWar,
  playerRoles,
  projectHitter,
  projectPitcher,
  replacementRa9,
} from './players.ts';

export interface HitterSlot {
  hitter: HitterProjection;
  pos: string;
  pa: number;
  starter: boolean;
  war: number;
}

export interface PitcherSlot {
  pitcher: PitcherProjection;
  role: 'SP' | 'RP';
  ip: number;
  war: number;
}

/** A player added by WAR alone (e.g. an NPB signing with no MLB stats). */
export interface FixedWarPlayer {
  /** Stable key, e.g. the FanGraphs id, so the move can be undone. */
  id?: string;
  name: string;
  war: number;
  isPitcher: boolean;
}

export interface TeamProjection {
  teamId: number;
  lineup: HitterSlot[]; // starters then bench
  rotation: PitcherSlot[];
  bullpen: PitcherSlot[];
  fixedWar: FixedWarPlayer[];
  replacementPa: number;
  replacementSpIp: number;
  replacementRpIp: number;
  runsScored: number;
  runsAllowed: number;
  war: number;
  wins: number;
  losses: number;
  /** Share of PA taken by left-handed hitters (switch hitters count half), for platoon effects. */
  lineupLeftShare: number;
}

// Player projections depend only on the player and league context, so cache them across roster edits.
const hitterCache = new WeakMap<LeagueContext, WeakMap<ProjectionPlayer, HitterProjection>>();
const pitcherCache = new WeakMap<LeagueContext, WeakMap<ProjectionPlayer, PitcherProjection>>();

const memo = <T>(cache: WeakMap<LeagueContext, WeakMap<ProjectionPlayer, T>>, fn: (p: ProjectionPlayer, lg: LeagueContext) => T) =>
  (p: ProjectionPlayer, lg: LeagueContext): T => {
    let byPlayer = cache.get(lg);
    if (!byPlayer) cache.set(lg, (byPlayer = new WeakMap()));
    let v = byPlayer.get(p);
    if (v === undefined) byPlayer.set(p, (v = fn(p, lg)));
    return v;
  };

export const cachedHitter = memo(hitterCache, projectHitter);
export const cachedPitcher = memo(pitcherCache, projectPitcher);

const sumBy = <T>(arr: T[], f: (x: T) => number) => arr.reduce((s, x) => s + f(x), 0);

/** Pythagenpat expected winning percentage. */
export const pythagWinPct = (rs: number, ra: number, games = 162): number => {
  const exp = Math.pow((rs + ra) / games, 0.287);
  return Math.pow(rs, exp) / (Math.pow(rs, exp) + Math.pow(ra, exp));
};

export const buildLineup = (hitters: HitterProjection[], lg: LeagueContext): HitterSlot[] => {
  const pool = [...hitters].sort((a, b) => b.runsPerPa - a.runsPerPa);
  const used = new Set<number>();
  const slots: HitterSlot[] = [];
  let missedPa = 0;

  for (const slot of LINEUP_SLOTS) {
    const pick = pool.find((h) => !used.has(h.playerId) && h.eligible.includes(slot.pos));
    if (!pick) {
      missedPa += slot.pa;
      continue;
    }
    used.add(pick.playerId);
    const pa = slot.pa * pick.availability;
    missedPa += slot.pa - pa;
    slots.push({ hitter: pick, pos: slot.pos, pa, starter: true, war: hitterWar(pick, pa, slot.pos, lg) });
  }

  // Bench: backup catcher first if available, then best remaining bats.
  const remaining = pool.filter((h) => !used.has(h.playerId));
  const backupC = remaining.find((h) => h.eligible.includes('C'));
  const bench = [...(backupC ? [backupC] : []), ...remaining.filter((h) => h !== backupC)].slice(0, BENCH_PA.length);
  const benchCap = 450;
  bench.forEach((h, i) => {
    const base = BENCH_PA[i] * h.availability;
    const share = Math.min(missedPa, Math.max(0, benchCap * h.availability - base) * 0.5);
    missedPa -= share;
    const pa = base + share;
    slots.push({ hitter: h, pos: h.position, pa, starter: false, war: hitterWar(h, pa, h.position, lg) });
  });
  return slots;
};

export const buildStaff = (
  pitchers: PitcherProjection[],
  lg: LeagueContext,
): { rotation: PitcherSlot[]; bullpen: PitcherSlot[] } => {
  const byRa9 = (a: PitcherProjection, b: PitcherProjection) => a.ra9 - b.ra9;
  const starters = pitchers.filter((p) => p.role === 'SP').sort(byRa9);
  const rotation = starters.slice(0, ROTATION_IP.length).map((p, i) => {
    const ip = ROTATION_IP[i] * p.availability;
    return { pitcher: p, role: 'SP' as const, ip, war: pitcherWar(p, ip, 'SP', lg) };
  });
  const inRotation = new Set(rotation.map((s) => s.pitcher.playerId));
  const relievers = pitchers.filter((p) => !inRotation.has(p.playerId)).sort(byRa9);
  const bullpen = relievers.slice(0, BULLPEN_IP.length).map((p, i) => {
    const ip = BULLPEN_IP[i] * (p.role === 'SP' ? Math.max(p.availability, 0.8) : p.availability);
    return { pitcher: p, role: 'RP' as const, ip, war: pitcherWar(p, ip, 'RP', lg) };
  });
  return { rotation, bullpen };
};

export interface TeamInput {
  teamId: number;
  players: ProjectionPlayer[];
  fixedWar?: FixedWarPlayer[];
}

/** Projects a team in isolation (not normalized against the rest of the league). */
export const projectTeam = (input: TeamInput, lg: LeagueContext): TeamProjection => {
  const hitters: HitterProjection[] = [];
  const pitchers: PitcherProjection[] = [];
  for (const p of input.players) {
    const roles = playerRoles(p);
    if (roles.hitter) hitters.push(cachedHitter(p, lg));
    if (roles.pitcher) pitchers.push(cachedPitcher(p, lg));
  }

  const lineup = buildLineup(hitters, lg);
  const { rotation, bullpen } = buildStaff(pitchers, lg);
  const fixedWar = input.fixedWar ?? [];

  const hitterPa = sumBy(lineup, (s) => s.pa);
  const replacementPa = Math.max(0, TEAM_PA - hitterPa);
  const rotationIp = sumBy(rotation, (s) => s.ip);
  const replacementSpIp = Math.max(0, sumBy(ROTATION_IP, (x) => x) - rotationIp);
  const bullpenIp = sumBy(bullpen, (s) => s.ip);
  const replacementRpIp = Math.max(0, TEAM_IP - rotationIp - replacementSpIp - bullpenIp);

  // Runs scored: league average plus batting/baserunning above average (position adj is not offense).
  const fixedHitWar = sumBy(fixedWar.filter((f) => !f.isPitcher), (f) => f.war);
  const fixedPitWar = sumBy(fixedWar.filter((f) => f.isPitcher), (f) => f.war);
  const runsScored =
    lg.runsPerTeam +
    sumBy(lineup, (s) => s.hitter.runsPerPa * s.pa) -
    (HITTER_REPLACEMENT_RUNS_PER_600 * replacementPa) / 600 +
    fixedHitWar * lg.runsPerWin;

  const runsAllowed =
    lg.runsPerTeam +
    sumBy([...rotation, ...bullpen], (s) => ((s.pitcher.ra9 - lg.ra9) * s.ip) / 9) +
    ((replacementRa9('SP', lg) - lg.ra9) * replacementSpIp) / 9 +
    ((replacementRa9('RP', lg) - lg.ra9) * replacementRpIp) / 9 -
    fixedPitWar * lg.runsPerWin;

  const war =
    sumBy(lineup, (s) => s.war) + sumBy([...rotation, ...bullpen], (s) => s.war) + fixedHitWar + fixedPitWar;
  const wins = pythagWinPct(runsScored, runsAllowed) * 162;

  const leftPa = sumBy(lineup, (s) => (s.hitter.bats === 'L' ? s.pa : s.hitter.bats === 'S' ? s.pa / 2 : 0));

  return {
    teamId: input.teamId,
    lineup,
    rotation,
    bullpen,
    fixedWar,
    replacementPa,
    replacementSpIp,
    replacementRpIp,
    runsScored,
    runsAllowed,
    war,
    wins,
    losses: 162 - wins,
    lineupLeftShare: hitterPa > 0 ? leftPa / hitterPa : 0,
  };
};

/**
 * Projects every team, then re-centers runs so the league scores as many runs as it allows and the
 * average team wins 81. Offseason rosters are incomplete, so raw totals drift low.
 */
export const projectLeague = (inputs: TeamInput[], lg: LeagueContext): TeamProjection[] => {
  const raw = inputs.map((i) => projectTeam(i, lg));
  const meanRs = sumBy(raw, (t) => t.runsScored) / raw.length;
  const meanRa = sumBy(raw, (t) => t.runsAllowed) / raw.length;
  return raw.map((t) => {
    const runsScored = t.runsScored - meanRs + lg.runsPerTeam;
    const runsAllowed = t.runsAllowed - meanRa + lg.runsPerTeam;
    const wins = pythagWinPct(runsScored, runsAllowed) * 162;
    return { ...t, runsScored, runsAllowed, wins, losses: 162 - wins };
  });
};

export { hitterRunsAboveAverage };
