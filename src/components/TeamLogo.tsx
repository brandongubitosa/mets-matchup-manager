import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, MLB_TEAMS } from '../constants';

interface TeamLogoProps {
  teamId: number;
  size?: number;
}

// Map team abbreviations to ESPN's format (lowercase, some differ)
const ESPN_ABBR_MAP: { [key: string]: string } = {
  'LAA': 'laa',
  'ARI': 'ari',
  'BAL': 'bal',
  'BOS': 'bos',
  'CHC': 'chc',
  'CIN': 'cin',
  'CLE': 'cle',
  'COL': 'col',
  'DET': 'det',
  'HOU': 'hou',
  'KC': 'kc',
  'LAD': 'lad',
  'WSH': 'wsh',
  'NYM': 'nym',
  'OAK': 'oak',
  'PIT': 'pit',
  'SD': 'sd',
  'SEA': 'sea',
  'SF': 'sf',
  'STL': 'stl',
  'TB': 'tb',
  'TEX': 'tex',
  'TOR': 'tor',
  'MIN': 'min',
  'PHI': 'phi',
  'ATL': 'atl',
  'CWS': 'chw',
  'MIA': 'mia',
  'NYY': 'nyy',
  'MIL': 'mil',
};

const getLogoUrl = (teamId: number): string => {
  const team = MLB_TEAMS[teamId];
  if (!team) return '';

  const espnAbbr = ESPN_ABBR_MAP[team.abbreviation] || team.abbreviation.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${espnAbbr}.png`;
};

export const TeamLogo: React.FC<TeamLogoProps> = ({
  teamId,
  size = 40,
}) => {
  const [error, setError] = useState(false);

  const team = MLB_TEAMS[teamId];
  const abbreviation = team?.abbreviation || '???';
  const logoUrl = getLogoUrl(teamId);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (error || !logoUrl) {
    return (
      <View style={[styles.fallbackContainer, containerStyle]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.35 }]}>
          {abbreviation}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size }}
        onError={() => setError(true)}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  fallbackText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});
