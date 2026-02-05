import { useState, useEffect, useCallback } from 'react';
import { TodaysGame, Player } from '../types';
import { getTodaysGameForTeam, getOpposingPitcherForTeam } from '../services/mlbApi';

interface UseTodaysGameReturn {
  game: TodaysGame | null;
  opposingPitcher: Player | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useTodaysGame = (teamId: number): UseTodaysGameReturn => {
  const [game, setGame] = useState<TodaysGame | null>(null);
  const [opposingPitcher, setOpposingPitcher] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    setLoading(true);
    setError(null);

    const gameResult = await getTodaysGameForTeam(teamId);

    if (!gameResult.success) {
      setGame(null);
      setOpposingPitcher(null);
      setError(gameResult.error);
      setLoading(false);
      return;
    }

    setGame(gameResult.data);

    // Try to get opposing pitcher
    const pitcherResult = await getOpposingPitcherForTeam(gameResult.data.gameId, teamId);
    if (pitcherResult.success) {
      setOpposingPitcher(pitcherResult.data);
    } else {
      setOpposingPitcher(null);
    }

    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  return {
    game,
    opposingPitcher,
    loading,
    error,
    refetch: fetchGame,
  };
};
