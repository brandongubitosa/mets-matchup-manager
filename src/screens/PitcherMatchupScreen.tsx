import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { PlayerCard, TeamPicker, SearchBar, StepIndicator, SkeletonPlayerList, AnimatedCard } from '../components';
import { RosterPlayer, RootStackParamList, PitcherMatchupScreenNavigationProp } from '../types';
import { getTeamPitchers, getTeamBatters } from '../services/mlbApi';

type PitcherMatchupScreenProps = {
  navigation: PitcherMatchupScreenNavigationProp;
  route: RouteProp<RootStackParamList, 'PitcherMatchup'>;
};

export const PitcherMatchupScreen: React.FC<PitcherMatchupScreenProps> = ({ navigation, route }) => {
  const { teamId, teamName } = route.params;
  const [metsPitchers, setMetsPitchers] = useState<RosterPlayer[]>([]);
  const [opposingBatters, setOpposingBatters] = useState<RosterPlayer[]>([]);
  const [selectedPitcher, setSelectedPitcher] = useState<RosterPlayer | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingBatters, setLoadingBatters] = useState(false);

  useEffect(() => {
    loadTeamPitchers();
  }, [teamId]);

  useEffect(() => {
    if (selectedTeamId) {
      loadOpposingBatters(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadTeamPitchers = async () => {
    setLoading(true);
    const pitchers = await getTeamPitchers(teamId);
    setMetsPitchers(pitchers);
    setLoading(false);
  };

  const loadOpposingBatters = async (teamId: number) => {
    setLoadingBatters(true);
    const batters = await getTeamBatters(teamId);
    setOpposingBatters(batters);
    setLoadingBatters(false);
  };

  const handleSelectTeam = (teamId: number) => {
    setSelectedTeamId(teamId);
    setSearchQuery('');
  };

  const handleSelectPitcher = (pitcher: RosterPlayer) => {
    setSelectedPitcher(pitcher);
  };

  const handleSelectBatter = (batter: RosterPlayer) => {
    if (selectedPitcher) {
      navigation.navigate('MatchupDetail', {
        batterId: batter.id,
        pitcherId: selectedPitcher.id,
        mode: 'pitcher',
      });
    }
  };

  const filteredPitchers = metsPitchers.filter((pitcher) =>
    pitcher.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBatters = opposingBatters.filter((batter) =>
    batter.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentStep = !selectedPitcher ? 0 : !selectedTeamId ? 1 : 2;
  const steps = [
    { label: 'Pitcher' },
    { label: 'Team' },
    { label: 'Batter' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>&#8249; Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teamName} Pitchers</Text>
        <Text style={styles.headerSubtitle}>vs. Opposing Batters</Text>
      </LinearGradient>

      <StepIndicator steps={steps} currentStep={currentStep} />

      {loading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonPlayerList count={5} />
        </View>
      ) : !selectedPitcher ? (
        <>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${teamName} pitchers...`}
          />
          <FlatList
            data={filteredPitchers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <AnimatedCard delay={index * 40}>
                <PlayerCard
                  player={item}
                  onPress={() => handleSelectPitcher(item)}
                />
              </AnimatedCard>
            )}
            contentContainerStyle={styles.list}
          />
        </>
      ) : !selectedTeamId ? (
        <>
          <View style={styles.selectedPlayer}>
            <PlayerCard
              player={selectedPitcher}
              selected
              onPress={() => setSelectedPitcher(null)}
            />
            <Text style={styles.tapToChange}>Tap player to change</Text>
          </View>
          <TeamPicker
            selectedTeamId={selectedTeamId}
            onSelectTeam={handleSelectTeam}
            excludeTeamId={teamId}
          />
        </>
      ) : (
        <>
          <View style={styles.matchupBanner}>
            <Text style={styles.matchupText}>
              {selectedPitcher.fullName} vs. {MLB_TEAMS[selectedTeamId]?.abbreviation}
            </Text>
            <View style={styles.changeButtons}>
              <TouchableOpacity
                style={styles.changePill}
                onPress={() => { setSelectedPitcher(null); setSelectedTeamId(null); }}
              >
                <Text style={styles.changePillText}>Change Pitcher</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changePill}
                onPress={() => setSelectedTeamId(null)}
              >
                <Text style={styles.changePillText}>Change Team</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loadingBatters ? (
            <View style={styles.skeletonContainer}>
              <SkeletonPlayerList count={4} />
            </View>
          ) : (
            <>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search batters..."
              />
              <FlatList
                data={filteredBatters}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => (
                  <AnimatedCard delay={index * 40}>
                    <PlayerCard
                      player={item}
                      onPress={() => handleSelectBatter(item)}
                    />
                  </AnimatedCard>
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No batters found</Text>
                }
              />
            </>
          )}
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
