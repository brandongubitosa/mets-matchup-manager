import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, MLB_TEAMS } from '../constants';

interface TeamPickerProps {
  selectedTeamId: number | null;
  onSelectTeam: (teamId: number) => void;
  excludeTeamId?: number;
}

export const TeamPicker: React.FC<TeamPickerProps> = ({
  selectedTeamId,
  onSelectTeam,
  excludeTeamId,
}) => {
  const teams = Object.entries(MLB_TEAMS)
    .map(([id, team]) => ({ id: parseInt(id), ...team }))
    .filter((team) => !excludeTeamId || team.id !== excludeTeamId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Select Opposing Team</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {teams.map((team) => (
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
