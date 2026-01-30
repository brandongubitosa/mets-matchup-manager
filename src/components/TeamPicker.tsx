import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, MLB_TEAMS, NL_EAST_TEAMS } from '../constants';

interface TeamPickerProps {
  selectedTeamId: number | null;
  onSelectTeam: (teamId: number) => void;
  excludeMets?: boolean;
}

export const TeamPicker: React.FC<TeamPickerProps> = ({
  selectedTeamId,
  onSelectTeam,
  excludeMets = true,
}) => {
  const teams = Object.entries(MLB_TEAMS)
    .map(([id, team]) => ({ id: parseInt(id), ...team }))
    .filter((team) => !excludeMets || team.id !== 121)
    .sort((a, b) => {
      // Prioritize NL East teams
      const aIsNLEast = NL_EAST_TEAMS.includes(a.id);
      const bIsNLEast = NL_EAST_TEAMS.includes(b.id);
      if (aIsNLEast && !bIsNLEast) return -1;
      if (!aIsNLEast && bIsNLEast) return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Division Rivals</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {teams
          .filter((team) => NL_EAST_TEAMS.includes(team.id) && team.id !== 121)
          .map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamChip,
                selectedTeamId === team.id && styles.selectedChip,
              ]}
              onPress={() => onSelectTeam(team.id)}
            >
              <Text
                style={[
                  styles.teamAbbr,
                  selectedTeamId === team.id && styles.selectedText,
                ]}
              >
                {team.abbreviation}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>All Teams</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {teams
          .filter((team) => !NL_EAST_TEAMS.includes(team.id))
          .map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamChip,
                selectedTeamId === team.id && styles.selectedChip,
              ]}
              onPress={() => onSelectTeam(team.id)}
            >
              <Text
                style={[
                  styles.teamAbbr,
                  selectedTeamId === team.id && styles.selectedText,
                ]}
              >
                {team.abbreviation}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scroll: {
    paddingHorizontal: 12,
  },
  teamChip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  selectedChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  teamAbbr: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  selectedText: {
    color: COLORS.white,
  },
});
