import { useState, useEffect } from 'react';
import { LineupPlayer } from '../types';
import { getGameLineup } from '../services/mlbApi';

interface UseGameLineupReturn {
  homeLineup: LineupPlayer[];
  awayLineup: LineupPlayer[];
  loading: boolean;
}

export const useGameLineup = (gameId: number | undefined): UseGameLineupReturn => {
  const [homeLineup, setHomeLineup] = useState<LineupPlayer[]>([]);
  const [awayLineup, setAwayLineup] = useState<LineupPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gameId) {
      setHomeLineup([]);
      setAwayLineup([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getGameLineup(gameId).then((data) => {
      if (!cancelled) {
        setHomeLineup(data.home);
        setAwayLineup(data.away);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return { homeLineup, awayLineup, loading };
};
