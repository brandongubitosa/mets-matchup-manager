import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GameWeather } from '../services/mlbApi';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';

interface WeatherCardProps {
  weather: GameWeather | null;
  loading?: boolean;
}

const IMPACT_CONFIG = {
  'pitcher-friendly': { color: '#1D4ED8', bg: '#EFF6FF', icon: '⚾', label: 'Pitcher Friendly' },
  'hitter-friendly':  { color: '#B45309', bg: '#FFFBEB', icon: '💥', label: 'Hitter Friendly'  },
  'rain-risk':        { color: '#6B21A8', bg: '#FAF5FF', icon: '🌧', label: 'Rain Risk'         },
  'neutral':          { color: '#374151', bg: '#F9FAFB', icon: '☁️', label: 'Neutral'           },
};

// Draw a simple wind direction arrow by rotating an arrow character
const WindArrow: React.FC<{ degrees: number }> = ({ degrees }) => (
  <Text style={[styles.windArrow, { transform: [{ rotate: `${degrees}deg` }] }]}>↑</Text>
);

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, loading = false }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Day Weather</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching forecast...</Text>
        </View>
      ) : !weather ? (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>Weather data unavailable</Text>
        </View>
      ) : (
        <>
          <Text style={styles.parkName}>{weather.parkName}</Text>

          {weather.isDome ? (
            <View style={styles.domeRow}>
              <Text style={styles.domeIcon}>🏟️</Text>
              <Text style={styles.domeText}>Indoor stadium — controlled environment</Text>
            </View>
          ) : (
            <>
              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{weather.tempF}°F</Text>
                  <Text style={styles.statLabel}>TEMP</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCell}>
                  <View style={styles.windRow}>
                    {weather.windSpeedMph > 0 && (
                      <WindArrow degrees={weather.windDirectionDeg} />
                    )}
                    <Text style={styles.statValue}>
                      {weather.windSpeedMph > 0 ? `${weather.windSpeedMph} mph` : 'Calm'}
                    </Text>
                  </View>
                  <Text style={styles.statLabel}>
                    {weather.windSpeedMph > 0 ? `WIND (${weather.windDirectionLabel})` : 'WIND'}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCell}>
                  <Text style={[
                    styles.statValue,
                    weather.precipProbability >= 40 && { color: '#7C3AED' },
                  ]}>
                    {weather.precipProbability}%
                  </Text>
                  <Text style={styles.statLabel}>RAIN</Text>
                </View>
              </View>

              {/* Impact banner */}
              <View style={[styles.impactBanner, { backgroundColor: IMPACT_CONFIG[weather.impact].bg }]}>
                <Text style={styles.impactIcon}>{IMPACT_CONFIG[weather.impact].icon}</Text>
                <View style={styles.impactText}>
                  <Text style={[styles.impactLabel, { color: IMPACT_CONFIG[weather.impact].color }]}>
                    {IMPACT_CONFIG[weather.impact].label}
                  </Text>
                  <Text style={styles.impactDetail}>{weather.impactDetail}</Text>
                </View>
              </View>
            </>
          )}
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
    marginBottom: SPACING.xs,
  },
  parkName: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.borderLight,
  },
  statValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  windArrow: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },
  impactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  impactIcon: {
    fontSize: 22,
  },
  impactText: {
    flex: 1,
  },
  impactLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  impactDetail: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  domeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.borderLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  domeIcon: {
    fontSize: 22,
  },
  domeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    flex: 1,
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
  },
});
