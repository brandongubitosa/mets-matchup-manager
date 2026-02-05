import axios, { AxiosError } from 'axios';
import {
  Player,
  MatchupStats,
  MatchupResult,
  RosterPlayer,
  MLBRosterResponse,
  MLBPlayerResponse,
  MLBStatsResponse,
  ApiResult,
} from '../types';
import { METS_TEAM_ID } from '../constants';

const BASE_URL = 'https://statsapi.mlb.com/api/v1';
const API_TIMEOUT_MS = 10000;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT_MS,
});

// Helper to parse player name - handles complex names like "J.D. Martinez" or "Fernando Tatis Jr."
const parsePlayerName = (fullName: string, firstName?: string, lastName?: string): { firstName: string; lastName: string } => {
  // Use API-provided names if available
  if (firstName && lastName) {
    return { firstName, lastName };
  }
  // Fallback to parsing fullName
  const parts = fullName.split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
};

// Helper to format error messages
const formatError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    if (error.response?.status === 404) {
      return 'Data not found.';
    }
    return `Network error: ${error.message}`;
  }
  return 'An unexpected error occurred.';
};

export const getMetsRoster = async (): Promise<ApiResult<RosterPlayer[]>> => {
  try {
    const response = await api.get<MLBRosterResponse>(`/teams/${METS_TEAM_ID}/roster?rosterType=active`);
    const roster = response.data?.roster ?? [];

    return {
      success: true,
      data: roster.map((r) => {
        const { firstName, lastName } = parsePlayerName(
          r.person.fullName,
          r.person.firstName,
          r.person.lastName
        );
        return {
          id: r.person.id,
          fullName: r.person.fullName,
          firstName,
          lastName,
          jerseyNumber: r.jerseyNumber,
          position: r.position,
          status: r.status,
        };
      }),
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

export const getMetsBatters = async (): Promise<RosterPlayer[]> => {
  const result = await getMetsRoster();
  if (!result.success) return [];

  return result.data.filter(
    (player) => player.position.type !== 'Pitcher' || player.position.abbreviation === 'TWP'
  );
};

export const getMetsPitchers = async (): Promise<RosterPlayer[]> => {
  const result = await getMetsRoster();
  if (!result.success) return [];

  return result.data.filter((player) => player.position.type === 'Pitcher');
};

export const getPlayerDetails = async (playerId: number): Promise<ApiResult<Player>> => {
  try {
    const response = await api.get<MLBPlayerResponse>(`/people/${playerId}`);
    const people = response.data?.people ?? [];

    if (people.length === 0) {
      return { success: false, error: 'Player not found' };
    }

    const person = people[0];
    return {
      success: true,
      data: {
        id: person.id,
        fullName: person.fullName,
        firstName: person.firstName,
        lastName: person.lastName,
        primaryNumber: person.primaryNumber,
        position: person.primaryPosition,
        batSide: person.batSide,
        pitchHand: person.pitchHand,
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

export const searchPlayers = async (query: string, teamId?: number): Promise<ApiResult<Player[]>> => {
  try {
    let url = `/sports/1/players?search=${encodeURIComponent(query)}`;
    if (teamId) {
      url = `/teams/${teamId}/roster?rosterType=fullSeason`;
    }

    const response = await api.get(url);
    const players = teamId ? response.data?.roster : response.data?.people;

    if (!players) {
      return { success: true, data: [] };
    }

    interface RosterItem {
      person: {
        id: number;
        fullName: string;
        firstName?: string;
        lastName?: string;
      };
      position: {
        code: string;
        name: string;
        type: string;
        abbreviation: string;
      };
    }

    interface PlayerItem {
      id: number;
      fullName: string;
      firstName?: string;
      lastName?: string;
      primaryPosition: {
        code: string;
        name: string;
        type: string;
        abbreviation: string;
      };
    }

    const filtered = teamId
      ? (players as RosterItem[]).filter((r) =>
          r.person.fullName.toLowerCase().includes(query.toLowerCase())
        )
      : players;

    const result = (teamId ? filtered : players).slice(0, 20).map((p: RosterItem | PlayerItem) => {
      const isRoster = 'person' in p;
      const person = isRoster ? (p as RosterItem).person : (p as PlayerItem);
      const position = isRoster ? (p as RosterItem).position : (p as PlayerItem).primaryPosition;
      const { firstName, lastName } = parsePlayerName(
        person.fullName,
        person.firstName,
        person.lastName
      );

      return {
        id: person.id,
        fullName: person.fullName,
        firstName,
        lastName,
        position,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

export const getTeamRoster = async (teamId: number): Promise<ApiResult<RosterPlayer[]>> => {
  try {
    const response = await api.get<MLBRosterResponse>(`/teams/${teamId}/roster?rosterType=active`);
    const roster = response.data?.roster ?? [];

    return {
      success: true,
      data: roster.map((r) => {
        const { firstName, lastName } = parsePlayerName(
          r.person.fullName,
          r.person.firstName,
          r.person.lastName
        );
        return {
          id: r.person.id,
          fullName: r.person.fullName,
          firstName,
          lastName,
          jerseyNumber: r.jerseyNumber,
          position: r.position,
          status: r.status,
        };
      }),
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

export const getTeamPitchers = async (teamId: number): Promise<RosterPlayer[]> => {
  const result = await getTeamRoster(teamId);
  if (!result.success) return [];

  return result.data.filter((player) => player.position.type === 'Pitcher');
};

export const getTeamBatters = async (teamId: number): Promise<RosterPlayer[]> => {
  const result = await getTeamRoster(teamId);
  if (!result.success) return [];

  return result.data.filter((player) => player.position.type !== 'Pitcher');
};

interface RawMatchupStats {
  gamesPlayed?: number;
  atBats?: number;
  hits?: number;
  doubles?: number;
  triples?: number;
  homeRuns?: number;
  rbi?: number;
  baseOnBalls?: number;
  strikeOuts?: number;
  hitByPitch?: number;
  sacFlies?: number;
}

const calculateStats = (stats: RawMatchupStats): MatchupStats => {
  const atBats = stats.atBats ?? 0;
  const hits = stats.hits ?? 0;
  const walks = stats.baseOnBalls ?? 0;
  const hitByPitch = stats.hitByPitch ?? 0;
  const sacFlies = stats.sacFlies ?? 0;
  const doubles = stats.doubles ?? 0;
  const triples = stats.triples ?? 0;
  const homeRuns = stats.homeRuns ?? 0;

  const totalBases = hits + doubles + (triples * 2) + (homeRuns * 3);

  const avg = atBats > 0 ? (hits / atBats).toFixed(3) : '.000';
  const obpDenom = atBats + walks + hitByPitch + sacFlies;
  const obp = obpDenom > 0 ? ((hits + walks + hitByPitch) / obpDenom).toFixed(3) : '.000';
  const slg = atBats > 0 ? (totalBases / atBats).toFixed(3) : '.000';
  const opsValue = parseFloat(obp) + parseFloat(slg);

  return {
    gamesPlayed: stats.gamesPlayed ?? 0,
    atBats,
    hits,
    doubles,
    triples,
    homeRuns,
    rbi: stats.rbi ?? 0,
    walks,
    strikeouts: stats.strikeOuts ?? 0,
    avg: avg.replace('0.', '.'),
    obp: obp.replace('0.', '.'),
    slg: slg.replace('0.', '.'),
    ops: opsValue.toFixed(3).replace('0.', '.'),
  };
};

export const getBatterVsPitcher = async (
  batterId: number,
  pitcherId: number
): Promise<ApiResult<MatchupResult>> => {
  try {
    const [matchupResponse, batterResponse, pitcherResponse] = await Promise.all([
      api.get<MLBStatsResponse>(
        `/people/${batterId}/stats?stats=vsPlayer&opposingPlayerId=${pitcherId}&group=hitting`
      ),
      api.get<MLBPlayerResponse>(`/people/${batterId}`),
      api.get<MLBPlayerResponse>(`/people/${pitcherId}`),
    ]);

    const batterData = batterResponse.data?.people?.[0];
    const pitcherData = pitcherResponse.data?.people?.[0];

    if (!batterData || !pitcherData) {
      return { success: false, error: 'Could not find player information' };
    }

    const matchupStats = matchupResponse.data?.stats?.[0]?.splits?.[0]?.stat;

    const emptyStats: MatchupStats = {
      gamesPlayed: 0,
      atBats: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      rbi: 0,
      walks: 0,
      strikeouts: 0,
      avg: '.000',
      obp: '.000',
      slg: '.000',
      ops: '.000',
    };

    return {
      success: true,
      data: {
        batter: {
          id: batterData.id,
          fullName: batterData.fullName,
          firstName: batterData.firstName,
          lastName: batterData.lastName,
          position: batterData.primaryPosition,
          batSide: batterData.batSide,
        },
        pitcher: {
          id: pitcherData.id,
          fullName: pitcherData.fullName,
          firstName: pitcherData.firstName,
          lastName: pitcherData.lastName,
          position: pitcherData.primaryPosition,
          pitchHand: pitcherData.pitchHand,
        },
        stats: matchupStats ? calculateStats(matchupStats) : emptyStats,
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// Get today's game for the default team (Mets)
export const getTodaysGame = async (): Promise<ApiResult<{
  gameId: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  gameTime: string;
}>> => {
  return getTodaysGameForTeam(METS_TEAM_ID);
};

// Get today's game for any team
export const getTodaysGameForTeam = async (teamId: number): Promise<ApiResult<{
  gameId: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  gameTime: string;
  isHome: boolean;
  opponent: { id: number; name: string };
}>> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get(
      `/schedule?sportId=1&teamId=${teamId}&date=${today}`
    );

    const games = response.data?.dates?.[0]?.games;
    if (!games || games.length === 0) {
      return { success: false, error: 'No game scheduled today' };
    }

    const game = games[0];
    const isHome = game.teams.home.team.id === teamId;
    const opponent = isHome ? game.teams.away.team : game.teams.home.team;

    return {
      success: true,
      data: {
        gameId: game.gamePk,
        homeTeam: {
          id: game.teams.home.team.id,
          name: game.teams.home.team.name,
        },
        awayTeam: {
          id: game.teams.away.team.id,
          name: game.teams.away.team.name,
        },
        gameTime: game.gameDate,
        isHome,
        opponent: {
          id: opponent.id,
          name: opponent.name,
        },
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// Get opposing starting pitcher for a game
export const getOpposingPitcherForTeam = async (gameId: number, teamId: number): Promise<ApiResult<Player>> => {
  try {
    const response = await api.get(`/game/${gameId}/boxscore`);
    const teams = response.data?.teams;

    if (!teams) {
      return { success: false, error: 'Could not load game data' };
    }

    const isHome = teams.home?.team?.id === teamId;
    const opposingTeam = isHome ? teams.away : teams.home;

    const startingPitcherId = opposingTeam?.pitchers?.[0];
    if (!startingPitcherId) {
      return { success: false, error: 'Starting pitcher not available yet' };
    }

    return getPlayerDetails(startingPitcherId);
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// Legacy: Get opposing starting pitcher for today's game (Mets)
export const getOpposingPitcher = async (gameId: number): Promise<ApiResult<Player>> => {
  return getOpposingPitcherForTeam(gameId, METS_TEAM_ID);
};
