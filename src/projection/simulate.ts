// Game-by-game season simulation. Each game's win probability comes from the matchup: team offense
// vs. the opposing starter (sampled by rotation share) and bullpen, home field, and platoon edge.

import type { ProjectionTeam, ScheduledGame } from '../types/projection';
import type { LeagueContext } from './players.ts';
import type { TeamProjection } from './team.ts';
import { replacementRa9 } from './players.ts';

export const SIM_DEFAULTS = {
  sims: 10000,
  /** Share of a game's innings pitched by the starter. */
  starterShare: 0.58,
  /** Runs multiplier for the home team (and its inverse for the visitor). */
  homeEdge: 1.03,
  /** Run boost per unit of lineup share holding the platoon advantage, relative to 50/50. */
  platoonEdge: 0.06,
  /**
   * Standard deviation of true-talent uncertainty, as a share of runs scored/allowed per season.
   * Calibrated so simulated spread matches backtested projection error (~9.3 wins RMSE).
   */
  talentSd: 0.065,
  playoffSpotsPerLeague: 6,
  seed: 20270401,
};

export type SimOptions = Partial<typeof SIM_DEFAULTS>;

export interface StarterOption {
  name: string;
  throws: string | null;
  ra9: number;
  share: number; // share of team starts
}

/** Per-team inputs the simulator needs, derived from a TeamProjection. */
export interface TeamRating {
  teamId: number;
  runsPerGame: number;
  /** Runs allowed per game, used to scale starter/bullpen mix back to the team's projection. */
  allowedPerGame: number;
  starters: StarterOption[];
  bullpenRa9: number;
  /** Team-average game RA9 (starter mix + bullpen), the denominator for per-game scaling. */
  avgGameRa9: number;
  lineupLeftShare: number;
  /** League runs per team per game, the baseline for combining offense and run prevention. */
  leagueRunsPerGame: number;
}

export const buildTeamRating = (t: TeamProjection, lg: LeagueContext, starterShare: number): TeamRating => {
  const starters: StarterOption[] = t.rotation.map((s) => ({
    name: s.pitcher.name,
    throws: s.pitcher.throws,
    ra9: s.pitcher.ra9,
    share: s.ip,
  }));
  if (t.replacementSpIp > 0) {
    starters.push({ name: 'Replacement SP', throws: 'R', ra9: replacementRa9('SP', lg), share: t.replacementSpIp });
  }
  const totalShare = starters.reduce((s, x) => s + x.share, 0) || 1;
  starters.forEach((s) => (s.share /= totalShare));

  const penIp = t.bullpen.reduce((s, x) => s + x.ip, 0) + t.replacementRpIp;
  const penRuns =
    t.bullpen.reduce((s, x) => s + x.pitcher.ra9 * x.ip, 0) + replacementRa9('RP', lg) * t.replacementRpIp;
  const bullpenRa9 = penIp > 0 ? penRuns / penIp : lg.ra9;
  const avgStarterRa9 = starters.reduce((s, x) => s + x.ra9 * x.share, 0);

  return {
    teamId: t.teamId,
    runsPerGame: t.runsScored / 162,
    allowedPerGame: t.runsAllowed / 162,
    starters,
    bullpenRa9,
    avgGameRa9: starterShare * avgStarterRa9 + (1 - starterShare) * bullpenRa9,
    lineupLeftShare: t.lineupLeftShare,
    leagueRunsPerGame: lg.runsPerTeam / 162,
  };
};

/** Win probability for team A given expected runs for A and B (per-game Pythagenpat). */
export const gameWinProb = (runsA: number, runsB: number, exponent = Math.pow(runsA + runsB, 0.287)): number =>
  1 / (1 + Math.pow(runsB / runsA, exponent));

/** Expected runs for `bat` against `field`'s given starter. */
export const expectedRuns = (
  bat: TeamRating,
  field: TeamRating,
  starter: StarterOption,
  isHome: boolean,
  opts: typeof SIM_DEFAULTS,
): number => {
  const gameRa9 = opts.starterShare * starter.ra9 + (1 - opts.starterShare) * field.bullpenRa9;
  const pitchingFactor = gameRa9 / field.avgGameRa9;
  // Platoon: share of the lineup with the advantage against this starter, vs. a neutral 50/50.
  const advantaged = starter.throws === 'L' ? 1 - bat.lineupLeftShare : bat.lineupLeftShare;
  const platoon = 1 + opts.starterShare * opts.platoonEdge * (advantaged - 0.5) * 2;
  const home = isHome ? opts.homeEdge : 1 / opts.homeEdge;
  // Log5-style: batting team's offense scaled by how the fielding team's run prevention compares to average.
  const base = (bat.runsPerGame * field.allowedPerGame) / bat.leagueRunsPerGame;
  return base * pitchingFactor * platoon * home;
};

/** Win probability for the home team averaged over both teams' rotations (no sampling). */
export const expectedHomeWinProb = (home: TeamRating, away: TeamRating, opts: SimOptions = {}): number => {
  const o = { ...SIM_DEFAULTS, ...opts };
  let p = 0;
  for (const hs of home.starters) {
    for (const as of away.starters) {
      const rh = expectedRuns(home, away, as, true, o);
      const ra = expectedRuns(away, home, hs, false, o);
      p += hs.share * as.share * gameWinProb(rh, ra);
    }
  }
  return p;
};

/** Small, fast, seedable PRNG so simulations are reproducible. */
export const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const normal = (rand: () => number) => {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};

const pickStarter = (starters: StarterOption[], r: number): StarterOption => {
  let acc = 0;
  for (const s of starters) {
    acc += s.share;
    if (r < acc) return s;
  }
  return starters[starters.length - 1];
};

export interface TeamSimResult {
  teamId: number;
  meanWins: number;
  /** 10th, 50th and 90th percentile wins. */
  p10: number;
  p50: number;
  p90: number;
  divisionPct: number;
  playoffPct: number;
  /** wins -> share of simulations. */
  distribution: Record<number, number>;
}

export interface SeasonSimResult {
  sims: number;
  teams: TeamSimResult[];
}

/**
 * Simulates the season `sims` times. Each simulation draws a true-talent offset per team, then plays
 * every game with randomly drawn starters. Division and playoff races are settled per simulation.
 */
export const simulateSeason = (
  projections: TeamProjection[],
  teams: ProjectionTeam[],
  schedule: ScheduledGame[],
  lg: LeagueContext,
  options: SimOptions = {},
): SeasonSimResult => {
  const o = { ...SIM_DEFAULTS, ...options };
  const rand = mulberry32(o.seed);
  const ratings = projections.map((p) => buildTeamRating(p, lg, o.starterShare));
  const idx = new Map(ratings.map((r, i) => [r.teamId, i]));
  const n = ratings.length;
  const games = schedule
    .map((g) => [idx.get(g.home), idx.get(g.away)])
    .filter((g): g is [number, number] => g[0] != null && g[1] != null);

  const teamInfo = ratings.map((r) => teams.find((t) => t.id === r.teamId));
  const divisions = new Map<string, number[]>();
  const leagues = new Map<string, number[]>();
  teamInfo.forEach((t, i) => {
    divisions.set(t?.division ?? '', [...(divisions.get(t?.division ?? '') ?? []), i]);
    leagues.set(t?.league ?? '', [...(leagues.get(t?.league ?? '') ?? []), i]);
  });

  const winCounts = ratings.map(() => new Map<number, number>());
  const divTitles = new Array(n).fill(0);
  const playoffs = new Array(n).fill(0);
  const totalWins = new Array(n).fill(0);

  const simRatings = ratings.map((r) => ({ ...r }));
  const wins = new Array(n).fill(0);
  const tiebreak = new Array(n).fill(0);

  // Pythagenpat exponent barely moves game to game; fixing it at the league level halves the math.
  const exponent = Math.pow(2 * (lg.runsPerTeam / 162), 0.287);

  for (let s = 0; s < o.sims; s++) {
    for (let i = 0; i < n; i++) {
      simRatings[i].runsPerGame = ratings[i].runsPerGame * (1 + o.talentSd * normal(rand));
      simRatings[i].allowedPerGame = ratings[i].allowedPerGame * (1 + o.talentSd * normal(rand));
      wins[i] = 0;
      tiebreak[i] = rand();
    }
    for (const [h, a] of games) {
      const home = simRatings[h];
      const away = simRatings[a];
      const hs = pickStarter(home.starters, rand());
      const as = pickStarter(away.starters, rand());
      const p = gameWinProb(expectedRuns(home, away, as, true, o), expectedRuns(away, home, hs, false, o), exponent);
      if (rand() < p) wins[h]++;
      else wins[a]++;
    }

    const rank = (a: number, b: number) => wins[b] - wins[a] || tiebreak[b] - tiebreak[a];
    const divWinners = new Set<number>();
    for (const members of divisions.values()) divWinners.add([...members].sort(rank)[0]);
    for (const members of leagues.values()) {
      const winners = members.filter((i) => divWinners.has(i));
      const wildCards = members
        .filter((i) => !divWinners.has(i))
        .sort(rank)
        .slice(0, Math.max(0, o.playoffSpotsPerLeague - winners.length));
      for (const i of [...winners, ...wildCards]) playoffs[i]++;
    }
    for (let i = 0; i < n; i++) {
      totalWins[i] += wins[i];
      winCounts[i].set(wins[i], (winCounts[i].get(wins[i]) ?? 0) + 1);
      if (divWinners.has(i)) divTitles[i]++;
    }
  }

  const percentile = (counts: Map<number, number>, q: number) => {
    const target = q * o.sims;
    let acc = 0;
    for (const w of [...counts.keys()].sort((a, b) => a - b)) {
      acc += counts.get(w)!;
      if (acc >= target) return w;
    }
    return 0;
  };

  return {
    sims: o.sims,
    teams: ratings.map((r, i) => ({
      teamId: r.teamId,
      meanWins: totalWins[i] / o.sims,
      p10: percentile(winCounts[i], 0.1),
      p50: percentile(winCounts[i], 0.5),
      p90: percentile(winCounts[i], 0.9),
      divisionPct: divTitles[i] / o.sims,
      playoffPct: playoffs[i] / o.sims,
      distribution: Object.fromEntries([...winCounts[i].entries()].map(([w, c]) => [w, c / o.sims])),
    })),
  };
};

export interface GameOutlook {
  gamePk: number;
  date: string;
  opponentId: number;
  home: boolean;
  winProb: number;
}

/** Per-game win probabilities for one team (expected over both rotations), in schedule order. */
export const teamGameOutlook = (
  teamId: number,
  projections: TeamProjection[],
  schedule: ScheduledGame[],
  lg: LeagueContext,
  options: SimOptions = {},
): GameOutlook[] => {
  const o = { ...SIM_DEFAULTS, ...options };
  const ratings = new Map(projections.map((p) => [p.teamId, buildTeamRating(p, lg, o.starterShare)]));
  const cache = new Map<string, number>();
  return schedule
    .filter((g) => g.home === teamId || g.away === teamId)
    .map((g) => {
      const key = `${g.home}-${g.away}`;
      if (!cache.has(key)) cache.set(key, expectedHomeWinProb(ratings.get(g.home)!, ratings.get(g.away)!, o));
      const pHome = cache.get(key)!;
      const home = g.home === teamId;
      return { gamePk: g.gamePk, date: g.date, opponentId: home ? g.away : g.home, home, winProb: home ? pHome : 1 - pHome };
    });
};

/** Splits a team's game outlook into months with expected wins, and finds the toughest stretch. */
export const summarizeOutlook = (games: GameOutlook[], stretch = 20) => {
  const months = new Map<string, { games: number; expectedWins: number }>();
  for (const g of games) {
    const m = g.date.slice(0, 7);
    const cur = months.get(m) ?? { games: 0, expectedWins: 0 };
    months.set(m, { games: cur.games + 1, expectedWins: cur.expectedWins + g.winProb });
  }
  let toughest = { start: 0, expectedWinPct: 1 };
  for (let i = 0; i + stretch <= games.length; i++) {
    const pct = games.slice(i, i + stretch).reduce((s, g) => s + g.winProb, 0) / stretch;
    if (pct < toughest.expectedWinPct) toughest = { start: i, expectedWinPct: pct };
  }
  return {
    expectedWins: games.reduce((s, g) => s + g.winProb, 0),
    months: [...months.entries()].map(([month, v]) => ({ month, ...v })),
    toughestStretch: games.length
      ? {
          from: games[toughest.start].date,
          to: games[Math.min(games.length, toughest.start + stretch) - 1].date,
          expectedWinPct: toughest.expectedWinPct,
        }
      : null,
  };
};
