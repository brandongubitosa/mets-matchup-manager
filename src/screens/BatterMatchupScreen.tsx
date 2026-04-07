import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { PlayerCard, TeamPicker, SearchBar, StepIndicator, SkeletonPlayerList, AnimatedCard } from '../components';
import { RosterPlayer, RootStackParamList, BatterMatchupScreenNavigationProp } from '../types';
import { getTeamBatters, getTeamPitchers, invalidateTeamRosterCache } from '../services/mlbApi';

type BatterMatchupScreenProps = {
  navigation: BatterMatchupScreenNavigationProp;
  route: RouteProp<RootStackParamList, 'BatterMatchup'>;
};

export const BatterMatchupScreen: React.FC<BatterMatchupScreenProps> = ({ navigation, route }) => {
  const {
    teamId,
    teamName,
    opponentTeamId,
    opponentTeamName,
    pendingBatterId,
    clearBatter,
  } = route.params;
  const [metsBatters, setMetsBatters] = useState<RosterPlayer[]>([]);
  const [opposingPitchers, setOpposingPitchers] = useState<RosterPlayer[]>([]);
  const [selectedBatter, setSelectedBatter] = useState<RosterPlayer | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(opponentTeamId ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPitchers, setLoadingPitchers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const flowBase = { teamId, teamName, opponentTeamId, opponentTeamName };

  const onRefreshRosters = useCallback(async () => {
    setRefreshing(true);
    try {
      invalidateTeamRosterCache(teamId);
      const batters = await getTeamBatters(teamId);
      setMetsBatters(batters);
      if (selectedTeamId) {
        invalidateTeamRosterCache(selectedTeamId);
        const pitchers = await getTeamPitchers(selectedTeamId);
        setOpposingPitchers(pitchers);
      }
    } finally {
      setRefreshing(false);
    }
  }, [teamId, selectedTeamId]);

  useEffect(() => {
    if (clearBatter) {
      setSelectedBatter(null);
      navigation.setParams({ clearBatter: undefined });
    }
  }, [clearBatter, navigation]);

  useEffect(() => {
    if (pendingBatterId == null) return;
    const b = metsBatters.find((p) => p.id === pendingBatterId);
    if (b) {
      setSelectedBatter(b);
      navigation.setParams({ pendingBatterId: undefined });
    }
  }, [pendingBatterId, metsBatters, navigation]);

  useEffect(() => {
    loadTeamBatters();
  }, [teamId]);

  useEffect(() => {
    if (selectedTeamId) {
      loadOpposingPitchers(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadTeamBatters = async () => {
    setLoading(true);
    const batters = await getTeamBatters(teamId);
    setMetsBatters(batters);
    setLoading(false);
  };

  const loadOpposingPitchers = async (teamId: number) => {
    setLoadingPitchers(true);
    const pitchers = await getTeamPitchers(teamId);
    setOpposingPitchers(pitchers);
    setLoadingPitchers(false);
  };

  const handleSelectTeam = (teamId: number) => {
    setSelectedTeamId(teamId);
    setSearchQuery('');
  };

  const opponentName = selectedTeamId
    ? (opponentTeamId === selectedTeamId && opponentTeamName)
      ? opponentTeamName
      : MLB_TEAMS[selectedTeamId]?.name ?? MLB_TEAMS[selectedTeamId]?.abbreviation ?? 'Opponent'
    : null;

  const openBatterCard = (batter: RosterPlayer) => {
    navigation.navigate('PlayerBackCard', {
      playerId: batter.id,
      backToBatterMatchup: flowBase,
    });
  };

  /** Must set selection before navigating so Back returns into the flow with this batter chosen */
  const pickBatterAndOpenCard = (batter: RosterPlayer) => {
    setSelectedBatter(batter);
    openBatterCard(batter);
  };

  const openPitcherCard = (pitcher: RosterPlayer) => {
    if (!selectedBatter || !selectedTeamId) return;
    navigation.navigate('MatchupDetail', {
      batterId: selectedBatter.id,
      pitcherId: pitcher.id,
      mode: 'batter',
    });
  };

  const filteredBatters = metsBatters.filter((batter) =>
    batter.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPitchers = opposingPitchers.filter((pitcher) =>
    pitcher.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentStep = !selectedBatter ? 0 : !selectedTeamId ? 1 : 2;
  const steps = [
    { label: 'Batter' },
    { label: 'Team' },
    { label: 'Pitcher' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teamName} Batters</Text>
        <Text style={styles.headerSubtitle}>vs. Opposing Pitchers</Text>
      </LinearGradient>

      <StepIndicator steps={steps} currentStep={currentStep} />

      {loading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonPlayerList count={5} />
        </View>
      ) : !selectedBatter ? (
        <>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${teamName} batters...`}
          />
          <FlatList
            data={filteredBatters}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefreshRosters} tintColor={COLORS.primary} />
            }
            renderItem={({ item, index }) => (
              <AnimatedCard delay={index * 40}>
                <PlayerCard
                  player={item}
                  variant="card"
                  onPress={() => pickBatterAndOpenCard(item)}
                />
              </AnimatedCard>
            )}
            contentContainerStyle={styles.cardGrid}
          />
        </>
      ) : !selectedTeamId ? (
        <>
          <View style={styles.selectedPlayer}>
            <PlayerCard
              player={selectedBatter}
              variant="list"
              selected
              onPress={() => openBatterCard(selectedBatter)}
            />
            <Text style={styles.tapToChange}>Tap for full card · use card to clear or change</Text>
          </View>
          <TeamPicker
            selectedTeamId={selectedTeamId}
            onSelectTeam={handleSelectTeam}
            excludeTeamId={teamId}
          />
        </>
      ) : loadingPitchers ? (
        <View style={styles.skeletonContainer}>
          <SkeletonPlayerList count={4} />
        </View>
      ) : (
        <>
          <View style={styles.matchupBanner}>
            <Text style={styles.matchupText}>
              {selectedBatter.fullName} vs. {opponentName ?? MLB_TEAMS[selectedTeamId]?.abbreviation}
            </Text>
            <View style={styles.changeButtons}>
              <TouchableOpacity
                style={styles.changePill}
                onPress={() => setSelectedBatter(null)}
              >
                <Text style={styles.changePillText}>Change Batter</Text>
              </TouchableOpacity>
              {!opponentTeamId && (
                <TouchableOpacity
                  style={styles.changePill}
                  onPress={() => setSelectedTeamId(null)}
                >
                  <Text style={styles.changePillText}>Change Team</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search pitchers..."
          />
          <FlatList
            data={filteredPitchers}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefreshRosters} tintColor={COLORS.primary} />
            }
            renderItem={({ item, index }) => (
              <AnimatedCard delay={index * 40}>
                <PlayerCard
                  player={item}
                  variant="card"
                  onPress={() => openPitcherCard(item)}
                />
              </AnimatedCard>
            )}
            contentContainerStyle={styles.cardGrid}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No pitchers found</Text>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    marginBottom: SPACING.xs,
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    opacity: 0.9,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.white,
    opacity: 0.7,
    marginTop: 2,
  },
  list: {
    paddingBottom: SPACING.lg,
  },
  cardGrid: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  cardRow: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: SPACING.sm,
  },
  selectedPlayer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tapToChange: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  matchupBanner: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  matchupText: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  changeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  changePill: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  changePillText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: 40,
    fontSize: FONT_SIZE.base,
  },
});
