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
  PitcherSeasonStats,
  BatterPredictionItem,
  TeamPredictionData,
  GamePredictionResult,
  HotZone,
  PitcherArsenalPitch,
  PitchTypeStats,
  PitchArsenalMatchup,
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

  return result.data.filter(
    (player) => player.position.type === 'Pitcher' || player.position.abbreviation === 'TWP'
  );
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

  return result.data.filter(
    (player) => player.position.type === 'Pitcher' || player.position.abbreviation === 'TWP'
  );
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
    const [matchupResponse, batterResponse, pitcherResponse, seasonResponse] = await Promise.all([
      api.get<MLBStatsResponse>(
        `/people/${batterId}/stats?stats=vsPlayer&opposingPlayerId=${pitcherId}&group=hitting`
      ),
      api.get<MLBPlayerResponse>(`/people/${batterId}`),
      api.get<MLBPlayerResponse>(`/people/${pitcherId}`),
      api.get<MLBStatsResponse>(
        `/people/${batterId}/stats?stats=season&group=hitting`
      ),
    ]);

    const batterData = batterResponse.data?.people?.[0];
    const pitcherData = pitcherResponse.data?.people?.[0];

    if (!batterData || !pitcherData) {
      return { success: false, error: 'Could not find player information' };
    }

    const matchupStats = matchupResponse.data?.stats?.[0]?.splits?.[0]?.stat;
    const seasonStats = seasonResponse.data?.stats?.[0]?.splits?.[0]?.stat;

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
        seasonStats: seasonStats ? calculateStats(seasonStats) : undefined,
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

// Get today's game for any team (with probable pitchers via hydrate)
export const getTodaysGameForTeam = async (teamId: number): Promise<ApiResult<{
  gameId: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  gameTime: string;
  isHome: boolean;
  opponent: { id: number; name: string };
  probablePitcher?: { id: number; fullName: string };
}>> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get(
      `/schedule?sportId=1&teamId=${teamId}&date=${today}&hydrate=probablePitcher`
    );

    const games = response.data?.dates?.[0]?.games;
    if (!games || games.length === 0) {
      return { success: false, error: 'No game scheduled today' };
    }

    const game = games[0];
    const isHome = game.teams.home.team.id === teamId;
    const opponent = isHome ? game.teams.away.team : game.teams.home.team;

    // Extract probable pitcher for the opposing team
    const opposingTeamData = isHome ? game.teams.away : game.teams.home;
    const probablePitcherData = opposingTeamData?.probablePitcher;

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
        probablePitcher: probablePitcherData?.id
          ? { id: probablePitcherData.id, fullName: probablePitcherData.fullName }
          : undefined,
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

// ─── Pitch Arsenal ───────────────────────────────────────────────────────────

// Human-readable pitch names by Statcast code
const PITCH_NAMES: Record<string, string> = {
  FF: '4-Seam Fastball',
  SI: 'Sinker',
  FT: '2-Seam Fastball',
  FC: 'Cutter',
  FS: 'Splitter',
  SL: 'Slider',
  ST: 'Sweeper',
  SV: 'Slurve',
  CU: 'Curveball',
  KC: 'Knuckle Curve',
  CH: 'Changeup',
  SC: 'Screwball',
  KN: 'Knuckleball',
  EP: 'Eephus',
  FO: 'Forkball',
  CS: 'Slow Curve',
};

interface RawArsenalSplit {
  stat?: {
    type?: { code?: string; description?: string };
    percentage?: number;
    avgSpeed?: number;
    avgSpin?: number;
    strikeoutPercent?: number;
    // batter-side fields
    atBats?: number;
    hits?: number;
    avg?: string;
    whiffs?: number;
    swings?: number;
    whiffPercent?: number;
  };
}

export const getPitcherArsenal = async (
  pitcherId: number,
  season?: number
): Promise<ApiResult<PitcherArsenalPitch[]>> => {
  try {
    const yr = season ?? new Date().getFullYear();
    const response = await api.get(
      `/people/${pitcherId}/stats?stats=pitchArsenal&group=pitching&season=${yr}`
    );

    const splits: RawArsenalSplit[] = response.data?.stats?.[0]?.splits ?? [];
    if (splits.length === 0) {
      return { success: false, error: 'No arsenal data available' };
    }

    const pitches: PitcherArsenalPitch[] = splits
      .filter((s) => s.stat?.type?.code)
      .map((s) => {
        const code = s.stat!.type!.code!;
        return {
          pitchCode: code,
          pitchName: PITCH_NAMES[code] ?? s.stat!.type!.description ?? code,
          usagePct: s.stat?.percentage ?? 0,
          avgVelocity: s.stat?.avgSpeed ?? 0,
          avgSpin: s.stat?.avgSpin,
          strikeoutPct: s.stat?.strikeoutPercent,
        };
      })
      .filter((p) => p.usagePct > 0)
      .sort((a, b) => b.usagePct - a.usagePct);

    return { success: true, data: pitches };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

export const getBatterVsPitchType = async (
  batterId: number,
  season?: number
): Promise<ApiResult<PitchTypeStats[]>> => {
  try {
    const yr = season ?? new Date().getFullYear();
    const response = await api.get(
      `/people/${batterId}/stats?stats=pitchArsenal&group=hitting&season=${yr}`
    );

    const splits: RawArsenalSplit[] = response.data?.stats?.[0]?.splits ?? [];
    if (splits.length === 0) {
      return { success: false, error: 'No batter pitch data available' };
    }

    const stats: PitchTypeStats[] = splits
      .filter((s) => s.stat?.type?.code)
      .map((s) => {
        const code = s.stat!.type!.code!;
        const atBats = s.stat?.atBats ?? 0;
        const whiffs = s.stat?.whiffs ?? 0;
        const swings = s.stat?.swings ?? 0;
        return {
          pitchCode: code,
          pitchType: PITCH_NAMES[code] ?? s.stat!.type!.description ?? code,
          atBats,
          hits: s.stat?.hits ?? 0,
          avg: s.stat?.avg ?? '.000',
          whiffs,
          swings,
          whiffRate:
            swings > 0
              ? ((whiffs / swings) * 100).toFixed(0) + '%'
              : s.stat?.whiffPercent != null
              ? (s.stat.whiffPercent * 100).toFixed(0) + '%'
              : '0%',
        };
      });

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

export const getPitchArsenalMatchup = async (
  pitcherId: number,
  batterId: number,
  season?: number
): Promise<ApiResult<PitchArsenalMatchup[]>> => {
  const [arsenalResult, batterResult] = await Promise.all([
    getPitcherArsenal(pitcherId, season),
    getBatterVsPitchType(batterId, season),
  ]);

  if (!arsenalResult.success) {
    return { success: false, error: arsenalResult.error };
  }

  const batterMap: Record<string, PitchTypeStats> = {};
  if (batterResult.success) {
    batterResult.data.forEach((s) => {
      batterMap[s.pitchCode] = s;
    });
  }

  const matchups: PitchArsenalMatchup[] = arsenalResult.data.map((pitch) => ({
    pitcher: pitch,
    batterStats: batterMap[pitch.pitchCode],
  }));

  return { success: true, data: matchups };
};

// ─── Hot Zone (Strike Zone Chart) ───────────────────────────────────────────

export const getBatterHotZones = async (
  batterId: number,
  season?: number
): Promise<ApiResult<HotZone[]>> => {
  try {
    const yr = season ?? new Date().getFullYear();
    const response = await api.get(
      `/people/${batterId}/stats?stats=hotZone&group=hitting&season=${yr}`
    );

    const splits = response.data?.stats?.[0]?.splits;
    if (!splits || splits.length === 0) {
      return { success: false, error: 'No hot zone data available' };
    }

    // MLB API returns zones nested inside splits[0].stat.zones
    const zones: Array<{ zone: string; value: string; color?: string; temp?: string }> =
      splits[0]?.stat?.zones ?? [];

    // Fallback: some API versions return zone as a top-level split property
    const fallbackZones = splits
      .filter((s: { zone?: string }) => s.zone)
      .map((s: { zone: string; stat?: { avg?: string; color?: string; temp?: string } }) => ({
        zone: s.zone,
        value: s.stat?.avg ?? '0',
        color: s.stat?.color,
        temp: s.stat?.temp,
      }));

    const result: Array<{ zone: string; value: string; color?: string; temp?: string }> =
      zones.length > 0 ? zones : fallbackZones;
    if (result.length === 0) {
      return { success: false, error: 'No zone data found' };
    }

    return {
      success: true,
      data: result.map((z) => ({
        zone: z.zone,
        value: z.value ?? '0',
        color: z.color,
        temp: z.temp,
      })),
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// ─── Game Prediction ────────────────────────────────────────────────────────

const calculatePitcherStats = (stats: Record<string, unknown>): PitcherSeasonStats => ({
  era: stats.era ? parseFloat(stats.era as string).toFixed(2) : '0.00',
  whip: stats.whip ? parseFloat(stats.whip as string).toFixed(2) : '0.00',
  strikeouts: (stats.strikeOuts as number) ?? 0,
  walks: (stats.baseOnBalls as number) ?? 0,
  inningsPitched: (stats.inningsPitched as string) ?? '0.0',
  gamesStarted: (stats.gamesStarted as number) ?? 0,
});

export const getPitcherSeasonStats = async (
  pitcherId: number
): Promise<ApiResult<{ player: Player; stats: PitcherSeasonStats }>> => {
  try {
    const [playerRes, statsRes] = await Promise.all([
      api.get<MLBPlayerResponse>(`/people/${pitcherId}`),
      api.get(`/people/${pitcherId}/stats?stats=season&group=pitching`),
    ]);

    const personData = playerRes.data?.people?.[0];
    if (!personData) return { success: false, error: 'Pitcher not found' };

    const statSplit = statsRes.data?.stats?.[0]?.splits?.[0]?.stat;

    return {
      success: true,
      data: {
        player: {
          id: personData.id,
          fullName: personData.fullName,
          firstName: personData.firstName,
          lastName: personData.lastName,
          position: personData.primaryPosition,
          pitchHand: personData.pitchHand,
        },
        stats: statSplit
          ? calculatePitcherStats(statSplit)
          : { era: '0.00', whip: '0.00', strikeouts: 0, walks: 0, inningsPitched: '0.0', gamesStarted: 0 },
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

const LEAGUE_AVG_OPS = 0.720;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const pitcherEraFactor = (era: string): number => {
  const eraNum = parseFloat(era);
  if (!eraNum || eraNum === 0) return 1.0;
  return clamp(4.5 / eraNum, 0.6, 1.8);
};

const platoonTag = (
  batCode: string | undefined,
  pitchCode: string | undefined
): BatterPredictionItem['platoonAdvantage'] => {
  if (!batCode || !pitchCode) return 'neutral';
  if (batCode === 'S') return 'switch';
  if (batCode !== pitchCode) return 'advantage';
  return 'disadvantage';
};

const platoonMultiplier = (tag: BatterPredictionItem['platoonAdvantage']): number => {
  switch (tag) {
    case 'advantage': return 1.05;
    case 'disadvantage': return 0.95;
    case 'switch': return 1.02;
    default: return 1.0;
  }
};

interface BatterFetchResult {
  batterId: number;
  fullName: string;
  batSide?: { code: string; description: string };
  seasonOPS: number;
  h2hOPS: number;
  h2hAtBats: number;
}

const fetchBatterPredictionStats = async (
  batter: RosterPlayer,
  opposingPitcherId: number | undefined,
  opposingPitchHand: string | undefined
): Promise<BatterPredictionItem> => {
  try {
    const calls: Promise<unknown>[] = [
      api.get<MLBStatsResponse>(`/people/${batter.id}/stats?stats=season&group=hitting`),
      api.get<MLBPlayerResponse>(`/people/${batter.id}`),
    ];
    if (opposingPitcherId) {
      calls.push(
        api.get<MLBStatsResponse>(
          `/people/${batter.id}/stats?stats=vsPlayer&opposingPlayerId=${opposingPitcherId}&group=hitting`
        )
      );
    }

    const results = await Promise.all(calls);
    const seasonRes = results[0] as { data: MLBStatsResponse };
    const playerRes = results[1] as { data: MLBPlayerResponse };
    const h2hRes = results[2] as { data: MLBStatsResponse } | undefined;

    const personData = playerRes.data?.people?.[0];
    const batSide = personData?.batSide;

    const seasonStat = seasonRes.data?.stats?.[0]?.splits?.[0]?.stat;
    let seasonOPS = LEAGUE_AVG_OPS;
    if (seasonStat) {
      const calc = calculateStats(seasonStat as Parameters<typeof calculateStats>[0]);
      const ops = parseFloat(calc.ops);
      if (ops > 0) seasonOPS = ops;
    }

    let h2hOPS = 0;
    let h2hAtBats = 0;
    if (h2hRes) {
      const h2hStat = h2hRes.data?.stats?.[0]?.splits?.[0]?.stat;
      if (h2hStat) {
        const calc = calculateStats(h2hStat as Parameters<typeof calculateStats>[0]);
        h2hAtBats = h2hStat.atBats ?? 0;
        if (h2hAtBats > 0) h2hOPS = parseFloat(calc.ops) || 0;
      }
    }

    let effectiveOPS = seasonOPS;
    if (h2hAtBats >= 5) {
      effectiveOPS = h2hOPS * 0.5 + seasonOPS * 0.5;
    } else if (h2hAtBats >= 2) {
      effectiveOPS = h2hOPS * 0.25 + seasonOPS * 0.75;
    }

    const tag = platoonTag(batSide?.code, opposingPitchHand);
    effectiveOPS = clamp(effectiveOPS * platoonMultiplier(tag), 0.3, 1.5);

    return {
      id: batter.id,
      fullName: batter.fullName,
      batSide,
      seasonOPS,
      h2hOPS,
      h2hAtBats,
      effectiveOPS,
      platoonAdvantage: tag,
    };
  } catch {
    return {
      id: batter.id,
      fullName: batter.fullName,
      seasonOPS: LEAGUE_AVG_OPS,
      h2hOPS: 0,
      h2hAtBats: 0,
      effectiveOPS: LEAGUE_AVG_OPS,
      platoonAdvantage: 'neutral',
    };
  }
};

const buildTeamData = async (
  teamId: number,
  teamName: string,
  pitcherId: number | undefined,
  opposingPitcherId: number | undefined
): Promise<TeamPredictionData> => {
  const [rosterResult, pitcherResult] = await Promise.all([
    getTeamBatters(teamId),
    pitcherId ? getPitcherSeasonStats(pitcherId) : Promise.resolve(null),
  ]);

  const batters = rosterResult.slice(0, 9);
  const pitcherData = pitcherResult && 'data' in pitcherResult && pitcherResult.success
    ? pitcherResult.data
    : null;

  const pitchHand = pitcherData?.player?.pitchHand?.code;

  const batterItems = await Promise.all(
    batters.map((b) => fetchBatterPredictionStats(b, opposingPitcherId, pitchHand))
  );

  const offensiveScore =
    batterItems.length > 0
      ? batterItems.reduce((sum, b) => sum + b.effectiveOPS, 0) / batterItems.length
      : LEAGUE_AVG_OPS;

  return {
    teamId,
    teamName,
    pitcher: pitcherData?.player ?? null,
    pitcherStats: pitcherData?.stats ?? null,
    batters: batterItems,
    offensiveScore,
  };
};

export const predictGame = async (params: {
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homePitcherId?: number;
  awayPitcherId?: number;
}): Promise<ApiResult<GamePredictionResult>> => {
  try {
    const { homeTeamId, homeTeamName, awayTeamId, awayTeamName, homePitcherId, awayPitcherId } = params;

    const [homeData, awayData] = await Promise.all([
      buildTeamData(homeTeamId, homeTeamName, homePitcherId, awayPitcherId),
      buildTeamData(awayTeamId, awayTeamName, awayPitcherId, homePitcherId),
    ]);

    const homePitcherFactor = homeData.pitcherStats ? pitcherEraFactor(homeData.pitcherStats.era) : 1.0;
    const awayPitcherFactor = awayData.pitcherStats ? pitcherEraFactor(awayData.pitcherStats.era) : 1.0;

    const homeRunExp = homeData.offensiveScore * awayPitcherFactor;
    const awayRunExp = awayData.offensiveScore * homePitcherFactor;
    const total = homeRunExp + awayRunExp;
    const baseProbHome = total > 0 ? homeRunExp / total : 0.5;
    // 5% home field advantage
    const homeWinProbability = clamp(baseProbHome * 0.95 + 0.05, 0.01, 0.99);
    const predictedWinner: 'home' | 'away' = homeWinProbability >= 0.5 ? 'home' : 'away';
    const confidence = Math.abs(homeWinProbability - 0.5) * 2;

    // Build key factors
    const keyFactors: string[] = [];

    const homeAdvCount = homeData.batters.filter((b) => b.platoonAdvantage === 'advantage').length;
    const awayAdvCount = awayData.batters.filter((b) => b.platoonAdvantage === 'advantage').length;
    if (homeAdvCount > awayAdvCount) {
      keyFactors.push(`${homeTeamName} has ${homeAdvCount} platoon matchup advantages`);
    } else if (awayAdvCount > homeAdvCount) {
      keyFactors.push(`${awayTeamName} has ${awayAdvCount} platoon matchup advantages`);
    }

    const homeH2H = homeData.batters.filter((b) => b.h2hAtBats >= 5).length;
    const awayH2H = awayData.batters.filter((b) => b.h2hAtBats >= 5).length;
    if (homeH2H + awayH2H > 0) {
      keyFactors.push(`${homeH2H + awayH2H} batters have significant head-to-head history`);
    }

    if (homeData.pitcherStats && awayData.pitcherStats) {
      const homeEra = parseFloat(homeData.pitcherStats.era);
      const awayEra = parseFloat(awayData.pitcherStats.era);
      if (homeEra < awayEra - 0.5) {
        keyFactors.push(`${homeTeamName}'s starter has a significant ERA edge (${homeData.pitcherStats.era} vs ${awayData.pitcherStats.era})`);
      } else if (awayEra < homeEra - 0.5) {
        keyFactors.push(`${awayTeamName}'s starter has a significant ERA edge (${awayData.pitcherStats.era} vs ${homeData.pitcherStats.era})`);
      }
    }

    if (homeData.offensiveScore > awayData.offensiveScore + 0.05) {
      keyFactors.push(`${homeTeamName}'s lineup projects stronger against this pitching`);
    } else if (awayData.offensiveScore > homeData.offensiveScore + 0.05) {
      keyFactors.push(`${awayTeamName}'s lineup projects stronger against this pitching`);
    }

    if (keyFactors.length === 0) {
      keyFactors.push('Both teams are evenly matched in this matchup');
    }

    return {
      success: true,
      data: {
        homeTeam: homeData,
        awayTeam: awayData,
        predictedWinner,
        homeWinProbability,
        confidence,
        keyFactors,
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};
