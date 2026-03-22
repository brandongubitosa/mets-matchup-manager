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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { HomeScreenNavigationProp, TodaysGame, Player } from '../types';
import { usePersistedTeam } from '../hooks';
import { TodaysGameCard, TeamLogo, AnimatedCard } from '../components';

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

const teamList = Object.entries(MLB_TEAMS)
  .map(([id, team]) => ({ id: parseInt(id), ...team }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { team: selectedTeam, setTeam: setSelectedTeam, isLoading } = usePersistedTeam();
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
      {/* ── Hero Header ── */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
      >
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <TeamLogo teamId={selectedTeam.id} size={88} />
        </Animated.View>

        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={styles.teamSelector}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Change team"
        >
          <Text style={styles.heroTitle}>{selectedTeam.abbreviation}</Text>
          <Text style={styles.heroSubtitle}>Matchup Manager</Text>
          <View style={styles.changeTeamPill}>
            <Text style={styles.changeTeamText}>Change Team  ▼</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Game */}
        <AnimatedCard delay={0}>
          <TodaysGameCard
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
          />
        </AnimatedCard>

        {/* Live Scores */}
        <AnimatedCard
          delay={50}
          onPress={() =>
            navigation.navigate('LiveScores', { highlightTeamId: selectedTeam.id })
          }
        >
          <LinearGradient
            colors={['#0A0A0A', '#1A1A2E']}
            style={styles.liveScoresCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.liveScoresLeft}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
              <Text style={styles.liveScoresTitle}>Scoreboard</Text>
              <Text style={styles.liveScoresDesc}>All MLB games today</Text>
            </View>
            <View style={styles.liveScoresArrow}>
              <Text style={styles.featureArrowText}>›</Text>
            </View>
          </LinearGradient>
        </AnimatedCard>

        {/* Section label */}
        <Text style={styles.sectionLabel}>MATCHUP TOOLS</Text>

        {/* 2-column feature cards */}
        <View style={styles.featureRow}>
          <AnimatedCard
            delay={100}
            onPress={() =>
              navigation.navigate('BatterMatchup', {
                teamId: selectedTeam.id,
                teamName: selectedTeam.name,
              })
            }
          >
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              style={styles.featureCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.featureIconCircle}>
                <Text style={styles.featureIcon}>💥</Text>
              </View>
              <Text style={styles.featureTitle}>Batters</Text>
              <Text style={styles.featureDesc}>Hitters vs opposing pitchers</Text>
              <View style={styles.featureArrow}>
                <Text style={styles.featureArrowText}>›</Text>
              </View>
            </LinearGradient>
          </AnimatedCard>

          <AnimatedCard
            delay={180}
            onPress={() =>
              navigation.navigate('PitcherMatchup', {
                teamId: selectedTeam.id,
                teamName: selectedTeam.name,
              })
            }
          >
            <LinearGradient
              colors={[COLORS.secondary, '#A0001F']}
              style={styles.featureCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.featureIconCircle}>
                <Text style={styles.featureIcon}>⚾</Text>
              </View>
              <Text style={styles.featureTitle}>Pitchers</Text>
              <Text style={styles.featureDesc}>Starters vs opposing lineups</Text>
              <View style={styles.featureArrow}>
                <Text style={styles.featureArrowText}>›</Text>
              </View>
            </LinearGradient>
          </AnimatedCard>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>Data from MLB Stats API</Text>
      </ScrollView>

      {/* ── Team Picker Modal ── */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Team</Text>
              <TouchableOpacity
                onPress={() => { setShowPicker(false); setTeamSearch(''); }}
                style={styles.modalCloseIcon}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
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
                <TouchableOpacity onPress={() => setTeamSearch('')}>
                  <Text style={styles.searchClear}>✕</Text>
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
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.teamOptionSeparator} />}
            />
          </View>
        </View>
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

  // ── Hero Header ──────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -60,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -40,
    left: -40,
  },
  logoWrapper: {
    marginBottom: SPACING.md,
    ...SHADOW.lg,
  },
  teamSelector: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: FONT_SIZE.hero,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 2,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.lg,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
  },
  changeTeamPill: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  changeTeamText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Scroll Content ──────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
    marginTop: -SPACING.lg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // ── Feature Cards (2-col) ───────────────────────────────────────────────
  featureRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  featureCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    minHeight: 160,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  featureIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  featureDesc: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
    flex: 1,
  },
  featureArrow: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  featureArrowText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginTop: -2,
  },

  // ── Live Scores Card ─────────────────────────────────────────────────────
  liveScoresCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  liveScoresLeft: {
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
  },
  liveBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    color: COLORS.danger,
    letterSpacing: 1,
  },
  liveScoresTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  liveScoresDesc: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  liveScoresArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footerText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },

  // ── Team Picker Modal ────────────────────────────────────────────────────
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
    fontSize: 14,
    marginRight: SPACING.sm,
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
  checkIcon: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
