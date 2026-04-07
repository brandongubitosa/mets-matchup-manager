import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { UmpireStats } from '../services/mlbApi';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';

interface UmpireCardProps {
  stats: UmpireStats | null;
  loading?: boolean;
  noData?: boolean;
}

const TENDENCY_CONFIG = {
  'pitcher-friendly': { color: '#1D4ED8', bg: '#EFF6FF', label: 'Pitcher Friendly' },
  'hitter-friendly':  { color: '#B45309', bg: '#FFFBEB', label: 'Hitter Friendly' },
  'neutral':          { color: '#374151', bg: '#F9FAFB', label: 'Average Zone' },
};

// A simple horizontal progress bar
const StatBar: React.FC<{ value: number; min: number; max: number; color: string }> = ({
  value, min, max, color,
}) => {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
    </View>
  );
};

const barStyles = StyleSheet.create({
  track: { height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill:  { height: 5, borderRadius: 3 },
});

export const UmpireCard: React.FC<UmpireCardProps> = ({ stats, loading = false, noData = false }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Plate Umpire</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Looking up umpire...</Text>
        </View>
      ) : noData || !stats ? (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>
            Umpire assignment unavailable — typically posted a few hours before first pitch
          </Text>
        </View>
      ) : (
        <>
          {/* Name row */}
          <View style={styles.nameRow}>
            <View>
              <Text style={styles.umpieName}>{stats.name}</Text>
              <Text style={styles.gamesText}>{stats.games} career games called</Text>
            </View>
          </View>

          {/* Stat bars */}
          <View style={styles.statsSection}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Accuracy</Text>
              <StatBar value={stats.accuracyPct} min={88} max={100} color="#10B981" />
              <Text style={styles.statValue}>{stats.accuracyPct.toFixed(1)}%</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Consistency</Text>
              <StatBar value={stats.consistencyPct} min={88} max={100} color="#3B82F6" />
              <Text style={styles.statValue}>{stats.consistencyPct.toFixed(1)}%</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Run Impact</Text>
              <StatBar value={stats.runImpact} min={0.8} max={2.0} color="#F59E0B" />
              <Text style={styles.statValue}>{stats.runImpact.toFixed(2)}</Text>
            </View>
          </View>

          {/* Tendency badge */}
          <View style={[styles.tendencyBanner, { backgroundColor: TENDENCY_CONFIG[stats.zoneTendency].bg }]}>
            <View style={styles.tendencyText}>
              <Text style={[styles.tendencyLabel, { color: TENDENCY_CONFIG[stats.zoneTendency].color }]}>
                {TENDENCY_CONFIG[stats.zoneTendency].label}
              </Text>
              <Text style={styles.tendencyDetail}>{stats.tendencyDetail}</Text>
            </View>
          </View>

          <Text style={styles.footnote}>
            Run Impact = avg runs affected per game · Source: Umpire Scorecards
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },
  title: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  umpieName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  gamesText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statsSection: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    width: 80,
    fontWeight: '600',
  },
  statValue: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
    width: 42,
    textAlign: 'right',
  },
  tendencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  tendencyText: {
    flex: 1,
  },
  tendencyLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  tendencyDetail: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  footnote: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  noDataText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
