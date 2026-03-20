import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RecentBatterStats, RecentPitcherStats, MatchupStats, PitcherSeasonStats } from '../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';

interface RecentFormCardProps {
  batterName: string;
  pitcherName: string;
  batterForm: { l7: RecentBatterStats; l15: RecentBatterStats; l30: RecentBatterStats } | null;
  pitcherForm: { l3: RecentPitcherStats; l5: RecentPitcherStats; l10: RecentPitcherStats } | null;
  batterSeason?: MatchupStats;
  pitcherSeason?: PitcherSeasonStats;
  loading?: boolean;
}

type BatterPeriod = 'l7' | 'l15' | 'l30';
type PitcherPeriod = 'l3' | 'l5' | 'l10';
type Mode = 'batter' | 'pitcher';

const BATTER_LABELS: Record<BatterPeriod, string> = { l7: 'L7', l15: 'L15', l30: 'L30' };
const PITCHER_LABELS: Record<PitcherPeriod, string> = { l3: 'L3', l5: 'L5', l10: 'L10' };

// Returns ↑ ↓ → and a color comparing recent to season
const trend = (
  recent: number,
  season: number,
  higherIsBetter = true
): { arrow: string; color: string } => {
  if (season === 0) return { arrow: '—', color: COLORS.textMuted };
  const diff = recent - season;
  const pct = Math.abs(diff / season);
  if (pct < 0.05) return { arrow: '→', color: COLORS.textMuted };
  const improving = higherIsBetter ? diff > 0 : diff < 0;
  return improving
    ? { arrow: '↑', color: COLORS.success }
    : { arrow: '↓', color: COLORS.danger };
};

const parseAvg = (s: string): number => {
  const n = parseFloat(s.startsWith('.') ? '0' + s : s);
  return isNaN(n) ? 0 : n;
};

export const RecentFormCard: React.FC<RecentFormCardProps> = ({
  batterName,
  pitcherName,
  batterForm,
  pitcherForm,
  batterSeason,
  pitcherSeason,
  loading = false,
}) => {
  const [mode, setMode] = useState<Mode>('batter');
  const [batterPeriod, setBatterPeriod] = useState<BatterPeriod>('l15');
  const [pitcherPeriod, setPitcherPeriod] = useState<PitcherPeriod>('l5');

  const noData = !batterForm && !pitcherForm;

  const renderModeTab = (m: Mode, label: string) => (
    <TouchableOpacity
      key={m}
      style={[styles.modeTab, mode === m && styles.modeTabActive]}
      onPress={() => setMode(m)}
    >
      <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPeriodBtn = <T extends string>(
    period: T,
    current: T,
    label: string,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={period}
      style={[styles.periodBtn, current === period && styles.periodBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.periodBtnText, current === period && styles.periodBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStatBox = (
    value: string,
    label: string,
    arrow?: string,
    arrowColor?: string
  ) => (
    <View style={styles.statBox}>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {arrow && arrow !== '—' && (
          <Text style={[styles.trendArrow, { color: arrowColor }]}>{arrow}</Text>
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderBatterContent = () => {
    if (!batterForm) {
      return (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>No batting game log available</Text>
        </View>
      );
    }

    const stats = batterForm[batterPeriod];
    const kRate = stats.atBats > 0 ? ((stats.strikeouts / stats.atBats) * 100).toFixed(0) + '%' : '—';
    const bbRate = stats.atBats > 0 ? ((stats.walks / stats.atBats) * 100).toFixed(0) + '%' : '—';

    const avgT = batterSeason
      ? trend(parseAvg(stats.avg), parseAvg(batterSeason.avg))
      : undefined;
    const opsT = batterSeason
      ? trend(parseAvg(stats.ops), parseAvg(batterSeason.ops))
      : undefined;
    const obpT = batterSeason
      ? trend(parseAvg(stats.obp), parseAvg(batterSeason.obp))
      : undefined;
    const slgT = batterSeason
      ? trend(parseAvg(stats.slg), parseAvg(batterSeason.slg))
      : undefined;

    return (
      <>
        <Text style={styles.gamesLabel}>{stats.games} games · {stats.hits}-for-{stats.atBats}</Text>
        <View style={styles.statGrid}>
          {renderStatBox(stats.avg, 'AVG', avgT?.arrow, avgT?.color)}
          {renderStatBox(stats.ops, 'OPS', opsT?.arrow, opsT?.color)}
          {renderStatBox(stats.obp, 'OBP', obpT?.arrow, obpT?.color)}
          {renderStatBox(stats.slg, 'SLG', slgT?.arrow, slgT?.color)}
        </View>
        <View style={styles.secondaryGrid}>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{stats.homeRuns}</Text>
            <Text style={styles.secondaryLabel}>HR</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{stats.rbi}</Text>
            <Text style={styles.secondaryLabel}>RBI</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{kRate}</Text>
            <Text style={styles.secondaryLabel}>K%</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{bbRate}</Text>
            <Text style={styles.secondaryLabel}>BB%</Text>
          </View>
        </View>
      </>
    );
  };

  const renderPitcherContent = () => {
    if (!pitcherForm) {
      return (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>No pitching game log available</Text>
        </View>
      );
    }

    const stats = pitcherForm[pitcherPeriod];

    const eraT = pitcherSeason
      ? trend(parseFloat(stats.era), parseFloat(pitcherSeason.era), false)
      : undefined;
    const whipT = pitcherSeason
      ? trend(parseFloat(stats.whip), parseFloat(pitcherSeason.whip), false)
      : undefined;

    const kPer9 = parseFloat(stats.inningsPitched) > 0
      ? ((stats.strikeouts / parseFloat(stats.inningsPitched)) * 9).toFixed(1)
      : '0.0';
    const bbPer9 = parseFloat(stats.inningsPitched) > 0
      ? ((stats.walks / parseFloat(stats.inningsPitched)) * 9).toFixed(1)
      : '0.0';

    return (
      <>
        <Text style={styles.gamesLabel}>{stats.games} starts · {stats.inningsPitched} IP</Text>
        <View style={styles.statGrid}>
          {renderStatBox(stats.era, 'ERA', eraT?.arrow, eraT?.color)}
          {renderStatBox(stats.whip, 'WHIP', whipT?.arrow, whipT?.color)}
          {renderStatBox(kPer9, 'K/9')}
          {renderStatBox(bbPer9, 'BB/9')}
        </View>
        <View style={styles.secondaryGrid}>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{stats.strikeouts}</Text>
            <Text style={styles.secondaryLabel}>K</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{stats.walks}</Text>
            <Text style={styles.secondaryLabel}>BB</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{stats.hits}</Text>
            <Text style={styles.secondaryLabel}>H</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Text style={styles.secondaryValue}>{stats.earnedRuns}</Text>
            <Text style={styles.secondaryLabel}>ER</Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Form</Text>
      <Text style={styles.subtitle}>Arrows compare to full season · tap period to adjust window</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>Loading game logs...</Text>
        </View>
      ) : noData ? (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>Game log data unavailable for this season</Text>
        </View>
      ) : (
        <>
          {/* Mode tabs */}
          <View style={styles.modeTabs}>
            {renderModeTab('batter', batterName.split(' ').pop() ?? 'Batter')}
            {renderModeTab('pitcher', pitcherName.split(' ').pop() ?? 'Pitcher')}
          </View>

          {/* Period selector */}
          <View style={styles.periodRow}>
            {mode === 'batter'
              ? (Object.keys(BATTER_LABELS) as BatterPeriod[]).map((p) =>
                  renderPeriodBtn(p, batterPeriod, BATTER_LABELS[p], () => setBatterPeriod(p))
                )
              : (Object.keys(PITCHER_LABELS) as PitcherPeriod[]).map((p) =>
                  renderPeriodBtn(p, pitcherPeriod, PITCHER_LABELS[p], () => setPitcherPeriod(p))
                )}
          </View>

          {mode === 'batter' ? renderBatterContent() : renderPitcherContent()}
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
    marginBottom: SPACING.md,
  },

  // Mode tabs
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  modeTab: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  modeTabActive: {
    backgroundColor: COLORS.primary,
  },
  modeTabText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeTabTextActive: {
    color: COLORS.white,
  },

  // Period buttons
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  periodBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodBtnText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  periodBtnTextActive: {
    color: COLORS.white,
  },

  // Games summary line
  gamesLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  // 2x2 main stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: SPACING.sm,
  },
  statBox: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  trendArrow: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    marginTop: 2,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },

  // Secondary 4-stat row
  secondaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  secondaryStat: {
    alignItems: 'center',
  },
  secondaryValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  secondaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
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
