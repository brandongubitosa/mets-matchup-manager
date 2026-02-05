import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { StatsTable } from '../components';
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

  if (loading) {
    return (
      <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel="Loading matchup data">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading matchup data...</Text>
      </View>
    );
  }

  if (error || !matchup) {
    return (
      <View style={styles.errorContainer} accessibilityRole="alert">
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Something went wrong'}</Text>
      </View>
    );
  }

  const advantage = getAdvantageText();
  const { stats } = matchup;

  // Calculate rates safely with guards against division by zero
  const kRate = safeDivide(stats.strikeouts, stats.atBats) * 100;
  const walkDenominator = stats.atBats + stats.walks;
  const walkRate = safeDivide(stats.walks, walkDenominator) * 100;
  const hrRate = safeDivide(stats.homeRuns, stats.atBats) * 100;
  const singles = stats.hits - stats.doubles - stats.triples - stats.homeRuns;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header} accessibilityRole="header">
          <View style={styles.vsContainer}>
            <View style={styles.playerBox} accessibilityLabel={`Batter: ${matchup.batter.fullName}`}>
              <Text style={styles.playerLabel}>BATTER</Text>
              <Text style={styles.playerName}>{matchup.batter.fullName}</Text>
              {matchup.batter.batSide && (
                <Text style={styles.playerDetail}>
                  {matchup.batter.batSide.code === 'S'
                    ? 'Switch Hitter'
                    : `Bats ${matchup.batter.batSide.description}`}
                </Text>
              )}
            </View>

            <View style={styles.vsCircle} accessibilityLabel="versus">
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.playerBox} accessibilityLabel={`Pitcher: ${matchup.pitcher.fullName}`}>
              <Text style={styles.playerLabel}>PITCHER</Text>
              <Text style={styles.playerName}>{matchup.pitcher.fullName}</Text>
              {matchup.pitcher.pitchHand && (
                <Text style={styles.playerDetail}>
                  Throws {matchup.pitcher.pitchHand.description}
                </Text>
              )}
            </View>
          </View>

          {advantage && (
            <View
              style={[styles.advantageBadge, { backgroundColor: advantage.color }]}
              accessibilityRole="text"
              accessibilityLabel={`Matchup assessment: ${advantage.text}`}
            >
              <Text style={styles.advantageText}>{advantage.text}</Text>
            </View>
          )}
        </View>

        <StatsTable stats={matchup.stats} title="Career Head-to-Head" />

        {stats.atBats > 0 && (
          <View style={styles.breakdown} accessibilityRole="region" accessibilityLabel="Quick analysis section">
            <Text style={styles.breakdownTitle}>Quick Analysis</Text>
            <View style={styles.analysisGrid}>
              <View style={styles.analysisItem} accessibilityLabel={`Strikeout rate: ${kRate.toFixed(0)} percent`}>
                <Text style={styles.analysisValue}>{kRate.toFixed(0)}%</Text>
                <Text style={styles.analysisLabel}>K Rate</Text>
              </View>
              <View style={styles.analysisItem} accessibilityLabel={`Walk rate: ${walkRate.toFixed(0)} percent`}>
                <Text style={styles.analysisValue}>{walkRate.toFixed(0)}%</Text>
                <Text style={styles.analysisLabel}>Walk Rate</Text>
              </View>
              <View style={styles.analysisItem} accessibilityLabel={`Home run rate: ${hrRate.toFixed(1)} percent`}>
                <Text style={styles.analysisValue}>{hrRate.toFixed(1)}%</Text>
                <Text style={styles.analysisLabel}>HR Rate</Text>
              </View>
              <View style={styles.analysisItem} accessibilityLabel={`Singles: ${singles}`}>
                <Text style={styles.analysisValue}>{singles}</Text>
                <Text style={styles.analysisLabel}>Singles</Text>
              </View>
            </View>
          </View>
        )}

        {stats.atBats === 0 && (
          <View style={styles.noDataContainer} accessibilityRole="region" accessibilityLabel="No matchup history">
            <Text style={styles.noDataIcon}>📊</Text>
            <Text style={styles.noDataTitle}>No Previous Matchups</Text>
            <Text style={styles.noDataText}>
              These players haven't faced each other in recorded MLB history.
              {'\n\n'}
              This could mean it's the first time they'll meet, or one player
              was in the minors when the other was active.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Select another matchup"
        >
          <Text style={styles.backButtonText}>← Select Another Matchup</Text>
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
    backgroundColor: COLORS.primary,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerBox: {
    flex: 1,
    alignItems: 'center',
  },
  playerLabel: {
    fontSize: 10,
    color: COLORS.secondary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  playerDetail: {
    fontSize: 11,
    color: COLORS.lightGray,
    marginTop: 4,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  vsText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  advantageBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 16,
  },
  advantageText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  breakdown: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 16,
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
    marginBottom: 8,
  },
  analysisValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  analysisLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  noDataContainer: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
