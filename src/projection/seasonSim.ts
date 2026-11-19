// Plays out one season game by game (with box-score style results) and then the postseason in the
// current MLB format: 6 teams per league, Wild Card (best of 3), Division Series (best of 5),
// League Championship Series and World Series (best of 7).

import type { ProjectionTeam, ScheduledGame } from '../types/projection';
import type { LeagueContext } from './players.ts';
import type { TeamProjection } from './team.ts';
import type { StarterOption, TeamRating } from './simulate.ts';
import {
  SIM_DEFAULTS,
  buildTeamRating,
  expectedRuns,
  gameWinProb,
  mulberry32,
  normal,
} from './simulate.ts';

export interface SimGame {
  gamePk: number;
  date: string;
  home: number;
  away: number;
  homeScore: number;
  awayScore: number;
  homeStarter: string;
  awayStarter: string;
  extraInnings: boolean;
}

export interface StandingRow {
  teamId: number;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
}

export interface SeriesResult {
  round: 'Wild Card' | 'Division Series' | 'Championship Series' | 'World Series';
  league: string; // '' for the World Series
  high: number; // higher seed / home-field team
  low: number;
  highWins: number;
  lowWins: number;
  winner: number;
}

export interface PlayoffSeed {
  teamId: number;
  seed: number;
  league: string;
}

export interface SeasonSimulation {
  seed: number;
  games: SimGame[];
  standings: StandingRow[];
  playoffSeeds: PlayoffSeed[];
  series: SeriesResult[];
  champion: number;
}

/** Poisson sample (Knuth) for small means. */
const poisson = (lambda: number, rand: () => number): number => {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
};

/** Gamma(shape >= 1) sample via Marsaglia-Tsang. */
const gamma = (shape: number, scale: number, rand: () => number): number => {
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rand);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
};

/** Runs in a game: negative binomial (Poisson-gamma), matching MLB's variance of about 2x the mean. */
const RUNS_DISPERSION = 4;
const EXTRA_INNING_TIE_SHARE = 0.4;
const sampleRuns = (mean: number, rand: () => number) =>
  poisson(gamma(RUNS_DISPERSION, mean / RUNS_DISPERSION, rand), rand);

/**
 * A plausible final score for a game whose winner is already decided, so scores never change the
 * win probabilities the model produced. Ties are settled as extra-inning wins by one or two runs.
 */
const sampleScore = (winnerMean: number, loserMean: number, rand: () => number) => {
  for (let i = 0; i < 25; i++) {
    const w = sampleRuns(winnerMean, rand);
    const l = sampleRuns(loserMean, rand);
    if (w > l) return { winner: w, loser: l, extra: false };
    // Tied regulation scores come up more often than real extra-inning games (~9% of games), so
    // only some ties become extra innings; the rest are redrawn.
    if (w === l && rand() < EXTRA_INNING_TIE_SHARE) return { winner: w + (rand() < 0.75 ? 1 : 2), loser: l, extra: true };
  }
  const l = sampleRuns(loserMean, rand);
  return { winner: l + 1, loser: l, extra: false };
};

const playGame = (
  home: TeamRating,
  away: TeamRating,
  hs: StarterOption,
  as: StarterOption,
  rand: () => number,
  exponent: number,
) => {
  const o = SIM_DEFAULTS;
  const rh = expectedRuns(home, away, as, true, o);
  const ra = expectedRuns(away, home, hs, false, o);
  const homeWins = rand() < gameWinProb(rh, ra, exponent);
  const s = homeWins ? sampleScore(rh, ra, rand) : sampleScore(ra, rh, rand);
  return {
    homeScore: homeWins ? s.winner : s.loser,
    awayScore: homeWins ? s.loser : s.winner,
    extra: s.extra,
  };
};

/** Top four starters in rotation order (by RA9), the usual postseason rotation. */
const playoffRotation = (r: TeamRating) => {
  const named = r.starters.filter((s) => s.name !== 'Replacement SP');
  const fillIns = r.starters.filter((s) => s.name === 'Replacement SP');
  const rotation = [...named, ...fillIns].slice(0, 4);
  return rotation.length ? rotation : r.starters.slice(0, 1);
};

/** Home games for the higher seed by game number: 2-2-1 (best of 5), 2-3-2 (best of 7), all (best of 3). */
const higherSeedHome = (bestOf: number, game: number) =>
  bestOf === 3 ? true : bestOf === 5 ? [0, 1, 4].includes(game) : [0, 1, 5, 6].includes(game);

export const simulateOneSeason = (
  projections: TeamProjection[],
  teams: ProjectionTeam[],
  schedule: ScheduledGame[],
  lg: LeagueContext,
  seed: number = Date.now() % 2147483647,
): SeasonSimulation => {
  const rand = mulberry32(seed);
  const o = SIM_DEFAULTS;
  const exponent = Math.pow(2 * (lg.runsPerTeam / 162), 0.287);

  // One true-talent draw per team for the season (some teams over- or under-perform their projection).
  const ratings = new Map<number, TeamRating>();
  for (const p of projections) {
    const r = buildTeamRating(p, lg, o.starterShare);
    ratings.set(p.teamId, {
      ...r,
      runsPerGame: r.runsPerGame * (1 + o.talentSd * normal(rand)),
      allowedPerGame: r.allowedPerGame * (1 + o.talentSd * normal(rand)),
    });
  }

  const rows = new Map<number, StandingRow>(
    projections.map((p) => [p.teamId, { teamId: p.teamId, wins: 0, losses: 0, runsScored: 0, runsAllowed: 0 }]),
  );
  // Starters follow a rotation: each game goes to the starter furthest behind his share of starts,
  // so an ace pitches every fifth day and fill-ins appear at the rate of the innings they cover.
  const starts = new Map<number, number[]>();
  const gamesPlayed = new Map<number, number>();
  const nextStarter = (teamId: number, r: TeamRating): StarterOption => {
    const counts = starts.get(teamId) ?? r.starters.map(() => 0);
    const played = (gamesPlayed.get(teamId) ?? 0) + 1;
    let best = 0;
    let bestDeficit = -Infinity;
    r.starters.forEach((st, i) => {
      // Small priority by rotation order so the ace gets Opening Day and fill-ins go last on ties.
      const deficit = st.share * played - counts[i] + (r.starters.length - i) * 0.02;
      if (deficit > bestDeficit + 1e-9) {
        bestDeficit = deficit;
        best = i;
      }
    });
    counts[best]++;
    starts.set(teamId, counts);
    gamesPlayed.set(teamId, played);
    return r.starters[best];
  };

  const games: SimGame[] = [];
  for (const g of schedule) {
    const home = ratings.get(g.home);
    const away = ratings.get(g.away);
    if (!home || !away) continue;
    const hs = nextStarter(g.home, home);
    const as = nextStarter(g.away, away);
    const r = playGame(home, away, hs, as, rand, exponent);
    games.push({
      gamePk: g.gamePk,
      date: g.date,
      home: g.home,
      away: g.away,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      homeStarter: hs.name,
      awayStarter: as.name,
      extraInnings: r.extra,
    });
    const h = rows.get(g.home)!;
    const a = rows.get(g.away)!;
    h.runsScored += r.homeScore;
    h.runsAllowed += r.awayScore;
    a.runsScored += r.awayScore;
    a.runsAllowed += r.homeScore;
    if (r.homeScore > r.awayScore) {
      h.wins++;
      a.losses++;
    } else {
      a.wins++;
      h.losses++;
    }
  }

  // Seeding: ties broken randomly (stand-in for head-to-head tiebreakers).
  const tiebreak = new Map(projections.map((p) => [p.teamId, rand()]));
  const rank = (a: number, b: number) =>
    rows.get(b)!.wins - rows.get(a)!.wins || tiebreak.get(b)! - tiebreak.get(a)!;
  const info = new Map(teams.map((t) => [t.id, t]));
  const leagues = [...new Set(teams.map((t) => t.league))].sort();
  const playoffSeeds: PlayoffSeed[] = [];
  for (const league of leagues) {
    const members = teams.filter((t) => t.league === league && rows.has(t.id)).map((t) => t.id);
    const divisions = [...new Set(members.map((id) => info.get(id)!.division))];
    const winners = divisions.map((d) => members.filter((id) => info.get(id)!.division === d).sort(rank)[0]).sort(rank);
    const wildCards = members.filter((id) => !winners.includes(id)).sort(rank).slice(0, 3);
    [...winners, ...wildCards].forEach((teamId, i) => playoffSeeds.push({ teamId, seed: i + 1, league }));
  }

  const series: SeriesResult[] = [];
  const playSeries = (round: SeriesResult['round'], league: string, high: number, low: number, bestOf: number) => {
    const need = Math.ceil(bestOf / 2);
    const hr = ratings.get(high)!;
    const lr = ratings.get(low)!;
    const hRot = playoffRotation(hr);
    const lRot = playoffRotation(lr);
    let hw = 0;
    let lw = 0;
    for (let game = 0; hw < need && lw < need; game++) {
      const hs = hRot[game % hRot.length];
      const ls = lRot[game % lRot.length];
      if (higherSeedHome(bestOf, game)) {
        const r = playGame(hr, lr, hs, ls, rand, exponent);
        r.homeScore > r.awayScore ? hw++ : lw++;
      } else {
        const r = playGame(lr, hr, ls, hs, rand, exponent);
        r.homeScore > r.awayScore ? lw++ : hw++;
      }
    }
    const result = { round, league, high, low, highWins: hw, lowWins: lw, winner: hw > lw ? high : low };
    series.push(result);
    return result.winner;
  };

  const pennant: number[] = [];
  for (const league of leagues) {
    const s = (n: number) => playoffSeeds.find((p) => p.league === league && p.seed === n)!.teamId;
    const wc36 = playSeries('Wild Card', league, s(3), s(6), 3);
    const wc45 = playSeries('Wild Card', league, s(4), s(5), 3);
    const ds1 = playSeries('Division Series', league, s(1), wc45, 5);
    const ds2 = playSeries('Division Series', league, s(2), wc36, 5);
    const seedOf = (id: number) => playoffSeeds.find((p) => p.teamId === id)!.seed;
    const [hi, lo] = seedOf(ds1) < seedOf(ds2) ? [ds1, ds2] : [ds2, ds1];
    pennant.push(playSeries('Championship Series', league, hi, lo, 7));
  }
  const [a, b] = pennant;
  const [wsHigh, wsLow] = rank(a, b) <= 0 ? [a, b] : [b, a];
  const champion = playSeries('World Series', '', wsHigh, wsLow, 7);

  return {
    seed,
    games,
    standings: [...rows.values()],
    playoffSeeds,
    series,
    champion,
  };
};

/** How a team's season ended, e.g. "Won the World Series" or "Lost the NLDS to LAD (1-3)". */
export const describeFinish = (
  sim: SeasonSimulation,
  teamId: number,
  abbr: (id: number) => string,
  leagueShort: (league: string) => string,
): string => {
  if (sim.champion === teamId) return 'Won the World Series';
  const played = sim.series.filter((s) => s.high === teamId || s.low === teamId);
  if (!played.length) return 'Missed the playoffs';
  const last = played[played.length - 1];
  const opp = last.high === teamId ? last.low : last.high;
  const mine = last.high === teamId ? last.highWins : last.lowWins;
  const theirs = last.high === teamId ? last.lowWins : last.highWins;
  const name =
    last.round === 'World Series'
      ? 'the World Series'
      : last.round === 'Wild Card'
        ? `the ${leagueShort(last.league)} Wild Card Series`
        : `the ${leagueShort(last.league)}${last.round === 'Division Series' ? 'DS' : 'CS'}`;
  return `Lost ${name} to ${abbr(opp)} (${mine}-${theirs})`;
};
