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
import { DEFAULT_CBT, MIN_THRESHOLD, teamPayroll, type CbtSettings } from '../services/payroll';

const SIMS = 1000;
const EMPTY_MOVES: RosterMoves = {};
const storageKey = (teamId: number) => `seasonBuilder:${seasonData.season}:${teamId}`;

/** Roster moves for one team, persisted per device, with live projections and a background simulation. */
export const useSeasonBuilder = (teamId: number, opts: { odds?: boolean; moves?: RosterMoves } = {}) => {
  const runOdds = opts.odds !== false;
  // Moves passed in (e.g. from the builder to the sim screen) are used as-is instead of storage.
  const fixedMoves = opts.moves;
  // Moves are tagged with the team they were loaded for, so switching teams never shows or saves
  // the previous team's moves while the new team's are loading.
  const [store, setStore] = useState<{ teamId: number | null; moves: RosterMoves }>(() =>
    fixedMoves ? { teamId, moves: sanitizeMoves(fixedMoves) } : { teamId: null, moves: {} },
  );
  const loaded = store.teamId === teamId;
  const moves = loaded ? store.moves : EMPTY_MOVES;
  const [sim, setSim] = useState<SeasonSimResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const simRun = useRef(0);

  useEffect(() => {
    if (fixedMoves) {
      setStore({ teamId, moves: sanitizeMoves(fixedMoves) });
      return;
    }
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
  }, [teamId, fixedMoves]);

  const setMoves = useCallback(
    (next: RosterMoves | ((m: RosterMoves) => RosterMoves)) => {
      setStore((prev) => {
        if (prev.teamId !== teamId) return prev; // still loading this team's moves
        const value = typeof next === 'function' ? next(prev.moves) : next;
        if (!fixedMoves) AsyncStorage.setItem(storageKey(teamId), JSON.stringify(value)).catch(() => undefined);
        return { teamId, moves: value };
      });
    },
    [teamId, fixedMoves],
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
    if (!loaded || !runOdds) return;
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
  }, [projections, lg, loaded, runOdds]);

  const { settings: cbt, setSettings: setCbt } = useCbtSettings();
  const payroll = useMemo(() => teamPayroll(teamId, moves, cbt), [teamId, moves, cbt]);

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
    payroll,
    cbt,
    setCbt,
  };
};

const CBT_KEY = 'seasonBuilder:cbtSettings';

/** Luxury tax settings (threshold and payer status), saved on the device. */
export const useCbtSettings = () => {
  const [settings, setState] = useState<CbtSettings>(DEFAULT_CBT);
  // If the user edits before the saved settings finish loading, the edit wins.
  const edited = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(CBT_KEY)
      .then((raw) => {
        if (!raw || edited.current) return;
        const v = JSON.parse(raw);
        if (
          v &&
          Number.isFinite(v.threshold) &&
          v.threshold >= MIN_THRESHOLD &&
          ['first', 'second', 'repeat'].includes(v.payerStatus)
        ) {
          setState({ threshold: v.threshold, payerStatus: v.payerStatus });
        }
      })
      .catch(() => undefined);
  }, []);
  const setSettings = useCallback((next: CbtSettings) => {
    edited.current = true;
    const value = { ...next, threshold: Math.max(MIN_THRESHOLD, next.threshold) };
    setState(value);
    AsyncStorage.setItem(CBT_KEY, JSON.stringify(value)).catch(() => undefined);
  }, []);
  return { settings, setSettings };
};
