import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { BullpenPitcherStatus, TeamBullpenStatus } from '../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';

interface BullpenFatigueCardProps {
  homeTeam: TeamBullpenStatus | null;
  awayTeam: TeamBullpenStatus | null;
  homeAbbr: string;
  awayAbbr: string;
  loading?: boolean;
}

const STATUS_COLOR = {
  unavailable: '#EF5350',
  limited: '#FFA726',
  available: '#66BB6A',
};

const STATUS_LABEL = {
  unavailable: 'Out',
  limited: 'Limited',
  available: 'Available',
};

const formatDaysRest = (daysRest: number): string => {
  if (daysRest === 99) return 'Fresh';
  if (daysRest === 0) return 'Today';
  if (daysRest === 1) return 'Yesterday';
  return `${daysRest}d rest`;
};

const PitcherRow: React.FC<{ pitcher: BullpenPitcherStatus }> = ({ pitcher }) => {
  const color = STATUS_COLOR[pitcher.status];
  const lastName = pitcher.fullName.split(' ').slice(1).join(' ') || pitcher.fullName;

  return (
    <View style={styles.pitcherRow}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.pitcherName} numberOfLines={1}>{lastName}</Text>
      <View style={styles.pitcherRight}>
        {pitcher.lastAppearance ? (
          <>
            <Text style={styles.restText}>{formatDaysRest(pitcher.daysRest)}</Text>
            <Text style={styles.lastOuting}>
              {pitcher.lastAppearance.inningsPitched} IP · {pitcher.lastAppearance.numberOfPitches}p
            </Text>
          </>
        ) : (
          <Text style={styles.freshText}>No recent outing</Text>
        )}
      </View>
    </View>
  );
};

const TeamColumn: React.FC<{ team: TeamBullpenStatus | null; abbr: string; label: string }> = ({
  team,
  abbr,
  label,
}) => {
  const usedPitchers = team?.pitchers.filter((p) => p.daysRest < 99) ?? [];
  const freshCount = team?.pitchers.filter((p) => p.daysRest === 99).length ?? 0;

  return (
    <View style={styles.column}>
      <Text style={styles.teamLabel}>{abbr} ({label})</Text>
      {usedPitchers.length === 0 ? (
        <Text style={styles.noDataText}>No recent outings</Text>
      ) : (
        usedPitchers.map((p) => <PitcherRow key={p.playerId} pitcher={p} />)
      )}
      {freshCount > 0 && (
        <Text style={styles.freshCount}>+ {freshCount} fully rested</Text>
      )}
    </View>
  );
};

export const BullpenFatigueCard: React.FC<BullpenFatigueCardProps> = ({
  homeTeam,
  awayTeam,
  homeAbbr,
  awayAbbr,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pitching availability</Text>
      <Text style={styles.subtitle}>Relief pitcher fatigue — last 7 days</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading pitching data...</Text>
        </View>
      ) : (
        <>
          <View style={styles.legend}>
            {(['available', 'limited', 'unavailable'] as const).map((s) => (
              <View key={s} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLOR[s] }]} />
                <Text style={styles.legendLabel}>{STATUS_LABEL[s]}</Text>
              </View>
            ))}
          </View>

          <View style={styles.teamsRow}>
            <TeamColumn team={awayTeam} abbr={awayAbbr} label="Away" />
            <View style={styles.divider} />
            <TeamColumn team={homeTeam} abbr={homeAbbr} label="Home" />
          </View>

          <Text style={styles.footnote}>
            Out = pitched within 1 day · Limited = 2 days or heavy load
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
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  legend: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
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
  teamsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  column: {
    flex: 1,
  },
  teamLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.xs,
  },
  pitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  pitcherName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pitcherRight: {
    alignItems: 'flex-end',
  },
  restText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  lastOuting: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  freshText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  freshCount: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  noDataText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontStyle: 'italic',
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
  footnote: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
