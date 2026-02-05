import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, MLB_TEAMS } from '../constants';
import { TeamLogo } from './TeamLogo';

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
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {teams.map((team) => {
          const isSelected = selectedTeamId === team.id;
          return (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamCell,
                isSelected && styles.teamCellSelected,
                Platform.OS === 'web' ? { cursor: 'pointer' as unknown as undefined } : {},
              ]}
              onPress={() => onSelectTeam(team.id)}
              activeOpacity={0.7}
            >
              <TeamLogo teamId={team.id} size={36} />
              <Text
                style={[
                  styles.teamAbbr,
                  isSelected && styles.teamAbbrSelected,
                ]}
              >
                {team.abbreviation}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  teamCell: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  teamCellSelected: {
    backgroundColor: `${COLORS.primary}12`,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  teamAbbr: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  teamAbbrSelected: {
    color: COLORS.primary,
  },
});
