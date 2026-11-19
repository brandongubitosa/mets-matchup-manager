import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  leagueContextFor,
  projectSeason,
  simulateSeason,
  summarizeOutlook,
  teamGameOutlook,
  type RosterMoves,
  type SeasonSimResult,
} from '../projection';
import { seasonData } from '../services/seasonBuilder';

const SIMS = 1000;
const storageKey = (teamId: number) => `seasonBuilder:${seasonData.season}:${teamId}`;

/** Roster moves for one team, persisted per device, with live projections and a background simulation. */
export const useSeasonBuilder = (teamId: number) => {
  const [moves, setMovesState] = useState<RosterMoves>({});
  const [loaded, setLoaded] = useState(false);
  const [sim, setSim] = useState<SeasonSimResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const simRun = useRef(0);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey(teamId))
      .then((raw) => {
        if (!cancelled && raw) setMovesState(JSON.parse(raw));
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const setMoves = useCallback(
    (next: RosterMoves | ((m: RosterMoves) => RosterMoves)) => {
      setMovesState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        AsyncStorage.setItem(storageKey(teamId), JSON.stringify(value)).catch(() => undefined);
        return value;
      });
    },
    [teamId],
  );

  const lg = leagueContextFor(seasonData);
  const baseline = useMemo(() => projectSeason(seasonData), []);
  const projections = useMemo(() => projectSeason(seasonData, { [teamId]: moves }), [teamId, moves]);
  const team = projections.find((t) => t.teamId === teamId);
  const baselineTeam = baseline.find((t) => t.teamId === teamId);

  const outlook = useMemo(() => {
    const games = teamGameOutlook(teamId, projections, seasonData.schedule, lg);
    return { games, ...summarizeOutlook(games) };
  }, [teamId, projections, lg]);

  // Simulate after the UI has updated; drop stale runs when moves change quickly.
  useEffect(() => {
    if (!loaded) return;
    const run = ++simRun.current;
    setSimulating(true);
    const timer = setTimeout(() => {
      const result = simulateSeason(projections, seasonData.teams, seasonData.schedule, lg, { sims: SIMS });
      if (run === simRun.current) {
        setSim(result);
        setSimulating(false);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [projections, lg, loaded]);

  return {
    loaded,
    moves,
    setMoves,
    resetMoves: () => setMoves({}),
    projections,
    team,
    baselineTeam,
    sim,
    teamSim: sim?.teams.find((t) => t.teamId === teamId) ?? null,
    simulating,
    outlook,
  };
};
