import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { COLORS } from '../constants';
import { StatsTable } from '../components';
import { MatchupResult } from '../types';
import { getBatterVsPitcher } from '../services/mlbApi';

type RootStackParamList = {
  Home: undefined;
  BatterMatchup: undefined;
  PitcherMatchup: undefined;
  MatchupDetail: { batterId: number; pitcherId: number; mode: 'batter' | 'pitcher' };
};

type MatchupDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MatchupDetail'>;
  route: RouteProp<RootStackParamList, 'MatchupDetail'>;
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
    loadMatchup();
  }, [batterId, pitcherId]);

  const loadMatchup = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBatterVsPitcher(batterId, pitcherId);
      if (result) {
        setMatchup(result);
      } else {
        setError('Could not load matchup data');
      }
    } catch (err) {
      setError('Error loading matchup data');
    }
    setLoading(false);
  };

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading matchup data...</Text>
      </View>
    );
  }

  if (error || !matchup) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Something went wrong'}</Text>
      </View>
    );
  }

  const advantage = getAdvantageText();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.vsContainer}>
            <View style={styles.playerBox}>
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

            <View style={styles.vsCircle}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.playerBox}>
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
            <View style={[styles.advantageBadge, { backgroundColor: advantage.color }]}>
              <Text style={styles.advantageText}>{advantage.text}</Text>
            </View>
          )}
        </View>

        <StatsTable stats={matchup.stats} title="Career Head-to-Head" />

        {matchup.stats.atBats > 0 && (
          <View style={styles.breakdown}>
            <Text style={styles.breakdownTitle}>Quick Analysis</Text>
            <View style={styles.analysisGrid}>
              <View style={styles.analysisItem}>
                <Text style={styles.analysisValue}>
                  {((matchup.stats.strikeouts / matchup.stats.atBats) * 100).toFixed(0)}%
                </Text>
                <Text style={styles.analysisLabel}>K Rate</Text>
              </View>
              <View style={styles.analysisItem}>
                <Text style={styles.analysisValue}>
                  {(
                    (matchup.stats.walks /
                      (matchup.stats.atBats + matchup.stats.walks)) *
                    100
                  ).toFixed(0)}%
                </Text>
                <Text style={styles.analysisLabel}>Walk Rate</Text>
              </View>
              <View style={styles.analysisItem}>
                <Text style={styles.analysisValue}>
                  {matchup.stats.atBats > 0
                    ? (matchup.stats.homeRuns / matchup.stats.atBats * 100).toFixed(1)
                    : '0'}%
                </Text>
                <Text style={styles.analysisLabel}>HR Rate</Text>
              </View>
              <View style={styles.analysisItem}>
                <Text style={styles.analysisValue}>
                  {(matchup.stats.hits - matchup.stats.doubles - matchup.stats.triples - matchup.stats.homeRuns)}
                </Text>
                <Text style={styles.analysisLabel}>Singles</Text>
              </View>
            </View>
          </View>
        )}

        {matchup.stats.atBats === 0 && (
          <View style={styles.noDataContainer}>
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
});
