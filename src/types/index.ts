export interface Player {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  primaryNumber?: string;
  position: {
    code: string;
    name: string;
    type: string;
    abbreviation: string;
  };
  batSide?: {
    code: string;
    description: string;
  };
  pitchHand?: {
    code: string;
    description: string;
  };
}

export interface MatchupStats {
  gamesPlayed: number;
  /** Plate appearances (when provided by MLB vs-pitcher splits). */
  plateAppearances?: number;
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
}

export interface PitchTypeStats {
  pitchType: string;
  pitchCode: string;
  atBats: number;
  hits: number;
  avg: string;
  whiffs: number;
  swings: number;
  whiffRate: string;
}

export interface PitcherArsenalPitch {
  pitchCode: string;
  pitchName: string;
  usagePct: number;   // 0–1
  avgVelocity: number;
  avgSpin?: number;
  strikeoutPct?: number;
}

export interface PitchArsenalMatchup {
  pitcher: PitcherArsenalPitch;
  batterStats?: PitchTypeStats; // undefined if no recorded ABs vs this pitch
}

export interface MatchupResult {
  batter: Player;
  pitcher: Player;
  stats: MatchupStats;
  pitchTypes?: PitchTypeStats[];
  seasonStats?: MatchupStats;
  last10Games?: MatchupStats;
}

export interface Team {
  id: number;
  name: string;
  abbreviation: string;
}

export interface TodaysGame {
  gameId: number;
  homeTeam: {
    id: number;
    name: string;
  };
  awayTeam: {
    id: number;
    name: string;
  };
  gameTime: string;
  isHome: boolean;
  opponent: {
    id: number;
    name: string;
  };
  probablePitcher?: {
    id: number;
    fullName: string;
  };
  myProbablePitcher?: {
    id: number;
    fullName: string;
    pitchHand?: string;
  };
  status: 'Preview' | 'Live' | 'Final' | 'Postponed' | 'Delayed' | 'Cancelled';
  homeScore?: number;
  awayScore?: number;
}

export interface RosterPlayer extends Player {
  jerseyNumber: string;
  status: {
    code: string;
    description: string;
  };
}

// API Response types for type safety
export interface MLBRosterResponse {
  roster: Array<{
    person: {
      id: number;
      fullName: string;
      firstName?: string;
      lastName?: string;
    };
    jerseyNumber: string;
    position: {
      code: string;
      name: string;
      type: string;
      abbreviation: string;
    };
    status: {
      code: string;
      description: string;
    };
  }>;
}

export interface MLBPlayerResponse {
  people: Array<{
    id: number;
    fullName: string;
    firstName: string;
    lastName: string;
    primaryNumber?: string;
    primaryPosition: {
      code: string;
      name: string;
      type: string;
      abbreviation: string;
    };
    batSide?: {
      code: string;
      description: string;
    };
    pitchHand?: {
      code: string;
      description: string;
    };
  }>;
}

export interface MLBStatsResponse {
  stats: Array<{
    splits: Array<{
      stat: {
        gamesPlayed?: number;
        atBats?: number;
        hits?: number;
        doubles?: number;
        triples?: number;
        homeRuns?: number;
        rbi?: number;
        baseOnBalls?: number;
        strikeOuts?: number;
        hitByPitch?: number;
        sacFlies?: number;
      };
    }>;
  }>;
}

export interface PitcherSeasonStats {
  era: string;
  whip: string;
  strikeouts: number;
  walks: number;
  inningsPitched: string;
  gamesStarted: number;
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  saves?: number;
  homeRuns?: number;
  hitByPitch?: number;
  fip?: string;
}

export interface BatterPredictionItem {
  id: number;
  fullName: string;
  batSide?: { code: string; description: string };
  seasonOPS: number;
  recentOPS?: number;    // last-15-day OPS
  recentGames?: number;  // games sampled in recent window
  h2hOPS: number;
  h2hAtBats: number;
  /** Career PA vs this pitcher (same source as MatchupDetail career H2H). */
  h2hPlateAppearances: number;
  h2hSeason?: number;
  effectiveOPS: number;
  platoonAdvantage: 'advantage' | 'disadvantage' | 'neutral' | 'switch';
}

export interface LineupPlayer {
  battingOrder: number; // 1–9
  playerId: number;
  fullName: string;
  position: string; // position abbreviation
}

export interface TeamStaffStats {
  era: string;
  whip: string;
  strikeouts: number;
  walks: number;
  rsPerGame?: number;
  raPerGame?: number;
}

export interface TeamPredictionData {
  teamId: number;
  teamName: string;
  pitcher: Player | null;
  pitcherStats: PitcherSeasonStats | null;
  pitcherRecentEra?: string; // last-21-day ERA
  batters: BatterPredictionItem[];
  offensiveScore: number;
  staffStats?: TeamStaffStats | null;
}

export interface LiveGameState {
  homeScore: number;
  awayScore: number;
  inning: number;
  inningHalf: string;
  preGameProbability: number; // probability before live adjustment
}

export interface GamePredictionResult {
  homeTeam: TeamPredictionData;
  awayTeam: TeamPredictionData;
  predictedWinner: 'home' | 'away';
  homeWinProbability: number;
  confidence: number;
  keyFactors: string[];
  isLive: boolean;
  liveGameState?: LiveGameState;
  parkFactor: number;
}

export interface BatterSplitEntry {
  code: string;         // 'h' | 'a' | 'vl' | 'vr'
  description: string;  // 'Home Games' | 'Away Games' | 'vs Left' | 'vs Right'
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  strikeouts: number;
  walks: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
}

export interface RecentBatterStats {
  games: number;
  atBats: number;
  hits: number;
  homeRuns: number;
  rbi: number;
  strikeouts: number;
  walks: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
}

export interface RecentPitcherStats {
  games: number;
  inningsPitched: string;
  earnedRuns: number;
  strikeouts: number;
  walks: number;
  hits: number;
  era: string;
  whip: string;
}

export interface HotZone {
  zone: string;
  value: string; // batting average e.g. ".350"
  color?: string;
  temp?: string;
}

export type GameStatus = 'Preview' | 'Pre-Game' | 'Warmup' | 'In Progress' | 'Final' | 'Game Over' | 'Postponed' | 'Delayed' | 'Suspended';

export interface LiveGame {
  gamePk: number;
  gameDate: string;
  status: {
    abstractGameState: string;
    detailedState: GameStatus | string;
    statusCode: string;
  };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  homeScore: number;
  awayScore: number;
  homeHits: number;
  awayHits: number;
  homeErrors: number;
  awayErrors: number;
  currentInning: number | null;
  currentInningOrdinal: string | null;
  inningHalf: 'top' | 'bottom' | null;
  outs: number | null;
  homeProbablePitcher?: { id: number; fullName: string };
  awayProbablePitcher?: { id: number; fullName: string };
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

// Result type for better error handling
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface BullpenAppearance {
  date: string;
  inningsPitched: string;
  numberOfPitches: number;
  earnedRuns: number;
}

export interface BullpenPitcherStatus {
  playerId: number;
  fullName: string;
  daysRest: number;             // days since last appearance; 99 = no recent outing
  lastAppearance?: BullpenAppearance;
  consecutiveDays: number;      // consecutive days appeared
  status: 'available' | 'limited' | 'unavailable';
}

export interface TeamBullpenStatus {
  teamId: number;
  teamName: string;
  pitchers: BullpenPitcherStatus[];
}

export * from './navigation';
