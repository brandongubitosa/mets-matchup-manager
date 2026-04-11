import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import {
  Player,
  MatchupStats,
  PitcherSeasonStats,
  PlayerBackCardScreenNavigationProp,
  PlayerBackCardScreenRouteProp,
} from '../types';
import { getBatterSeasonStats, getPitcherSeasonStats } from '../services/mlbApi';
import { usePersistedTeam } from '../hooks';

type Props = {
  navigation: PlayerBackCardScreenNavigationProp;
  route: PlayerBackCardScreenRouteProp;
};

const getHeadshotUrl = (playerId: number): string =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_320,q_auto:best/v1/people/${playerId}/headshot/67/current`;

const isPitcherPlayer = (p: Player | null) =>
  !!p && (p.position?.type === 'Pitcher' || p.position?.abbreviation === 'TWP');

const StatCell: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={tableStyles.cell}>
    <Text style={tableStyles.cellLabel}>{label}</Text>
    <Text style={tableStyles.cellValue}>{value}</Text>
  </View>
);

const HittingTable: React.FC<{ stats: MatchupStats }> = ({ stats }) => (
  <View style={tableStyles.wrap}>
    <Text style={tableStyles.title}>SEASON — MAJOR LEAGUE HITTING</Text>
    <View style={tableStyles.row}>
      <StatCell label="G" value={stats.gamesPlayed} />
      <StatCell label="AB" value={stats.atBats} />
      <StatCell label="H" value={stats.hits} />
      <StatCell label="HR" value={stats.homeRuns} />
      <StatCell label="RBI" value={stats.rbi} />
    </View>
    <View style={tableStyles.row}>
      <StatCell label="BB" value={stats.walks} />
      <StatCell label="SO" value={stats.strikeouts} />
      <StatCell label="AVG" value={stats.avg} />
      <StatCell label="OBP" value={stats.obp} />
      <StatCell label="OPS" value={stats.ops} />
    </View>
  </View>
);

const PitchingTable: React.FC<{ stats: PitcherSeasonStats }> = ({ stats }) => (
  <View style={tableStyles.wrap}>
    <Text style={tableStyles.title}>SEASON — MAJOR LEAGUE PITCHING</Text>
    <View style={tableStyles.row}>
      <StatCell label="G" value={stats.gamesPlayed ?? '—'} />
      <StatCell label="GS" value={stats.gamesStarted} />
      <StatCell label="IP" value={stats.inningsPitched} />
      <StatCell label="W" value={stats.wins ?? '—'} />
      <StatCell label="L" value={stats.losses ?? '—'} />
    </View>
    <View style={tableStyles.row}>
      <StatCell label="SV" value={stats.saves ?? '—'} />
      <StatCell label="SO" value={stats.strikeouts} />
      <StatCell label="BB" value={stats.walks} />
      <StatCell label="ERA" value={stats.era} />
      <StatCell label="WHIP" value={stats.whip} />
    </View>
  </View>
);

export const PlayerBackCardScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    playerId,
    counterpartPlayerId,
    counterpartPlayerName,
    opponentTeamId,
    opponentTeamName,
    backToBatterMatchup,
    backToPitcherMatchup,
    backToLiveScores,
    backToGamePrediction,
    backToMatchupDetail,
  } = route.params;

  const { team: persistedTeam } = usePersistedTeam();
  const [player, setPlayer] = useState<Player | null>(null);
  const [hitting, setHitting] = useState<MatchupStats | null>(null);
  const [pitching, setPitching] = useState<PitcherSeasonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const width = Dimensions.get('window').width;
  const splitRow = width >= 640;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setImageError(false);

      const pitchRes = await getPitcherSeasonStats(playerId);
      if (cancelled) return;

      if (pitchRes.success && isPitcherPlayer(pitchRes.data.player)) {
        setPlayer(pitchRes.data.player);
        setPitching(pitchRes.data.stats);
        setHitting(null);
        setLoading(false);
        return;
      }

      const hitRes = await getBatterSeasonStats(playerId);
      if (cancelled) return;

      if (hitRes.success) {
        setPlayer(hitRes.data.player);
        setHitting(hitRes.data.stats);
        setPitching(null);
      } else {
        setError(hitRes.error);
      }
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const currentIsPitcher = isPitcherPlayer(player);
  const batterIdForMatchup = currentIsPitcher ? counterpartPlayerId ?? playerId : playerId;
  const pitcherIdForMatchup = currentIsPitcher ? playerId : counterpartPlayerId ?? playerId;
  const h2hValid =
    !!counterpartPlayerId &&
    !!player &&
    batterIdForMatchup !== pitcherIdForMatchup;

  const goMatchupDetail = () => {
    if (!h2hValid) return;
    navigation.navigate('MatchupDetail', {
      batterId: batterIdForMatchup,
      pitcherId: pitcherIdForMatchup,
      mode: currentIsPitcher ? 'pitcher' : 'batter',
    });
  };

  const oppAbbr = opponentTeamId ? MLB_TEAMS[opponentTeamId]?.abbreviation : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={styles.topStripe}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingLabel}>Loading card…</Text>
        </View>
      ) : error || !player ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Player not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, splitRow && styles.scrollContentWide]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.cardOuter, splitRow && styles.cardOuterRow]}>
            <View style={[styles.statsPanel, splitRow && styles.statsPanelSplit]}>
              <View style={styles.marbleHeader}>
                <Text style={styles.cardNo}>#{player.primaryNumber ?? '—'}</Text>
                <Text style={styles.nameBlock}>{player.fullName.toUpperCase()}</Text>
                <Text style={styles.bioLine}>
                  BATS: {player.batSide?.code ?? '—'} · THROWS: {player.pitchHand?.code ?? '—'}
                </Text>
                <Text style={styles.bioLine}>
                  POS: {player.position?.abbreviation ?? '—'}
                </Text>
              </View>

              {hitting && <HittingTable stats={hitting} />}
              {pitching && <PitchingTable stats={pitching} />}
            </View>

            <View style={[styles.photoPanel, splitRow && styles.photoPanelSplit]}>
              {!imageError ? (
                <Image
                  source={{ uri: getHeadshotUrl(player.id) }}
                  style={styles.photo}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={styles.photoFallback}>
                  <Text style={styles.photoFallbackLetter}>{player.fullName.charAt(0)}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            {h2hValid && (
              <TouchableOpacity style={styles.primaryBtn} onPress={goMatchupDetail} activeOpacity={0.85}>
                <LinearGradient
                  colors={[COLORS.primaryDark, COLORS.primary]}
                  style={styles.primaryBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.primaryBtnText}>
                    vs. {counterpartPlayerName ?? 'selected opponent'}
                  </Text>
                  <Text style={styles.primaryBtnSub}>Head-to-head matchup</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {opponentTeamId && opponentTeamName && persistedTeam?.id && (
              <>
                {!currentIsPitcher && (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() =>
                      navigation.navigate('BatterMatchup', {
                        teamId: persistedTeam.id,
                        teamName: persistedTeam.name,
                        opponentTeamId,
                        opponentTeamName,
                      })
                    }
                  >
                    <Text style={styles.secondaryBtnText}>
                      {persistedTeam.abbreviation} batters vs. {oppAbbr ?? 'opponent'}
                    </Text>
                  </TouchableOpacity>
                )}
                {currentIsPitcher && (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() =>
                      navigation.navigate('PitcherMatchup', {
                        teamId: persistedTeam.id,
                        teamName: persistedTeam.name,
                        opponentTeamId,
                        opponentTeamName,
                      })
                    }
                  >
                    <Text style={styles.secondaryBtnText}>
                      {persistedTeam.abbreviation} pitchers vs. {oppAbbr ?? 'opponent'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {backToBatterMatchup && !currentIsPitcher && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() =>
                  navigation.navigate('BatterMatchup', {
                    ...backToBatterMatchup,
                    pendingBatterId: playerId,
                  })
                }
              >
                <Text style={styles.secondaryBtnText}>Use this batter in flow</Text>
              </TouchableOpacity>
            )}

            {backToPitcherMatchup && currentIsPitcher && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() =>
                  navigation.navigate('PitcherMatchup', {
                    ...backToPitcherMatchup,
                    pendingPitcherId: playerId,
                  })
                }
              >
                <Text style={styles.secondaryBtnText}>Use this pitcher in flow</Text>
              </TouchableOpacity>
            )}

            {(backToBatterMatchup || backToPitcherMatchup) && (
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => {
                  if (backToBatterMatchup) {
                    navigation.navigate('BatterMatchup', { ...backToBatterMatchup, clearBatter: true });
                  } else if (backToPitcherMatchup) {
                    navigation.navigate('PitcherMatchup', { ...backToPitcherMatchup, clearPitcher: true });
                  }
                }}
              >
                <Text style={styles.ghostBtnText}>Clear selection & return</Text>
              </TouchableOpacity>
            )}

            {backToMatchupDetail && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('MatchupDetail', backToMatchupDetail)}
              >
                <Text style={styles.secondaryBtnText}>Back to matchup breakdown</Text>
              </TouchableOpacity>
            )}

            {backToLiveScores && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('LiveScores', backToLiveScores)}
              >
                <Text style={styles.secondaryBtnText}>Back to live scores</Text>
              </TouchableOpacity>
            )}

            {backToGamePrediction && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('GamePrediction', backToGamePrediction)}
              >
                <Text style={styles.secondaryBtnText}>Back to game prediction</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const tableStyles = StyleSheet.create({
  wrap: {
    marginTop: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  cell: {
    minWidth: 56,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  cellValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topStripe: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    marginTop: SPACING.xs,
  },
  backText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  scrollContentWide: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  cardOuter: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
    ...SHADOW.md,
  },
  cardOuterRow: {
    flexDirection: 'row',
  },
  statsPanel: {
    padding: SPACING.md,
    flex: 1,
    backgroundColor: '#FCFDFE',
  },
  statsPanelSplit: {
    flex: 1.15,
    maxWidth: '58%',
  },
  marbleHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingBottom: SPACING.sm + 2,
    marginBottom: SPACING.sm,
  },
  cardNo: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  nameBlock: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.35,
    marginTop: SPACING.xs,
  },
  bioLine: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '700',
  },
  photoPanel: {
    minHeight: 220,
    backgroundColor: '#1a1a2e',
  },
  photoPanelSplit: {
    flex: 0.85,
    minHeight: undefined,
  },
  photo: {
    width: '100%',
    height: '100%',
    minHeight: 280,
  },
  photoFallback: {
    flex: 1,
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  photoFallbackLetter: {
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.white,
  },
  actions: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  primaryBtnGrad: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
  },
  primaryBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(0,45,114,0.16)',
    ...SHADOW.sm,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  ghostBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  ghostBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingLabel: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
