import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SELECTED_TEAM: '@mets_matchup:selected_team',
} as const;

export interface SelectedTeam {
  id: number;
  name: string;
  abbreviation: string;
}

export const saveSelectedTeam = async (team: SelectedTeam): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_TEAM, JSON.stringify(team));
  } catch (error) {
    console.error('Error saving selected team:', error);
  }
};

export const getSelectedTeam = async (): Promise<SelectedTeam | null> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_TEAM);
    if (value) {
      return JSON.parse(value) as SelectedTeam;
    }
    return null;
  } catch (error) {
    console.error('Error reading selected team:', error);
    return null;
  }
};

export const clearSelectedTeam = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_TEAM);
  } catch (error) {
    console.error('Error clearing selected team:', error);
  }
};
