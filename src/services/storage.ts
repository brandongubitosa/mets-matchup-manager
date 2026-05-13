import AsyncStorage from '@react-native-async-storage/async-storage';
import { PredictionRecord } from '../types';

const STORAGE_KEYS = {
  SELECTED_TEAM: '@mets_matchup:selected_team',
  PREDICTION_RECORDS: '@mets_matchup:prediction_records',
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

export const getPredictionRecords = async (): Promise<PredictionRecord[]> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.PREDICTION_RECORDS);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as PredictionRecord[]) : [];
  } catch {
    return [];
  }
};

/** Saves a prediction record. Skips silently if a record for this gameId already exists. */
export const savePredictionRecord = async (record: PredictionRecord): Promise<void> => {
  try {
    const existing = await getPredictionRecords();
    if (existing.some((r) => r.gameId === record.gameId)) return;
    await AsyncStorage.setItem(
      STORAGE_KEYS.PREDICTION_RECORDS,
      JSON.stringify([record, ...existing])
    );
  } catch (error) {
    console.error('Error saving prediction record:', error);
  }
};

/** Merges a partial update into an existing record matched by gameId. */
export const updatePredictionRecord = async (
  gameId: number,
  update: Partial<PredictionRecord>
): Promise<void> => {
  try {
    const existing = await getPredictionRecords();
    const updated = existing.map((r) =>
      r.gameId === gameId ? { ...r, ...update } : r
    );
    await AsyncStorage.setItem(STORAGE_KEYS.PREDICTION_RECORDS, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating prediction record:', error);
  }
};

export const clearPredictionRecords = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PREDICTION_RECORDS);
  } catch (error) {
    console.error('Error clearing prediction records:', error);
  }
};
