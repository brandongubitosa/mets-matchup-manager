import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { NO_GAME_SCHEDULED_TODAY } from '../services/mlbApi';
import { useTodaysGame, useTeamRoster, useGameLineup } from '../hooks';
import { TodaysGame, Player, LineupPlayer } from '../types';
import { TeamLogo } from './TeamLogo';
import { SkeletonGameCard } from './SkeletonLoader';
import { FieldingProjectionMini } from './FieldingProjectionMini';
import { buildFieldMapFromLineup, buildFieldMapFromRoster } from '../utils/fieldPositions';

interface TodaysGameCardProps {
  teamId: number;
  teamName: string;
  onViewMatchups?: (opponentId: number, opponentName: string) => void;
  onPredictGame?: (game: TodaysGame, opposingPitcher: Player | null) => void;
  onProbablePitcherPress?: (pitcher: Player, opponentTeamId: number, opponentTeamName: string) => void;
  onPlayerPress?: (playerId: number, opponentTeamId: number, opponentTeamName: string) => void;
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
  onPlayerPress,
  compact = false,
}) => {
  const { game, opposingPitcher, loading, error, refetch } = useTodaysGame(teamId);
  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch(true);
    setRefreshing(false);
  }, [refetch]);
  const { batters: myBatters, loading: myRosterLoading } = useTeamRoster(compact ? teamId : 0);
  const { batters: oppBatters, loading: oppRosterLoading } = useTeamRoster(
    compact ? (game?.opponent?.id ?? 0) : 0
  );
  const { homeLineup, awayLineup, loading: lineupLoading } = useGameLineup(
    compact ? game?.gameId : undefined
  );

  // Determine which lineup side belongs to my team vs opponent
  const myLineup: LineupPlayer[] = game?.isHome ? homeLineup : awayLineup;
  const oppLineup: LineupPlayer[] = game?.isHome ? awayLineup : homeLineup;

  const myFieldMap = useMemo(() => {
    if (myLineup.length > 0) return buildFieldMapFromLineup(myLineup);
    return buildFieldMapFromRoster(myBatters);
  }, [myLineup, myBatters]);

  const oppFieldMap = useMemo(() => {
    if (oppLineup.length > 0) return buildFieldMapFromLineup(oppLineup);
    return buildFieldMapFromRoster(oppBatters);
  }, [oppLineup, oppBatters]);

  const displayLineupLoading = compact && (myRosterLoading || oppRosterLoading || lineupLoading);

  if (loading) {
    return <SkeletonGameCard />;
  }

  if (error && error !== NO_GAME_SCHEDULED_TODAY) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.noGameContent}>
          <Text style={styles.scheduleErrorTitle}>Couldn&apos;t load schedule</Text>
          <Text style={styles.scheduleErrorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => refetch(true)}
            style={styles.retryButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retry loading schedule"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.noGameContent}>
          <Text style={styles.noGameTitle}>No Game Today</Text>
          <Text style={styles.noGameText}>
            {teamName} doesn&apos;t have a game scheduled for today.
          </Text>
          <TouchableOpacity
            onPress={() => refetch(true)}
            style={styles.retryButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh schedule"
          >
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const opponentAbbr = MLB_TEAMS[game.opponent.id]?.abbreviation || '???';
  const logoSize = compact ? 40 : 48;
  const isFinal = game.status === 'Final';
  const isLive  = game.status === 'Live';
  const isPostponed = game.status === 'Postponed' || game.status === 'Delayed' || game.status === 'Cancelled';

  // Determine winner for W/L badges
  const myScore   = game.isHome ? game.homeScore : game.awayScore;
  const oppScore  = game.isHome ? game.awayScore : game.homeScore;
  const iWon      = isFinal && myScore !== undefined && oppScore !== undefined && myScore > oppScore;
  const iLost     = isFinal && myScore !== undefined && oppScore !== undefined && myScore < oppScore;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <LinearGradient
        colors={isFinal ? ['#374151', '#4B5563'] : [COLORS.primaryDark, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          {isLive ? <PulsingDot /> : null}
          {isFinal ? (
            <View style={styles.finalBadge}>
              <Text style={styles.finalBadgeText}>FINAL</Text>
            </View>
          ) : (
            <Text style={styles.headerTitle}>
              {isLive ? 'LIVE' : isPostponed ? game.status.toUpperCase() : "TODAY'S GAME"}
            </Text>
          )}
        </View>
        <Text style={styles.gameTime}>
          {isFinal || isLive ? '' : formatGameTime(game.gameTime)}
        </Text>
      </LinearGradient>

      <View style={[styles.matchupRow, compact && styles.matchupRowCompact]}>
        <View style={styles.teamInfo}>
          <TeamLogo teamId={teamId} size={logoSize} />
          <Text style={[styles.teamAbbr, compact && styles.teamAbbrCompact]}>
            {MLB_TEAMS[teamId]?.abbreviation || '???'}
          </Text>
          {(isFinal || isLive) && myScore !== undefined ? (
            <Text style={[styles.scoreText, iWon && styles.scoreWinner, iLost && styles.scoreLoser]}>
              {myScore}
            </Text>
          ) : (
            <View style={[styles.homeAwayBadge, game.isHome && styles.homeAwayBadgeActive]}>
              <Text style={[styles.homeAway, game.isHome && styles.homeAwayActive]}>
                {game.isHome ? 'HOME' : 'AWAY'}
              </Text>
            </View>
          )}
          {isFinal && (
            <View style={[styles.resultBadge, iWon ? styles.resultWin : iLost ? styles.resultLoss : styles.resultTie]}>
              <Text style={styles.resultBadgeText}>{iWon ? 'W' : iLost ? 'L' : 'T'}</Text>
            </View>
          )}
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>{(isFinal || isLive) ? '–' : 'VS'}</Text>
        </View>

        <View style={styles.teamInfo}>
          <TeamLogo teamId={game.opponent.id} size={logoSize} />
          <Text style={[styles.teamAbbr, compact && styles.teamAbbrCompact]}>{opponentAbbr}</Text>
          {(isFinal || isLive) && oppScore !== undefined ? (
            <Text style={[styles.scoreText, iLost && styles.scoreWinner, iWon && styles.scoreLoser]}>
              {oppScore}
            </Text>
          ) : (
            <View style={[styles.homeAwayBadge, !game.isHome && styles.homeAwayBadgeActive]}>
              <Text style={[styles.homeAway, !game.isHome && styles.homeAwayActive]}>
                {game.isHome ? 'AWAY' : 'HOME'}
              </Text>
            </View>
          )}
          {isFinal && (
            <View style={[styles.resultBadge, iLost ? styles.resultWin : iWon ? styles.resultLoss : styles.resultTie]}>
              <Text style={styles.resultBadgeText}>{iLost ? 'W' : iWon ? 'L' : 'T'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Pitchers row — dual display in compact mode, single in default */}
      {compact ? (
        <View style={styles.dualPitcherRow}>
          {/* My team's pitcher */}
          <View style={styles.pitcherCol}>
            <Text style={styles.pitcherColLabel}>
              {MLB_TEAMS[teamId]?.abbreviation} SP
            </Text>
            {game.myProbablePitcher ? (
              <>
                <TouchableOpacity
                  onPress={() => onPlayerPress?.(game.myProbablePitcher!.id, game.opponent.id, game.opponent.name)}
                  disabled={!onPlayerPress}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.pitcherColName, onPlayerPress && styles.pitcherColNameTappable]} numberOfLines={1} ellipsizeMode="tail">
                    {game.myProbablePitcher.fullName.split(' ').slice(1).join(' ') || game.myProbablePitcher.fullName}
                  </Text>
                </TouchableOpacity>
                {game.myProbablePitcher.pitchHand && (
                  <Text style={styles.pitcherHandLabel}>
                    {game.myProbablePitcher.pitchHand === 'R' ? 'RHP' : 'LHP'}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.pitcherColTBD}>TBD</Text>
            )}
          </View>
          <View style={styles.pitcherColDivider} />
          {/* Opposing pitcher */}
          <View style={[styles.pitcherCol, styles.pitcherColRight]}>
            <Text style={styles.pitcherColLabel}>
              {opponentAbbr} SP
            </Text>
            {opposingPitcher ? (
              <>
                <TouchableOpacity
                  onPress={() => onPlayerPress?.(opposingPitcher.id, game.opponent.id, game.opponent.name)}
                  disabled={!onPlayerPress}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.pitcherColName, onPlayerPress && styles.pitcherColNameTappable]} numberOfLines={1} ellipsizeMode="tail">
                    {opposingPitcher.lastName || opposingPitcher.fullName}
                  </Text>
                </TouchableOpacity>
                {opposingPitcher.pitchHand?.code && (
                  <Text style={styles.pitcherHandLabel}>
                    {opposingPitcher.pitchHand.code === 'R' ? 'RHP' : 'LHP'}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.pitcherColTBD}>TBD</Text>
            )}
          </View>
        </View>
      ) : (
        opposingPitcher && (
          <View style={styles.pitcherInfo}>
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
        )
      )}

      {/* Fielding projection — compact: by defensive position (not batting order) */}
      {compact && (
        <View style={styles.lineupSection}>
          <Text style={styles.fieldSectionTitle}>Fielding projection</Text>
          <Text style={styles.fieldSectionHint}>
            Players on the field by position. Batting order updates when lineups are official.
          </Text>
          {!displayLineupLoading && (myLineup.length === 0 || oppLineup.length === 0) && (
            <View style={styles.projectedBanner}>
              <Text style={styles.projectedBannerText}>PROJECTED POSITIONS</Text>
            </View>
          )}

          {displayLineupLoading ? (
            <View style={styles.lineupLoading}>
              <ActivityIndicator size="small" color={COLORS.textMuted} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.fieldScrollContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
              }
            >
              <FieldingProjectionMini
                myAbbr={MLB_TEAMS[teamId]?.abbreviation ?? '—'}
                oppAbbr={opponentAbbr}
                myFieldMap={myFieldMap}
                oppFieldMap={oppFieldMap}
                onPlayerPress={onPlayerPress}
                opponentTeamId={game.opponent.id}
                opponentTeamName={game.opponent.name}
              />
            </ScrollView>
          )}
        </View>
      )}

      {/* Action buttons — hidden for completed games */}
      {!isFinal && (onViewMatchups || onPredictGame) && (
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

  // ── Dual pitcher row (compact) ───────────────────────────────────────────
  dualPitcherRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pitcherCol: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    alignItems: 'flex-start',
  },
  pitcherColRight: {
    alignItems: 'flex-end',
  },
  pitcherColDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  pitcherColLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pitcherColName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pitcherColNameTappable: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  pitcherColTBD: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  pitcherHandLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // ── Lineup section (compact) ─────────────────────────────────────────────
  lineupSection: {
    flex: 1,
    overflow: 'hidden',
  },
  fieldSectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  fieldSectionHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
    lineHeight: 16,
  },
  projectedBanner: {
    backgroundColor: `${COLORS.secondary}18`,
    paddingVertical: 3,
    alignItems: 'center',
  },
  projectedBannerText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 1,
  },
  lineupLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  fieldScrollContent: {
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.sm,
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
  scheduleErrorTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  scheduleErrorText: {
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
  finalBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  finalBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  scoreWinner: {
    color: COLORS.success,
  },
  scoreLoser: {
    color: COLORS.textMuted,
  },
  resultBadge: {
    marginTop: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultWin: {
    backgroundColor: COLORS.success,
  },
  resultLoss: {
    backgroundColor: COLORS.danger,
  },
  resultTie: {
    backgroundColor: COLORS.textMuted,
  },
  resultBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '900',
    color: COLORS.white,
  },
});
