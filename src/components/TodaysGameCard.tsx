import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, MLB_TEAMS } from '../constants';
import { useTodaysGame } from '../hooks';
import { TeamLogo } from './TeamLogo';

interface TodaysGameCardProps {
  teamId: number;
  teamName: string;
  onViewMatchups?: (opponentId: number, opponentName: string) => void;
}

const formatGameTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const TodaysGameCard: React.FC<TodaysGameCardProps> = ({
  teamId,
  teamName,
  onViewMatchups,
}) => {
  const { game, opposingPitcher, loading, error, refetch } = useTodaysGame(teamId);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Checking today's schedule...</Text>
        </View>
      </View>
    );
  }

  if (error || !game) {
    return (
      <View style={styles.container}>
        <View style={styles.noGameContent}>
          <Text style={styles.noGameIcon}>📅</Text>
          <Text style={styles.noGameTitle}>No Game Today</Text>
          <Text style={styles.noGameText}>
            {teamName} doesn't have a game scheduled for today.
          </Text>
          <TouchableOpacity onPress={refetch} style={styles.retryButton}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const opponentAbbr = MLB_TEAMS[game.opponent.id]?.abbreviation || '???';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Game</Text>
        <Text style={styles.gameTime}>{formatGameTime(game.gameTime)}</Text>
      </View>

      <View style={styles.matchupRow}>
        <View style={styles.teamInfo}>
          <TeamLogo teamId={teamId} size={50} />
          <Text style={styles.teamAbbr}>
            {MLB_TEAMS[teamId]?.abbreviation || '???'}
          </Text>
          <Text style={styles.homeAway}>{game.isHome ? 'HOME' : 'AWAY'}</Text>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>vs</Text>
        </View>

        <View style={styles.teamInfo}>
          <TeamLogo teamId={game.opponent.id} size={50} />
          <Text style={styles.teamAbbr}>{opponentAbbr}</Text>
          <Text style={styles.homeAway}>{game.isHome ? 'AWAY' : 'HOME'}</Text>
        </View>
      </View>

      {opposingPitcher && (
        <View style={styles.pitcherInfo}>
          <Text style={styles.pitcherLabel}>Probable Starter:</Text>
          <Text style={styles.pitcherName}>{opposingPitcher.fullName}</Text>
          {opposingPitcher.pitchHand && (
            <Text style={styles.pitcherHand}>
              ({opposingPitcher.pitchHand.code === 'R' ? 'RHP' : 'LHP'})
            </Text>
          )}
        </View>
      )}

      {onViewMatchups && (
        <TouchableOpacity
          style={styles.viewMatchupsButton}
          onPress={() => onViewMatchups(game.opponent.id, game.opponent.name)}
          accessibilityRole="button"
          accessibilityLabel={`View matchups against ${game.opponent.name}`}
        >
          <Text style={styles.viewMatchupsText}>View Matchups vs {opponentAbbr}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gameTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  teamInfo: {
    alignItems: 'center',
    flex: 1,
  },
  teamAbbr: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  homeAway: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
    letterSpacing: 1,
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '600',
  },
  pitcherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    gap: 4,
  },
  pitcherLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  pitcherName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.black,
  },
  pitcherHand: {
    fontSize: 12,
    color: COLORS.gray,
  },
  viewMatchupsButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewMatchupsText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  noGameContent: {
    alignItems: 'center',
    padding: 24,
  },
  noGameIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  noGameTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  noGameText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
  },
  retryText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
});
