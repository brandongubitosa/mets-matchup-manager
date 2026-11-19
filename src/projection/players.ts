// Marcel-style player projections: weighted recent seasons + discounted MiLB, regressed to league
// average, age-adjusted, then valued in runs and WAR.

import type { HittingLine, LeagueTotals, MilbLevel, PitchingLine, ProjectionPlayer } from '../types/projection';
import {
  CS_RUNS,
  FIELD_POSITIONS,
  FULL_SEASON_PA,
  HITTER_REGRESSION_PA,
  HITTER_REPLACEMENT_RUNS_PER_600,
  IMPLIED_POSITIONS,
  MILB_FACTOR,
  MILB_SEASON_WEIGHT,
  OLD_DECLINE,
  PEAK_AGE,
  PITCHER_REGRESSION_BF,
  POSITION_ADJ,
  RP_REPLACEMENT_RA9_FACTOR,
  RUN_VALUES,
  SB_RUNS,
  SEASON_WEIGHTS,
  SP_REPLACEMENT_RA9_FACTOR,
  YOUNG_GAIN,
} from './constants.ts';

// ---------- League context ----------

export interface LeagueContext {
  season: number;
  /** Hitting event rates per PA. */
  bat: HitRates;
  /** Run value per PA of an average hitter (above an out). */
  runValuePerPa: number;
  sbPerPa: number;
  csPerPa: number;
  /** Pitching event rates per BF. */
  pit: PitchRates;
  ra9: number;
  fipConstant: number;
  runsPerWin: number;
  runsPerTeam: number; // per 162 games
}

export interface HitRates {
  single: number;
  double: number;
  triple: number;
  hr: number;
  ubb: number;
  hbp: number;
  so: number;
  sb: number;
  cs: number;
}

export interface PitchRates {
  so: number;
  bb: number; // BB + HBP - IBB
  hr: number;
  outs: number;
}

const hitEvents = (l: Omit<HittingLine, 'season' | 'age'>) => ({
  single: l.h - l.d - l.t - l.hr,
  double: l.d,
  triple: l.t,
  hr: l.hr,
  ubb: l.bb - l.ibb,
  hbp: l.hbp,
  so: l.so,
  sb: l.sb,
  cs: l.cs,
});

const pitchEvents = (l: Omit<PitchingLine, 'season' | 'age'>) => ({
  so: l.so,
  bb: l.bb + l.hbp - l.ibb,
  hr: l.hr,
  outs: l.outs,
});

export const runValue = (r: HitRates): number =>
  r.ubb * RUN_VALUES.ubb +
  r.hbp * RUN_VALUES.hbp +
  r.single * RUN_VALUES.single +
  r.double * RUN_VALUES.double +
  r.triple * RUN_VALUES.triple +
  r.hr * RUN_VALUES.hr;

const rawFip = (r: PitchRates): number => {
  const ip = r.outs / 3;
  return ip > 0 ? (13 * r.hr + 3 * r.bb - 2 * r.so) / ip : 0;
};

/** Builds league baselines from league totals, weighting seasons like Marcel does. */
export const buildLeagueContext = (totals: LeagueTotals[], season: number): LeagueContext => {
  const recent = [...totals].sort((a, b) => b.season - a.season).slice(0, SEASON_WEIGHTS.length);
  const w = (i: number) => SEASON_WEIGHTS[i];
  let pa = 0;
  let bf = 0;
  let outs = 0;
  let runs = 0;
  let games = 0;
  const bat: Record<string, number> = {};
  const pit: Record<string, number> = {};
  recent.forEach((t, i) => {
    pa += w(i) * t.hitting.pa;
    bf += w(i) * t.pitching.bf;
    outs += w(i) * t.pitching.outs;
    runs += w(i) * t.runs;
    games += w(i) * t.games;
    for (const [k, v] of Object.entries(hitEvents(t.hitting))) bat[k] = (bat[k] ?? 0) + w(i) * v;
    for (const [k, v] of Object.entries(pitchEvents(t.pitching))) pit[k] = (pit[k] ?? 0) + w(i) * v;
  });
  const batRates = Object.fromEntries(Object.entries(bat).map(([k, v]) => [k, v / pa])) as unknown as HitRates;
  const pitRates = Object.fromEntries(Object.entries(pit).map(([k, v]) => [k, v / bf])) as unknown as PitchRates;
  const ra9 = (runs / outs) * 27;
  const runsPerGame = runs / games / 2;
  return {
    season,
    bat: batRates,
    runValuePerPa: runValue(batRates),
    sbPerPa: batRates.sb,
    csPerPa: batRates.cs,
    pit: pitRates,
    ra9,
    fipConstant: ra9 - rawFip(pitRates),
    runsPerWin: 9 * (runs / (outs / 3)) * 1.5 + 3,
    runsPerTeam: runsPerGame * 162,
  };
};

// ---------- Helpers ----------

export const ageInSeason = (birthDate: string | null, season: number): number | null => {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  // Baseball age: age on June 30 of the season.
  return season - y - (m > 6 || (m === 6 && d > 30) ? 1 : 0);
};

/** Multiplier on a player's production for aging from last season to this one. */
export const ageFactor = (age: number | null): number => {
  if (age == null) return 1;
  return age < PEAK_AGE ? 1 + YOUNG_GAIN * (PEAK_AGE - age) : 1 - OLD_DECLINE * (age - PEAK_AGE);
};

const seasonWeight = (season: number, projSeason: number): number => SEASON_WEIGHTS[projSeason - 1 - season] ?? 0;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// ---------- Hitters ----------

export interface HitterProjection {
  playerId: number;
  name: string;
  age: number | null;
  bats: string | null;
  position: string; // most-played position
  eligible: string[]; // positions they can play, incl. DH
  rates: HitRates;
  /** Batting + baserunning runs above average per PA. */
  runsPerPa: number;
  /** Plate appearances the player would get as a healthy everyday player (Marcel playing time). */
  marcelPa: number;
  /** Share of an everyday role the player is expected to be available for. */
  availability: number;
  /** WAR over 600 PA at their primary position, for ranking and display. */
  warPer600: number;
}

/** Translates a MiLB line to MLB-equivalent events: less contact quality, more strikeouts. */
const translateMilbHitting = (events: ReturnType<typeof hitEvents>, level: MilbLevel) => {
  const f = MILB_FACTOR[level];
  return {
    single: events.single * f,
    double: events.double * f,
    triple: events.triple * f,
    hr: events.hr * f * f,
    ubb: events.ubb * f,
    hbp: events.hbp,
    so: events.so * (2 - f),
    sb: events.sb * f,
    cs: events.cs,
  };
};

const positionValue = (pos: string, pa: number) => ((POSITION_ADJ[pos] ?? 0) * pa) / FULL_SEASON_PA;

export const hitterPositions = (p: ProjectionPlayer, projSeason: number): { primary: string; eligible: string[] } => {
  const games: Record<string, number> = {};
  for (const f of p.fielding) {
    const w = seasonWeight(f.season, projSeason) || 1;
    for (const [pos, g] of Object.entries(f.games)) if (pos !== 'P') games[pos] = (games[pos] ?? 0) + w * g;
  }
  const sorted = Object.entries(games).sort((a, b) => b[1] - a[1]);
  const fallback = FIELD_POSITIONS.includes(p.position) ? p.position : 'DH';
  const primary = sorted[0]?.[0] && sorted[0][0] !== 'DH' ? sorted[0][0] : sorted.length ? 'DH' : fallback;
  const eligible = new Set<string>([primary, 'DH']);
  for (const [pos, g] of sorted) if (g >= 60 && pos !== 'DH') eligible.add(pos); // ~15 games, weighted
  for (const pos of [...eligible]) for (const extra of IMPLIED_POSITIONS[pos] ?? []) eligible.add(extra);
  if (eligible.has('C') && primary !== 'C' && (games.C ?? 0) < 120) eligible.delete('C');
  return { primary, eligible: [...eligible] };
};

export const projectHitter = (p: ProjectionPlayer, lg: LeagueContext): HitterProjection => {
  const sums: Record<string, number> = {};
  let weightedPa = 0;
  const add = (events: Record<string, number>, pa: number, w: number) => {
    if (!w || !pa) return;
    weightedPa += w * pa;
    for (const [k, v] of Object.entries(events)) sums[k] = (sums[k] ?? 0) + w * v;
  };
  for (const line of p.hitting) add(hitEvents(line), line.pa, seasonWeight(line.season, lg.season));
  for (const line of p.milbHitting) {
    add(
      translateMilbHitting(hitEvents(line), line.level),
      line.pa,
      seasonWeight(line.season, lg.season) * MILB_SEASON_WEIGHT,
    );
  }

  const age = ageInSeason(p.birthDate, lg.season);
  const af = ageFactor(age);
  const rates = {} as HitRates;
  for (const k of Object.keys(lg.bat) as (keyof HitRates)[]) {
    const regressed = ((sums[k] ?? 0) + HITTER_REGRESSION_PA * lg.bat[k]) / (weightedPa + HITTER_REGRESSION_PA);
    // Aging scales good outcomes; strikeouts move the opposite way.
    rates[k] = k === 'so' ? regressed / af : k === 'cs' ? regressed : regressed * af;
  }

  const baserunning = (rates.sb - lg.sbPerPa) * SB_RUNS + (rates.cs - lg.csPerPa) * CS_RUNS;
  const runsPerPa = runValue(rates) - lg.runValuePerPa + baserunning;

  const paBy = (season: number) =>
    (p.hitting.find((h) => h.season === season)?.pa ?? 0) +
    p.milbHitting.filter((h) => h.season === season).reduce((s, h) => s + h.pa, 0);
  const marcelPa = 0.5 * paBy(lg.season - 1) + 0.1 * paBy(lg.season - 2) + 200;
  const { primary, eligible } = hitterPositions(p, lg.season);
  const runs600 = runsPerPa * 600 + positionValue(primary, 600) + HITTER_REPLACEMENT_RUNS_PER_600;

  return {
    playerId: p.id,
    name: p.name,
    age,
    bats: p.bats,
    position: primary,
    eligible,
    rates,
    runsPerPa,
    marcelPa,
    availability: clamp(marcelPa / 600, 0.6, 1),
    warPer600: runs600 / lg.runsPerWin,
  };
};

/** Runs above average (batting + baserunning + position) for a given playing time. */
export const hitterRunsAboveAverage = (h: HitterProjection, pa: number, pos: string): number =>
  h.runsPerPa * pa + positionValue(pos, pa);

export const hitterWar = (h: HitterProjection, pa: number, pos: string, lg: LeagueContext): number =>
  (hitterRunsAboveAverage(h, pa, pos) + (HITTER_REPLACEMENT_RUNS_PER_600 * pa) / 600) / lg.runsPerWin;

// ---------- Pitchers ----------

export interface PitcherProjection {
  playerId: number;
  name: string;
  age: number | null;
  throws: string | null;
  role: 'SP' | 'RP';
  rates: PitchRates;
  ra9: number;
  /** Innings the player would throw if healthy (Marcel playing time). */
  marcelIp: number;
  availability: number;
  /** WAR over a standard workload (170 IP SP, 65 IP RP), for ranking and display. */
  warPerRole: number;
}

const translateMilbPitching = (events: ReturnType<typeof pitchEvents>, level: MilbLevel) => {
  const f = MILB_FACTOR[level];
  return { so: events.so * f, bb: events.bb * (2 - f), hr: events.hr * (2 - f) * (2 - f), outs: events.outs * f };
};

export const replacementRa9 = (role: 'SP' | 'RP', lg: LeagueContext) =>
  lg.ra9 * (role === 'SP' ? SP_REPLACEMENT_RA9_FACTOR : RP_REPLACEMENT_RA9_FACTOR);

export const projectPitcher = (p: ProjectionPlayer, lg: LeagueContext): PitcherProjection => {
  const sums: Record<string, number> = {};
  let weightedBf = 0;
  let starts = 0;
  let apps = 0;
  const add = (events: Record<string, number>, bf: number, w: number) => {
    if (!w || !bf) return;
    weightedBf += w * bf;
    for (const [k, v] of Object.entries(events)) sums[k] = (sums[k] ?? 0) + w * v;
  };
  for (const line of p.pitching) {
    const w = seasonWeight(line.season, lg.season);
    add(pitchEvents(line), line.bf, w);
    starts += w * line.gs;
    apps += w * line.g;
  }
  for (const line of p.milbPitching) {
    const w = seasonWeight(line.season, lg.season) * MILB_SEASON_WEIGHT;
    add(translateMilbPitching(pitchEvents(line), line.level), line.bf, w);
    starts += w * line.gs;
    apps += w * line.g;
  }

  const age = ageInSeason(p.birthDate, lg.season);
  const af = ageFactor(age);
  const rates = {} as PitchRates;
  for (const k of Object.keys(lg.pit) as (keyof PitchRates)[]) {
    const regressed = ((sums[k] ?? 0) + PITCHER_REGRESSION_BF * lg.pit[k]) / (weightedBf + PITCHER_REGRESSION_BF);
    rates[k] = k === 'so' || k === 'outs' ? regressed * af : regressed / af;
  }
  const ra9 = rawFip(rates) + lg.fipConstant;
  const role: 'SP' | 'RP' = apps > 0 && starts / apps >= 0.5 ? 'SP' : 'RP';

  const ipBy = (season: number) =>
    ((p.pitching.find((x) => x.season === season)?.outs ?? 0) +
      p.milbPitching.filter((x) => x.season === season).reduce((s, x) => s + x.outs, 0)) /
    3;
  const marcelIp = 0.5 * ipBy(lg.season - 1) + 0.1 * ipBy(lg.season - 2) + (role === 'SP' ? 60 : 25);
  const fullIp = role === 'SP' ? 170 : 65;

  return {
    playerId: p.id,
    name: p.name,
    age,
    throws: p.throws,
    role,
    rates,
    ra9,
    marcelIp,
    availability: clamp(marcelIp / fullIp, 0.5, 1),
    warPerRole: ((replacementRa9(role, lg) - ra9) * fullIp) / 9 / lg.runsPerWin,
  };
};

export const pitcherRunsAboveAverage = (pp: PitcherProjection, ip: number, lg: LeagueContext): number =>
  ((lg.ra9 - pp.ra9) * ip) / 9;

export const pitcherWar = (pp: PitcherProjection, ip: number, role: 'SP' | 'RP', lg: LeagueContext): number =>
  ((replacementRa9(role, lg) - pp.ra9) * ip) / 9 / lg.runsPerWin;

// ---------- Classification ----------

/** Whether a player should be projected as a hitter, a pitcher, or both (two-way). */
export const playerRoles = (p: ProjectionPlayer): { hitter: boolean; pitcher: boolean } => {
  const pa = p.hitting.reduce((s, h) => s + h.pa, 0) + p.milbHitting.reduce((s, h) => s + h.pa, 0);
  const bf = p.pitching.reduce((s, x) => s + x.bf, 0) + p.milbPitching.reduce((s, x) => s + x.bf, 0);
  if (p.position === 'TWP') return { hitter: true, pitcher: true };
  if (p.position === 'P') return { hitter: false, pitcher: true };
  return { hitter: true, pitcher: bf > 300 && bf > pa };
};
