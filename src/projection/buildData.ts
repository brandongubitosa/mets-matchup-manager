// Pure transforms from MLB Stats API responses into the projection data snapshot.
// No runtime imports: scripts/build-projection-data.ts runs this file directly with Node.

import type {
  FieldingLine,
  HittingLine,
  LeagueTotals,
  MilbHittingLine,
  MilbLevel,
  MilbPitchingLine,
  PitchingLine,
  ProjectionPlayer,
} from '../types/projection';

type Raw = Record<string, any>;

export const MILB_LEVELS: Record<number, MilbLevel> = { 11: 'AAA', 12: 'AA', 13: 'A+', 14: 'A' };

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

/** "123.2" innings -> 371 outs. */
export const inningsToOuts = (ip: unknown): number => {
  if (ip == null || ip === '') return 0;
  const [whole, frac = '0'] = String(ip).split('.');
  return num(whole) * 3 + num(frac);
};

export const slimHitting = (season: number, s: Raw): HittingLine => ({
  season,
  age: s.age ?? null,
  g: num(s.gamesPlayed),
  pa: num(s.plateAppearances),
  ab: num(s.atBats),
  h: num(s.hits),
  d: num(s.doubles),
  t: num(s.triples),
  hr: num(s.homeRuns),
  bb: num(s.baseOnBalls),
  ibb: num(s.intentionalWalks),
  hbp: num(s.hitByPitch),
  so: num(s.strikeOuts),
  sf: num(s.sacFlies),
  sb: num(s.stolenBases),
  cs: num(s.caughtStealing),
});

export const slimPitching = (season: number, s: Raw): PitchingLine => ({
  season,
  age: s.age ?? null,
  g: num(s.gamesPitched ?? s.gamesPlayed),
  gs: num(s.gamesStarted),
  outs: s.outs != null ? num(s.outs) : inningsToOuts(s.inningsPitched),
  bf: num(s.battersFaced),
  h: num(s.hits),
  hr: num(s.homeRuns),
  bb: num(s.baseOnBalls),
  ibb: num(s.intentionalWalks),
  hbp: num(s.hitBatsmen ?? s.hitByPitch),
  so: num(s.strikeOuts),
  r: num(s.runs),
  er: num(s.earnedRuns),
  sv: num(s.saves),
  hld: num(s.holds),
});

/** Adds numeric fields of b into a copy of a (season/age taken from a). */
const addLines = <T extends Record<string, any>>(a: T, b: T): T => {
  const out: Record<string, any> = { ...a };
  for (const k of Object.keys(b)) {
    if (k === 'season' || k === 'age' || k === 'level') continue;
    if (typeof b[k] === 'number') out[k] = (out[k] ?? 0) + b[k];
  }
  return out as T;
};

/**
 * yearByYear returns one split per team a player appeared for. When a player changed teams the API
 * may also include a combined split with no team. Prefer that total; otherwise sum the team splits.
 */
export const collapseSplits = <T extends { season: number }>(
  splits: Raw[],
  slim: (season: number, stat: Raw) => T,
  keyOf: (split: Raw) => string = (sp) => String(sp.season),
): T[] => {
  const groups = new Map<string, Raw[]>();
  for (const sp of splits) {
    const key = keyOf(sp);
    groups.set(key, [...(groups.get(key) ?? []), sp]);
  }
  const lines: T[] = [];
  for (const group of groups.values()) {
    const season = num(group[0].season);
    const total = group.length > 1 ? group.find((sp) => !sp.team) : undefined;
    if (total) {
      lines.push({ ...slim(season, total.stat), ...extra(total) });
      continue;
    }
    const withTeam = group.length > 1 ? group.filter((sp) => sp.team) : group;
    const [first, ...rest] = withTeam.map((sp) => ({ ...slim(season, sp.stat), ...extra(sp) }));
    lines.push(rest.reduce((acc, line) => addLines(acc, line), first));
  }
  return lines.sort((a, b) => a.season - b.season);
};

// Carries the MiLB level through collapseSplits for minor league splits.
const extra = (sp: Raw): Raw => {
  const level = MILB_LEVELS[sp.sport?.id];
  return level ? { level } : {};
};

/** Fielding splits -> games per position per season. */
export const collapseFielding = (splits: Raw[]): FieldingLine[] => {
  const bySeason = new Map<number, Record<string, number>>();
  for (const sp of splits) {
    const season = num(sp.season);
    const pos = sp.stat?.position?.abbreviation ?? sp.position?.abbreviation;
    if (!pos || !sp.team) continue; // skip combined rows to avoid double counting
    const games = bySeason.get(season) ?? {};
    games[pos] = (games[pos] ?? 0) + num(sp.stat?.gamesPlayed);
    bySeason.set(season, games);
  }
  return [...bySeason.entries()].sort((a, b) => a[0] - b[0]).map(([season, games]) => ({ season, games }));
};

const splitsFor = (person: Raw, group: string): Raw[] =>
  (person?.stats ?? []).filter((s: Raw) => s.group?.displayName === group).flatMap((s: Raw) => s.splits ?? []);

const inSeasons = (seasons: number[]) => (sp: Raw) => seasons.includes(num(sp.season));

/**
 * Builds a projection player from the MLB-hydrated person and (optionally) the MiLB-hydrated person.
 * Only MLB (sport 1) splits count as MLB stats; only AAA through A are kept for minors.
 */
export const buildPlayer = (
  person: Raw,
  milbPerson: Raw | undefined,
  mlbSeasons: number[],
  milbSeasons: number[],
): ProjectionPlayer => {
  const isMlb = (sp: Raw) => (sp.sport?.id ?? 1) === 1;
  const isMilb = (sp: Raw) => MILB_LEVELS[sp.sport?.id] != null;
  const mlb = (group: string) => splitsFor(person, group).filter(isMlb).filter(inSeasons(mlbSeasons));
  const milb = (group: string) =>
    splitsFor(milbPerson ?? {}, group).filter(isMilb).filter(inSeasons(milbSeasons));
  const byLevel = (sp: Raw) => `${sp.season}-${sp.sport?.id}`;

  return {
    id: person.id,
    name: person.fullName,
    birthDate: person.birthDate ?? null,
    bats: person.batSide?.code ?? null,
    throws: person.pitchHand?.code ?? null,
    position: person.primaryPosition?.abbreviation ?? '',
    mlbDebut: person.mlbDebutDate ?? null,
    hitting: collapseSplits(mlb('hitting'), slimHitting),
    pitching: collapseSplits(mlb('pitching'), slimPitching),
    fielding: collapseFielding(mlb('fielding')),
    milbHitting: collapseSplits(milb('hitting'), slimHitting, byLevel) as MilbHittingLine[],
    milbPitching: collapseSplits(milb('pitching'), slimPitching, byLevel) as MilbPitchingLine[],
  };
};

/** Sums the 30 team rows from /teams/stats into league totals for one season. */
export const buildLeagueTotals = (season: number, hittingSplits: Raw[], pitchingSplits: Raw[]): LeagueTotals => {
  const sum = <T extends Record<string, any>>(lines: T[]): T => lines.reduce((acc, l) => addLines(acc, l));
  const { season: _s, age: _a, ...hitting } = sum(hittingSplits.map((sp) => slimHitting(season, sp.stat)));
  const { season: _s2, age: _a2, ...pitching } = sum(pitchingSplits.map((sp) => slimPitching(season, sp.stat)));
  const runs = hittingSplits.reduce((acc, sp) => acc + num(sp.stat?.runs), 0);
  const games = hittingSplits.reduce((acc, sp) => acc + num(sp.stat?.gamesPlayed), 0) / 2;
  return { season, hitting, pitching, runs, games };
};

/** Lowercase, strip accents, punctuation and suffixes so "Luis Arráez Jr." matches "Luis Arraez". */
export const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.'’-]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Matches FanGraphs free agents to MLB ids by normalized name. Ambiguous names (two MLB players with
 * the same name) are disambiguated by age when possible, otherwise left unmatched.
 */
export const matchFreeAgents = (
  freeAgents: { fangraphsId: string; name: string; age: number | null }[],
  mlbPlayers: { id: number; fullName: string; currentAge?: number }[],
): Record<string, number> => {
  const index = new Map<string, { id: number; currentAge?: number }[]>();
  for (const p of mlbPlayers) {
    const key = normalizeName(p.fullName);
    index.set(key, [...(index.get(key) ?? []), p]);
  }
  const out: Record<string, number> = {};
  for (const fa of freeAgents) {
    const candidates = index.get(normalizeName(fa.name)) ?? [];
    const unique = [...new Map(candidates.map((c) => [c.id, c])).values()];
    let match = unique.length === 1 ? unique[0] : undefined;
    if (!match && unique.length > 1 && fa.age != null) {
      const close = unique.filter((c) => c.currentAge != null && Math.abs(c.currentAge - fa.age!) <= 1);
      if (close.length === 1) match = close[0];
    }
    if (match) out[fa.fangraphsId] = match.id;
  }
  return out;
};
