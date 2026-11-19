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
import { sanitizeMoves, seasonData } from '../services/seasonBuilder';

const SIMS = 1000;
const EMPTY_MOVES: RosterMoves = {};
const storageKey = (teamId: number) => `seasonBuilder:${seasonData.season}:${teamId}`;

/** Roster moves for one team, persisted per device, with live projections and a background simulation. */
export const useSeasonBuilder = (teamId: number) => {
  // Moves are tagged with the team they were loaded for, so switching teams never shows or saves
  // the previous team's moves while the new team's are loading.
  const [store, setStore] = useState<{ teamId: number | null; moves: RosterMoves }>({ teamId: null, moves: {} });
  const loaded = store.teamId === teamId;
  const moves = loaded ? store.moves : EMPTY_MOVES;
  const [sim, setSim] = useState<SeasonSimResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const simRun = useRef(0);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey(teamId))
      .then((raw) => (raw ? sanitizeMoves(JSON.parse(raw)) : {}))
      .catch(() => ({}))
      .then((loadedMoves) => {
        if (!cancelled) setStore({ teamId, moves: loadedMoves });
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const setMoves = useCallback(
    (next: RosterMoves | ((m: RosterMoves) => RosterMoves)) => {
      setStore((prev) => {
        if (prev.teamId !== teamId) return prev; // still loading this team's moves
        const value = typeof next === 'function' ? next(prev.moves) : next;
        AsyncStorage.setItem(storageKey(teamId), JSON.stringify(value)).catch(() => undefined);
        return { teamId, moves: value };
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
