import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { PitchArsenalMatchup } from '../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';

interface PitchArsenalCardProps {
  matchups: PitchArsenalMatchup[];
  batterName: string;
  pitcherName: string;
  loading?: boolean;
  noData?: boolean;
}

// Color for batter AVG against a pitch
const getAvgColor = (avg: string): string => {
  const n = parseFloat(avg);
  if (isNaN(n) || n === 0) return COLORS.textMuted;
  if (n >= 0.310) return COLORS.danger;
  if (n >= 0.260) return COLORS.warning;
  return COLORS.success;
};

// Background tint for a row based on batter performance
const getRowTint = (avg: string): string => {
  const n = parseFloat(avg);
  if (isNaN(n) || n === 0) return 'transparent';
  if (n >= 0.310) return COLORS.dangerLight;
  if (n >= 0.260) return COLORS.warningLight;
  return COLORS.successLight;
};

// Usage bar color — just use a neutral blue gradient feel
const USAGE_BAR_COLOR = '#3B82F6';

export const PitchArsenalCard: React.FC<PitchArsenalCardProps> = ({
  matchups,
  batterName,
  pitcherName,
  loading = false,
  noData = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pitch Arsenal Breakdown</Text>
      <Text style={styles.subtitle}>
        {pitcherName}'s pitches · {batterName}'s numbers vs each
      </Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>Loading arsenal data...</Text>
        </View>
      ) : noData ? (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>Arsenal data unavailable for this season</Text>
        </View>
      ) : (
        <>
          {/* Column headers */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.pitchCol]}>PITCH</Text>
            <Text style={[styles.headerCell, styles.usageCol]}>USAGE</Text>
            <Text style={[styles.headerCell, styles.veloCol]}>VELO</Text>
            <Text style={[styles.headerCell, styles.avgCol]}>AVG</Text>
            <Text style={[styles.headerCell, styles.whiffCol]}>WHIFF%</Text>
          </View>

          {matchups.map(({ pitcher, batterStats }) => {
            const usagePct = Math.round(pitcher.usagePct * 100);
            const avg = batterStats?.avg ?? null;
            const whiffRate = batterStats?.whiffRate ?? null;
            const hasData = batterStats && batterStats.atBats > 0;

            return (
              <View
                key={pitcher.pitchCode}
                style={[styles.row, { backgroundColor: hasData ? getRowTint(avg ?? '') : 'transparent' }]}
              >
                {/* Pitch name + code */}
                <View style={styles.pitchCol}>
                  <Text style={styles.pitchCode}>{pitcher.pitchCode}</Text>
                  <Text style={styles.pitchName} numberOfLines={1}>
                    {pitcher.pitchName}
                  </Text>
                </View>

                {/* Usage bar */}
                <View style={styles.usageCol}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${usagePct}%` }]} />
                  </View>
                  <Text style={styles.usagePct}>{usagePct}%</Text>
                </View>

                {/* Velocity */}
                <View style={styles.veloCol}>
                  <Text style={styles.veloText}>
                    {pitcher.avgVelocity > 0 ? `${pitcher.avgVelocity.toFixed(1)}` : '—'}
                  </Text>
                </View>

                {/* Batter AVG */}
                <View style={styles.avgCol}>
                  {hasData ? (
                    <Text style={[styles.statValue, { color: getAvgColor(avg ?? '') }]}>
                      {avg?.replace('0.', '.') ?? '—'}
                    </Text>
                  ) : (
                    <Text style={styles.noSample}>—</Text>
                  )}
                </View>

                {/* Whiff rate */}
                <View style={styles.whiffCol}>
                  {hasData ? (
                    <Text style={styles.statValue}>{whiffRate ?? '—'}</Text>
                  ) : (
                    <Text style={styles.noSample}>—</Text>
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendLabel}>Struggles (&lt;.260)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.legendLabel}>Neutral</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.legendLabel}>Hits well (&gt;.310)</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const COL_WIDTHS = {
  pitch: 110,
  usage: 90,
  velo: 50,
  avg: 46,
  whiff: 52,
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
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },

  // Column header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  headerCell: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Data row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    marginVertical: 1,
  },

  // Column definitions
  pitchCol: {
    width: COL_WIDTHS.pitch,
  },
  usageCol: {
    width: COL_WIDTHS.usage,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  veloCol: {
    width: COL_WIDTHS.velo,
    alignItems: 'center',
  },
  avgCol: {
    width: COL_WIDTHS.avg,
    alignItems: 'center',
  },
  whiffCol: {
    width: COL_WIDTHS.whiff,
    alignItems: 'center',
  },

  // Pitch label
  pitchCode: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  pitchName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Usage bar
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: USAGE_BAR_COLOR,
    borderRadius: 3,
  },
  usagePct: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    width: 28,
    textAlign: 'right',
  },

  // Stat values
  veloText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  noSample: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },

  // States
  centered: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  statusText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  noDataText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
