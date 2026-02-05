export const METS_TEAM_ID = 121;

export const COLORS = {
  primary: '#002D72', // Mets blue
  secondary: '#D50032', // MLB red
  background: '#F5F5F5',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
};

export const MLB_TEAMS: { [key: number]: { name: string; abbreviation: string } } = {
  108: { name: 'Los Angeles Angels', abbreviation: 'LAA' },
  109: { name: 'Arizona Diamondbacks', abbreviation: 'ARI' },
  110: { name: 'Baltimore Orioles', abbreviation: 'BAL' },
  111: { name: 'Boston Red Sox', abbreviation: 'BOS' },
  112: { name: 'Chicago Cubs', abbreviation: 'CHC' },
  113: { name: 'Cincinnati Reds', abbreviation: 'CIN' },
  114: { name: 'Cleveland Guardians', abbreviation: 'CLE' },
  115: { name: 'Colorado Rockies', abbreviation: 'COL' },
  116: { name: 'Detroit Tigers', abbreviation: 'DET' },
  117: { name: 'Houston Astros', abbreviation: 'HOU' },
  118: { name: 'Kansas City Royals', abbreviation: 'KC' },
  119: { name: 'Los Angeles Dodgers', abbreviation: 'LAD' },
  120: { name: 'Washington Nationals', abbreviation: 'WSH' },
  121: { name: 'New York Mets', abbreviation: 'NYM' },
  133: { name: 'Oakland Athletics', abbreviation: 'OAK' },
  134: { name: 'Pittsburgh Pirates', abbreviation: 'PIT' },
  135: { name: 'San Diego Padres', abbreviation: 'SD' },
  136: { name: 'Seattle Mariners', abbreviation: 'SEA' },
  137: { name: 'San Francisco Giants', abbreviation: 'SF' },
  138: { name: 'St. Louis Cardinals', abbreviation: 'STL' },
  139: { name: 'Tampa Bay Rays', abbreviation: 'TB' },
  140: { name: 'Texas Rangers', abbreviation: 'TEX' },
  141: { name: 'Toronto Blue Jays', abbreviation: 'TOR' },
  142: { name: 'Minnesota Twins', abbreviation: 'MIN' },
  143: { name: 'Philadelphia Phillies', abbreviation: 'PHI' },
  144: { name: 'Atlanta Braves', abbreviation: 'ATL' },
  145: { name: 'Chicago White Sox', abbreviation: 'CWS' },
  146: { name: 'Miami Marlins', abbreviation: 'MIA' },
  147: { name: 'New York Yankees', abbreviation: 'NYY' },
  158: { name: 'Milwaukee Brewers', abbreviation: 'MIL' },
};

export const NL_EAST_TEAMS = [121, 143, 144, 146, 120]; // Mets, Phillies, Braves, Marlins, Nationals

// MLB team logo URL (PNG format, works better with React Native Image)
export const getTeamLogoUrl = (teamId: number, size: number = 100): string => {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
};

// Alternative PNG logo URL (better compatibility)
export const getTeamLogoPngUrl = (teamId: number): string => {
  return `https://www.mlbstatic.com/team-logos/team-cap-on-light/${teamId}.svg`;
};
