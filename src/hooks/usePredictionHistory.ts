import { useState, useEffect, useCallback } from 'react';
import { PredictionRecord } from '../types';
import {
  getPredictionRecords,
  savePredictionRecord,
  updatePredictionRecord,
  clearPredictionRecords,
} from '../services/storage';
import { getGameResult } from '../services/mlbApi';

export interface PredictionStats {
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
  accuracy: number; // 0–1, based on settled games only
}

interface UsePredictionHistoryReturn {
  records: PredictionRecord[];
  stats: PredictionStats;
  loading: boolean;
  addRecord: (record: PredictionRecord) => Promise<void>;
  refreshResults: () => Promise<void>;
  clearAll: () => Promise<void>;
}

function computeStats(records: PredictionRecord[]): PredictionStats {
  const correct = records.filter((r) => r.isCorrect === true).length;
  const incorrect = records.filter((r) => r.isCorrect === false).length;
  const pending = records.filter((r) => r.isCorrect === null).length;
  const settled = correct + incorrect;
  return {
    total: records.length,
    correct,
    incorrect,
    pending,
    accuracy: settled > 0 ? correct / settled : 0,
  };
}

export const usePredictionHistory = (): UsePredictionHistoryReturn => {
  const [records, setRecords] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const stored = await getPredictionRecords();
    setRecords(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addRecord = useCallback(async (record: PredictionRecord) => {
    await savePredictionRecord(record);
    setRecords((prev) => {
      if (prev.some((r) => r.gameId === record.gameId)) return prev;
      return [record, ...prev];
    });
  }, []);

  /** Fetches final scores for any pending predictions and updates storage. */
  const refreshResults = useCallback(async () => {
    const current = await getPredictionRecords();
    const pending = current.filter((r) => r.isCorrect === null);
    if (pending.length === 0) return;

    const updates = await Promise.all(
      pending.map(async (r) => {
        const result = await getGameResult(r.gameId);
        if (!result?.isFinal) return null;
        const actualWinner: 'home' | 'away' =
          result.homeScore > result.awayScore ? 'home' : 'away';
        return {
          gameId: r.gameId,
          update: {
            actualWinner,
            actualHomeScore: result.homeScore,
            actualAwayScore: result.awayScore,
            isCorrect: actualWinner === r.predictedWinner,
          },
        };
      })
    );

    for (const item of updates) {
      if (item) await updatePredictionRecord(item.gameId, item.update);
    }

    const refreshed = await getPredictionRecords();
    setRecords(refreshed);
  }, []);

  const clearAll = useCallback(async () => {
    await clearPredictionRecords();
    setRecords([]);
  }, []);

  return {
    records,
    stats: computeStats(records),
    loading,
    addRecord,
    refreshResults,
    clearAll,
  };
};
