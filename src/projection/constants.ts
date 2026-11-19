// Tunable constants for the projection engine. Phase 5 (backtesting) calibrates these.

/** Marcel season weights, most recent first. */
export const SEASON_WEIGHTS = [5, 4, 3];

/** MiLB seasons count less than MLB seasons of the same year. */
export const MILB_SEASON_WEIGHT = 0.6;

/** Regression to league average: PA / BF of league-average performance added to every player. */
export const HITTER_REGRESSION_PA = 1200;
export const PITCHER_REGRESSION_BF = 600;

/** Age curve: peak age, yearly improvement before it, yearly decline after it. */
export const PEAK_AGE = 29;
export const YOUNG_GAIN = 0.006;
export const OLD_DECLINE = 0.003;

/** Share of MLB production a MiLB stat line translates to, by level. */
export const MILB_FACTOR = { AAA: 0.88, AA: 0.82, 'A+': 0.75, A: 0.68 } as const;

/** Run values of batting events above an out. */
export const RUN_VALUES = { ubb: 0.57, hbp: 0.6, single: 0.74, double: 1.05, triple: 1.34, hr: 1.74 };
export const SB_RUNS = 0.2;
export const CS_RUNS = -0.42;

/** Positional adjustment in runs per 162 games (about 680 PA). */
export const POSITION_ADJ: Record<string, number> = {
  C: 12.5,
  SS: 7.5,
  '2B': 2.5,
  '3B': 2.5,
  CF: 2.5,
  LF: -7.5,
  RF: -7.5,
  '1B': -12.5,
  DH: -17.5,
};
export const FULL_SEASON_PA = 680;

/** Replacement level: hitters lose this many runs per 600 PA vs. average; pitchers allow RA9 × factor. */
export const HITTER_REPLACEMENT_RUNS_PER_600 = 20;
export const SP_REPLACEMENT_RA9_FACTOR = 1.25;
export const RP_REPLACEMENT_RA9_FACTOR = 1.1;

/** Team playing time slots. */
export const TEAM_PA = 6200;
export const LINEUP_SLOTS: { pos: string; pa: number }[] = [
  { pos: 'C', pa: 480 },
  { pos: 'SS', pa: 640 },
  { pos: 'CF', pa: 620 },
  { pos: '2B', pa: 620 },
  { pos: '3B', pa: 620 },
  { pos: 'RF', pa: 620 },
  { pos: 'LF', pa: 600 },
  { pos: '1B', pa: 620 },
  { pos: 'DH', pa: 600 },
];
export const BENCH_PA = [220, 180, 140, 100]; // backup C first
export const ROTATION_IP = [180, 170, 160, 150, 140, 40];
export const BULLPEN_IP = [70, 68, 65, 62, 60, 58, 55, 50, 40];
export const TEAM_IP = 1440;

/** Fielding positions used for eligibility, scarcest first. */
export const FIELD_POSITIONS = ['C', 'SS', 'CF', '2B', '3B', 'RF', 'LF', '1B'];
/** Playing a harder position implies you can play these. */
export const IMPLIED_POSITIONS: Record<string, string[]> = {
  SS: ['2B', '3B'],
  CF: ['LF', 'RF'],
  '2B': ['3B'],
  '3B': ['1B'],
  LF: ['RF'],
  RF: ['LF'],
};
