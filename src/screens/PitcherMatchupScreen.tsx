import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, MLB_TEAMS } from '../constants';
import { PlayerCard, TeamPicker, SearchBar } from '../components';
import { RosterPlayer } from '../types';
import { getMetsPitchers, getTeamBatters } from '../services/mlbApi';

type RootStackParamList = {
  Home: undefined;
  BatterMatchup: undefined;
  PitcherMatchup: undefined;
  MatchupDetail: { batterId: number; pitcherId: number; mode: 'batter' | 'pitcher' };
};

type PitcherMatchupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PitcherMatchup'>;
};

export const PitcherMatchupScreen: React.FC<PitcherMatchupScreenProps> = ({ navigation }) => {
  const [metsPitchers, setMetsPitchers] = useState<RosterPlayer[]>([]);
  const [opposingBatters, setOpposingBatters] = useState<RosterPlayer[]>([]);
  const [selectedPitcher, setSelectedPitcher] = useState<RosterPlayer | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingBatters, setLoadingBatters] = useState(false);

  useEffect(() => {
    loadMetsPitchers();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadOpposingBatters(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadMetsPitchers = async () => {
    setLoading(true);
    const pitchers = await getMetsPitchers();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Mets pitchers...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mets Pitchers vs. Batters</Text>
      </View>

      {!selectedPitcher ? (
        <>
          <Text style={styles.stepTitle}>Step 1: Select a Mets Pitcher</Text>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search Mets pitchers..."
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
          />
        </>
      ) : !selectedTeamId ? (
        <>
          <View style={styles.selectedPlayer}>
            <Text style={styles.selectedLabel}>Selected Pitcher:</Text>
            <PlayerCard
              player={selectedPitcher}
              selected
              onPress={() => setSelectedPitcher(null)}
            />
            <Text style={styles.tapToChange}>Tap to change</Text>
          </View>
          <Text style={styles.stepTitle}>Step 2: Select Opposing Team</Text>
          <TeamPicker
            selectedTeamId={selectedTeamId}
            onSelectTeam={handleSelectTeam}
          />
        </>
      ) : (
        <>
          <View style={styles.selectedPlayer}>
            <Text style={styles.selectedLabel}>
              {selectedPitcher.fullName} vs. {MLB_TEAMS[selectedTeamId]?.abbreviation} Batters
            </Text>
            <View style={styles.changeButtons}>
              <Text
                style={styles.changeLink}
                onPress={() => setSelectedPitcher(null)}
              >
                Change Pitcher
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

          {loadingBatters ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading batters...</Text>
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
                renderItem={({ item }) => (
                  <PlayerCard
                    player={item}
                    onPress={() => handleSelectBatter(item)}
                  />
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
