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

export interface RosterPlayer extends Player {
  jerseyNumber: string;
  status: {
    code: string;
    description: string;
  };
}
