import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { LiveGame } from '../types';
import { getLiveScores, invalidateLiveScoresCache } from '../services/mlbApi';
import { isGameInProgress } from '../utils/liveGame';

const POLL_INTERVAL_LIVE = 30_000;
const POLL_INTERVAL_IDLE = 120_000;

interface UseLiveScoresReturn {
  games: LiveGame[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  hasLiveGames: boolean;
  /** Pass true (default) to bypass short-lived HTTP cache after pull-to-refresh or manual refresh. */
  refetch: (forceRefresh?: boolean) => Promise<void>;
}

export const useLiveScores = (): UseLiveScoresReturn => {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const hasLiveGames = games.some(isGameInProgress);

  const fetchScores = useCallback(async (showLoading = false, forceRefresh = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    if (forceRefresh) {
      invalidateLiveScoresCache();
    }

    const result = await getLiveScores();

    if (result.success) {
      setGames(result.data);
      setLastUpdated(new Date());
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const interval = hasLiveGames ? POLL_INTERVAL_LIVE : POLL_INTERVAL_IDLE;
    intervalRef.current = setInterval(() => fetchScores(false, false), interval);
  }, [hasLiveGames, fetchScores]);

  useEffect(() => {
    fetchScores(true, false);
  }, [fetchScores]);

  useEffect(() => {
    startPolling();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startPolling]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        fetchScores(false, false);
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      appStateRef.current = nextState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [fetchScores, startPolling]);

  return {
    games,
    loading,
    error,
    lastUpdated,
    hasLiveGames,
    refetch: (forceRefresh = true) => fetchScores(false, forceRefresh),
  };
};
