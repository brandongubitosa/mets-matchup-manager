import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, MLB_TEAMS } from '../constants';
import { HomeScreenNavigationProp } from '../types';
import { usePersistedTeam } from '../hooks';
import { TodaysGameCard, TeamLogo } from '../components';

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

const teamList = Object.entries(MLB_TEAMS).map(([id, team]) => ({
  id: parseInt(id),
  ...team,
})).sort((a, b) => a.name.localeCompare(b.name));

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { team: selectedTeam, setTeam: setSelectedTeam, isLoading } = usePersistedTeam();
  const [showPicker, setShowPicker] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header} accessibilityRole="header">
        <TeamLogo teamId={selectedTeam.id} size={70} />
        <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.teamSelector}>
          <Text style={styles.title}>{selectedTeam.abbreviation} Matchup</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle}>Manager</Text>
      </View>

      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Team</Text>
            <FlatList
              data={teamList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.teamOption}
                  onPress={() => { setSelectedTeam(item); setShowPicker(false); }}
                >
                  <Text style={styles.teamOptionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.content}>
        <TodaysGameCard
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          onViewMatchups={(opponentId, opponentName) => {
            navigation.navigate('BatterMatchup', { teamId: selectedTeam.id, teamName: selectedTeam.name });
          }}
        />

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('BatterMatchup', { teamId: selectedTeam.id, teamName: selectedTeam.name })}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`View ${selectedTeam.name} batters matchups`}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>💥</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{selectedTeam.abbreviation} Batters</Text>
            <Text style={styles.cardDescription}>
              See how {selectedTeam.name} hitters perform against opposing pitchers
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PitcherMatchup', { teamId: selectedTeam.id, teamName: selectedTeam.name })}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`View ${selectedTeam.name} pitchers matchups`}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>⚾</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{selectedTeam.abbreviation} Pitchers</Text>
            <Text style={styles.cardDescription}>
              See how {selectedTeam.name} pitchers perform against opposing batters
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Data from MLB Stats API</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logo: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 24,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  arrow: {
    fontSize: 24,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: COLORS.background,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  teamSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownArrow: {
    color: COLORS.secondary,
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    maxHeight: '70%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: COLORS.black,
  },
  teamOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  teamOptionText: {
    fontSize: 16,
    color: COLORS.black,
  },
  closeBtn: {
    marginTop: 16,
    padding: 14,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  closeBtnText: {
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.gray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
