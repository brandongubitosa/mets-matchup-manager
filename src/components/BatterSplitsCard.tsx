import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { BatterSplitEntry } from '../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';

interface BatterSplitsCardProps {
  splits: BatterSplitEntry[];
  batterName: string;
  pitcherHand?: string; // 'R' | 'L' — used to highlight the relevant row
  loading?: boolean;
  noData?: boolean;
}

const SPLIT_LABELS: Record<string, string> = {
  h: 'Home',
  a: 'Away',
  vl: 'vs Left',
  vr: 'vs Right',
};

const SPLIT_ICONS: Record<string, string> = {
  h: '🏠',
  a: '✈️',
  vl: '⬅️',
  vr: '➡️',
};

const getOpsColor = (ops: string): string => {
  const n = parseFloat(ops);
  if (isNaN(n)) return COLORS.textPrimary;
  if (n >= 0.900) return '#C62828';
  if (n >= 0.800) return '#EF6C00';
  if (n >= 0.700) return COLORS.success;
  return COLORS.textSecondary;
};

const getAvgColor = (avg: string): string => {
  const n = parseFloat(avg);
  if (isNaN(n)) return COLORS.textPrimary;
  if (n >= 0.300) return '#C62828';
  if (n >= 0.260) return '#EF6C00';
  if (n >= 0.230) return COLORS.success;
  return COLORS.textSecondary;
};

// Which split code is highlighted based on pitcher handedness
const getHighlightCode = (pitcherHand?: string): string | null => {
  if (pitcherHand === 'R') return 'vr';
  if (pitcherHand === 'L') return 'vl';
  return null;
};

export const BatterSplitsCard: React.FC<BatterSplitsCardProps> = ({
  splits,
  batterName,
  pitcherHand,
  loading = false,
  noData = false,
}) => {
  const highlightCode = getHighlightCode(pitcherHand);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Batter Splits</Text>
      <Text style={styles.subtitle}>
        {batterName} — 2025 season
        {pitcherHand ? `  ·  Facing ${pitcherHand}HP` : ''}
      </Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>Loading splits...</Text>
        </View>
      ) : noData ? (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>Split data unavailable for this season</Text>
        </View>
      ) : (
        <>
          {/* Column headers */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.splitCol]}>SPLIT</Text>
            <Text style={[styles.headerCell, styles.statCol]}>AVG</Text>
            <Text style={[styles.headerCell, styles.statCol]}>OBP</Text>
            <Text style={[styles.headerCell, styles.statCol]}>SLG</Text>
            <Text style={[styles.headerCell, styles.statCol]}>OPS</Text>
            <Text style={[styles.headerCell, styles.abCol]}>AB</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {splits.map((split) => {
            const isHighlighted = split.code === highlightCode;
            return (
              <View
                key={split.code}
                style={[styles.row, isHighlighted && styles.rowHighlighted]}
              >
                {/* Split label */}
                <View style={[styles.splitCol, styles.splitLabelContainer]}>
                  {isHighlighted && (
                    <View style={styles.matchupBadge}>
                      <Text style={styles.matchupBadgeText}>THIS MATCHUP</Text>
                    </View>
                  )}
                  <View style={styles.splitNameRow}>
                    <Text style={styles.splitIcon}>
                      {SPLIT_ICONS[split.code] ?? ''}
                    </Text>
                    <Text style={[styles.splitLabel, isHighlighted && styles.splitLabelHighlighted]}>
                      {SPLIT_LABELS[split.code] ?? split.description}
                    </Text>
                  </View>
                </View>

                {/* Stats */}
                <Text style={[styles.statCol, styles.statValue, { color: getAvgColor(split.avg) }]}>
                  {split.avg}
                </Text>
                <Text style={[styles.statCol, styles.statValue, { color: COLORS.textPrimary }]}>
                  {split.obp}
                </Text>
                <Text style={[styles.statCol, styles.statValue, { color: COLORS.textPrimary }]}>
                  {split.slg}
                </Text>
                <Text style={[styles.statCol, styles.statValue, { color: getOpsColor(split.ops) }, styles.opsValue]}>
                  {split.ops}
                </Text>
                <Text style={[styles.abCol, styles.abValue]}>
                  {split.atBats}
                </Text>
              </View>
            );
          })}

          {/* Legend */}
          {highlightCode && (
            <View style={styles.legendRow}>
              <View style={styles.highlightSwatch} />
              <Text style={styles.legendText}>
                Highlighted row = relevant split for this matchup
              </Text>
            </View>
          )}

          {/* Color key */}
          <View style={styles.colorKey}>
            <View style={styles.colorKeyItem}>
              <View style={[styles.colorDot, { backgroundColor: '#C62828' }]} />
              <Text style={styles.colorKeyLabel}>Elite</Text>
            </View>
            <View style={styles.colorKeyItem}>
              <View style={[styles.colorDot, { backgroundColor: '#EF6C00' }]} />
              <Text style={styles.colorKeyLabel}>Good</Text>
            </View>
            <View style={styles.colorKeyItem}>
              <View style={[styles.colorDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.colorKeyLabel}>Average</Text>
            </View>
            <View style={styles.colorKeyItem}>
              <View style={[styles.colorDot, { backgroundColor: COLORS.textSecondary }]} />
              <Text style={styles.colorKeyLabel}>Below avg</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const COL = {
  split: 96,
  stat: 46,
  ab: 36,
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

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.xs,
  },
  headerCell: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginBottom: SPACING.xs,
  },

  // Data rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    marginVertical: 1,
  },
  rowHighlighted: {
    backgroundColor: `${COLORS.primary}0D`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },

  // Column widths
  splitCol: {
    width: COL.split,
  },
  statCol: {
    width: COL.stat,
    textAlign: 'center',
  },
  abCol: {
    width: COL.ab,
    textAlign: 'center',
  },

  // Split label
  splitLabelContainer: {
    justifyContent: 'center',
  },
  matchupBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  matchupBadgeText: {
    color: COLORS.white,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  splitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  splitIcon: {
    fontSize: 12,
  },
  splitLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  splitLabelHighlighted: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Stat values
  statValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  opsValue: {
    fontWeight: '800',
  },
  abValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  highlightSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: `${COLORS.primary}0D`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  legendText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    flex: 1,
  },

  // OPS color key
  colorKey: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  colorKeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorKeyLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },

  // States
  centered: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
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
