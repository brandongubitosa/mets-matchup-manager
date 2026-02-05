import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';
import { MatchupStats } from '../types';

interface StatsTableProps {
  stats: MatchupStats;
  title?: string;
}

const getStatColor = (label: string, value: string | number): string | undefined => {
  const numVal = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numVal)) return undefined;

  switch (label) {
    case 'AVG':
      if (numVal >= 0.3) return COLORS.success;
      if (numVal >= 0.25) return COLORS.warning;
      if (numVal > 0 && numVal < 0.2) return COLORS.danger;
      return undefined;
    case 'OBP':
      if (numVal >= 0.35) return COLORS.success;
      if (numVal >= 0.3) return COLORS.warning;
      return undefined;
    case 'SLG':
      if (numVal >= 0.45) return COLORS.success;
      if (numVal >= 0.35) return COLORS.warning;
      return undefined;
    case 'OPS':
      if (numVal >= 0.8) return COLORS.success;
      if (numVal >= 0.7) return COLORS.warning;
      return undefined;
    default:
      return undefined;
  }
};

export const StatsTable: React.FC<StatsTableProps> = ({ stats, title }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const statRows = [
    { label: 'AB', value: stats.atBats },
    { label: 'H', value: stats.hits },
    { label: 'AVG', value: stats.avg },
    { label: 'HR', value: stats.homeRuns },
    { label: 'RBI', value: stats.rbi },
    { label: 'BB', value: stats.walks },
    { label: 'K', value: stats.strikeouts },
    { label: 'OBP', value: stats.obp },
    { label: 'SLG', value: stats.slg },
    { label: 'OPS', value: stats.ops },
  ];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.table}>
        <View style={styles.row}>
          {statRows.slice(0, 5).map((stat) => {
            const color = getStatColor(stat.label, stat.value);
            return (
              <View key={stat.label} style={styles.cell}>
                <Text style={styles.label}>{stat.label}</Text>
                <Text style={[styles.value, color ? { color } : undefined]}>
                  {stat.value}
                </Text>
                {color && <View style={[styles.colorDot, { backgroundColor: color }]} />}
              </View>
            );
          })}
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          {statRows.slice(5, 10).map((stat) => {
            const color = getStatColor(stat.label, stat.value);
            return (
              <View key={stat.label} style={styles.cell}>
                <Text style={styles.label}>{stat.label}</Text>
                <Text style={[styles.value, color ? { color } : undefined]}>
                  {stat.value}
                </Text>
                {color && <View style={[styles.colorDot, { backgroundColor: color }]} />}
              </View>
            );
          })}
        </View>
      </View>
      {stats.gamesPlayed > 0 && (
        <Text style={styles.games}>
          Based on {stats.gamesPlayed} game{stats.gamesPlayed !== 1 ? 's' : ''}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },
  title: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  table: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.sm,
  },
  cell: {
    alignItems: 'center',
    minWidth: 50,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  colorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  games: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },
});
