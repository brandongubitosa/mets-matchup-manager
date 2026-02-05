import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { COLORS, MLB_TEAMS } from '../constants';
import { PlayerCard, TeamPicker, SearchBar } from '../components';
import { RosterPlayer, RootStackParamList, BatterMatchupScreenNavigationProp } from '../types';
import { getTeamBatters, getTeamPitchers } from '../services/mlbApi';

type BatterMatchupScreenProps = {
  navigation: BatterMatchupScreenNavigationProp;
  route: RouteProp<RootStackParamList, 'BatterMatchup'>;
};

export const BatterMatchupScreen: React.FC<BatterMatchupScreenProps> = ({ navigation, route }) => {
  const { teamId, teamName } = route.params;
  const [metsBatters, setMetsBatters] = useState<RosterPlayer[]>([]);
  const [opposingPitchers, setOpposingPitchers] = useState<RosterPlayer[]>([]);
  const [selectedBatter, setSelectedBatter] = useState<RosterPlayer | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPitchers, setLoadingPitchers] = useState(false);

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

  const handleSelectBatter = (batter: RosterPlayer) => {
    setSelectedBatter(batter);
  };

  const handleSelectPitcher = (pitcher: RosterPlayer) => {
    if (selectedBatter) {
      navigation.navigate('MatchupDetail', {
        batterId: selectedBatter.id,
        pitcherId: pitcher.id,
        mode: 'batter',
      });
    }
  };

  const filteredBatters = metsBatters.filter((batter) =>
    batter.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPitchers = opposingPitchers.filter((pitcher) =>
    pitcher.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading {teamName} roster...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{teamName} Batters vs. Pitchers</Text>
      </View>

      {!selectedBatter ? (
        <>
          <Text style={styles.stepTitle}>Step 1: Select a {teamName} Batter</Text>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${teamName} batters...`}
          />
          <FlatList
            data={filteredBatters}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <PlayerCard
                player={item}
                onPress={() => handleSelectBatter(item)}
              />
            )}
            contentContainerStyle={styles.list}
          />
        </>
      ) : !selectedTeamId ? (
        <>
          <View style={styles.selectedPlayer}>
            <Text style={styles.selectedLabel}>Selected Batter:</Text>
            <PlayerCard
              player={selectedBatter}
              selected
              onPress={() => setSelectedBatter(null)}
            />
            <Text style={styles.tapToChange}>Tap to change</Text>
          </View>
          <Text style={styles.stepTitle}>Step 2: Select Opposing Team</Text>
          <TeamPicker
            selectedTeamId={selectedTeamId}
            onSelectTeam={handleSelectTeam}
            excludeTeamId={teamId}
          />
        </>
      ) : (
        <>
          <View style={styles.selectedPlayer}>
            <Text style={styles.selectedLabel}>
              {selectedBatter.fullName} vs. {MLB_TEAMS[selectedTeamId]?.abbreviation} Pitchers
            </Text>
            <View style={styles.changeButtons}>
              <Text
                style={styles.changeLink}
                onPress={() => setSelectedBatter(null)}
              >
                Change Batter
              </Text>
              <Text style={styles.separator}>|</Text>
              <Text
                style={styles.changeLink}
                onPress={() => setSelectedTeamId(null)}
              >
                Change Team
              </Text>
            </View>
          </View>

          {loadingPitchers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading pitchers...</Text>
            </View>
          ) : (
            <>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search pitchers..."
              />
              <FlatList
                data={filteredPitchers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <PlayerCard
                    player={item}
                    onPress={() => handleSelectPitcher(item)}
                  />
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No pitchers found</Text>
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
    backgroundColor: COLORS.primary,
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  selectedPlayer: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  tapToChange: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 4,
  },
  changeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  changeLink: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  separator: {
    marginHorizontal: 12,
    color: COLORS.lightGray,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray,
    marginTop: 40,
    fontSize: 16,
  },
});
