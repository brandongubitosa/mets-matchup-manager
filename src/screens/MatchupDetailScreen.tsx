import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';
import { StatsTable, StatBar, SkeletonStatsTable, AnimatedCard } from '../components';
import { MatchupResult, MatchupDetailScreenNavigationProp, MatchupDetailScreenRouteProp } from '../types';
import { getBatterVsPitcher } from '../services/mlbApi';

type MatchupDetailScreenProps = {
  navigation: MatchupDetailScreenNavigationProp;
  route: MatchupDetailScreenRouteProp;
};

// Safe division helper to prevent NaN/Infinity
const safeDivide = (numerator: number, denominator: number, defaultValue: number = 0): number => {
  if (denominator === 0) return defaultValue;
  return numerator / denominator;
};

export const MatchupDetailScreen: React.FC<MatchupDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { batterId, pitcherId, mode } = route.params;
  const [matchup, setMatchup] = useState<MatchupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMatchup = async () => {
      setLoading(true);
      setError(null);

      const result = await getBatterVsPitcher(batterId, pitcherId);

      if (cancelled) return;

      if (result.success) {
        setMatchup(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    fetchMatchup();

    return () => {
      cancelled = true;
    };
  }, [batterId, pitcherId]);

  const getAdvantageText = () => {
    if (!matchup) return null;
    const avg = parseFloat(matchup.stats.avg);
    const atBats = matchup.stats.atBats;

    if (atBats === 0) {
      return { text: 'No previous matchups', color: COLORS.gray };
    }

    if (atBats < 5) {
      return { text: 'Limited sample size', color: COLORS.warning };
    }

    if (mode === 'batter') {
      if (avg >= 0.3) return { text: 'Batter has the edge', color: COLORS.success };
      if (avg < 0.2) return { text: 'Pitcher has the edge', color: COLORS.danger };
      return { text: 'Even matchup', color: COLORS.gray };
    } else {
      if (avg >= 0.3) return { text: 'Batter has the edge', color: COLORS.danger };
      if (avg < 0.2) return { text: 'Pitcher has the edge', color: COLORS.success };
      return { text: 'Even matchup', color: COLORS.gray };
    }
  };

  const getHeadshotUrl = (playerId: number): string =>
    `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>&#8249; Back</Text>
          </TouchableOpacity>
          <Text style={styles.loadingHeaderText}>Loading matchup...</Text>
        </LinearGradient>
        <SkeletonStatsTable />
        <SkeletonStatsTable />
      </SafeAreaView>
    );
  }

  if (error || !matchup) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>&#8249; Back</Text>
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.errorContainer} accessibilityRole="alert">
          <Text style={styles.errorIcon}>&#9888;&#65039;</Text>
          <Text style={styles.errorText}>{error || 'Something went wrong'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const advantage = getAdvantageText();
  const { stats } = matchup;

  const kRate = safeDivide(stats.strikeouts, stats.atBats) * 100;
  const walkDenominator = stats.atBats + stats.walks;
  const walkRate = safeDivide(stats.walks, walkDenominator) * 100;
  const hrRate = safeDivide(stats.homeRuns, stats.atBats) * 100;
  const avg = parseFloat(stats.avg) || 0;
  const obp = parseFloat(stats.obp) || 0;
  const slg = parseFloat(stats.slg) || 0;
  const ops = parseFloat(stats.ops) || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>&#8249; Back</Text>
          </TouchableOpacity>

          <View style={styles.vsContainer}>
            <View style={styles.playerBox}>
              <View style={styles.headshotContainer}>
                <Image
                  source={{ uri: getHeadshotUrl(matchup.batter.id) }}
                  style={styles.headshot}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.playerLabel}>BATTER</Text>
              <Text style={styles.playerName}>{matchup.batter.fullName}</Text>
              {matchup.batter.batSide && (
                <Text style={styles.playerDetail}>
                  {matchup.batter.batSide.code === 'S' ? 'Switch' : `Bats ${matchup.batter.batSide.code}`}
                </Text>
              )}
            </View>

            <View style={styles.vsCircle}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.playerBox}>
              <View style={styles.headshotContainer}>
                <Image
                  source={{ uri: getHeadshotUrl(matchup.pitcher.id) }}
                  style={styles.headshot}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.playerLabel}>PITCHER</Text>
              <Text style={styles.playerName}>{matchup.pitcher.fullName}</Text>
              {matchup.pitcher.pitchHand && (
                <Text style={styles.playerDetail}>Throws {matchup.pitcher.pitchHand.code}</Text>
              )}
            </View>
          </View>

          {advantage && (
            <View style={[styles.advantageBadge, { backgroundColor: advantage.color }]}>
              <Text style={styles.advantageText}>{advantage.text}</Text>
            </View>
          )}
        </LinearGradient>

        <AnimatedCard delay={0}>
          <StatsTable stats={matchup.stats} title="Career Head-to-Head" />
        </AnimatedCard>

        {stats.atBats > 0 && (
          <AnimatedCard delay={150}>
            <View style={styles.statBarsContainer}>
              <Text style={styles.statBarsTitle}>Performance Breakdown</Text>
              <StatBar
                label="AVG"
                value={avg}
                maxValue={0.5}
                displayValue={stats.avg}
                thresholds={{ good: 0.3, average: 0.25 }}
              />
              <StatBar
                label="OBP"
                value={obp}
                maxValue={0.6}
                displayValue={stats.obp}
                thresholds={{ good: 0.35, average: 0.3 }}
              />
              <StatBar
                label="SLG"
                value={slg}
                maxValue={0.8}
                displayValue={stats.slg}
                thresholds={{ good: 0.45, average: 0.35 }}
              />
              <StatBar
                label="OPS"
                value={ops}
                maxValue={1.2}
                displayValue={stats.ops}
                thresholds={{ good: 0.8, average: 0.7 }}
              />
            </View>
          </AnimatedCard>
        )}

        {stats.atBats > 0 && (
          <AnimatedCard delay={300}>
            <View style={styles.breakdown}>
              <Text style={styles.breakdownTitle}>Quick Analysis</Text>
              <View style={styles.analysisGrid}>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisValue}>{kRate.toFixed(0)}%</Text>
                  <Text style={styles.analysisLabel}>K Rate</Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisValue}>{walkRate.toFixed(0)}%</Text>
                  <Text style={styles.analysisLabel}>BB Rate</Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisValue}>{hrRate.toFixed(1)}%</Text>
                  <Text style={styles.analysisLabel}>HR Rate</Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisValue}>{stats.hits - stats.doubles - stats.triples - stats.homeRuns}</Text>
                  <Text style={styles.analysisLabel}>Singles</Text>
                </View>
              </View>
            </View>
          </AnimatedCard>
        )}

        {stats.atBats === 0 && (
          <AnimatedCard delay={150}>
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataIcon}>&#128202;</Text>
              <Text style={styles.noDataTitle}>No Previous Matchups</Text>
              <Text style={styles.noDataText}>
                These players haven't faced each other in recorded MLB history.
                This could mean it's the first time they'll meet.
              </Text>
            </View>
          </AnimatedCard>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>&#8592; Select Another Matchup</Text>
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

  // Back button
  backBtn: {
    marginBottom: SPACING.md,
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    opacity: 0.9,
  },
  loadingHeaderText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: SPACING.md,
  },

  // VS section
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerBox: {
    flex: 1,
    alignItems: 'center',
  },
  headshotContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
  },
  headshot: {
    width: 64,
    height: 64,
  },
  playerLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.secondaryLight,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
    fontWeight: '700',
  },
  playerName: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  playerDetail: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.lightGray,
    marginTop: SPACING.xs,
  },
  vsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.sm,
    ...SHADOW.md,
  },
  vsText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: FONT_SIZE.md,
  },

  // Advantage badge
  advantageBadge: {
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
  },
  advantageText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.sm,
  },

  // Stat bars
  statBarsContainer: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },
  statBarsTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Quick analysis
  breakdown: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },
  breakdownTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  analysisItem: {
    alignItems: 'center',
    width: '25%',
    marginBottom: SPACING.sm,
  },
  analysisValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  analysisLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
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
    marginTop: SPACING.sm,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZE.base,
  },

  // No data
  noDataContainer: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  noDataTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  noDataText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Back button at bottom
  backButton: {
    backgroundColor: COLORS.primary,
    margin: SPACING.md,
    marginTop: SPACING.sm,
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
});
