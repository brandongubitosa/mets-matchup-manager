import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { AnimatedCard, TeamLogo } from '../components';
import {
  GamePredictionScreenNavigationProp,
  GamePredictionScreenRouteProp,
  GamePredictionResult,
  BatterPredictionItem,
  LiveGameState,
} from '../types';
import { predictGame } from '../services/mlbApi';

type Props = {
  navigation: GamePredictionScreenNavigationProp;
  route: GamePredictionScreenRouteProp;
};

const WinProbabilityBar: React.FC<{
  homeProb: number;
  homeAbbr: string;
  awayAbbr: string;
  homeTeamId: number;
  awayTeamId: number;
}> = ({ homeProb, homeAbbr, awayAbbr, homeTeamId, awayTeamId }) => {
  const homePct = Math.round(homeProb * 100);
  const awayPct = 100 - homePct;

  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <View style={barStyles.labelSide}>
          <TeamLogo teamId={awayTeamId} size={24} />
          <Text style={barStyles.abbr}>{awayAbbr}</Text>
          <Text style={barStyles.pct}>{awayPct}%</Text>
        </View>
        <Text style={barStyles.middle}>WIN PROBABILITY</Text>
        <View style={[barStyles.labelSide, { flexDirection: 'row-reverse' }]}>
          <TeamLogo teamId={homeTeamId} size={24} />
          <Text style={barStyles.abbr}>{homeAbbr}</Text>
          <Text style={barStyles.pct}>{homePct}%</Text>
        </View>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.awayFill, { flex: awayPct }]} />
        <View style={[barStyles.homeFill, { flex: homePct }]} />
      </View>
    </View>
  );
};

const barStyles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  labelSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  abbr: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  pct: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.white,
  },
  middle: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  track: {
    flexDirection: 'row',
    height: 12,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  awayFill: {
    backgroundColor: COLORS.secondary,
  },
  homeFill: {
    backgroundColor: COLORS.success,
  },
});

const PitcherStatsCard: React.FC<{
  label: string;
  name: string;
  hand?: string;
  era: string;
  whip: string;
  strikeouts: number;
  isWinner: boolean;
  onPress?: () => void;
}> = ({ label, name, hand, era, whip, strikeouts, isWinner, onPress }) => {
  const inner = (
    <View style={[pitcherStyles.card, isWinner && pitcherStyles.winnerCard]}>
      {isWinner && (
        <View style={pitcherStyles.winnerBadge}>
          <Text style={pitcherStyles.winnerBadgeText}>EDGE</Text>
        </View>
      )}
      <Text style={pitcherStyles.label}>{label}</Text>
      <Text style={pitcherStyles.name} numberOfLines={1}>{name}</Text>
      {hand && (
        <View style={pitcherStyles.handBadge}>
          <Text style={pitcherStyles.handText}>{hand === 'R' ? 'RHP' : 'LHP'}</Text>
        </View>
      )}
      <View style={pitcherStyles.stats}>
        <View style={pitcherStyles.stat}>
          <Text style={[pitcherStyles.statVal, isWinner && pitcherStyles.winnerText]}>{era}</Text>
          <Text style={pitcherStyles.statLabel}>ERA</Text>
        </View>
        <View style={pitcherStyles.stat}>
          <Text style={[pitcherStyles.statVal, isWinner && pitcherStyles.winnerText]}>{whip}</Text>
          <Text style={pitcherStyles.statLabel}>WHIP</Text>
        </View>
        <View style={pitcherStyles.stat}>
          <Text style={[pitcherStyles.statVal, isWinner && pitcherStyles.winnerText]}>{strikeouts}</Text>
          <Text style={pitcherStyles.statLabel}>K</Text>
        </View>
      </View>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
};

const pitcherStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    position: 'relative',
  },
  winnerCard: {
    borderColor: COLORS.success,
    borderWidth: 2,
  },
  winnerBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  winnerBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  handBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  handText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: '700',
  },
  stats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  stat: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  winnerText: {
    color: COLORS.success,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});


const opsSourceLabel = (item: BatterPredictionItem): string => {
  const hasH2H = item.h2hAtBats >= 2;
  const hasRecent = !!item.recentOPS && !!item.recentGames && item.recentGames >= 3;
  if (hasH2H && hasRecent) return 'H2H Blend';
  if (hasH2H) return 'H2H+Season';
  if (hasRecent) return 'L15 Blend';
  return 'Season';
};

const formTag = (item: BatterPredictionItem): 'hot' | 'cold' | null => {
  if (!item.recentOPS || !item.recentGames || item.recentGames < 3) return null;
  if (item.recentOPS > item.seasonOPS + 0.050) return 'hot';
  if (item.recentOPS < item.seasonOPS - 0.050) return 'cold';
  return null;
};

const LineupRow: React.FC<{ item: BatterPredictionItem; rank: number; onPress?: () => void }> = ({
  item,
  rank,
  onPress,
}) => {
  const form = formTag(item);
  return (
    <TouchableOpacity
      style={lineupStyles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
    >
      <Text style={lineupStyles.rank}>{rank}</Text>
      <Text style={lineupStyles.name} numberOfLines={1}>{item.fullName}</Text>
      {form && (
        <View style={[lineupStyles.formBadge, { backgroundColor: form === 'hot' ? `${COLORS.danger}20` : `${COLORS.primary}15` }]}>
          <Text style={[lineupStyles.formText, { color: form === 'hot' ? COLORS.danger : COLORS.primary }]}>
            {form === 'hot' ? '🔥' : '❄️'}
          </Text>
        </View>
      )}
      <Text style={lineupStyles.h2h}>
        {item.h2hAtBats > 0 ? `${item.h2hAtBats} PA` : '—'}
      </Text>
      <View style={lineupStyles.opsCol}>
        <Text style={lineupStyles.ops}>{item.effectiveOPS.toFixed(3)}</Text>
        <Text style={lineupStyles.opsLabel}>{opsSourceLabel(item)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const lineupStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  rank: {
    width: 20,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  name: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  h2h: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  formBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  formText: {
    fontSize: 11,
  },
  opsCol: {
    alignItems: 'flex-end',
    width: 56,
  },
  ops: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'right',
  },
  opsLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '500',
    textAlign: 'right',
  },
});

export const GamePredictionScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    teamId,
    teamName,
    opponentTeamId,
    opponentTeamName,
    isHome,
    teamPitcherId,
    opponentPitcherId,
  } = route.params;

  const homeTeamId = isHome ? teamId : opponentTeamId;
  const homeTeamName = isHome ? teamName : opponentTeamName;
  const awayTeamId = isHome ? opponentTeamId : teamId;
  const awayTeamName = isHome ? opponentTeamName : teamName;
  const homePitcherId = isHome ? teamPitcherId : opponentPitcherId;
  const awayPitcherId = isHome ? opponentPitcherId : teamPitcherId;

  const homeAbbr = MLB_TEAMS[homeTeamId]?.abbreviation ?? '???';
  const awayAbbr = MLB_TEAMS[awayTeamId]?.abbreviation ?? '???';

  const [prediction, setPrediction] = useState<GamePredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState('Loading rosters...');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setLoadingStep('Loading rosters...');

      // Simulate progress steps for UX
      const stepTimer = setTimeout(() => {
        if (!cancelled) setLoadingStep('Fetching pitcher stats & recent form...');
      }, 1500);
      const stepTimer2 = setTimeout(() => {
        if (!cancelled) setLoadingStep('Checking live game state...');
      }, 3000);
      const stepTimer3 = setTimeout(() => {
        if (!cancelled) setLoadingStep('Calculating win probability...');
      }, 5000);

      const result = await predictGame({
        homeTeamId,
        homeTeamName,
        awayTeamId,
        awayTeamName,
        homePitcherId,
        awayPitcherId,
      });

      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (cancelled) return;

      if (result.success) {
        setPrediction(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [homeTeamId, awayTeamId, homePitcherId, awayPitcherId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Game Prediction</Text>
          <Text style={styles.headerSubtitle}>{awayAbbr} @ {homeAbbr}</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{loadingStep}</Text>
          <Text style={styles.loadingSubtext}>
            Analyzing lineups and pitching matchups...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !prediction) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error ?? 'Something went wrong'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { homeTeam, awayTeam, predictedWinner, homeWinProbability, confidence, keyFactors, isLive, liveGameState, parkFactor } = prediction;
  const winner = predictedWinner === 'home' ? homeTeam : awayTeam;
  const winnerAbbr = predictedWinner === 'home' ? homeAbbr : awayAbbr;
  const confidenceLabel =
    confidence >= 0.4 ? 'High Confidence' :
    confidence >= 0.2 ? 'Moderate Confidence' :
    'Toss-Up';

  const homePitcherEdge = predictedWinner === 'home';
  const gpParams = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Game Prediction</Text>
          <Text style={styles.headerSubtitle}>{awayAbbr} @ {homeAbbr}</Text>

          <WinProbabilityBar
            homeProb={homeWinProbability}
            homeAbbr={homeAbbr}
            awayAbbr={awayAbbr}
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
          />
        </LinearGradient>

        {/* Live Game Banner */}
        {isLive && liveGameState && (
          <AnimatedCard delay={0}>
            <View style={styles.liveCard}>
              <View style={styles.liveBadgeRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>GAME IN PROGRESS</Text>
              </View>
              <View style={styles.liveScoreRow}>
                <View style={styles.liveTeamScore}>
                  <TeamLogo teamId={awayTeamId} size={28} />
                  <Text style={styles.liveTeamAbbr}>{awayAbbr}</Text>
                  <Text style={styles.liveScore}>{liveGameState.awayScore}</Text>
                </View>
                <View style={styles.liveInningBlock}>
                  <Text style={styles.liveInningHalf}>
                    {liveGameState.inningHalf === 'top' ? '▲' : '▼'}
                  </Text>
                  <Text style={styles.liveInningNum}>{liveGameState.inning}</Text>
                </View>
                <View style={[styles.liveTeamScore, { flexDirection: 'row-reverse' }]}>
                  <TeamLogo teamId={homeTeamId} size={28} />
                  <Text style={styles.liveTeamAbbr}>{homeAbbr}</Text>
                  <Text style={styles.liveScore}>{liveGameState.homeScore}</Text>
                </View>
              </View>
              <Text style={styles.liveNote}>
                Win probability adjusted for live score (pre-game: {Math.round(
                  (predictedWinner === 'home' ? liveGameState.preGameProbability : 1 - liveGameState.preGameProbability) * 100
                )}%)
              </Text>
            </View>
          </AnimatedCard>
        )}

        {/* Predicted Winner */}
        <AnimatedCard delay={isLive ? 80 : 0}>
          <View style={styles.winnerSection}>
            <Text style={styles.winnerLabel}>PREDICTED WINNER</Text>
            <View style={styles.winnerRow}>
              <TeamLogo teamId={winner.teamId} size={56} />
              <View style={styles.winnerInfo}>
                <Text style={styles.winnerName}>{winner.teamName}</Text>
                <View style={styles.confidenceRow}>
                  <View style={[styles.confidenceBadge, {
                    backgroundColor: confidence >= 0.4 ? COLORS.successLight :
                      confidence >= 0.2 ? COLORS.warningLight : COLORS.borderLight,
                  }]}>
                    <Text style={[styles.confidenceText, {
                      color: confidence >= 0.4 ? COLORS.success :
                        confidence >= 0.2 ? COLORS.warning : COLORS.gray,
                    }]}>
                      {confidenceLabel}
                    </Text>
                  </View>
                  <Text style={styles.winPct}>
                    {predictedWinner === 'home'
                      ? `${Math.round(homeWinProbability * 100)}%`
                      : `${Math.round((1 - homeWinProbability) * 100)}%`} to win
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                Based on season OPS, 15-day batter form, H2H history, platoon matchups, pitcher ERA/WHIP/K rate, 3-week pitcher form, park factor ({parkFactor.toFixed(2)}){isLive ? ', and live score' : ''}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Pitching Matchup */}
        {(homeTeam.pitcher || awayTeam.pitcher) && (
          <AnimatedCard delay={100}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pitching Matchup</Text>
              <View style={styles.pitcherRow}>
                <PitcherStatsCard
                  label={`${awayAbbr} (Away)`}
                  name={awayTeam.pitcher?.fullName ?? 'TBD'}
                  hand={awayTeam.pitcher?.pitchHand?.code}
                  era={awayTeam.pitcherStats?.era ?? '—'}
                  whip={awayTeam.pitcherStats?.whip ?? '—'}
                  strikeouts={awayTeam.pitcherStats?.strikeouts ?? 0}
                  isWinner={!homePitcherEdge && !!awayTeam.pitcherStats}
                  onPress={
                    awayTeam.pitcher
                      ? () =>
                          navigation.navigate('PlayerBackCard', {
                            playerId: awayTeam.pitcher!.id,
                            opponentTeamId: homeTeam.teamId,
                            opponentTeamName: homeTeam.teamName,
                            backToGamePrediction: gpParams,
                          })
                      : undefined
                  }
                />
                <PitcherStatsCard
                  label={`${homeAbbr} (Home)`}
                  name={homeTeam.pitcher?.fullName ?? 'TBD'}
                  hand={homeTeam.pitcher?.pitchHand?.code}
                  era={homeTeam.pitcherStats?.era ?? '—'}
                  whip={homeTeam.pitcherStats?.whip ?? '—'}
                  strikeouts={homeTeam.pitcherStats?.strikeouts ?? 0}
                  isWinner={homePitcherEdge && !!homeTeam.pitcherStats}
                  onPress={
                    homeTeam.pitcher
                      ? () =>
                          navigation.navigate('PlayerBackCard', {
                            playerId: homeTeam.pitcher!.id,
                            opponentTeamId: awayTeam.teamId,
                            opponentTeamName: awayTeam.teamName,
                            backToGamePrediction: gpParams,
                          })
                      : undefined
                  }
                />
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* Bullpen Comparison */}
        {(homeTeam.staffStats || awayTeam.staffStats) && (
          <AnimatedCard delay={150}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bullpen Comparison</Text>
              <View style={styles.bullpenRow}>
                {/* Away bullpen */}
                <View style={styles.bullpenCard}>
                  <Text style={styles.bullpenTeam}>{awayAbbr}</Text>
                  {awayTeam.staffStats ? (
                    <>
                      <View style={styles.bullpenStat}>
                        <Text style={styles.bullpenStatLabel}>ERA</Text>
                        <Text style={styles.bullpenStatValue}>{awayTeam.staffStats.era}</Text>
                      </View>
                      <View style={styles.bullpenStat}>
                        <Text style={styles.bullpenStatLabel}>WHIP</Text>
                        <Text style={styles.bullpenStatValue}>{awayTeam.staffStats.whip}</Text>
                      </View>
                      <View style={styles.bullpenStat}>
                        <Text style={styles.bullpenStatLabel}>K</Text>
                        <Text style={styles.bullpenStatValue}>{awayTeam.staffStats.strikeouts}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.bullpenNA}>N/A</Text>
                  )}
                </View>
                <View style={styles.bullpenDivider} />
                {/* Home bullpen */}
                <View style={styles.bullpenCard}>
                  <Text style={styles.bullpenTeam}>{homeAbbr}</Text>
                  {homeTeam.staffStats ? (
                    <>
                      <View style={styles.bullpenStat}>
                        <Text style={styles.bullpenStatLabel}>ERA</Text>
                        <Text style={[
                          styles.bullpenStatValue,
                          parseFloat(homeTeam.staffStats.era) < parseFloat(awayTeam.staffStats?.era ?? '99')
                            ? styles.bullpenEdge : undefined
                        ]}>{homeTeam.staffStats.era}</Text>
                      </View>
                      <View style={styles.bullpenStat}>
                        <Text style={styles.bullpenStatLabel}>WHIP</Text>
                        <Text style={styles.bullpenStatValue}>{homeTeam.staffStats.whip}</Text>
                      </View>
                      <View style={styles.bullpenStat}>
                        <Text style={styles.bullpenStatLabel}>K</Text>
                        <Text style={styles.bullpenStatValue}>{homeTeam.staffStats.strikeouts}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.bullpenNA}>N/A</Text>
                  )}
                </View>
              </View>
              <Text style={styles.bullpenNote}>Team season pitching stats (starters + relievers)</Text>
            </View>
          </AnimatedCard>
        )}

        {/* Key Factors */}
        <AnimatedCard delay={200}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Factors</Text>
            {keyFactors.map((factor, i) => (
              <View key={i} style={styles.factorRow}>
                <Text style={styles.factorDot}>•</Text>
                <Text style={styles.factorText}>{factor}</Text>
              </View>
            ))}
          </View>
        </AnimatedCard>

        {/* Lineup Analysis: Away */}
        <AnimatedCard delay={300}>
          <View style={styles.section}>
            <View style={styles.lineupHeader}>
              <TeamLogo teamId={awayTeamId} size={24} />
              <Text style={styles.sectionTitle}>{awayAbbr} Lineup</Text>
              <Text style={styles.lineupOPSHeader}>EFF. OPS</Text>
            </View>
            {awayTeam.batters.map((b, i) => (
              <LineupRow
                key={b.id}
                item={b}
                rank={i + 1}
                onPress={() =>
                  navigation.navigate('PlayerBackCard', {
                    playerId: b.id,
                    counterpartPlayerId: homeTeam.pitcher?.id,
                    counterpartPlayerName: homeTeam.pitcher?.fullName,
                    opponentTeamId: homeTeam.teamId,
                    opponentTeamName: homeTeam.teamName,
                    backToGamePrediction: gpParams,
                  })
                }
              />
            ))}
            <View style={styles.lineupTotal}>
              <Text style={styles.lineupTotalLabel}>Projected Lineup OPS</Text>
              <Text style={styles.lineupTotalValue}>{awayTeam.offensiveScore.toFixed(3)}</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Lineup Analysis: Home */}
        <AnimatedCard delay={400}>
          <View style={styles.section}>
            <View style={styles.lineupHeader}>
              <TeamLogo teamId={homeTeamId} size={24} />
              <Text style={styles.sectionTitle}>{homeAbbr} Lineup</Text>
              <Text style={styles.lineupOPSHeader}>EFF. OPS</Text>
            </View>
            {homeTeam.batters.map((b, i) => (
              <LineupRow
                key={b.id}
                item={b}
                rank={i + 1}
                onPress={() =>
                  navigation.navigate('PlayerBackCard', {
                    playerId: b.id,
                    counterpartPlayerId: awayTeam.pitcher?.id,
                    counterpartPlayerName: awayTeam.pitcher?.fullName,
                    opponentTeamId: awayTeam.teamId,
                    opponentTeamName: awayTeam.teamName,
                    backToGamePrediction: gpParams,
                  })
                }
              />
            ))}
            <View style={styles.lineupTotal}>
              <Text style={styles.lineupTotalLabel}>Projected Lineup OPS</Text>
              <Text style={styles.lineupTotalValue}>{homeTeam.offensiveScore.toFixed(3)}</Text>
            </View>
          </View>
        </AnimatedCard>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  backBtn: {
    marginBottom: SPACING.md,
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    opacity: 0.9,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: SPACING.md,
  },
  loadingSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZE.base,
  },

  // Live game card
  liveCard: {
    backgroundColor: '#0A0A0A',
    margin: SPACING.md,
    marginBottom: 0,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  liveBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    color: COLORS.danger,
    letterSpacing: 1.2,
  },
  liveScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  liveTeamScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  liveTeamAbbr: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  liveScore: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '900',
    color: COLORS.white,
  },
  liveInningBlock: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  liveInningHalf: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    lineHeight: 12,
  },
  liveInningNum: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  liveNote: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Winner section
  winnerSection: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },
  winnerLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  confidenceBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  confidenceText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  winPct: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  disclaimer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  disclaimerText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Generic section
  section: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
    marginBottom: SPACING.md,
  },
  pitcherRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },

  // Key factors
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  factorDot: {
    fontSize: FONT_SIZE.base,
    color: COLORS.primary,
    fontWeight: '700',
    lineHeight: 20,
  },
  factorText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  // Lineup
  lineupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  lineupOPSHeader: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    width: 44,
    textAlign: 'right',
  },
  lineupTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  lineupTotalLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  lineupTotalValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // Bottom button
  backButton: {
    backgroundColor: COLORS.primary,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },

  // Bullpen
  bullpenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.sm,
  },
  bullpenCard: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  bullpenTeam: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  bullpenStat: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  bullpenStatLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  bullpenStatValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 40,
  },
  bullpenEdge: {
    color: COLORS.success,
  },
  bullpenDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.md,
    alignSelf: 'stretch',
  },
  bullpenNA: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  bullpenNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
});
