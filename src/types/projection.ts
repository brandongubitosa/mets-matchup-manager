// Types for the season projection data snapshot (src/data/projectionData.json).

export type MilbLevel = 'AAA' | 'AA' | 'A+' | 'A';

/** Counting stats for one hitter season (summed across teams). */
export interface HittingLine {
  season: number;
  age: number | null;
  g: number;
  pa: number;
  ab: number;
  h: number;
  d: number; // doubles
  t: number; // triples
  hr: number;
  bb: number;
  ibb: number;
  hbp: number;
  so: number;
  sf: number;
  sb: number;
  cs: number;
}

/** Counting stats for one pitcher season. Innings stored as outs to avoid "x.1/x.2" notation. */
export interface PitchingLine {
  season: number;
  age: number | null;
  g: number;
  gs: number;
  outs: number;
  bf: number;
  h: number;
  hr: number;
  bb: number;
  ibb: number;
  hbp: number;
  so: number;
  r: number;
  er: number;
  sv: number;
  hld: number;
}

/** Games played at each fielding position in a season, e.g. { SS: 120, '2B': 15 }. */
export interface FieldingLine {
  season: number;
  games: Record<string, number>;
}

export interface MilbHittingLine extends HittingLine {
  level: MilbLevel;
}

export interface MilbPitchingLine extends PitchingLine {
  level: MilbLevel;
}

export interface ProjectionPlayer {
  id: number;
  name: string;
  birthDate: string | null;
  bats: string | null;
  throws: string | null;
  position: string; // primary position abbreviation, e.g. "SS", "P", "TWP"
  mlbDebut: string | null;
  hitting: HittingLine[];
  pitching: PitchingLine[];
  fielding: FieldingLine[];
  milbHitting: MilbHittingLine[];
  milbPitching: MilbPitchingLine[];
}

export interface ProjectionTeam {
  id: number;
  abbr: string;
  name: string;
  league: string;
  division: string;
}

export interface ScheduledGame {
  gamePk: number;
  date: string; // YYYY-MM-DD
  home: number; // team id
  away: number;
}

/** League-wide totals for a season, used as the regression baseline. */
export interface LeagueTotals {
  season: number;
  hitting: Omit<HittingLine, 'season' | 'age'>;
  pitching: Omit<PitchingLine, 'season' | 'age'>;
  runs: number;
  games: number;
}

export interface ProjectionData {
  season: number; // season being projected
  statSeasons: number[]; // seasons of history included
  generatedAt: string;
  teams: ProjectionTeam[];
  /** 40-man roster player ids by team id. */
  rosters: Record<string, number[]>;
  players: Record<string, ProjectionPlayer>;
  league: LeagueTotals[];
  schedule: ScheduledGame[];
  /** FanGraphs free agent id -> MLB player id (only for free agents matched by name). */
  freeAgentIds: Record<string, number>;
  /** Org minor leaguers not on the 40-man (call-up candidates) by MLB team id. */
  callUps: Record<string, number[]>;
}
