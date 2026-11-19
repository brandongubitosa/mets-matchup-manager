import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';
import type { SeasonSimScreenNavigationProp, SeasonSimScreenRouteProp } from '../types';
import { useSeasonBuilder } from '../hooks';
import { seasonData } from '../services/seasonBuilder';
import {
  describeFinish,
  leagueContextFor,
  simulateOneSeason,
  type SeasonSimulation,
  type SeriesResult,
  type StandingRow,
} from '../projection';

type Props = {
  navigation: SeasonSimScreenNavigationProp;
  route: SeasonSimScreenRouteProp;
};

type Tab = 'log' | 'standings' | 'playoffs';

const abbr = (id: number) => seasonData.teams.find((t) => t.id === id)?.abbr ?? '';
const leagueShort = (league: string) => (league.startsWith('National') ? 'NL' : league.startsWith('American') ? 'AL' : league);
const divisionShort = (d: string) => d.replace('National League', 'NL').replace('American League', 'AL');
const shortDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const lastName = (name: string) => (name.startsWith('Replacement') ? 'Repl.' : name.split(' ').slice(-1)[0]);
const gamesBack = (leader: StandingRow, r: StandingRow) => {
  const gb = (leader.wins - r.wins + (r.losses - leader.losses)) / 2;
  return gb === 0 ? '—' : gb.toFixed(1).replace('.0', '');
};
const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? 'th'}`;

export const SeasonSimScreen: React.FC<Props> = ({ navigation, route }) => {
  const teamId = route.params?.teamId ?? 121;
  const b = useSeasonBuilder(teamId, { odds: false });
  const [sim, setSim] = useState<SeasonSimulation | null>(null);
  const [count, setCount] = useState(0);
  const [tab, setTab] = useState<Tab>('log');
  const [history, setHistory] = useState<{ wins: number; finish: string }[]>([]);

  const run = useCallback(() => {
    if (!b.loaded) return;
    const result = simulateOneSeason(
      b.projections,
      seasonData.teams,
      seasonData.schedule,
      leagueContextFor(seasonData),
      Math.floor(Math.random() * 2147483646) + 1,
    );
    setSim(result);
    setCount((c) => c + 1);
    const row = result.standings.find((r) => r.teamId === teamId)!;
    setHistory((h) => [{ wins: row.wins, finish: describeFinish(result, teamId, abbr, leagueShort) }, ...h].slice(0, 20));
  }, [b.loaded, b.projections, teamId]);

  // Sim once as soon as the roster (with saved moves) has loaded.
  useEffect(() => {
    if (b.loaded && !sim) run();
  }, [b.loaded, sim, run]);

  const team = seasonData.teams.find((t) => t.id === teamId);
  const row = sim?.standings.find((r) => r.teamId === teamId);
  const byId = useMemo(() => new Map(sim?.standings.map((r) => [r.teamId, r]) ?? []), [sim]);
  const sortRows = (ids: number[]) =>
    ids.map((id) => byId.get(id)!).filter(Boolean).sort((a, c) => c.wins - a.wins || a.losses - c.losses);

  const divisionRank = useMemo(() => {
    if (!sim || !team) return null;
    const rows = sortRows(seasonData.teams.filter((t) => t.division === team.division).map((t) => t.id));
    return rows.findIndex((r) => r.teamId === teamId) + 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, team, teamId]);

  const myGames = useMemo(() => sim?.games.filter((g) => g.home === teamId || g.away === teamId) ?? [], [sim, teamId]);
  const streaks = useMemo(() => {
    let best = 0;
    let worst = 0;
    let cur = 0;
    for (const g of myGames) {
      const won = (g.home === teamId) === g.homeScore > g.awayScore;
      cur = won ? Math.max(1, cur + 1) : Math.min(-1, cur - 1);
      best = Math.max(best, cur);
      worst = Math.min(worst, cur);
    }
    return { best, worst: -worst };
  }, [myGames, teamId]);

  if (!b.loaded || !sim || !row || !team) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const finish = describeFinish(sim, teamId, abbr, leagueShort);
  const madePlayoffs = sim.playoffSeeds.some((s) => s.teamId === teamId);
  const champion = sim.champion === teamId;
  const avgWins = history.length ? history.reduce((s, h) => s + h.wins, 0) / history.length : row.wins;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backBtnText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {seasonData.season} Sim #{count}
        </Text>
        <View style={styles.backBtn} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, SHADOW.md, champion && styles.heroChamp]}>
          <Text style={[styles.heroEyebrow, champion && styles.light]}>{team.name}</Text>
          <Text style={[styles.heroRecord, champion && styles.light]}>
            {row.wins}–{row.losses}
          </Text>
          <Text style={[styles.heroFinish, champion && styles.light]}>
            {champion ? '🏆 ' : ''}
            {finish}
          </Text>
          <Text style={[styles.heroSub, champion && styles.lightMuted]}>
            {ordinal(divisionRank ?? 0)} in {divisionShort(team.division)} · {row.runsScored} RS / {row.runsAllowed} RA ·{' '}
            {row.runsScored - row.runsAllowed >= 0 ? '+' : ''}
            {row.runsScored - row.runsAllowed} run diff
          </Text>
          <Text style={[styles.heroSub, champion && styles.lightMuted]}>
            Longest win streak {streaks.best} · longest losing streak {streaks.worst}
            {b.moves.add?.length || b.moves.remove?.length || b.moves.addFixedWar?.length ? ' · with your roster moves' : ''}
          </Text>
          <TouchableOpacity onPress={run} style={styles.simBtn} accessibilityRole="button" accessibilityLabel="Sim the season again">
            <Text style={styles.simBtnText}>↻ Sim Again</Text>
          </TouchableOpacity>
        </View>

        {history.length > 1 && (
          <View style={[styles.card, SHADOW.sm]}>
            <Text style={styles.cardTitle}>
              Your last {history.length} sims · avg {avgWins.toFixed(1)} wins
            </Text>
            <View style={styles.historyRow}>
              {history.map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.historyPill,
                    h.finish === 'Won the World Series'
                      ? styles.pillChamp
                      : h.finish === 'Missed the playoffs'
                        ? styles.pillMiss
                        : styles.pillPlayoff,
                  ]}
                >
                  <Text style={styles.historyText}>{h.wins}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.note}>Gold = won the World Series · blue = made the playoffs · gray = missed</Text>
          </View>
        )}

        <View style={styles.tabs}>
          {(['log', 'standings', 'playoffs'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'log' ? 'Game Log' : t === 'standings' ? 'Standings' : 'Playoffs'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'log' && (
          <View style={[styles.card, SHADOW.sm]}>
            {myGames.map((g, i) => {
              const home = g.home === teamId;
              const us = home ? g.homeScore : g.awayScore;
              const them = home ? g.awayScore : g.homeScore;
              const won = us > them;
              const ourSp = home ? g.homeStarter : g.awayStarter;
              const theirSp = home ? g.awayStarter : g.homeStarter;
              return (
                <View key={`${g.gamePk}-${i}`} style={styles.logRow}>
                  <Text style={styles.logDate}>{shortDate(g.date)}</Text>
                  <Text style={styles.logOpp}>
                    {home ? 'vs' : '@'} {abbr(home ? g.away : g.home)}
                  </Text>
                  <Text style={[styles.logResult, { color: won ? COLORS.success : COLORS.danger }]}>
                    {won ? 'W' : 'L'} {us}-{them}
                    {g.extraInnings ? ' (F/10)' : ''}
                  </Text>
                  <Text style={styles.logSp} numberOfLines={1}>
                    {lastName(ourSp)} v {lastName(theirSp)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {tab === 'standings' && (
          <>
            {[...new Set(seasonData.teams.map((t) => t.division))]
              .sort((a, c) => (a === team.division ? -1 : c === team.division ? 1 : a.localeCompare(c)))
              .map((div) => {
                const rows = sortRows(seasonData.teams.filter((t) => t.division === div).map((t) => t.id));
                return (
                  <View key={div} style={[styles.card, SHADOW.sm]}>
                    <View style={styles.standHeader}>
                      <Text style={[styles.cardTitle, { flex: 1 }]}>{divisionShort(div)}</Text>
                      <Text style={styles.standCol}>W-L</Text>
                      <Text style={styles.standCol}>GB</Text>
                      <Text style={styles.standCol}>Diff</Text>
                    </View>
                    {rows.map((r) => {
                      const seed = sim.playoffSeeds.find((s) => s.teamId === r.teamId);
                      return (
                        <View key={r.teamId} style={[styles.standRow, r.teamId === teamId && styles.standRowMine]}>
                          <Text style={[styles.standTeam, r.teamId === teamId && styles.standTeamMine]}>
                            {abbr(r.teamId)}
                            {seed ? ` (${seed.seed})` : ''}
                          </Text>
                          <Text style={styles.standCol}>
                            {r.wins}-{r.losses}
                          </Text>
                          <Text style={styles.standCol}>{gamesBack(rows[0], r)}</Text>
                          <Text style={styles.standCol}>
                            {r.runsScored - r.runsAllowed > 0 ? '+' : ''}
                            {r.runsScored - r.runsAllowed}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            <Text style={styles.note}>(n) = playoff seed</Text>
          </>
        )}

        {tab === 'playoffs' && (
          <>
            {!madePlayoffs && <Text style={styles.note}>{team.name} missed the playoffs this time.</Text>}
            {(['Wild Card', 'Division Series', 'Championship Series', 'World Series'] as SeriesResult['round'][]).map((round) => (
              <View key={round} style={[styles.card, SHADOW.sm]}>
                <Text style={styles.cardTitle}>{round}</Text>
                {sim.series
                  .filter((s) => s.round === round)
                  .map((s, i) => {
                    const seedOf = (id: number) => sim.playoffSeeds.find((p) => p.teamId === id)?.seed;
                    const mine = s.high === teamId || s.low === teamId;
                    return (
                      <View key={i} style={[styles.seriesRow, mine && styles.standRowMine]}>
                        {s.league ? <Text style={styles.seriesLeague}>{leagueShort(s.league)}</Text> : null}
                        <Text style={[styles.seriesTeam, s.winner === s.high && styles.seriesWinner]}>
                          ({seedOf(s.high)}) {abbr(s.high)}
                        </Text>
                        <Text style={styles.seriesScore}>
                          {s.highWins}-{s.lowWins}
                        </Text>
                        <Text style={[styles.seriesTeam, s.winner === s.low && styles.seriesWinner]}>
                          ({seedOf(s.low)}) {abbr(s.low)}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            ))}
            <Text style={styles.note}>🏆 {seasonData.teams.find((t) => t.id === sim.champion)?.name} win the World Series.</Text>
          </>
        )}

        <Text style={styles.footnote}>
          Each sim plays all {seasonData.schedule.length.toLocaleString()} games with the projection model: offense vs. that
          day's starting pitchers and bullpens, home field and platoon edge, plus season-to-season luck in each team's true
          talent. Postseason rotations use each team's top four starters.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: { paddingVertical: SPACING.xs, minWidth: 60 },
  backBtnText: { color: COLORS.white, fontSize: FONT_SIZE.md, fontWeight: '600' },
  headerTitle: { flex: 1, color: COLORS.white, fontSize: FONT_SIZE.lg, fontWeight: '800', textAlign: 'center' },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },

  hero: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs },
  heroChamp: { backgroundColor: COLORS.primary },
  heroEyebrow: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600' },
  heroRecord: { fontSize: FONT_SIZE.hero, fontWeight: '900', color: COLORS.primary },
  heroFinish: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.textPrimary },
  heroSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  light: { color: COLORS.white },
  lightMuted: { color: 'rgba(255,255,255,0.8)' },
  simBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  simBtnText: { color: COLORS.white, fontSize: FONT_SIZE.base, fontWeight: '800' },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs },
  cardTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  note: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 18 },
  footnote: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 16 },

  historyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  historyPill: { minWidth: 34, paddingVertical: 4, borderRadius: RADIUS.sm, alignItems: 'center' },
  pillChamp: { backgroundColor: '#F5C451' },
  pillPlayoff: { backgroundColor: '#BFD3F2' },
  pillMiss: { backgroundColor: COLORS.lightGray },
  historyText: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: COLORS.textPrimary },

  tabs: { flexDirection: 'row', gap: SPACING.xs },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },

  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: SPACING.xs },
  logDate: { width: 52, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  logOpp: { width: 62, fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary },
  logResult: { width: 78, fontSize: FONT_SIZE.sm, fontWeight: '800' },
  logSp: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'right' },

  standHeader: { flexDirection: 'row', alignItems: 'center' },
  standRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs + 2, paddingHorizontal: SPACING.xs, borderRadius: RADIUS.sm },
  standRowMine: { backgroundColor: COLORS.background },
  standTeam: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  standTeamMine: { fontWeight: '900', color: COLORS.primary },
  standCol: { width: 56, textAlign: 'right', fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600' },

  seriesRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs + 2, paddingHorizontal: SPACING.xs, borderRadius: RADIUS.sm, gap: SPACING.sm },
  seriesLeague: { width: 24, fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textMuted },
  seriesTeam: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  seriesWinner: { fontWeight: '900', color: COLORS.textPrimary },
  seriesScore: { width: 40, textAlign: 'center', fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.textPrimary },
});
