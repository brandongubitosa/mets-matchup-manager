import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import { MatchupStats } from '../types';

interface StatsTableProps {
  stats: MatchupStats;
  title?: string;
}

export const StatsTable: React.FC<StatsTableProps> = ({ stats, title }) => {
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

  const getAvgColor = (avg: string) => {
    const value = parseFloat(avg);
    if (value >= 0.3) return COLORS.success;
    if (value >= 0.25) return COLORS.warning;
    if (value < 0.2) return COLORS.danger;
    return COLORS.black;
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.table}>
        <View style={styles.row}>
          {statRows.slice(0, 5).map((stat) => (
            <View key={stat.label} style={styles.cell}>
              <Text style={styles.label}>{stat.label}</Text>
              <Text
                style={[
                  styles.value,
                  stat.label === 'AVG' && { color: getAvgColor(stats.avg) },
                ]}
              >
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {statRows.slice(5, 10).map((stat) => (
            <View key={stat.label} style={styles.cell}>
              <Text style={styles.label}>{stat.label}</Text>
              <Text style={styles.value}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </View>
      {stats.gamesPlayed > 0 && (
        <Text style={styles.games}>
          Based on {stats.gamesPlayed} game{stats.gamesPlayed !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  table: {
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  cell: {
    alignItems: 'center',
    minWidth: 50,
  },
  label: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  games: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
