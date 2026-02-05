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
  atBats: number;
  hits: number;
  avg: string;
  whiffs: number;
  swings: number;
  whiffRate: string;
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

export * from './navigation';
