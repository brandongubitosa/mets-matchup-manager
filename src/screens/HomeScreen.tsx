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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { HomeScreenNavigationProp } from '../types';
import { usePersistedTeam } from '../hooks';
import { TodaysGameCard, TeamLogo, AnimatedCard } from '../components';

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

const teamList = Object.entries(MLB_TEAMS)
  .map(([id, team]) => ({
    id: parseInt(id),
    ...team,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { team: selectedTeam, setTeam: setSelectedTeam, isLoading } = usePersistedTeam();
  const [showPicker, setShowPicker] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
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
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color={COLORS.white} />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
      >
        <Animated.View
          style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}
        >
          <TeamLogo teamId={selectedTeam.id} size={80} />
        </Animated.View>

        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={styles.teamSelector}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Change team"
        >
          <Text style={styles.title}>{selectedTeam.abbreviation} Matchup</Text>
          <View style={styles.dropdownBadge}>
            <Text style={styles.dropdownArrow}>▼</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.subtitle}>Manager</Text>
      </LinearGradient>

      {/* Team Picker Modal */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Team</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPicker(false);
                  setTeamSearch('');
                }}
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
                    onPress={() => {
                      setSelectedTeam(item);
                      setShowPicker(false);
                      setTeamSearch('');
                    }}
                    activeOpacity={0.6}
                  >
                    <TeamLogo teamId={item.id} size={36} />
                    <View style={styles.teamOptionInfo}>
                      <Text
                        style={[
                          styles.teamOptionText,
                          isSelected && styles.teamOptionTextSelected,
                        ]}
                      >
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

      {/* Content Area */}
      <View style={styles.content}>
        <AnimatedCard delay={0}>
          <TodaysGameCard
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            onViewMatchups={() => {
              navigation.navigate('BatterMatchup', {
                teamId: selectedTeam.id,
                teamName: selectedTeam.name,
              });
            }}
          />
        </AnimatedCard>

        <AnimatedCard
          delay={100}
          onPress={() =>
            navigation.navigate('BatterMatchup', {
              teamId: selectedTeam.id,
              teamName: selectedTeam.name,
            })
          }
        >
          <View style={styles.card}>
            <View style={[styles.cardIcon, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.iconText}>💥</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{selectedTeam.abbreviation} Batters</Text>
              <Text style={styles.cardDescription}>
                See how {selectedTeam.name} hitters perform against opposing pitchers
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>›</Text>
            </View>
          </View>
        </AnimatedCard>

        <AnimatedCard
          delay={200}
          onPress={() =>
            navigation.navigate('PitcherMatchup', {
              teamId: selectedTeam.id,
              teamName: selectedTeam.name,
            })
          }
        >
          <View style={styles.card}>
            <View style={[styles.cardIcon, { backgroundColor: COLORS.secondary }]}>
              <Text style={styles.iconText}>⚾</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{selectedTeam.abbreviation} Pitchers</Text>
              <Text style={styles.cardDescription}>
                See how {selectedTeam.name} pitchers perform against opposing batters
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>›</Text>
            </View>
          </View>
        </AnimatedCard>
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
    paddingTop: 36,
    paddingBottom: 32,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOW.md,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  iconText: {
    fontSize: 26,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 22,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: -2,
  },
  footer: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },

  // Team selector
  teamSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  dropdownBadge: {
    backgroundColor: COLORS.glassBg,
    borderRadius: RADIUS.full,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  dropdownArrow: {
    color: COLORS.white,
    fontSize: 10,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
    paddingBottom: SPACING.xl,
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
