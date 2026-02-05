import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { useTodaysGame } from '../hooks';
import { TeamLogo } from './TeamLogo';
import { SkeletonGameCard } from './SkeletonLoader';

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

const PulsingDot: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
  );
};

export const TodaysGameCard: React.FC<TodaysGameCardProps> = ({
  teamId,
  teamName,
  onViewMatchups,
}) => {
  const { game, opposingPitcher, loading, error, refetch } = useTodaysGame(teamId);

  if (loading) {
    return <SkeletonGameCard />;
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
          <TouchableOpacity onPress={refetch} style={styles.retryButton} activeOpacity={0.7}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const opponentAbbr = MLB_TEAMS[game.opponent.id]?.abbreviation || '???';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <PulsingDot />
          <Text style={styles.headerTitle}>TODAY'S GAME</Text>
        </View>
        <Text style={styles.gameTime}>{formatGameTime(game.gameTime)}</Text>
      </LinearGradient>

      <View style={styles.matchupRow}>
        <View style={styles.teamInfo}>
          <TeamLogo teamId={teamId} size={48} />
          <Text style={styles.teamAbbr}>
            {MLB_TEAMS[teamId]?.abbreviation || '???'}
          </Text>
          <View style={[styles.homeAwayBadge, game.isHome && styles.homeAwayBadgeActive]}>
            <Text style={[styles.homeAway, game.isHome && styles.homeAwayActive]}>
              {game.isHome ? 'HOME' : 'AWAY'}
            </Text>
          </View>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.teamInfo}>
          <TeamLogo teamId={game.opponent.id} size={48} />
          <Text style={styles.teamAbbr}>{opponentAbbr}</Text>
          <View style={[styles.homeAwayBadge, !game.isHome && styles.homeAwayBadgeActive]}>
            <Text style={[styles.homeAway, !game.isHome && styles.homeAwayActive]}>
              {game.isHome ? 'AWAY' : 'HOME'}
            </Text>
          </View>
        </View>
      </View>

      {opposingPitcher && (
        <View style={styles.pitcherInfo}>
          <Text style={styles.pitcherLabel}>Probable Starter</Text>
          <Text style={styles.pitcherName}>{opposingPitcher.fullName}</Text>
          {opposingPitcher.pitchHand && (
            <View style={styles.pitcherHandBadge}>
              <Text style={styles.pitcherHand}>
                {opposingPitcher.pitchHand.code === 'R' ? 'RHP' : 'LHP'}
              </Text>
            </View>
          )}
        </View>
      )}

      {onViewMatchups && (
        <TouchableOpacity
          style={styles.viewMatchupsButton}
          onPress={() => onViewMatchups(game.opponent.id, game.opponent.name)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`View matchups against ${game.opponent.name}`}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.viewMatchupsGradient}
          >
            <Text style={styles.viewMatchupsText}>View Matchups vs {opponentAbbr}</Text>
            <Text style={styles.viewMatchupsArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  headerTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  gameTime: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.secondaryLight,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  teamInfo: {
    alignItems: 'center',
    flex: 1,
  },
  teamAbbr: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  homeAwayBadge: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  homeAwayBadgeActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  homeAway: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
  },
  homeAwayActive: {
    color: COLORS.primary,
  },
  vsContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '800',
  },
  pitcherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
  },
  pitcherLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  pitcherName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pitcherHandBadge: {
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  pitcherHand: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: '700',
  },
  viewMatchupsButton: {
    overflow: 'hidden',
  },
  viewMatchupsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  viewMatchupsText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
  },
  viewMatchupsArrow: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  noGameContent: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  noGameIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  noGameTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  noGameText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
  },
  retryText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
