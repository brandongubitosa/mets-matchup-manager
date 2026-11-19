import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';
import type { SeasonBuilderScreenNavigationProp, SeasonBuilderScreenRouteProp } from '../types';
import { useSeasonBuilder } from '../hooks';
import {
  acquire,
  callUpCandidates,
  describeMoves,
  freeAgentCandidates,
  removeFixedWar,
  removePlayer,
  restorePlayer,
  seasonData,
  tradeCandidates,
  type Candidate,
} from '../services/seasonBuilder';
import type { TeamProjection } from '../projection';

type Props = {
  navigation: SeasonBuilderScreenNavigationProp;
  route: SeasonBuilderScreenRouteProp;
};

type Tab = 'sign' | 'trade' | 'callup' | 'roster' | 'schedule' | 'standings';
const TABS: { key: Tab; label: string }[] = [
  { key: 'sign', label: 'Free Agents' },
  { key: 'trade', label: 'Trade' },
  { key: 'callup', label: 'Call-Ups' },
  { key: 'roster', label: 'Depth Chart' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'standings', label: 'Standings' },
];

const abbr = (teamId: number) => seasonData.teams.find((t) => t.id === teamId)?.abbr ?? '';
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (x: number, digits = 1) => `${x >= 0 ? '+' : ''}${x.toFixed(digits)}`;
const money = (x?: number | null) => (x ? `$${(x / 1e6).toFixed(0)}M/yr` : '');
const record = (w: number) => `${Math.round(w)}–${162 - Math.round(w)}`;
const monthName = (ym: string) =>
  new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
const shortDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const SeasonBuilderScreen: React.FC<Props> = ({ navigation, route }) => {
  const teamId = route.params?.teamId ?? 121;
  const b = useSeasonBuilder(teamId);
  const [tab, setTab] = useState<Tab>('sign');
  const [query, setQuery] = useState('');
  const [faFilter, setFaFilter] = useState<'all' | 'bat' | 'pit'>('all');

  const candidates = useMemo<Candidate[]>(() => {
    if (tab === 'sign')
      return freeAgentCandidates(teamId, b.moves, {
        query,
        pitchers: faFilter === 'all' ? undefined : faFilter === 'pit',
      });
    if (tab === 'trade') return tradeCandidates(teamId, b.moves, { query });
    if (tab === 'callup') return callUpCandidates(teamId, b.moves);
    return [];
  }, [tab, teamId, b.moves, query, faFilter]);

  if (!b.loaded || !b.team || !b.baselineTeam) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const delta = b.team.wins - b.baselineTeam.wins;
  const moveList = describeMoves(b.moves);
  const teamName = seasonData.teams.find((t) => t.id === teamId)?.name ?? '';

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
        <Text style={styles.headerTitle}>{seasonData.season} Season Builder</Text>
        {moveList.length > 0 ? (
          <TouchableOpacity onPress={b.resetMoves} style={styles.resetBtn} accessibilityRole="button">
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.resetBtn} />
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Projection hero */}
        <View style={[styles.hero, SHADOW.md]}>
          <Text style={styles.heroEyebrow}>{teamName} projected record</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroRecord}>{record(b.team.wins)}</Text>
            {Math.abs(delta) >= 0.05 && (
              <View style={[styles.deltaPill, { backgroundColor: delta >= 0 ? COLORS.successLight : COLORS.dangerLight }]}>
                <Text style={[styles.deltaText, { color: delta >= 0 ? COLORS.success : COLORS.danger }]}>
                  {signed(delta)} W
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.heroSub}>
            {Math.round(b.team.runsScored)} runs scored · {Math.round(b.team.runsAllowed)} allowed · {b.team.war.toFixed(1)} WAR
          </Text>
          <View style={styles.oddsRow}>
            <Odds label="80% range" value={b.teamSim ? `${b.teamSim.p10}–${b.teamSim.p90} W` : '…'} />
            <Odds label="Division" value={b.teamSim ? pct(b.teamSim.divisionPct) : '…'} />
            <Odds label="Playoffs" value={b.teamSim ? pct(b.teamSim.playoffPct) : '…'} />
          </View>
          {b.simulating && <Text style={styles.simulating}>Simulating {seasonData.season} season…</Text>}
        </View>

        {/* Moves */}
        {moveList.length > 0 && (
          <View style={styles.chips}>
            {moveList.map((m) => (
              <TouchableOpacity
                key={`${m.kind}-${m.id}`}
                style={[styles.chip, m.kind === 'remove' ? styles.chipRemove : styles.chipAdd]}
                onPress={() =>
                  b.setMoves((cur) =>
                    m.kind === 'add'
                      ? removePlayer(cur, Number(m.id))
                      : m.kind === 'remove'
                        ? restorePlayer(cur, Number(m.id))
                        : removeFixedWar(cur, m.id),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Undo ${m.kind === 'remove' ? 'removing' : 'adding'} ${m.name}`}
              >
                <Text style={styles.chipText}>
                  {m.kind === 'remove' ? '− ' : '+ '}
                  {m.name} ✕
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => {
                setTab(t.key);
                setQuery('');
              }}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === t.key }}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {(tab === 'sign' || tab === 'trade') && (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={tab === 'sign' ? 'Search free agents' : 'Search any MLB player'}
            placeholderTextColor={COLORS.textMuted}
            style={styles.search}
            autoCorrect={false}
          />
        )}
        {tab === 'sign' && (
          <View style={styles.filterRow}>
            {(['all', 'bat', 'pit'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFaFilter(f)}
                style={[styles.filter, faFilter === f && styles.filterActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: faFilter === f }}
              >
                <Text style={[styles.filterText, faFilter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'All' : f === 'bat' ? 'Hitters' : 'Pitchers'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(tab === 'sign' || tab === 'trade' || tab === 'callup') && (
          <View style={styles.card}>
            {tab === 'callup' && (
              <Text style={styles.note}>
                Minor leaguers not on the 40-man. Wins added is how much they'd help today's depth chart.
              </Text>
            )}
            {candidates.length === 0 && (
              <Text style={styles.note}>
                No players found.
              </Text>
            )}
            {candidates.map((c) => (
              <CandidateRow key={c.key} c={c} onAdd={() => b.setMoves((cur) => acquire(cur, c))} />
            ))}
          </View>
        )}

        {tab === 'roster' && (
          <DepthChart
            team={b.team}
            onRemove={(id) => b.setMoves((cur) => removePlayer(cur, id))}
          />
        )}

        {tab === 'schedule' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Expected wins by month</Text>
            {b.outlook.months.map((m) => {
              const p = m.expectedWins / m.games;
              return (
                <View key={m.month} style={styles.monthRow}>
                  <Text style={styles.monthLabel}>{monthName(m.month)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.round(p * 100)}%` }]} />
                    <View style={styles.barMid} />
                  </View>
                  <Text style={styles.monthValue}>
                    {m.expectedWins.toFixed(1)}–{(m.games - m.expectedWins).toFixed(1)}
                  </Text>
                </View>
              );
            })}
            {b.outlook.toughestStretch && (
              <Text style={styles.note}>
                Toughest 20-game stretch: {shortDate(b.outlook.toughestStretch.from)} – {shortDate(b.outlook.toughestStretch.to)} (
                {pct(b.outlook.toughestStretch.expectedWinPct)} win chance per game)
              </Text>
            )}
            <Text style={[styles.cardTitle, { marginTop: SPACING.md }]}>Game by game</Text>
            {b.outlook.games.map((g) => (
              <View key={g.gamePk} style={styles.gameRow}>
                <Text style={styles.gameDate}>{shortDate(g.date)}</Text>
                <Text style={styles.gameOpp}>
                  {g.home ? 'vs' : '@'} {abbr(g.opponentId)}
                </Text>
                <Text style={[styles.gameProb, { color: g.winProb >= 0.5 ? COLORS.success : COLORS.danger }]}>
                  {pct(g.winProb)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'standings' && <Standings teamId={teamId} projections={b.projections} sim={b.sim} />}

        <Text style={styles.footnote}>
          Projections use the last 3 seasons (weighted toward the most recent), minor league stats discounted by level,
          regression to league average and an age curve. Matchups account for each opponent's rotation, home field and
          lineup handedness. Free agents without MLB stats use FanGraphs projected WAR.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const Odds: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.odds}>
    <Text style={styles.oddsValue}>{value}</Text>
    <Text style={styles.oddsLabel}>{label}</Text>
  </View>
);

const CandidateRow: React.FC<{ c: Candidate; onAdd: () => void }> = ({ c, onAdd }) => {
  const verb = c.source === 'freeAgent' ? 'Sign' : c.source === 'trade' ? 'Acquire' : 'Call up';
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName} numberOfLines={1}>
          {c.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {[c.position, c.age != null ? `Age ${c.age}` : null, c.from, money(c.medianAav)].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.rowSub}>
          {c.war != null ? `${c.war.toFixed(1)} WAR` : ''}
          {c.fangraphsWar != null && c.fixedWar == null ? ` · FanGraphs ${c.fangraphsWar.toFixed(1)}` : ''}
          {c.fixedWar ? ' (FanGraphs)' : ''}
        </Text>
      </View>
      <Text style={[styles.rowWins, { color: c.winsAdded > 0.25 ? COLORS.success : COLORS.textMuted }]}>
        {signed(c.winsAdded)} W
      </Text>
      <TouchableOpacity onPress={onAdd} style={styles.addBtn} accessibilityRole="button" accessibilityLabel={`${verb} ${c.name}`}>
        <Text style={styles.addBtnText}>{verb}</Text>
      </TouchableOpacity>
    </View>
  );
};

const DepthChart: React.FC<{ team: TeamProjection; onRemove: (playerId: number) => void }> = ({ team, onRemove }) => {
  const section = (title: string, rows: { id: number; label: string; name: string; detail: string; war: number }[]) => (
    <View style={styles.card} key={title}>
      <Text style={styles.cardTitle}>{title}</Text>
      {rows.map((r) => (
        <View key={`${title}-${r.id}-${r.label}`} style={styles.row}>
          <Text style={styles.depthPos}>{r.label}</Text>
          <View style={styles.rowMain}>
            <Text style={styles.rowName} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={styles.rowSub}>{r.detail}</Text>
          </View>
          <Text style={styles.rowWins}>{r.war.toFixed(1)}</Text>
          <TouchableOpacity
            onPress={() => onRemove(r.id)}
            style={styles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${r.name}`}
          >
            <Text style={styles.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
  return (
    <>
      {section(
        'Lineup',
        team.lineup.filter((s) => s.starter).map((s) => ({
          id: s.hitter.playerId,
          label: s.pos,
          name: s.hitter.name,
          detail: `${Math.round(s.pa)} PA · ${signed(s.hitter.runsPerPa * 600, 0)} runs/600`,
          war: s.war,
        })),
      )}
      {section(
        'Bench',
        team.lineup.filter((s) => !s.starter).map((s) => ({
          id: s.hitter.playerId,
          label: s.pos,
          name: s.hitter.name,
          detail: `${Math.round(s.pa)} PA`,
          war: s.war,
        })),
      )}
      {section(
        'Rotation',
        team.rotation.map((s, i) => ({
          id: s.pitcher.playerId,
          label: `SP${i + 1}`,
          name: s.pitcher.name,
          detail: `${Math.round(s.ip)} IP · ${s.pitcher.ra9.toFixed(2)} RA9`,
          war: s.war,
        })),
      )}
      {section(
        'Bullpen',
        team.bullpen.map((s) => ({
          id: s.pitcher.playerId,
          label: 'RP',
          name: s.pitcher.name,
          detail: `${Math.round(s.ip)} IP · ${s.pitcher.ra9.toFixed(2)} RA9`,
          war: s.war,
        })),
      )}
      <Text style={styles.note}>
        Unfilled playing time goes to replacement-level players: {Math.round(team.replacementPa)} PA,{' '}
        {Math.round(team.replacementSpIp + team.replacementRpIp)} IP. WAR shown on the right.
      </Text>
    </>
  );
};

const Standings: React.FC<{
  teamId: number;
  projections: TeamProjection[];
  sim: ReturnType<typeof useSeasonBuilder>['sim'];
}> = ({ teamId, projections, sim }) => {
  const divisions = [...new Set(seasonData.teams.map((t) => t.division))];
  const myDivision = seasonData.teams.find((t) => t.id === teamId)?.division;
  divisions.sort((a, b) => (a === myDivision ? -1 : b === myDivision ? 1 : a.localeCompare(b)));
  return (
    <>
      {divisions.map((div) => {
        const rows = seasonData.teams
          .filter((t) => t.division === div)
          .map((t) => ({
            team: t,
            proj: projections.find((p) => p.teamId === t.id)!,
            sim: sim?.teams.find((s) => s.teamId === t.id),
          }))
          .sort((a, b) => b.proj.wins - a.proj.wins);
        return (
          <View style={styles.card} key={div}>
            <View style={styles.standHeader}>
              <Text style={[styles.cardTitle, { flex: 1 }]}>
                {div.replace('National League', 'NL').replace('American League', 'AL')}
              </Text>
              <Text style={styles.standCol}>W–L</Text>
              <Text style={styles.standCol}>Div</Text>
              <Text style={styles.standCol}>Playoff</Text>
            </View>
            {rows.map((r) => (
              <View key={r.team.id} style={[styles.standRow, r.team.id === teamId && styles.standRowMine]}>
                <Text style={[styles.standTeam, r.team.id === teamId && styles.standTeamMine]}>{r.team.abbr}</Text>
                <Text style={styles.standCol}>{record(r.proj.wins)}</Text>
                <Text style={styles.standCol}>{r.sim ? pct(r.sim.divisionPct) : '…'}</Text>
                <Text style={styles.standCol}>{r.sim ? pct(r.sim.playoffPct) : '…'}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </>
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
  resetBtn: { minWidth: 60, alignItems: 'flex-end' },
  resetBtnText: { color: COLORS.white, fontSize: FONT_SIZE.md, fontWeight: '600' },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },

  hero: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs },
  heroEyebrow: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  heroRecord: { fontSize: FONT_SIZE.hero, fontWeight: '900', color: COLORS.primary },
  deltaPill: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  deltaText: { fontSize: FONT_SIZE.md, fontWeight: '800' },
  heroSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  oddsRow: { flexDirection: 'row', marginTop: SPACING.sm, gap: SPACING.sm },
  odds: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  oddsValue: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.textPrimary },
  oddsLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },
  simulating: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: SPACING.xs },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, borderWidth: 1 },
  chipAdd: { backgroundColor: COLORS.successLight, borderColor: COLORS.success },
  chipRemove: { backgroundColor: COLORS.dangerLight, borderColor: COLORS.danger },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary },

  tabs: { gap: SPACING.xs },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },

  search: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  filterRow: { flexDirection: 'row', gap: SPACING.xs },
  filter: { paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.lightGray },
  filterActive: { backgroundColor: COLORS.secondary },
  filterText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs, ...SHADOW.sm },
  cardTitle: { fontSize: FONT_SIZE.base, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  note: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, lineHeight: 18 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.textPrimary },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1 },
  rowWins: { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.textPrimary, minWidth: 52, textAlign: 'right' },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs + 2 },
  addBtnText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  removeBtn: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.lightGray },
  removeBtnText: { color: COLORS.danger, fontSize: FONT_SIZE.xs, fontWeight: '700' },
  depthPos: { width: 34, fontSize: FONT_SIZE.sm, fontWeight: '800', color: COLORS.primary },

  monthRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 3 },
  monthLabel: { width: 34, fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textPrimary },
  barTrack: { flex: 1, height: 10, borderRadius: RADIUS.full, backgroundColor: COLORS.lightGray, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full },
  barMid: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: COLORS.white },
  monthValue: { width: 76, textAlign: 'right', fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600' },

  gameRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  gameDate: { width: 64, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  gameOpp: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textPrimary },
  gameProb: { fontSize: FONT_SIZE.sm, fontWeight: '700' },

  standHeader: { flexDirection: 'row', alignItems: 'center' },
  standRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs + 2, paddingHorizontal: SPACING.xs, borderRadius: RADIUS.sm },
  standRowMine: { backgroundColor: COLORS.background },
  standTeam: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  standTeamMine: { fontWeight: '900', color: COLORS.primary },
  standCol: { width: 64, textAlign: 'right', fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '600' },

  footnote: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 16 },
});
