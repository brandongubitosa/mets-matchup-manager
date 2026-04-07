import { Platform, ViewStyle } from 'react-native';

export const METS_TEAM_ID = 121;

export const COLORS = {
  // Core brand
  primary: '#002D72',       // Mets blue
  primaryLight: '#1A4A8A',  // Lighter blue for gradients
  primaryDark: '#001A45',   // Darker blue for gradients
  secondary: '#D50032',     // MLB red
  secondaryLight: '#FF1A50',

  // Surfaces
  background: '#F0F2F5',
  surfaceElevated: '#FFFFFF',
  white: '#FFFFFF',
  black: '#1A1A2E',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Neutral
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Semantic
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  // Overlay
  overlay: 'rgba(0,0,0,0.5)',
  glassBg: 'rgba(255,255,255,0.15)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
} as const;

export const LINE_HEIGHT = {
  xs: 14,
  sm: 16,
  md: 20,
  base: 22,
  lg: 24,
  xl: 28,
  xxl: 32,
  xxxl: 40,
  hero: 48,
} as const;

type ShadowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export const SHADOW: Record<'sm' | 'md' | 'lg', ShadowStyle> = {
  sm: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const WEB_MAX_WIDTH = 480;

export const isWeb = Platform.OS === 'web';

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

// Ballpark coordinates and dome status, keyed by home team ID
export const BALLPARK_INFO: Record<number, { lat: number; lng: number; name: string; dome: boolean; timezone: string }> = {
  108: { lat: 33.8003, lng: -117.8827, name: 'Angel Stadium',          dome: false, timezone: 'America/Los_Angeles' },
  109: { lat: 33.4453, lng: -112.0667, name: 'Chase Field',            dome: true,  timezone: 'America/Phoenix' },
  110: { lat: 39.2838, lng: -76.6218,  name: 'Oriole Park',            dome: false, timezone: 'America/New_York' },
  111: { lat: 42.3467, lng: -71.0972,  name: 'Fenway Park',            dome: false, timezone: 'America/New_York' },
  112: { lat: 41.9484, lng: -87.6553,  name: 'Wrigley Field',          dome: false, timezone: 'America/Chicago' },
  113: { lat: 39.0979, lng: -84.5082,  name: 'Great American Ball Park',dome: false, timezone: 'America/New_York' },
  114: { lat: 41.4962, lng: -81.6852,  name: 'Progressive Field',      dome: false, timezone: 'America/New_York' },
  115: { lat: 39.7559, lng: -104.9942, name: 'Coors Field',            dome: false, timezone: 'America/Denver' },
  116: { lat: 42.3390, lng: -83.0485,  name: 'Comerica Park',          dome: false, timezone: 'America/New_York' },
  117: { lat: 29.7572, lng: -95.3555,  name: 'Minute Maid Park',       dome: true,  timezone: 'America/Chicago' },
  118: { lat: 39.0514, lng: -94.4803,  name: 'Kauffman Stadium',       dome: false, timezone: 'America/Chicago' },
  119: { lat: 34.0739, lng: -118.2400, name: 'Dodger Stadium',         dome: false, timezone: 'America/Los_Angeles' },
  120: { lat: 38.8730, lng: -77.0074,  name: 'Nationals Park',         dome: false, timezone: 'America/New_York' },
  121: { lat: 40.7571, lng: -73.8458,  name: 'Citi Field',             dome: false, timezone: 'America/New_York' },
  133: { lat: 37.7516, lng: -122.2005, name: 'Oakland Coliseum',       dome: false, timezone: 'America/Los_Angeles' },
  134: { lat: 40.4469, lng: -80.0057,  name: 'PNC Park',               dome: false, timezone: 'America/New_York' },
  135: { lat: 32.7073, lng: -117.1567, name: 'Petco Park',             dome: false, timezone: 'America/Los_Angeles' },
  136: { lat: 47.5914, lng: -122.3325, name: 'T-Mobile Park',          dome: true,  timezone: 'America/Los_Angeles' },
  137: { lat: 37.7786, lng: -122.3893, name: 'Oracle Park',            dome: false, timezone: 'America/Los_Angeles' },
  138: { lat: 38.6226, lng: -90.1928,  name: 'Busch Stadium',          dome: false, timezone: 'America/Chicago' },
  139: { lat: 27.7683, lng: -82.6534,  name: 'Tropicana Field',        dome: true,  timezone: 'America/New_York' },
  140: { lat: 32.7512, lng: -97.0832,  name: 'Globe Life Field',       dome: true,  timezone: 'America/Chicago' },
  141: { lat: 43.6414, lng: -79.3894,  name: 'Rogers Centre',          dome: true,  timezone: 'America/New_York' },
  142: { lat: 44.9817, lng: -93.2778,  name: 'Target Field',           dome: false, timezone: 'America/Chicago' },
  143: { lat: 39.9056, lng: -75.1665,  name: 'Citizens Bank Park',     dome: false, timezone: 'America/New_York' },
  144: { lat: 33.8908, lng: -84.4677,  name: 'Truist Park',            dome: false, timezone: 'America/New_York' },
  145: { lat: 41.8300, lng: -87.6339,  name: 'Guaranteed Rate Field',  dome: false, timezone: 'America/Chicago' },
  146: { lat: 25.7781, lng: -80.2196,  name: 'loanDepot park',         dome: true,  timezone: 'America/New_York' },
  147: { lat: 40.8296, lng: -73.9262,  name: 'Yankee Stadium',         dome: false, timezone: 'America/New_York' },
  158: { lat: 43.0281, lng: -87.9712,  name: 'American Family Field',  dome: true,  timezone: 'America/Chicago' },
};
