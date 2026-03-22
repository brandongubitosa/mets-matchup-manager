import { useState, useEffect } from 'react';
import { RosterPlayer } from '../types';
import { getTeamBatters } from '../services/mlbApi';

interface UseTeamRosterReturn {
  batters: RosterPlayer[];
  loading: boolean;
}

export const useTeamRoster = (teamId: number): UseTeamRosterReturn => {
  const [batters, setBatters] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId) {
      setBatters([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getTeamBatters(teamId).then((data) => {
      if (!cancelled) {
        setBatters(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return { batters, loading };
};
