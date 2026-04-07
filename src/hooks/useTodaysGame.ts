import { useState, useEffect, useCallback } from 'react';
import { TodaysGame, Player } from '../types';
import {
  getTodaysGameForTeam,
  getOpposingPitcherForTeam,
  invalidateTodaysGameCache,
  invalidateGameLineupCache,
  invalidateTeamRosterCache,
} from '../services/mlbApi';

interface UseTodaysGameReturn {
  game: TodaysGame | null;
  opposingPitcher: Player | null;
  loading: boolean;
  error: string | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
}

export const useTodaysGame = (teamId: number): UseTodaysGameReturn => {
  const [game, setGame] = useState<TodaysGame | null>(null);
  const [opposingPitcher, setOpposingPitcher] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) {
      invalidateTodaysGameCache(teamId);
      invalidateTeamRosterCache(teamId);
    }

    const gameResult = await getTodaysGameForTeam(teamId);

    if (!gameResult.success) {
      setGame(null);
      setOpposingPitcher(null);
      setError(gameResult.error);
      setLoading(false);
      return;
    }

    setGame(gameResult.data);
    if (forceRefresh) {
      if (gameResult.data.gameId) {
        invalidateGameLineupCache(gameResult.data.gameId);
      }
      invalidateTeamRosterCache(gameResult.data.opponent.id);
    }

    // Use probable pitcher from schedule hydrate if available, else fall back to boxscore
    if (gameResult.data.probablePitcher) {
      const pp = gameResult.data.probablePitcher;
      setOpposingPitcher({
        id: pp.id,
        fullName: pp.fullName,
        firstName: pp.fullName.split(' ')[0],
        lastName: pp.fullName.split(' ').slice(1).join(' '),
        position: { code: '1', name: 'Pitcher', type: 'Pitcher', abbreviation: 'P' },
      } as Player);
    } else {
      // Fall back to boxscore method
      const pitcherResult = await getOpposingPitcherForTeam(gameResult.data.gameId, teamId);
      if (pitcherResult.success) {
        setOpposingPitcher(pitcherResult.data);
      } else {
        setOpposingPitcher(null);
      }
    }

    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetchGame(false);
  }, [fetchGame]);

  return {
    game,
    opposingPitcher,
    loading,
    error,
    refetch: (forceRefresh = true) => fetchGame(forceRefresh),
  };
};
