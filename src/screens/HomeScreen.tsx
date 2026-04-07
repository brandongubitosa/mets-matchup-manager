import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, MLB_TEAMS } from '../constants';
import { HomeScreenNavigationProp, TodaysGame, Player } from '../types';
import { usePersistedTeam, useResponsiveLayout } from '../hooks';
import { getLiveScores } from '../services/mlbApi';
import { TodaysGameCard, TeamLogo, AnimatedCard } from '../components';

const HOME_LIVE_POLL_MS = 30_000;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

const teamList = Object.entries(MLB_TEAMS)
  .map(([id, team]) => ({ id: parseInt(id), ...team }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const isFocused = useIsFocused();
  const { team: selectedTeam, setTeam: setSelectedTeam, isLoading } = usePersistedTeam();
  const { isTablet } = useResponsiveLayout();
  const [hasLiveGames, setHasLiveGames] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [logoScale, logoOpacity]);

  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;

    const tick = async () => {
      const result = await getLiveScores();
      if (cancelled || !result.success) return;
      setHasLiveGames(result.data.some((g) => g.status.abstractGameState === 'Live'));
    };

    tick();
    const id = setInterval(tick, HOME_LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isFocused]);

  const filteredTeams = teamSearch
    ? teamList.filter(
        (t) =>
          t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
          t.abbreviation.toLowerCase().includes(teamSearch.toLowerCase())
      )
    : teamList;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Compact Horizontal Header ── */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
          <TeamLogo teamId={selectedTeam.id} size={40} />
        </Animated.View>

        <View style={styles.headerTextGroup}>
          <Text style={styles.heroTitle}>{selectedTeam.abbreviation}</Text>
          <Text style={styles.heroSubtitle}>Matchup Manager</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={styles.changeTeamPill}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Change team"
        >
          <Text style={styles.changeTeamText}>Change team</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── No-Scroll Content Grid ── */}
      <View
        style={[
          styles.content,
          isTablet && styles.contentWide,
        ]}
      >
        {/* Today's Game — fills available vertical space */}
        <AnimatedCard delay={0} style={styles.gameCardWrapper}>
          <TodaysGameCard
            compact
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            onViewMatchups={(opponentId: number, opponentName: string) =>
              navigation.navigate('BatterMatchup', {
                teamId: selectedTeam.id,
                teamName: selectedTeam.name,
                opponentTeamId: opponentId,
                opponentTeamName: opponentName,
              })
            }
            onPredictGame={(game: TodaysGame, opposingPitcher: Player | null) =>
              navigation.navigate('GamePrediction', {
                teamId: selectedTeam.id,
                teamName: selectedTeam.name,
                opponentTeamId: game.opponent.id,
                opponentTeamName: game.opponent.name,
                isHome: game.isHome,
                gameId: game.gameId,
                teamPitcherId: game.myProbablePitcher?.id,
                opponentPitcherId: opposingPitcher?.id,
              })
            }
            onProbablePitcherPress={(pitcher, opponentTeamId, opponentTeamName) =>
              navigation.navigate('PlayerBackCard', {
                playerId: pitcher.id,
                opponentTeamId,
                opponentTeamName,
              })
            }
            onPlayerPress={(playerId, opponentTeamId, opponentTeamName) =>
              navigation.navigate('PlayerBackCard', {
                playerId,
                opponentTeamId,
                opponentTeamName,
              })
            }
          />
        </AnimatedCard>

        {/* Quick-action row: Live Scores · Batters · Pitchers */}
        <View style={styles.quickRow}>
          {/* Live Scores */}
          <AnimatedCard
            delay={60}
            style={styles.quickBoxWrapper}
            accessibilityLabel={
              hasLiveGames ? 'Open live scoreboard, games in progress' : 'Open live scoreboard'
            }
            accessibilityHint="Shows today games and scores"
            onPress={() => navigation.navigate('LiveScores', { highlightTeamId: selectedTeam.id })}
          >
            <LinearGradient
              colors={['#0A0A0A', '#1A1A2E']}
              style={styles.quickBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {hasLiveGames ? (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              ) : null}
              <Text style={styles.quickBoxTitle}>Scoreboard</Text>
              <Text style={styles.quickBoxArrow}>›</Text>
            </LinearGradient>
          </AnimatedCard>

          {/* Batters */}
          <AnimatedCard
            delay={110}
            style={styles.quickBoxWrapper}
            accessibilityLabel="Open batter matchups"
            accessibilityHint="Pick a batter and opposing pitcher to view stats"
            onPress={() =>
              navigation.navigate('BatterMatchup', {
                teamId: selectedTeam.id,
                teamName: selectedTeam.name,
              })
            }
          >
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              style={styles.quickBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.quickBoxTitle}>Batters</Text>
              <Text style={styles.quickBoxArrow}>›</Text>
            </LinearGradient>
          </AnimatedCard>

          {/* Pitchers */}
          <AnimatedCard
            delay={160}
            style={styles.quickBoxWrapper}
            accessibilityLabel="Open pitcher matchups"
            accessibilityHint="Pick a pitcher and opposing batter to view stats"
            onPress={() =>
              navigation.navigate('PitcherMatchup', {
                teamId: selectedTeam.id,
                teamName: selectedTeam.name,
              })
            }
          >
            <LinearGradient
              colors={[COLORS.secondary, '#A0001F']}
              style={styles.quickBox}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.quickBoxTitle}>Pitchers</Text>
              <Text style={styles.quickBoxArrow}>›</Text>
            </LinearGradient>
          </AnimatedCard>
        </View>
      </View>

      {/* ── Team Picker Modal ── */}
      <Modal visible={showPicker} animationType="slide" transparent accessibilityViewIsModal>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboardRoot}
        >
          <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Team</Text>
              <TouchableOpacity
                onPress={() => { setShowPicker(false); setTeamSearch(''); }}
                style={styles.modalCloseIcon}
                accessibilityRole="button"
                accessibilityLabel="Close team picker"
                accessibilityHint="Closes the team list and clears search"
              >
                <Text style={styles.modalCloseText}>x</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <Text style={styles.searchIcon}>Search</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search teams..."
                placeholderTextColor={COLORS.textMuted}
                value={teamSearch}
                onChangeText={setTeamSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {teamSearch.length > 0 && (
                <TouchableOpacity
                  onPress={() => setTeamSearch('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear team search"
                  accessibilityHint="Removes text from the team search field"
                >
                  <Text style={styles.searchClear}>x</Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredTeams}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedTeam.id;
                return (
                  <TouchableOpacity
                    style={[styles.teamOption, isSelected && styles.teamOptionSelected]}
                    onPress={() => { setSelectedTeam(item); setShowPicker(false); setTeamSearch(''); }}
                    activeOpacity={0.6}
                  >
                    <TeamLogo teamId={item.id} size={36} />
                    <View style={styles.teamOptionInfo}>
                      <Text style={[styles.teamOptionText, isSelected && styles.teamOptionTextSelected]}>
                        {item.name}
                      </Text>
                      <Text style={styles.teamOptionAbbr}>{item.abbreviation}</Text>
                    </View>
                    {isSelected && <View style={styles.selectedDot} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.teamOptionSeparator} />}
            />
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Compact Horizontal Header ─────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  headerTextGroup: {
    flex: 1,
  },
  heroTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
    lineHeight: FONT_SIZE.xxl + 2,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  changeTeamPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  changeTeamText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── No-Scroll Content Grid ────────────────────────────────────────────
  content: {
    flex: 1,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  contentWide: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  gameCardWrapper: {
    flex: 1,
  },

  // ── Quick-Action Row (3 boxes) ────────────────────────────────────────
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickBoxWrapper: {
    flex: 1,
  },
  quickBox: {
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  quickBoxTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
  },
  quickBoxArrow: {
    fontSize: FONT_SIZE.lg,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    lineHeight: FONT_SIZE.lg,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.25)',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
  },
  liveBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    color: COLORS.danger,
    letterSpacing: 0.8,
  },

  // ── Team Picker Modal ────────────────────────────────────────────────────
  modalKeyboardRoot: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '82%',
    paddingBottom: SPACING.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lightGray,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseIcon: {
    position: 'absolute',
    right: SPACING.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
  },
  searchIcon: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginRight: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalSearchInput: {
    flex: 1,
    height: 42,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  searchClear: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    padding: SPACING.xs,
  },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  teamOptionSelected: {
    backgroundColor: COLORS.borderLight,
  },
  teamOptionInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  teamOptionText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  teamOptionTextSelected: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  teamOptionAbbr: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  teamOptionSeparator: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: 60,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
});
