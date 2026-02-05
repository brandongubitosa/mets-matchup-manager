import { useState, useEffect, useCallback } from 'react';
import { SelectedTeam, getSelectedTeam, saveSelectedTeam } from '../services/storage';

const DEFAULT_TEAM: SelectedTeam = {
  id: 121,
  name: 'New York Mets',
  abbreviation: 'NYM',
};

interface UsePersistedTeamReturn {
  team: SelectedTeam;
  setTeam: (team: SelectedTeam) => void;
  isLoading: boolean;
}

export const usePersistedTeam = (): UsePersistedTeamReturn => {
  const [team, setTeamState] = useState<SelectedTeam>(DEFAULT_TEAM);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      const savedTeam = await getSelectedTeam();
      if (savedTeam) {
        setTeamState(savedTeam);
      }
      setIsLoading(false);
    };

    loadTeam();
  }, []);

  const setTeam = useCallback((newTeam: SelectedTeam) => {
    setTeamState(newTeam);
    saveSelectedTeam(newTeam);
  }, []);

  return { team, setTeam, isLoading };
};
