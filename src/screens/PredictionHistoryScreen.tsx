import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { PredictionHistoryScreenNavigationProp } from '../types';
import { usePredictionHistory } from '../hooks';
import { TeamLogo } from '../components';

type Props = { navigation: PredictionHistoryScreenNavigationProp };

const formatDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const ConfidenceLabel: React.FC<{ confidence: number }> = ({ confidence }) => {
  const label =
    confidence >= 0.4 ? 'High' : confidence >= 0.2 ? 'Moderate' : 'Toss-Up';
  const color =
    confidence >= 0.4 ? COLORS.success : confidence >= 0.2 ? COLORS.warning : COLORS.textMuted;
  return (
    <View style={[rowStyles.confidencePill, { backgroundColor: `${color}20` }]}>
      <Text style={[rowStyles.confidenceText, { color }]}>{label}</Text>
    </View>
  );
};

export const PredictionHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { records, stats, loading, refreshResults, clearAll } = usePredictionHistory();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    refreshResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshResults();
    setRefreshing(false);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Prediction History',
      'This will permanently delete all your prediction records. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearAll },
      ]
    );
  };

  const accuracyPct = Math.round(stats.accuracy * 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prediction Record</Text>
        {records.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Stats summary */}
      {!loading && records.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.correct}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={[styles.statCard, styles.statCardCenter]}>
            <Text style={styles.recordText}>
              {stats.correct}–{stats.incorrect}
            </Text>
            <Text style={styles.accuracyText}>
              {stats.pending > 0
                ? `${accuracyPct}% · ${stats.pending} pending`
                : `${accuracyPct}% accuracy`}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.danger }]}>{stats.incorrect}</Text>
            <Text style={styles.statLabel}>Wrong</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No predictions yet</Text>
          <Text style={styles.emptyText}>
            Open a game prediction to start tracking your record.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
        >
          {records.map((record) => {
            const homeAbbr = MLB_TEAMS[record.homeTeamId]?.abbreviation ?? '???';
            const awayAbbr = MLB_TEAMS[record.awayTeamId]?.abbreviation ?? '???';
            const predictedIsHome = record.predictedWinner === 'home';
            const predictedId = predictedIsHome ? record.homeTeamId : record.awayTeamId;
            const predictedAbbr = predictedIsHome ? homeAbbr : awayAbbr;
            const homePct = Math.round(record.homeWinProbability * 100);
            const awayPct = 100 - homePct;

            return (
              <View key={record.gameId} style={rowStyles.card}>
                {/* Result badge */}
                <View style={rowStyles.topRow}>
                  <Text style={rowStyles.date}>{formatDate(record.date)}</Text>
                  {record.isCorrect === true && (
                    <View style={[rowStyles.resultBadge, { backgroundColor: `${COLORS.success}20` }]}>
                      <Text style={[rowStyles.resultText, { color: COLORS.success }]}>✓ Correct</Text>
                    </View>
                  )}
                  {record.isCorrect === false && (
                    <View style={[rowStyles.resultBadge, { backgroundColor: `${COLORS.danger}20` }]}>
                      <Text style={[rowStyles.resultText, { color: COLORS.danger }]}>✗ Wrong</Text>
                    </View>
                  )}
                  {record.isCorrect === null && (
                    <View style={[rowStyles.resultBadge, { backgroundColor: `${COLORS.textMuted}15` }]}>
                      <Text style={[rowStyles.resultText, { color: COLORS.textMuted }]}>Pending</Text>
                    </View>
                  )}
                </View>

                {/* Matchup row */}
                <View style={rowStyles.matchupRow}>
                  <View style={rowStyles.teamSide}>
                    <TeamLogo teamId={record.awayTeamId} size={28} />
                    <Text style={rowStyles.teamAbbr}>{awayAbbr}</Text>
                    <Text style={rowStyles.winPct}>{awayPct}%</Text>
                  </View>
                  <View style={rowStyles.matchupCenter}>
                    <Text style={rowStyles.atText}>@</Text>
                    {record.actualHomeScore !== null && (
                      <Text style={rowStyles.finalScore}>
                        {record.actualAwayScore}–{record.actualHomeScore}
                      </Text>
                    )}
                  </View>
                  <View style={[rowStyles.teamSide, rowStyles.teamSideRight]}>
                    <Text style={rowStyles.winPct}>{homePct}%</Text>
                    <Text style={rowStyles.teamAbbr}>{homeAbbr}</Text>
                    <TeamLogo teamId={record.homeTeamId} size={28} />
                  </View>
                </View>

                {/* Prediction chip */}
                <View style={rowStyles.predRow}>
                  <Text style={rowStyles.predLabel}>Predicted:</Text>
                  <TeamLogo teamId={predictedId} size={14} />
                  <Text style={rowStyles.predTeam}>{predictedAbbr}</Text>
                  <ConfidenceLabel confidence={record.confidence} />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    paddingRight: SPACING.xs,
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
  },
  clearBtn: {
    paddingLeft: SPACING.xs,
  },
  clearBtnText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statCardCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  recordText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 30,
  },
  accuracyText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
});

const rowStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  date: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  resultBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  resultText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  teamSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  teamSideRight: {
    justifyContent: 'flex-end',
  },
  teamAbbr: {
    fontSize: FONT_SIZE.base,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  winPct: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  matchupCenter: {
    alignItems: 'center',
    minWidth: 52,
  },
  atText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  finalScore: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginTop: 2,
  },
  predRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.xs,
  },
  predLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  predTeam: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  confidencePill: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: 'auto',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
