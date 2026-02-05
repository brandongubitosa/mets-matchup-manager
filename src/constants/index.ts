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
