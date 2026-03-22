import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { useTodaysGame } from '../hooks';
import { TodaysGame, Player } from '../types';
import { TeamLogo } from './TeamLogo';
import { SkeletonGameCard } from './SkeletonLoader';

interface TodaysGameCardProps {
  teamId: number;
  teamName: string;
  onViewMatchups?: (opponentId: number, opponentName: string) => void;
  onPredictGame?: (game: TodaysGame, opposingPitcher: Player | null) => void;
  onProbablePitcherPress?: (pitcher: Player, opponentTeamId: number, opponentTeamName: string) => void;
  compact?: boolean;
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
  onPredictGame,
  onProbablePitcherPress,
  compact = false,
}) => {
  const { game, opposingPitcher, loading, error, refetch } = useTodaysGame(teamId);

  if (loading) {
    return <SkeletonGameCard />;
  }

  if (error || !game) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
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
  const logoSize = compact ? 40 : 48;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
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

      <View style={[styles.matchupRow, compact && styles.matchupRowCompact]}>
        <View style={styles.teamInfo}>
          <TeamLogo teamId={teamId} size={logoSize} />
          <Text style={[styles.teamAbbr, compact && styles.teamAbbrCompact]}>
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
          <TeamLogo teamId={game.opponent.id} size={logoSize} />
          <Text style={[styles.teamAbbr, compact && styles.teamAbbrCompact]}>{opponentAbbr}</Text>
          <View style={[styles.homeAwayBadge, !game.isHome && styles.homeAwayBadgeActive]}>
            <Text style={[styles.homeAway, !game.isHome && styles.homeAwayActive]}>
              {game.isHome ? 'AWAY' : 'HOME'}
            </Text>
          </View>
        </View>
      </View>

      {opposingPitcher && (
        <View style={[styles.pitcherInfo, compact && styles.pitcherInfoCompact]}>
          <Text style={styles.pitcherLabel}>Probable Starter  </Text>
          <TouchableOpacity
            onPress={() =>
              onProbablePitcherPress?.(opposingPitcher, game.opponent.id, game.opponent.name)
            }
            disabled={!onProbablePitcherPress}
            activeOpacity={0.75}
            style={styles.pitcherNameWrap}
          >
            <Text style={styles.pitcherName} numberOfLines={1} ellipsizeMode="tail">
              {opposingPitcher.fullName}
            </Text>
          </TouchableOpacity>
          {opposingPitcher.pitchHand && (
            <View style={styles.pitcherHandBadge}>
              <Text style={styles.pitcherHand}>
                {opposingPitcher.pitchHand.code === 'R' ? 'RHP' : 'LHP'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action buttons — side-by-side in compact mode */}
      {(onViewMatchups || onPredictGame) && (
        <View style={compact ? styles.buttonsRow : undefined}>
          {onViewMatchups && (
            <TouchableOpacity
              style={[styles.viewMatchupsButton, compact && styles.viewMatchupsButtonCompact]}
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
                <Text style={styles.viewMatchupsText}>
                  {compact ? `vs ${opponentAbbr} Matchups` : `View Matchups vs ${opponentAbbr}`}
                </Text>
                <Text style={styles.viewMatchupsArrow}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {onPredictGame && (
            <TouchableOpacity
              style={[styles.predictButton, compact && styles.predictButtonCompact]}
              onPress={() => onPredictGame(game, opposingPitcher)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Predict game outcome"
            >
              <Text style={styles.predictButtonText}>
                {compact ? 'Predict' : 'Predict Game Outcome'}
              </Text>
              <Text style={styles.predictButtonArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>
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
  containerCompact: {
    flex: 1,
    marginBottom: 0,
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
  matchupRowCompact: {
    paddingVertical: SPACING.sm,
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
  teamAbbrCompact: {
    fontSize: FONT_SIZE.lg,
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
  },
  pitcherInfoCompact: {
    paddingBottom: SPACING.xs,
  },
  pitcherLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    flexShrink: 0,
  },
  pitcherNameWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
  pitcherName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
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
  buttonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  viewMatchupsButton: {
    overflow: 'hidden',
  },
  viewMatchupsButtonCompact: {
    flex: 1,
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
  predictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
  },
  predictButtonCompact: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.borderLight,
  },
  predictButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: FONT_SIZE.sm,
  },
  predictButtonArrow: {
    color: COLORS.primary,
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
