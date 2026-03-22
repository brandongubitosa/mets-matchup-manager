import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { LiveScoresScreenNavigationProp, LiveScoresScreenRouteProp, LiveGame } from '../types';
import { useLiveScores } from '../hooks/useLiveScores';
import { TeamLogo } from '../components';

type LiveScoresScreenProps = {
  navigation: LiveScoresScreenNavigationProp;
  route: LiveScoresScreenRouteProp;
};

const formatGameTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatLastUpdated = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

const PulsingDot: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />;
};

const InningIndicator: React.FC<{ game: LiveGame }> = ({ game }) => {
  const isTop = game.inningHalf === 'top';
  return (
    <View style={styles.inningContainer}>
      <View style={styles.inningArrows}>
        <Text style={[styles.inningArrow, isTop && styles.inningArrowActive]}>
          {'\u25B2'}
        </Text>
        <Text style={[styles.inningArrow, !isTop && styles.inningArrowActive]}>
          {'\u25BC'}
        </Text>
      </View>
      <Text style={styles.inningText}>{game.currentInning}</Text>
    </View>
  );
};

const OutIndicator: React.FC<{ outs: number }> = ({ outs }) => (
  <View style={styles.outsRow}>
    {[0, 1, 2].map((i) => (
      <View key={i} style={[styles.outDot, i < outs && styles.outDotFilled]} />
    ))}
  </View>
);

const GameStatusBadge: React.FC<{ game: LiveGame }> = ({ game }) => {
  const state = game.status.abstractGameState;
  const detail = game.status.detailedState;

  if (state === 'Live') {
    return (
      <View style={[styles.statusBadge, styles.statusLive]}>
        <PulsingDot />
        <Text style={styles.statusLiveText}>LIVE</Text>
      </View>
    );
  }

  if (state === 'Final') {
    return (
      <View style={[styles.statusBadge, styles.statusFinal]}>
        <Text style={styles.statusFinalText}>FINAL</Text>
      </View>
    );
  }

  if (detail === 'Postponed') {
    return (
      <View style={[styles.statusBadge, styles.statusPostponed]}>
        <Text style={styles.statusPostponedText}>PPD</Text>
      </View>
    );
  }

  return (
    <View style={[styles.statusBadge, styles.statusPreview]}>
      <Text style={styles.statusPreviewText}>{formatGameTime(game.gameDate)}</Text>
    </View>
  );
};

const LiveGameCard: React.FC<{
  game: LiveGame;
  isHighlighted: boolean;
  onProbablePitcherPress?: (payload: {
    playerId: number;
    opponentTeamId: number;
    opponentTeamName: string;
  }) => void;
}> = ({ game, isHighlighted, onProbablePitcherPress }) => {
  const isLive = game.status.abstractGameState === 'Live';
  const isFinal = game.status.abstractGameState === 'Final';
  const hasStarted = isLive || isFinal;

  const awayAbbr = MLB_TEAMS[game.awayTeam.id]?.abbreviation ?? '???';
  const homeAbbr = MLB_TEAMS[game.homeTeam.id]?.abbreviation ?? '???';

  const awayWinning = hasStarted && game.awayScore > game.homeScore;
  const homeWinning = hasStarted && game.homeScore > game.awayScore;

  return (
    <View style={[styles.gameCard, isHighlighted && styles.gameCardHighlighted]}>
      {isHighlighted && <View style={styles.highlightStripe} />}

      <View style={styles.gameCardInner}>
        {/* Status + inning info */}
        <View style={styles.gameHeader}>
          <GameStatusBadge game={game} />
          {isLive && game.outs != null && <OutIndicator outs={game.outs} />}
        </View>

        {/* Scoreboard */}
        <View style={styles.scoreboard}>
          {/* Away team row */}
          <View style={styles.teamRow}>
            <TeamLogo teamId={game.awayTeam.id} size={28} />
            <Text style={[styles.teamName, awayWinning && styles.teamNameWinning]} numberOfLines={1}>
              {awayAbbr}
            </Text>
            {!hasStarted && game.awayProbablePitcher && (
              <TouchableOpacity
                onPress={() =>
                  onProbablePitcherPress?.({
                    playerId: game.awayProbablePitcher!.id,
                    opponentTeamId: game.homeTeam.id,
                    opponentTeamName: game.homeTeam.name,
                  })
                }
                disabled={!onProbablePitcherPress}
                activeOpacity={0.7}
                style={styles.probablePitcherHit}
              >
                <Text style={styles.probablePitcher} numberOfLines={1}>
                  {game.awayProbablePitcher.fullName}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.scoreSpacer} />
            {hasStarted && (
              <Text style={[styles.score, awayWinning && styles.scoreWinning]}>
                {game.awayScore}
              </Text>
            )}
          </View>

          {/* Home team row */}
          <View style={styles.teamRow}>
            <TeamLogo teamId={game.homeTeam.id} size={28} />
            <Text style={[styles.teamName, homeWinning && styles.teamNameWinning]} numberOfLines={1}>
              {homeAbbr}
            </Text>
            {!hasStarted && game.homeProbablePitcher && (
              <TouchableOpacity
                onPress={() =>
                  onProbablePitcherPress?.({
                    playerId: game.homeProbablePitcher!.id,
                    opponentTeamId: game.awayTeam.id,
                    opponentTeamName: game.awayTeam.name,
                  })
                }
                disabled={!onProbablePitcherPress}
                activeOpacity={0.7}
                style={styles.probablePitcherHit}
              >
                <Text style={styles.probablePitcher} numberOfLines={1}>
                  {game.homeProbablePitcher.fullName}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.scoreSpacer} />
            {hasStarted && (
              <Text style={[styles.score, homeWinning && styles.scoreWinning]}>
                {game.homeScore}
              </Text>
            )}
          </View>
        </View>

        {/* Inning indicator for live games */}
        {isLive && game.currentInning != null && (
          <View style={styles.gameFooter}>
            <InningIndicator game={game} />
          </View>
        )}

        {/* R-H-E line for finished games */}
        {isFinal && (
          <View style={styles.rheContainer}>
            <View style={styles.rheHeader}>
              <Text style={styles.rheLabel} />
              <Text style={styles.rheColHeader}>R</Text>
              <Text style={styles.rheColHeader}>H</Text>
              <Text style={styles.rheColHeader}>E</Text>
            </View>
            <View style={styles.rheRow}>
              <Text style={styles.rheTeam}>{awayAbbr}</Text>
              <Text style={[styles.rheValue, awayWinning && styles.rheValueBold]}>{game.awayScore}</Text>
              <Text style={styles.rheValue}>{game.awayHits}</Text>
              <Text style={styles.rheValue}>{game.awayErrors}</Text>
            </View>
            <View style={styles.rheRow}>
              <Text style={styles.rheTeam}>{homeAbbr}</Text>
              <Text style={[styles.rheValue, homeWinning && styles.rheValueBold]}>{game.homeScore}</Text>
              <Text style={styles.rheValue}>{game.homeHits}</Text>
              <Text style={styles.rheValue}>{game.homeErrors}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export const LiveScoresScreen: React.FC<LiveScoresScreenProps> = ({ navigation, route }) => {
  const highlightTeamId = route.params?.highlightTeamId;
  const { games, loading, error, lastUpdated, hasLiveGames, refetch } = useLiveScores();

  const sortedGames = [...games].sort((a, b) => {
    const stateOrder: Record<string, number> = { Live: 0, Preview: 2, Final: 3 };
    const aOrder = stateOrder[a.status.abstractGameState] ?? 1;
    const bOrder = stateOrder[b.status.abstractGameState] ?? 1;
    if (aOrder !== bOrder) return aOrder - bOrder;

    const aHighlight = a.homeTeam.id === highlightTeamId || a.awayTeam.id === highlightTeamId;
    const bHighlight = b.homeTeam.id === highlightTeamId || b.awayTeam.id === highlightTeamId;
    if (aHighlight && !bHighlight) return -1;
    if (!aHighlight && bHighlight) return 1;

    return new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backText}>{'\u2039'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Live Scores</Text>
            {hasLiveGames && (
              <View style={styles.liveIndicator}>
                <PulsingDot />
                <Text style={styles.liveCountText}>
                  {games.filter((g) => g.status.abstractGameState === 'Live').length} live
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={refetch} style={styles.refreshButton} activeOpacity={0.7}>
            <Text style={styles.refreshIcon}>↻</Text>
          </TouchableOpacity>
        </View>
        {lastUpdated && (
          <Text style={styles.lastUpdatedText}>
            Updated {formatLastUpdated(lastUpdated)}
          </Text>
        )}
      </LinearGradient>

      {/* Content */}
      {loading && games.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading scores...</Text>
        </View>
      ) : error && games.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Unable to load scores</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryButton} activeOpacity={0.7}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : sortedGames.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚾</Text>
          <Text style={styles.emptyTitle}>No Games Today</Text>
          <Text style={styles.emptyText}>Check back on a game day for live scores.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedGames}
          keyExtractor={(item) => item.gamePk.toString()}
          renderItem={({ item }) => (
            <LiveGameCard
              game={item}
              isHighlighted={
                item.homeTeam.id === highlightTeamId || item.awayTeam.id === highlightTeamId
              }
              onProbablePitcherPress={({ playerId, opponentTeamId, opponentTeamName }) =>
                navigation.navigate('PlayerBackCard', {
                  playerId,
                  opponentTeamId,
                  opponentTeamName,
                  backToLiveScores: { highlightTeamId },
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  liveCountText: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  lastUpdatedText: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },

  // Loading / Error / Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorIcon: {
    fontSize: 40,
    color: COLORS.danger,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  errorTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // List
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  // Game Card
  gameCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  gameCardHighlighted: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  highlightStripe: {
    height: 3,
    backgroundColor: COLORS.primary,
  },
  gameCardInner: {
    padding: SPACING.md,
  },

  // Game header
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  // Status badges
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  statusLive: {
    backgroundColor: COLORS.dangerLight,
  },
  statusLiveText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    color: COLORS.danger,
    letterSpacing: 1,
  },
  statusFinal: {
    backgroundColor: COLORS.borderLight,
  },
  statusFinalText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  statusPostponed: {
    backgroundColor: COLORS.warningLight,
  },
  statusPostponedText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.warning,
    letterSpacing: 0.5,
  },
  statusPreview: {
    backgroundColor: COLORS.borderLight,
  },
  statusPreviewText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Pulsing dot (reused from TodaysGameCard pattern)
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
  },

  // Outs indicator
  outsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  outDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  outDotFilled: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.warning,
  },

  // Scoreboard
  scoreboard: {
    gap: SPACING.sm,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  teamName: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
    width: 40,
  },
  teamNameWinning: {
    color: COLORS.textPrimary,
  },
  probablePitcher: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    flex: 1,
  },
  probablePitcherHit: {
    flex: 1,
    minWidth: 0,
  },
  scoreSpacer: {
    flex: 1,
  },
  score: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '600',
    color: COLORS.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  scoreWinning: {
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  // Inning indicator
  inningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  inningArrows: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inningArrow: {
    fontSize: 6,
    lineHeight: 8,
    color: COLORS.lightGray,
  },
  inningArrowActive: {
    color: COLORS.danger,
  },
  inningText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Game footer (live inning)
  gameFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  // R-H-E for final games
  rheContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  rheHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
    paddingRight: 2,
  },
  rheLabel: {
    flex: 1,
  },
  rheColHeader: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    width: 28,
    textAlign: 'center',
  },
  rheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
  },
  rheTeam: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  rheValue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    width: 28,
    textAlign: 'center',
  },
  rheValueBold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
