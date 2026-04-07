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
  RecentBatterStats,
  RecentPitcherStats,
  BatterSplitEntry,
  LiveGame,
  LineupPlayer,
  TeamStaffStats,
  BullpenPitcherStatus,
  TeamBullpenStatus,
} from '../types';
import { METS_TEAM_ID } from '../constants';

const BASE_URL = 'https://statsapi.mlb.com/api/v1';
const API_TIMEOUT_MS = 10000;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT_MS,
});

/** Calendar YYYY-MM-DD in the user's local timezone (avoids UTC day-shift from `toISOString()`). */
export const formatLocalDateYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseLocalYMD = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
};

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
  myProbablePitcher?: { id: number; fullName: string; pitchHand?: string };
  status: 'Preview' | 'Live' | 'Final' | 'Postponed' | 'Delayed' | 'Cancelled';
  homeScore?: number;
  awayScore?: number;
}>> => {
  try {
    const today = formatLocalDateYMD(new Date());
    const response = await api.get(
      `/schedule?sportId=1&teamId=${teamId}&date=${today}&hydrate=probablePitcher,linescore`
    );

    const games = response.data?.dates?.[0]?.games;
    if (!games || games.length === 0) {
      return { success: false, error: 'No game scheduled today' };
    }

    const game = games[0];
    const isHome = game.teams.home.team.id === teamId;
    const opponent = isHome ? game.teams.away.team : game.teams.home.team;

    // Extract probable pitchers for both teams
    const opposingTeamData = isHome ? game.teams.away : game.teams.home;
    const myTeamData = isHome ? game.teams.home : game.teams.away;
    const probablePitcherData = opposingTeamData?.probablePitcher;
    const myProbablePitcherData = myTeamData?.probablePitcher;

    // Game status
    const abstractState: string = game.status?.abstractGameState ?? 'Preview';
    const detailedState: string = game.status?.detailedState ?? '';
    let status: 'Preview' | 'Live' | 'Final' | 'Postponed' | 'Delayed' | 'Cancelled';
    if (abstractState === 'Final' || detailedState === 'Final' || detailedState === 'Game Over' || detailedState === 'Completed Early') {
      status = 'Final';
    } else if (abstractState === 'Live' || detailedState === 'In Progress') {
      status = 'Live';
    } else if (detailedState === 'Postponed') {
      status = 'Postponed';
    } else if (detailedState.includes('Delay') || detailedState.includes('Suspended')) {
      status = 'Delayed';
    } else if (detailedState === 'Cancelled') {
      status = 'Cancelled';
    } else {
      status = 'Preview';
    }

    const homeScore = typeof game.teams.home.score === 'number' ? game.teams.home.score
      : game.linescore?.teams?.home?.runs ?? undefined;
    const awayScore = typeof game.teams.away.score === 'number' ? game.teams.away.score
      : game.linescore?.teams?.away?.runs ?? undefined;

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
        myProbablePitcher: myProbablePitcherData?.id
          ? { id: myProbablePitcherData.id, fullName: myProbablePitcherData.fullName, pitchHand: myProbablePitcherData.pitchHand?.code as string | undefined }
          : undefined,
        status,
        homeScore,
        awayScore,
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

// ─── Batter Splits ────────────────────────────────────────────────────────────

export const getBatterSplits = async (
  batterId: number,
  season?: number
): Promise<ApiResult<BatterSplitEntry[]>> => {
  try {
    const yr = season ?? new Date().getFullYear();
    const response = await api.get(
      `/people/${batterId}/stats?stats=statSplits&group=hitting&season=${yr}&sitCodes=vl,vr,h,a`
    );

    const splits: Array<{
      split?: { code?: string; description?: string };
      stat?: {
        atBats?: number; hits?: number; homeRuns?: number; rbi?: number;
        strikeOuts?: number; baseOnBalls?: number; avg?: string;
        obp?: string; slg?: string; ops?: string;
      };
    }> = response.data?.stats?.[0]?.splits ?? [];

    if (splits.length === 0) {
      return { success: false, error: 'No split data available' };
    }

    // Desired display order
    const ORDER = ['h', 'a', 'vl', 'vr'];
    const entries: BatterSplitEntry[] = splits
      .filter((s) => s.split?.code)
      .sort((a, b) => ORDER.indexOf(a.split!.code!) - ORDER.indexOf(b.split!.code!))
      .map((s) => ({
        code: s.split!.code!,
        description: s.split!.description ?? s.split!.code!,
        atBats: s.stat?.atBats ?? 0,
        hits: s.stat?.hits ?? 0,
        homeRuns: s.stat?.homeRuns ?? 0,
        rbi: s.stat?.rbi ?? 0,
        strikeouts: s.stat?.strikeOuts ?? 0,
        walks: s.stat?.baseOnBalls ?? 0,
        avg: s.stat?.avg ?? '.000',
        obp: s.stat?.obp ?? '.000',
        slg: s.stat?.slg ?? '.000',
        ops: s.stat?.ops ?? '.000',
      }));

    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// ─── Recent Form ─────────────────────────────────────────────────────────────

interface RawGameLogStat {
  hits?: number;
  atBats?: number;
  homeRuns?: number;
  rbi?: number;
  strikeOuts?: number;
  baseOnBalls?: number;
  doubles?: number;
  triples?: number;
  hitByPitch?: number;
  sacFlies?: number;
  // pitching
  earnedRuns?: number;
  inningsPitched?: string;
  baseOnBallsAllowed?: number;
  hitsAllowed?: number;
}

// Convert "5.1" IP notation (5 full innings + 1 out) to total outs
const ipToOuts = (ip: string): number => {
  const [full, partial] = ip.split('.').map(Number);
  return (full || 0) * 3 + (partial || 0);
};

const outsToIp = (outs: number): string => {
  const full = Math.floor(outs / 3);
  const partial = outs % 3;
  return partial === 0 ? `${full}.0` : `${full}.${partial}`;
};

const aggregateBatterGames = (games: RawGameLogStat[]): RecentBatterStats => {
  const ab = games.reduce((s, g) => s + (g.atBats ?? 0), 0);
  const h = games.reduce((s, g) => s + (g.hits ?? 0), 0);
  const bb = games.reduce((s, g) => s + (g.baseOnBalls ?? 0), 0);
  const hbp = games.reduce((s, g) => s + (g.hitByPitch ?? 0), 0);
  const sf = games.reduce((s, g) => s + (g.sacFlies ?? 0), 0);
  const d = games.reduce((s, g) => s + (g.doubles ?? 0), 0);
  const t = games.reduce((s, g) => s + (g.triples ?? 0), 0);
  const hr = games.reduce((s, g) => s + (g.homeRuns ?? 0), 0);
  const tb = h + d + t * 2 + hr * 3;

  const avg = ab > 0 ? (h / ab).toFixed(3).replace('0.', '.') : '.000';
  const obpDenom = ab + bb + hbp + sf;
  const obp = obpDenom > 0
    ? ((h + bb + hbp) / obpDenom).toFixed(3).replace('0.', '.')
    : '.000';
  const slg = ab > 0 ? (tb / ab).toFixed(3).replace('0.', '.') : '.000';
  const opsVal = (parseFloat(obp) + parseFloat(slg)).toFixed(3).replace('0.', '.');

  return {
    games: games.length,
    atBats: ab,
    hits: h,
    homeRuns: hr,
    rbi: games.reduce((s, g) => s + (g.rbi ?? 0), 0),
    strikeouts: games.reduce((s, g) => s + (g.strikeOuts ?? 0), 0),
    walks: bb,
    avg,
    obp,
    slg,
    ops: opsVal,
  };
};

const aggregatePitcherGames = (games: RawGameLogStat[]): RecentPitcherStats => {
  const totalOuts = games.reduce((s, g) => s + ipToOuts(g.inningsPitched ?? '0.0'), 0);
  const ip = outsToIp(totalOuts);
  const er = games.reduce((s, g) => s + (g.earnedRuns ?? 0), 0);
  const bb = games.reduce((s, g) => s + (g.baseOnBalls ?? 0), 0);
  const h = games.reduce((s, g) => s + (g.hits ?? 0), 0);
  const k = games.reduce((s, g) => s + (g.strikeOuts ?? 0), 0);

  const ipFull = totalOuts / 3;
  const era = ipFull > 0 ? ((er / ipFull) * 9).toFixed(2) : '0.00';
  const whip = ipFull > 0 ? ((bb + h) / ipFull).toFixed(2) : '0.00';

  return {
    games: games.length,
    inningsPitched: ip,
    earnedRuns: er,
    strikeouts: k,
    walks: bb,
    hits: h,
    era,
    whip,
  };
};

export const getBatterRecentForm = async (
  batterId: number,
  season?: number
): Promise<ApiResult<{ l7: RecentBatterStats; l15: RecentBatterStats; l30: RecentBatterStats }>> => {
  try {
    const yr = season ?? new Date().getFullYear();
    const response = await api.get(
      `/people/${batterId}/stats?stats=gameLog&group=hitting&season=${yr}&gameType=R`
    );

    const splits: Array<{ stat: RawGameLogStat }> = response.data?.stats?.[0]?.splits ?? [];
    if (splits.length === 0) {
      return { success: false, error: 'No game log data available' };
    }

    // Most recent games are at the end of the array
    const recent = [...splits].reverse();

    return {
      success: true,
      data: {
        l7: aggregateBatterGames(recent.slice(0, 7).map((s) => s.stat)),
        l15: aggregateBatterGames(recent.slice(0, 15).map((s) => s.stat)),
        l30: aggregateBatterGames(recent.slice(0, 30).map((s) => s.stat)),
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

export const getPitcherRecentForm = async (
  pitcherId: number,
  season?: number
): Promise<ApiResult<{ l3: RecentPitcherStats; l5: RecentPitcherStats; l10: RecentPitcherStats }>> => {
  try {
    const yr = season ?? new Date().getFullYear();
    const response = await api.get(
      `/people/${pitcherId}/stats?stats=gameLog&group=pitching&season=${yr}&gameType=R`
    );

    const splits: Array<{ stat: RawGameLogStat }> = response.data?.stats?.[0]?.splits ?? [];
    if (splits.length === 0) {
      return { success: false, error: 'No pitcher game log data available' };
    }

    const recent = [...splits].reverse();

    return {
      success: true,
      data: {
        l3: aggregatePitcherGames(recent.slice(0, 3).map((s) => s.stat)),
        l5: aggregatePitcherGames(recent.slice(0, 5).map((s) => s.stat)),
        l10: aggregatePitcherGames(recent.slice(0, 10).map((s) => s.stat)),
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
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
    const yearsToTry = season ? [season] : [yr, yr - 1];
    let splits: RawArsenalSplit[] = [];
    for (const y of yearsToTry) {
      const response = await api.get(
        `/people/${pitcherId}/stats?stats=pitchArsenal&group=pitching&season=${y}`
      );
      splits = response.data?.stats?.[0]?.splits ?? [];
      if (splits.length > 0) break;
    }
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
          avgVelocity: s.stat?.avgSpeed ?? s.stat?.averageSpeed ?? 0,
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

/** MLB's hitting `pitchArsenal` no longer includes AVG/AB; derive from `pitchLog` (Statcast pitch rows). */
const PITCH_LOG_TIMEOUT_MS = 28000;

const NON_SWING_EVENTS = new Set([
  'ball',
  'called_strike',
  'blocked_ball',
  'hit_by_pitch',
  'intent_ball',
  'pitchout',
  'automatic_ball',
  'automatic_strike',
]);

interface PitchLogSplitRow {
  game?: { gamePk?: number };
  stat?: {
    play?: {
      pitchNumber?: number;
      atBatNumber?: number;
      details?: {
        type?: { code?: string; description?: string };
        isAtBat?: boolean;
        isBaseHit?: boolean;
        event?: string;
      };
    };
  };
}

const aggregatePitchLogToPitchTypeStats = (splits: PitchLogSplitRow[]): PitchTypeStats[] => {
  const labelByCode = new Map<string, string>();
  for (const row of splits) {
    const t = row.stat?.play?.details?.type;
    if (t?.code && t.description && !labelByCode.has(t.code)) {
      labelByCode.set(t.code, t.description);
    }
  }

  const lastPitchByAb = new Map<string, { pn: number; row: PitchLogSplitRow }>();

  for (const row of splits) {
    const play = row.stat?.play;
    if (!play) continue;
    const gamePk = row.game?.gamePk;
    const abn = play.atBatNumber;
    if (gamePk == null || abn == null) continue;
    const pn = play.pitchNumber ?? 0;
    const key = `${gamePk}-${abn}`;
    const prev = lastPitchByAb.get(key);
    if (!prev || pn > prev.pn) {
      lastPitchByAb.set(key, { pn, row });
    }
  }

  const abHits = new Map<string, { ab: number; hits: number }>();
  for (const { row } of lastPitchByAb.values()) {
    const det = row.stat?.play?.details;
    if (!det?.isAtBat) continue;
    const code = det.type?.code;
    if (!code) continue;
    const cur = abHits.get(code) ?? { ab: 0, hits: 0 };
    cur.ab += 1;
    if (det.isBaseHit) cur.hits += 1;
    abHits.set(code, cur);
  }

  const swingWhiff = new Map<string, { swings: number; whiffs: number }>();
  for (const row of splits) {
    const det = row.stat?.play?.details;
    if (!det?.type?.code) continue;
    const code = det.type.code;
    const ev = det.event ?? '';
    if (NON_SWING_EVENTS.has(ev)) continue;
    const sw = swingWhiff.get(code) ?? { swings: 0, whiffs: 0 };
    sw.swings += 1;
    if (ev === 'swinging_strike') sw.whiffs += 1;
    swingWhiff.set(code, sw);
  }

  const codes = new Set<string>([...abHits.keys(), ...swingWhiff.keys()]);
  const out: PitchTypeStats[] = [];

  for (const code of codes) {
    const ah = abHits.get(code) ?? { ab: 0, hits: 0 };
    const sw = swingWhiff.get(code) ?? { swings: 0, whiffs: 0 };
    const avg =
      ah.ab > 0
        ? (ah.hits / ah.ab).toFixed(3).replace(/^0/, '.')
        : '.000';
    const whiffRate =
      sw.swings > 0 ? ((sw.whiffs / sw.swings) * 100).toFixed(0) + '%' : '0%';

    out.push({
      pitchCode: code,
      pitchType: PITCH_NAMES[code] ?? labelByCode.get(code) ?? code,
      atBats: ah.ab,
      hits: ah.hits,
      avg,
      whiffs: sw.whiffs,
      swings: sw.swings,
      whiffRate,
    });
  }

  return out.sort((a, b) => b.atBats - a.atBats);
};

export const getBatterVsPitchType = async (
  batterId: number,
  season?: number
): Promise<ApiResult<PitchTypeStats[]>> => {
  try {
    const yr = season ?? new Date().getFullYear();
    const endDate = formatLocalDateYMD(new Date());
    const startDate = `${yr}-02-20`;

    const response = await api.get(
      `/people/${batterId}/stats?stats=pitchLog&group=hitting&season=${yr}&gameType=R&startDate=${startDate}&endDate=${endDate}`,
      { timeout: PITCH_LOG_TIMEOUT_MS }
    );

    const splits: PitchLogSplitRow[] = response.data?.stats?.[0]?.splits ?? [];
    if (splits.length === 0) {
      return { success: false, error: 'No batter pitch data available' };
    }

    const stats = aggregatePitchLogToPitchTypeStats(splits);
    if (stats.length === 0) {
      return { success: false, error: 'No batter pitch data available' };
    }

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

// ─── Spray Chart ─────────────────────────────────────────────────────────────

export interface SprayChartData {
  leftField: number;
  leftCenterField: number;
  centerField: number;
  rightCenterField: number;
  rightField: number;
  total: number;
}

export const getBatterSprayChart = async (
  batterId: number,
  season?: number
): Promise<ApiResult<SprayChartData>> => {
  try {
    const yr = season ?? new Date().getFullYear();
    const response = await api.get(
      `/people/${batterId}/stats?stats=sprayChart&group=hitting&season=${yr}&gameType=R`
    );
    const stat = response.data?.stats?.[0]?.splits?.[0]?.stat;
    if (!stat) {
      return { success: false, error: 'No spray chart data available' };
    }

    const lf = stat.leftField ?? 0;
    const lcf = stat.leftCenterField ?? 0;
    const cf = stat.centerField ?? 0;
    const rcf = stat.rightCenterField ?? 0;
    const rf = stat.rightField ?? 0;
    const total = lf + lcf + cf + rcf + rf;
    if (total === 0) {
      return { success: false, error: 'No spray chart data available' };
    }

    return {
      success: true,
      data: { leftField: lf, leftCenterField: lcf, centerField: cf, rightCenterField: rcf, rightField: rf, total },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// ─── Hot Zone (Strike Zone Chart) ───────────────────────────────────────────

export const getBatterHotZones = async (
  batterId: number,
  season?: number
): Promise<ApiResult<HotZone[]>> => {
  try {
    const yr = season ?? new Date().getFullYear();
    const yearsToTry = season ? [season] : [yr, yr - 1];
    let result: Array<{ zone: string; value: string; color?: string; temp?: string }> = [];

    for (const y of yearsToTry) {
      const response = await api.get(
        `/people/${batterId}/stats?stats=hotColdZones&group=hitting&season=${y}`
      );

      const splits: Array<{ stat?: { name?: string; zones?: Array<{ zone: string; value: string; color?: string; temp?: string }> } }> =
        response.data?.stats?.[0]?.splits ?? [];
      if (splits.length === 0) continue;

      // The API returns multiple splits — one per metric. Find battingAverage.
      const avgSplit = splits.find((s) => s.stat?.name === 'battingAverage') ?? splits[0];
      const zones = avgSplit?.stat?.zones ?? [];

      if (zones.length > 0) {
        result = zones;
        break;
      }
    }

    if (result.length === 0) {
      return { success: false, error: 'No hot zone data available' };
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

// ─── Umpire Stats ─────────────────────────────────────────────────────────────

export interface UmpireStats {
  name: string;
  games: number;
  accuracyPct: number;       // overall_accuracy_wmean
  consistencyPct: number;    // consistency_wmean
  runImpact: number;         // total_run_impact_mean — avg runs affected per game
  zoneTendency: 'pitcher-friendly' | 'neutral' | 'hitter-friendly';
  tendencyDetail: string;
}

export const getUmpireStats = async (gameId: number): Promise<ApiResult<UmpireStats>> => {
  try {
    // Step 1: Get the home plate umpire from the MLB schedule API
    const scheduleRes = await api.get(
      `/schedule?gamePks=${gameId}&hydrate=officials`
    );
    const game = scheduleRes.data?.dates?.[0]?.games?.[0];
    const officials: Array<{ official: { fullName: string }; officialType: string }> =
      game?.officials ?? [];
    const hpUmpire = officials.find((o) => o.officialType === 'Home Plate');
    if (!hpUmpire) {
      return { success: false, error: 'Home plate umpire not yet assigned' };
    }
    const umpireName = hpUmpire.official.fullName;

    // Step 2: Fetch career stats from umpscorecards
    const umpRes = await axios.create({ timeout: 8000 }).get(
      'https://umpscorecards.com/api/umpires/',
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
    );
    const rows: Array<{
      umpire: string;
      n: number;
      overall_accuracy_wmean: number;
      consistency_wmean: number;
      total_run_impact_mean: number;
    }> = umpRes.data?.rows ?? [];

    if (rows.length === 0) {
      return { success: false, error: 'Umpire stats unavailable' };
    }

    // Match by last name + first initial
    const [firstName, ...rest] = umpireName.split(' ');
    const lastName = rest.join(' ').toLowerCase();
    const firstInitial = firstName[0]?.toLowerCase();

    const match = rows.find((r) => {
      const parts = r.umpire.toLowerCase().split(' ');
      const rLast = parts.slice(1).join(' ');
      const rFirst = parts[0]?.[0];
      return rLast === lastName && rFirst === firstInitial;
    }) ?? rows.find((r) => r.umpire.toLowerCase().includes(lastName));

    if (!match) {
      return { success: false, error: `No stats found for ${umpireName}` };
    }

    const accuracyPct = match.overall_accuracy_wmean;
    const consistencyPct = match.consistency_wmean;
    const runImpact = match.total_run_impact_mean;

    // Zone tendency: accuracy above ~94.5% = tighter zone (more correct strikes called = pitchers helped)
    // Accuracy below ~93% = looser zone (more balls called on true strikes = hitters helped)
    let zoneTendency: UmpireStats['zoneTendency'];
    let tendencyDetail: string;
    if (accuracyPct >= 94.5) {
      zoneTendency = 'pitcher-friendly';
      tendencyDetail = `${accuracyPct.toFixed(1)}% accuracy — tight, consistent zone`;
    } else if (accuracyPct < 93.0) {
      zoneTendency = 'hitter-friendly';
      tendencyDetail = `${accuracyPct.toFixed(1)}% accuracy — wider zone, more walks possible`;
    } else {
      zoneTendency = 'neutral';
      tendencyDetail = `${accuracyPct.toFixed(1)}% accuracy — average zone`;
    }

    return {
      success: true,
      data: {
        name: match.umpire,
        games: match.n,
        accuracyPct,
        consistencyPct,
        runImpact,
        zoneTendency,
        tendencyDetail,
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// ─── Weather ─────────────────────────────────────────────────────────────────

export interface GameWeather {
  tempF: number;
  windSpeedMph: number;
  windDirectionDeg: number;
  windDirectionLabel: string;
  precipProbability: number;  // 0–100
  isDome: boolean;
  parkName: string;
  impact: 'pitcher-friendly' | 'neutral' | 'hitter-friendly' | 'rain-risk';
  impactDetail: string;
}

const degToCompass = (deg: number): string => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
};

export const getGameWeather = async (
  homeTeamId: number,
  gameTimeUtc?: string   // ISO UTC string; if absent defaults to today at 7pm
): Promise<ApiResult<GameWeather>> => {
  try {
    const { BALLPARK_INFO } = await import('../constants');
    const park = BALLPARK_INFO[homeTeamId];

    if (!park) {
      return { success: false, error: 'No ballpark data for this team' };
    }

    if (park.dome) {
      return {
        success: true,
        data: {
          tempF: 72,
          windSpeedMph: 0,
          windDirectionDeg: 0,
          windDirectionLabel: 'N/A',
          precipProbability: 0,
          isDome: true,
          parkName: park.name,
          impact: 'neutral',
          impactDetail: 'Indoor stadium — weather has no effect',
        },
      };
    }

    // Determine what hour index to use (0–23)
    let targetHour = 19; // default 7 pm local
    if (gameTimeUtc) {
      const gameDate = new Date(gameTimeUtc);
      // Rough local hour based on timezone offset heuristic
      const offsetMap: Record<string, number> = {
        'America/New_York': -4,
        'America/Chicago': -5,
        'America/Denver': -6,
        'America/Los_Angeles': -7,
        'America/Phoenix': -7,
      };
      const offset = offsetMap[park.timezone] ?? -4;
      targetHour = Math.max(0, Math.min(23, gameDate.getUTCHours() + offset));
    }

    const response = await axios.create({ timeout: 8000 }).get(
      `https://api.open-meteo.com/v1/forecast?latitude=${park.lat}&longitude=${park.lng}` +
      `&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation_probability` +
      `&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=1&timezone=${encodeURIComponent(park.timezone)}`
    );

    const hourly = response.data?.hourly;
    if (!hourly) {
      return { success: false, error: 'Weather data unavailable' };
    }

    const tempF = Math.round(hourly.temperature_2m?.[targetHour] ?? 72);
    const windSpeedMph = Math.round(hourly.windspeed_10m?.[targetHour] ?? 0);
    const windDirectionDeg = hourly.winddirection_10m?.[targetHour] ?? 0;
    const precipProbability = hourly.precipitation_probability?.[targetHour] ?? 0;
    const windDirectionLabel = degToCompass(windDirectionDeg);

    // Determine weather impact
    let impact: GameWeather['impact'] = 'neutral';
    let impactDetail = 'Neutral conditions';

    if (precipProbability >= 40) {
      impact = 'rain-risk';
      impactDetail = `${precipProbability}% chance of rain — possible delay`;
    } else if (tempF <= 48 && windSpeedMph >= 10) {
      impact = 'pitcher-friendly';
      impactDetail = `Cold (${tempF}°F) + wind ${windSpeedMph} mph ${windDirectionLabel} — ball dies in cold air`;
    } else if (tempF <= 50) {
      impact = 'pitcher-friendly';
      impactDetail = `Cold weather (${tempF}°F) suppresses offense`;
    } else if (tempF >= 85 && windSpeedMph >= 10) {
      impact = 'hitter-friendly';
      impactDetail = `Hot (${tempF}°F) + ${windSpeedMph} mph wind — ideal for long balls`;
    } else if (windSpeedMph >= 15) {
      impact = 'neutral';
      impactDetail = `Gusty ${windSpeedMph} mph from ${windDirectionLabel} — impacts fly balls`;
    } else if (tempF >= 82) {
      impact = 'hitter-friendly';
      impactDetail = `Warm weather (${tempF}°F) — ball carries well`;
    }

    return {
      success: true,
      data: { tempF, windSpeedMph, windDirectionDeg, windDirectionLabel, precipProbability, isDome: false, parkName: park.name, impact, impactDetail },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// ─── Bullpen Fatigue ─────────────────────────────────────────────────────────

export const getTeamBullpenFatigue = async (
  teamId: number,
  teamName: string,
  starterPitcherId?: number,
  asOfDate?: string
): Promise<ApiResult<TeamBullpenStatus>> => {
  try {
    const today = asOfDate ?? formatLocalDateYMD(new Date());
    const lookbackDate = dateNDaysAgo(7, today);

    // Get the team's active pitching staff
    const pitcherResult = await getTeamPitchers(teamId);
    if (pitcherResult.length === 0) {
      return { success: false, error: 'Could not fetch pitching staff' };
    }

    // Exclude the known starter so we only show relievers
    const relievers = starterPitcherId
      ? pitcherResult.filter((p) => p.id !== starterPitcherId)
      : pitcherResult;

    // Fetch last 7 days of game logs for all relievers in parallel
    const gameLogResults = await Promise.all(
      relievers.map((p) =>
        api
          .get(
            `/people/${p.id}/stats?stats=gameLog&group=pitching&startDate=${lookbackDate}&endDate=${today}&gameType=R`
          )
          .then((r) => ({ pitcher: p, splits: r.data?.stats?.[0]?.splits ?? [] }))
          .catch(() => ({ pitcher: p, splits: [] }))
      )
    );

    const pitcherStatuses: BullpenPitcherStatus[] = gameLogResults.map(({ pitcher, splits }) => {
      if (splits.length === 0) {
        return {
          playerId: pitcher.id,
          fullName: pitcher.fullName,
          daysRest: 99,
          consecutiveDays: 0,
          status: 'available' as const,
        };
      }

      // Splits are in ascending date order — last entry is most recent
      const sortedSplits = [...splits].sort(
        (a: { date: string }, b: { date: string }) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const lastSplit = sortedSplits[sortedSplits.length - 1];
      const lastDate = new Date(lastSplit.date);
      const todayDate = new Date(today);
      const diffMs = todayDate.getTime() - lastDate.getTime();
      const daysRest = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Count consecutive days (working backwards from most recent)
      let consecutiveDays = 1;
      for (let i = sortedSplits.length - 2; i >= 0; i--) {
        const prevDate = new Date(sortedSplits[i].date);
        const currDate = new Date(sortedSplits[i + 1].date);
        const daysDiff = Math.round(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff === 1) {
          consecutiveDays++;
        } else {
          break;
        }
      }

      const pitches = lastSplit.stat?.numberOfPitches ?? 0;
      let status: 'available' | 'limited' | 'unavailable';
      if (daysRest <= 1) {
        status = 'unavailable';
      } else if (daysRest === 2 || (daysRest <= 3 && pitches >= 25)) {
        status = 'limited';
      } else {
        status = 'available';
      }

      return {
        playerId: pitcher.id,
        fullName: pitcher.fullName,
        daysRest,
        lastAppearance: {
          date: lastSplit.date,
          inningsPitched: lastSplit.stat?.inningsPitched ?? '0.0',
          numberOfPitches: pitches,
          earnedRuns: lastSplit.stat?.earnedRuns ?? 0,
        },
        consecutiveDays,
        status,
      };
    });

    // Sort: unavailable first, then limited, then available; within each group by daysRest asc
    const order = { unavailable: 0, limited: 1, available: 2 };
    pitcherStatuses.sort((a, b) => {
      const statusDiff = order[a.status] - order[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.daysRest - b.daysRest;
    });

    // Only include pitchers who have appeared in the last 7 days OR are known relievers
    const usedPitchers = pitcherStatuses.filter((p) => p.daysRest < 99);
    const unusedPitchers = pitcherStatuses.filter((p) => p.daysRest === 99);

    return {
      success: true,
      data: {
        teamId,
        teamName,
        // Show used first (sorted by status/rest), then unused (fully fresh)
        pitchers: [...usedPitchers, ...unusedPitchers],
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// ─── Live Scores ─────────────────────────────────────────────────────────────

export const getLiveScores = async (): Promise<ApiResult<LiveGame[]>> => {
  try {
    const today = formatLocalDateYMD(new Date());
    const response = await api.get(
      `/schedule?sportId=1&date=${today}&hydrate=linescore,team,probablePitcher`
    );

    const dates = response.data?.dates;
    if (!dates || dates.length === 0) {
      return { success: true, data: [] };
    }

    interface ScheduleGame {
      gamePk: number;
      gameDate: string;
      status: { abstractGameState: string; detailedState: string; statusCode: string };
      teams: {
        home: {
          team: { id: number; name: string };
          score?: number;
          probablePitcher?: { id: number; fullName: string };
        };
        away: {
          team: { id: number; name: string };
          score?: number;
          probablePitcher?: { id: number; fullName: string };
        };
      };
      linescore?: {
        currentInning?: number;
        currentInningOrdinal?: string;
        isTopInning?: boolean;
        outs?: number;
        teams?: {
          home?: { runs?: number; hits?: number; errors?: number };
          away?: { runs?: number; hits?: number; errors?: number };
        };
      };
    }

    const games: LiveGame[] = (dates[0].games as ScheduleGame[]).map((g) => {
      const ls = g.linescore;
      return {
        gamePk: g.gamePk,
        gameDate: g.gameDate,
        status: g.status,
        homeTeam: { id: g.teams.home.team.id, name: g.teams.home.team.name },
        awayTeam: { id: g.teams.away.team.id, name: g.teams.away.team.name },
        homeScore: ls?.teams?.home?.runs ?? g.teams.home.score ?? 0,
        awayScore: ls?.teams?.away?.runs ?? g.teams.away.score ?? 0,
        homeHits: ls?.teams?.home?.hits ?? 0,
        awayHits: ls?.teams?.away?.hits ?? 0,
        homeErrors: ls?.teams?.home?.errors ?? 0,
        awayErrors: ls?.teams?.away?.errors ?? 0,
        currentInning: ls?.currentInning ?? null,
        currentInningOrdinal: ls?.currentInningOrdinal ?? null,
        inningHalf: ls?.isTopInning === true ? 'top' : ls?.isTopInning === false ? 'bottom' : null,
        outs: ls?.outs ?? null,
        homeProbablePitcher: g.teams.home.probablePitcher?.id
          ? { id: g.teams.home.probablePitcher.id, fullName: g.teams.home.probablePitcher.fullName }
          : undefined,
        awayProbablePitcher: g.teams.away.probablePitcher?.id
          ? { id: g.teams.away.probablePitcher.id, fullName: g.teams.away.probablePitcher.fullName }
          : undefined,
      };
    });

    return { success: true, data: games };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

// ─── Game Prediction ────────────────────────────────────────────────────────

const calculatePitcherStats = (stats: Record<string, unknown>): PitcherSeasonStats => {
  const hr  = typeof stats.homeRuns   === 'number' ? stats.homeRuns   : 0;
  const hbp = typeof stats.hitBatsmen === 'number' ? stats.hitBatsmen
            : typeof stats.hitByPitch === 'number' ? stats.hitByPitch : 0;
  const k   = (stats.strikeOuts as number) ?? 0;
  const bb  = (stats.baseOnBalls as number) ?? 0;
  const ip  = parseIPtoDecimal((stats.inningsPitched as string) ?? '0.0');

  // FIP = (13×HR + 3×(BB+HBP) - 2×K) / IP + 3.17  (FIP constant ~3.17 for current era)
  const fipNum = ip >= 10 ? (13 * hr + 3 * (bb + hbp) - 2 * k) / ip + 3.17 : null;

  return {
    era:           stats.era ? parseFloat(stats.era as string).toFixed(2) : '0.00',
    whip:          stats.whip ? parseFloat(stats.whip as string).toFixed(2) : '0.00',
    strikeouts:    k,
    walks:         bb,
    inningsPitched:(stats.inningsPitched as string) ?? '0.0',
    gamesStarted:  (stats.gamesStarted as number) ?? 0,
    gamesPlayed:   typeof stats.gamesPlayed === 'number' ? stats.gamesPlayed : undefined,
    wins:          typeof stats.wins   === 'number' ? stats.wins   : undefined,
    losses:        typeof stats.losses === 'number' ? stats.losses : undefined,
    saves:         typeof stats.saves  === 'number' ? stats.saves  : undefined,
    homeRuns:      hr > 0 ? hr : undefined,
    hitByPitch:    hbp > 0 ? hbp : undefined,
    fip:           fipNum !== null && fipNum > 0 ? fipNum.toFixed(2) : undefined,
  };
};

const emptyHittingSeason: MatchupStats = {
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

export const getBatterSeasonStats = async (
  batterId: number
): Promise<ApiResult<{ player: Player; stats: MatchupStats }>> => {
  try {
    const [playerRes, statsRes] = await Promise.all([
      api.get<MLBPlayerResponse>(`/people/${batterId}`),
      api.get<MLBStatsResponse>(`/people/${batterId}/stats?stats=season&group=hitting`),
    ]);

    const personData = playerRes.data?.people?.[0];
    if (!personData) {
      return { success: false, error: 'Player not found' };
    }

    const raw = statsRes.data?.stats?.[0]?.splits?.[0]?.stat;

    return {
      success: true,
      data: {
        player: {
          id: personData.id,
          fullName: personData.fullName,
          firstName: personData.firstName,
          lastName: personData.lastName,
          primaryNumber: personData.primaryNumber,
          position: personData.primaryPosition,
          batSide: personData.batSide,
          pitchHand: personData.pitchHand,
        },
        stats: raw ? calculateStats(raw as RawMatchupStats) : emptyHittingSeason,
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};

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

const LEAGUE_AVG_OPS  = 0.720;
const LEAGUE_AVG_ERA  = 4.50;
const LEAGUE_AVG_WHIP = 1.25;
const LEAGUE_AVG_K9   = 8.5;

// Multi-year park run factors (>1 = hitter-friendly, <1 = pitcher-friendly)
const PARK_FACTORS: Record<number, number> = {
  115: 1.12, // COL - Coors Field
  113: 1.06, // CIN - Great American Ball Park
  108: 1.05, // LAA - Angel Stadium
  116: 1.04, // DET - Comerica Park
  144: 1.04, // ATL - Truist Park
  111: 1.03, // BOS - Fenway Park
  142: 1.03, // MIN - Target Field
  147: 1.02, // NYY - Yankee Stadium
  112: 1.02, // CHC - Wrigley Field
  143: 1.01, // PHI - Citizens Bank Park
  121: 1.01, // NYM - Citi Field
  118: 1.01, // KC - Kauffman Stadium
  110: 1.00, // BAL - Camden Yards
  117: 1.00, // HOU - Minute Maid Park
  138: 0.99, // STL - Busch Stadium
  134: 0.99, // PIT - PNC Park
  114: 0.99, // CLE - Progressive Field
  158: 0.99, // MIL - American Family Field
  120: 0.98, // WSH - Nationals Park
  141: 0.98, // TOR - Rogers Centre
  133: 0.98, // OAK
  146: 0.97, // MIA - LoanDepot Park
  136: 0.97, // SEA - T-Mobile Park
  145: 0.97, // CWS - Guaranteed Rate Field
  109: 0.97, // ARI - Chase Field
  140: 0.97, // TEX - Globe Life Field
  137: 0.96, // SF - Oracle Park
  139: 0.96, // TB - Tropicana Field
  119: 0.96, // LAD - Dodger Stadium
  135: 0.95, // SD - Petco Park
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// Parse "123.2" IP notation → 123.667 decimal innings
const parseIPtoDecimal = (ip: string): number => {
  const parts = (ip ?? '0').toString().split('.');
  const full   = parseInt(parts[0] ?? '0', 10) || 0;
  const thirds = parseInt(parts[1] ?? '0', 10) || 0;
  return full + thirds / 3;
};

// YYYY-MM-DD string N calendar days ago in local time (optionally from a specific YYYY-MM-DD)
const dateNDaysAgo = (n: number, fromDate?: string): string => {
  const base = fromDate ? parseLocalYMD(fromDate) : new Date();
  base.setDate(base.getDate() - n);
  return formatLocalDateYMD(base);
};

// Combined pitcher quality factor using FIP when available, otherwise ERA
// FIP removes defense luck: (13×HR + 3×(BB+HBP) - 2×K) / IP + 3.17
// Weights: FIP(35%) + ERA(20%) + WHIP(25%) + K9(20%), or ERA(50%)+WHIP(30%)+K9(20%) without FIP
// Blended with recent ERA from last few starts (40% weight)
const computePitcherFactor = (stats: PitcherSeasonStats, recentEra?: string): number => {
  const era  = parseFloat(stats.era)  || LEAGUE_AVG_ERA;
  const whip = parseFloat(stats.whip) || LEAGUE_AVG_WHIP;
  const ip   = parseIPtoDecimal(stats.inningsPitched);
  const k9   = ip > 0 ? (stats.strikeouts / ip) * 9 : LEAGUE_AVG_K9;

  const eraF  = clamp(LEAGUE_AVG_ERA  / era,  0.6, 1.8);
  const whipF = clamp(LEAGUE_AVG_WHIP / whip, 0.6, 1.8);
  const k9F   = clamp(k9 / LEAGUE_AVG_K9,     0.7, 1.35);

  let seasonFactor: number;
  if (stats.fip) {
    const fip  = parseFloat(stats.fip) || LEAGUE_AVG_ERA;
    const fipF = clamp(LEAGUE_AVG_ERA / fip, 0.6, 1.8);
    // FIP(35%) + ERA(20%) + WHIP(25%) + K9(20%)
    seasonFactor = 0.35 * fipF + 0.20 * eraF + 0.25 * whipF + 0.20 * k9F;
  } else {
    // Fallback: ERA(50%) + WHIP(30%) + K9(20%)
    seasonFactor = 0.50 * eraF + 0.30 * whipF + 0.20 * k9F;
  }

  if (recentEra) {
    const recentEraNum = parseFloat(recentEra) || LEAGUE_AVG_ERA;
    const recentEraF   = clamp(LEAGUE_AVG_ERA / recentEraNum, 0.6, 1.8);
    // 60% full-season composite, 40% recent ERA
    return 0.60 * seasonFactor + 0.40 * recentEraF;
  }

  return seasonFactor;
};

// Sigmoid-based live win expectancy from home team's perspective
const liveWinExpectancy = (
  homeScore: number,
  awayScore: number,
  inning: number,
  isTopHalf: boolean,
): number => {
  const scoreDiff    = homeScore - awayScore;
  const inningsLeft  = isTopHalf
    ? (9 - inning) + 0.5   // still have rest of current + remaining
    : Math.max(9 - inning, 0.1);
  const k = 1.8 / Math.max(inningsLeft, 0.2);
  return clamp(1 / (1 + Math.exp(-k * scoreDiff)), 0.01, 0.99);
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
  batter: { id: number; fullName: string },
  opposingPitcherId: number | undefined,
  opposingPitchHand: string | undefined
): Promise<BatterPredictionItem> => {
  try {
    const today       = formatLocalDateYMD(new Date());
    const start15     = dateNDaysAgo(15);

    const [seasonRes, playerRes, recentRes] = await Promise.all([
      api.get<MLBStatsResponse>(`/people/${batter.id}/stats?stats=season&group=hitting`),
      api.get<MLBPlayerResponse>(`/people/${batter.id}`),
      api.get<MLBStatsResponse>(
        `/people/${batter.id}/stats?stats=season&group=hitting&startDate=${start15}&endDate=${today}&gameType=R`
      ),
    ]) as [{ data: MLBStatsResponse }, { data: MLBPlayerResponse }, { data: MLBStatsResponse }];

    const personData = playerRes.data?.people?.[0];
    const batSide    = personData?.batSide;

    // Season OPS
    const seasonStat = seasonRes.data?.stats?.[0]?.splits?.[0]?.stat;
    let seasonOPS = LEAGUE_AVG_OPS;
    if (seasonStat) {
      const calc = calculateStats(seasonStat as Parameters<typeof calculateStats>[0]);
      const ops  = parseFloat(calc.ops);
      if (ops > 0) seasonOPS = ops;
    }

    // Recent 15-day OPS
    const recentSplit = recentRes.data?.stats?.[0]?.splits?.[0];
    let recentOPS   = 0;
    let recentGames = 0;
    if (recentSplit?.stat) {
      const calc = calculateStats(recentSplit.stat as Parameters<typeof calculateStats>[0]);
      const ops  = parseFloat(calc.ops);
      recentGames = recentSplit.stat.gamesPlayed ?? 0;
      if (ops > 0 && recentGames >= 3) recentOPS = ops;
    }

    // H2H — career totals vs this pitcher (sum all season splits from vsPlayerTotal)
    let h2hOPS    = 0;
    let h2hAtBats = 0;
    const h2hSeason: number | undefined = undefined;
    if (opposingPitcherId) {
      const res = await api.get<MLBStatsResponse>(
        `/people/${batter.id}/stats?stats=vsPlayerTotal&opposingPlayerId=${opposingPitcherId}&group=hitting`
      ).catch(() => null);
      const splits = (res as { data: MLBStatsResponse } | null)?.data?.stats?.[0]?.splits ?? [];

      // Sum counting stats across all seasonal splits to get career total
      const combined = splits.reduce((acc, split) => {
        const s = split.stat;
        if (!s) return acc;
        return {
          atBats:      (acc.atBats      ?? 0) + (s.atBats      ?? 0),
          hits:        (acc.hits        ?? 0) + (s.hits        ?? 0),
          doubles:     (acc.doubles     ?? 0) + (s.doubles     ?? 0),
          triples:     (acc.triples     ?? 0) + (s.triples     ?? 0),
          homeRuns:    (acc.homeRuns    ?? 0) + (s.homeRuns    ?? 0),
          rbi:         (acc.rbi         ?? 0) + (s.rbi         ?? 0),
          baseOnBalls: (acc.baseOnBalls ?? 0) + (s.baseOnBalls ?? 0),
          hitByPitch:  (acc.hitByPitch  ?? 0) + (s.hitByPitch  ?? 0),
          sacFlies:    (acc.sacFlies    ?? 0) + (s.sacFlies    ?? 0),
          strikeOuts:  (acc.strikeOuts  ?? 0) + (s.strikeOuts  ?? 0),
          gamesPlayed: (acc.gamesPlayed ?? 0) + (s.gamesPlayed ?? 0),
        };
      }, {} as Parameters<typeof calculateStats>[0]);

      if ((combined.atBats ?? 0) > 0) {
        const calc = calculateStats(combined);
        h2hAtBats = combined.atBats ?? 0;
        h2hOPS    = parseFloat(calc.ops) || 0;
      }
    }

    // Blend: season + recent form + H2H (weight depends on availability)
    let effectiveOPS = seasonOPS;
    const hasRecent  = recentOPS > 0 && recentGames >= 3;

    if (h2hAtBats >= 5 && hasRecent) {
      effectiveOPS = seasonOPS * 0.35 + recentOPS * 0.25 + h2hOPS * 0.40;
    } else if (h2hAtBats >= 5) {
      effectiveOPS = seasonOPS * 0.50 + h2hOPS * 0.50;
    } else if (h2hAtBats >= 2 && hasRecent) {
      effectiveOPS = seasonOPS * 0.45 + recentOPS * 0.30 + h2hOPS * 0.25;
    } else if (h2hAtBats >= 2) {
      effectiveOPS = seasonOPS * 0.75 + h2hOPS * 0.25;
    } else if (hasRecent) {
      effectiveOPS = seasonOPS * 0.55 + recentOPS * 0.45;
    }

    const tag = platoonTag(batSide?.code, opposingPitchHand);
    effectiveOPS = clamp(effectiveOPS * platoonMultiplier(tag), 0.3, 1.5);

    return {
      id: batter.id,
      fullName: batter.fullName,
      batSide,
      seasonOPS,
      recentOPS:   recentOPS > 0 ? recentOPS   : undefined,
      recentGames: recentGames   ? recentGames  : undefined,
      h2hOPS,
      h2hAtBats,
      h2hSeason,
      effectiveOPS,
      platoonAdvantage: tag,
    };
  } catch {
    return {
      id: batter.id,
      fullName: batter.fullName,
      seasonOPS:   LEAGUE_AVG_OPS,
      h2hOPS:      0,
      h2hAtBats:   0,
      effectiveOPS: LEAGUE_AVG_OPS,
      platoonAdvantage: 'neutral',
    };
  }
};

// PA weight per batting order slot based on expected plate appearances per 9-inning game.
// Leadoff hitter bats most; positions 7-9 bat least. Only applied when actual lineup is known.
const BATTING_ORDER_WEIGHTS = [1.07, 1.05, 1.04, 1.02, 1.00, 0.98, 0.96, 0.95, 0.93];

// Fetch a team's last-10 record from standings to gauge recent momentum
const getTeamLastTenRecord = async (teamId: number): Promise<{ wins: number; losses: number } | null> => {
  try {
    const year = new Date().getFullYear();
    const res = await api.get(`/standings?leagueId=103,104&season=${year}&standingsTypes=regularSeason`);
    const divisions: Array<{ teamRecords?: Array<{
      team?: { id: number };
      records?: { splitRecords?: Array<{ type: string; wins: number; losses: number }> };
    }> }> = res.data?.records ?? [];
    for (const division of divisions) {
      for (const tr of division.teamRecords ?? []) {
        if (tr.team?.id === teamId) {
          const last10 = tr.records?.splitRecords?.find((r) => r.type === 'lastTen');
          if (last10) return { wins: last10.wins, losses: last10.losses };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
};

const buildTeamData = async (
  teamId: number,
  teamName: string,
  pitcherId: number | undefined,
  opposingPitcherId: number | undefined,
  lineup?: LineupPlayer[]
): Promise<TeamPredictionData> => {
  const today   = formatLocalDateYMD(new Date());
  const start21 = dateNDaysAgo(21);

  const [rosterResult, pitcherResult, pitcherRecentResult, staffResult] = await Promise.all([
    getTeamBatters(teamId),
    pitcherId ? getPitcherSeasonStats(pitcherId) : Promise.resolve(null),
    // Last 21 days (approx 4-5 starts) for pitcher recent ERA
    pitcherId
      ? api.get(
          `/people/${pitcherId}/stats?stats=season&group=pitching&startDate=${start21}&endDate=${today}&gameType=R`
        ).catch(() => null)
      : Promise.resolve(null),
    getTeamPitchingStats(teamId),
  ]);

  // Use actual game lineup (batting order) if available, otherwise fall back to roster
  const batters: Array<{ id: number; fullName: string }> =
    lineup && lineup.length > 0
      ? lineup.map((p) => ({ id: p.playerId, fullName: p.fullName }))
      : rosterResult.slice(0, 9);
  const pitcherData = pitcherResult && 'data' in pitcherResult && pitcherResult.success
    ? pitcherResult.data
    : null;

  // Compute recent pitcher ERA from last 21 days
  let pitcherRecentEra: string | undefined;
  if (pitcherRecentResult) {
    try {
      const resStat = (pitcherRecentResult as { data: { stats?: Array<{ splits?: Array<{ stat?: { era?: string } }> }> } })
        ?.data?.stats?.[0]?.splits?.[0]?.stat;
      const era = resStat?.era;
      if (era && parseFloat(era) > 0) pitcherRecentEra = era;
    } catch { /* ignore */ }
  }

  const pitchHand = pitcherData?.player?.pitchHand?.code;

  const batterItems = await Promise.all(
    batters.map((b) => fetchBatterPredictionStats(b, opposingPitcherId, pitchHand))
  );

  // Weighted offensive score: give more credit to top-of-order slots that see more PAs.
  // Only apply weights when we have the actual confirmed batting order (not a roster fallback).
  const hasActualLineup = lineup && lineup.length > 0;
  const offensiveScore = batterItems.length > 0
    ? (() => {
        let wSum = 0;
        let wTotal = 0;
        batterItems.forEach((b, i) => {
          const w = hasActualLineup ? (BATTING_ORDER_WEIGHTS[i] ?? 1.0) : 1.0;
          wSum   += b.effectiveOPS * w;
          wTotal += w;
        });
        return wSum / wTotal;
      })()
    : LEAGUE_AVG_OPS;

  return {
    teamId,
    teamName,
    pitcher:           pitcherData?.player ?? null,
    pitcherStats:      pitcherData?.stats ?? null,
    pitcherRecentEra,
    batters:           batterItems,
    offensiveScore,
    staffStats:        staffResult,
  };
};

const extractLineupFromSide = (players: Record<string, {
  person: { id: number; fullName: string };
  position?: { abbreviation: string };
  battingOrder?: string;
}>): LineupPlayer[] =>
  Object.values(players)
    .filter((p) => p.battingOrder && parseInt(p.battingOrder) % 100 === 0)
    .sort((a, b) => parseInt(a.battingOrder!) - parseInt(b.battingOrder!))
    .map((p) => ({
      battingOrder: parseInt(p.battingOrder!) / 100,
      playerId: p.person.id,
      fullName: p.person.fullName,
      position: p.position?.abbreviation ?? '?',
    }));

export const getGameLineup = async (
  gameId: number
): Promise<{ home: LineupPlayer[]; away: LineupPlayer[] }> => {
  try {
    const res = await api.get(`/game/${gameId}/boxscore`);
    const teams = res.data?.teams;
    return {
      home: teams?.home?.players ? extractLineupFromSide(teams.home.players) : [],
      away: teams?.away?.players ? extractLineupFromSide(teams.away.players) : [],
    };
  } catch {
    return { home: [], away: [] };
  }
};

export const getTeamPitchingStats = async (teamId: number): Promise<TeamStaffStats | null> => {
  try {
    const [pitchRes, hitRes] = await Promise.all([
      api.get(`/teams/${teamId}/stats?stats=season&group=pitching&gameType=R`),
      api.get(`/teams/${teamId}/stats?stats=season&group=hitting&gameType=R`).catch(() => null),
    ]);
    const pitchSplit = pitchRes.data?.stats?.[0]?.splits?.[0]?.stat;
    if (!pitchSplit) return null;
    const hitSplit = (hitRes as { data: { stats?: Array<{ splits?: Array<{ stat?: Record<string, unknown> }> }> } } | null)
      ?.data?.stats?.[0]?.splits?.[0]?.stat;
    const games = (pitchSplit.gamesPlayed as number) ?? (hitSplit?.gamesPlayed as number) ?? 1;
    return {
      era:         pitchSplit.era         ?? '0.00',
      whip:        pitchSplit.whip        ?? '0.00',
      strikeouts:  pitchSplit.strikeOuts  ?? 0,
      walks:       pitchSplit.baseOnBalls ?? 0,
      raPerGame:   games > 0 ? ((pitchSplit.runs as number) ?? 0) / games : undefined,
      rsPerGame:   hitSplit && games > 0 ? ((hitSplit.runs as number) ?? 0) / games : undefined,
    };
  } catch {
    return null;
  }
};

export const predictGame = async (params: {
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homePitcherId?: number;
  awayPitcherId?: number;
  gameId?: number;
}): Promise<ApiResult<GamePredictionResult>> => {
  try {
    const { homeTeamId, homeTeamName, awayTeamId, awayTeamName, homePitcherId, awayPitcherId, gameId } = params;

    // Fetch game lineup, live scores, and last-10 records in parallel
    const [gameLineup, liveScoresResult, homeLast10, awayLast10] = await Promise.all([
      gameId ? getGameLineup(gameId) : Promise.resolve({ home: [], away: [] }),
      getLiveScores().catch(() => ({ success: false as const, error: '' })),
      getTeamLastTenRecord(homeTeamId).catch(() => null),
      getTeamLastTenRecord(awayTeamId).catch(() => null),
    ]);

    const homeLineup = gameLineup.home.length > 0 ? gameLineup.home : undefined;
    const awayLineup = gameLineup.away.length > 0 ? gameLineup.away : undefined;

    // Fetch team data in parallel, using actual lineup order when available
    const [homeData, awayData] = await Promise.all([
      buildTeamData(homeTeamId, homeTeamName, homePitcherId, awayPitcherId, homeLineup),
      buildTeamData(awayTeamId, awayTeamName, awayPitcherId, homePitcherId, awayLineup),
    ]);

    // ── Park factor (home team's park) ────────────────────────────────────────
    const parkFactor = PARK_FACTORS[homeTeamId] ?? 1.0;

    // ── Pitcher quality factors (ERA + WHIP + K/9, blended with recent) ───────
    // In hitter-friendly parks pitcher factors are compressed (more run variance)
    const parkCompression = 1 / Math.sqrt(parkFactor);
    const rawHomeStarterPF = homeData.pitcherStats
      ? computePitcherFactor(homeData.pitcherStats, homeData.pitcherRecentEra)
      : 1.0;
    const rawAwayStarterPF = awayData.pitcherStats
      ? computePitcherFactor(awayData.pitcherStats, awayData.pitcherRecentEra)
      : 1.0;

    // Bullpen factor: invert staff ERA relative to league average (lower ERA → higher factor)
    const staffFactor = (stats: import('../types').TeamStaffStats | null | undefined) => {
      if (!stats) return 1.0;
      const era = parseFloat(stats.era);
      if (!era || era <= 0) return 1.0;
      return clamp(LEAGUE_AVG_ERA / era, 0.80, 1.25);
    };
    const homeBullpenPF = staffFactor(homeData.staffStats);
    const awayBullpenPF = staffFactor(awayData.staffStats);

    // Blend: 65% starter, 35% bullpen
    const rawHomePF = rawHomeStarterPF * 0.65 + homeBullpenPF * 0.35;
    const rawAwayPF = rawAwayStarterPF * 0.65 + awayBullpenPF * 0.35;

    // Compress pitcher factor deviation toward 1.0 based on park
    const homePitcherFactor = 1 + (rawHomePF - 1) * parkCompression;
    const awayPitcherFactor = 1 + (rawAwayPF - 1) * parkCompression;

    // ── Expected run ratio → base win probability (75% of final) ────────────────
    const homeRunExp      = homeData.offensiveScore * parkFactor * awayPitcherFactor;
    const awayRunExp      = awayData.offensiveScore * parkFactor * homePitcherFactor;
    const runTotal        = homeRunExp + awayRunExp;
    const runModelProb    = runTotal > 0 ? homeRunExp / runTotal : 0.5;
    const runModelProbHFA = clamp(runModelProb * 0.95 + 0.05, 0.01, 0.99); // +5% HFA

    // ── Pythagorean win expectation (20% of final) ───────────────────────────
    // RS^1.83 / (RS^1.83 + RA^1.83) per team, then normalised head-to-head
    const homeRS = homeData.staffStats?.rsPerGame ?? 0;
    const homeRA = homeData.staffStats?.raPerGame ?? 0;
    const awayRS = awayData.staffStats?.rsPerGame ?? 0;
    const awayRA = awayData.staffStats?.raPerGame ?? 0;
    const EXP = 1.83;
    const homePyth = homeRS > 0 && homeRA > 0
      ? Math.pow(homeRS, EXP) / (Math.pow(homeRS, EXP) + Math.pow(homeRA, EXP))
      : 0.5;
    const awayPyth = awayRS > 0 && awayRA > 0
      ? Math.pow(awayRS, EXP) / (Math.pow(awayRS, EXP) + Math.pow(awayRA, EXP))
      : 0.5;
    const pythProbHome = clamp(homePyth / (homePyth + awayPyth), 0.25, 0.75);
    const hasPythData  = homeRS > 0 && homeRA > 0 && awayRS > 0 && awayRA > 0;

    // ── Team momentum — last 10 games (5% of final when available) ───────────
    const momentumFactor = (record: { wins: number; losses: number } | null): number => {
      if (!record) return 1.0;
      const total10 = record.wins + record.losses;
      if (total10 === 0) return 1.0;
      const winRate = record.wins / total10;
      return clamp(0.94 + winRate * 0.12, 0.97, 1.03);
    };
    const homeMomentum = momentumFactor(homeLast10);
    const awayMomentum = momentumFactor(awayLast10);
    // Convert to a head-to-head probability adjustment
    const momentumProbHome = clamp(
      (homeMomentum / (homeMomentum + awayMomentum)),
      0.35, 0.65
    );
    const hasMomentumData  = homeLast10 !== null && awayLast10 !== null;

    // ── Blend components ─────────────────────────────────────────────────────
    // Run model 75%, Pythagorean 20%, momentum 5% (fall back to run model if data missing)
    const pythWeight     = hasPythData     ? 0.20 : 0;
    const momentumWeight = hasMomentumData ? 0.05 : 0;
    const runWeight      = 1 - pythWeight - momentumWeight;
    const preGameProb    = clamp(
      runWeight * runModelProbHFA +
      pythWeight * pythProbHome +
      momentumWeight * momentumProbHome,
      0.01, 0.99
    );

    // ── Live game adjustment ──────────────────────────────────────────────────
    let finalProb       = preGameProb;
    let isLive          = false;
    let liveGameState: import('../types').LiveGameState | undefined;

    if (liveScoresResult.success) {
      const liveGame = liveScoresResult.data.find(
        (g) =>
          g.status.abstractGameState === 'Live' &&
          ((g.homeTeam.id === homeTeamId && g.awayTeam.id === awayTeamId) ||
           (g.homeTeam.id === awayTeamId && g.awayTeam.id === homeTeamId))
      );

      if (liveGame && liveGame.currentInning) {
        isLive = true;
        const inning     = liveGame.currentInning;
        const isTopHalf  = liveGame.inningHalf === 'top';

        // Normalise scores so homeTeamId is always the "home" side
        const liveHomeScore = liveGame.homeTeam.id === homeTeamId
          ? liveGame.homeScore : liveGame.awayScore;
        const liveAwayScore = liveGame.homeTeam.id === homeTeamId
          ? liveGame.awayScore : liveGame.homeScore;

        const liveProb = liveWinExpectancy(liveHomeScore, liveAwayScore, inning, isTopHalf);

        // Weight live data more heavily as game progresses (30% → 85%)
        const liveWeight   = clamp(0.30 + (inning - 1) * 0.07, 0.30, 0.85);
        finalProb          = clamp(liveWeight * liveProb + (1 - liveWeight) * preGameProb, 0.01, 0.99);

        liveGameState = {
          homeScore:          liveHomeScore,
          awayScore:          liveAwayScore,
          inning,
          inningHalf:         liveGame.inningHalf ?? 'top',
          preGameProbability: preGameProb,
        };
      }
    }

    const predictedWinner: 'home' | 'away' = finalProb >= 0.5 ? 'home' : 'away';
    const confidence = Math.abs(finalProb - 0.5) * 2;

    // ── Key factors ───────────────────────────────────────────────────────────
    const keyFactors: string[] = [];

    // Live game state (highest priority when active)
    if (isLive && liveGameState) {
      const { homeScore, awayScore, inning, inningHalf } = liveGameState;
      const leadTeam = homeScore > awayScore ? homeTeamName
        : awayScore > homeScore ? awayTeamName
        : null;
      const scoreLine = `${awayTeamName} ${awayScore} – ${homeScore} ${homeTeamName}`;
      if (leadTeam) {
        keyFactors.push(
          `LIVE (${inningHalf === 'top' ? 'Top' : 'Bot'} ${inning}): ${scoreLine} — ${leadTeam} leading`
        );
      } else {
        keyFactors.push(`LIVE (${inningHalf === 'top' ? 'Top' : 'Bot'} ${inning}): ${scoreLine} — Tied`);
      }
    }

    // Park factor
    if (parkFactor >= 1.04) {
      keyFactors.push(
        `Hitter-friendly park (factor ${parkFactor.toFixed(2)}) — expect elevated run scoring`
      );
    } else if (parkFactor <= 0.97) {
      keyFactors.push(
        `Pitcher-friendly park (factor ${parkFactor.toFixed(2)}) — pitching edges amplified`
      );
    }

    // Pitcher quality edge (ERA + WHIP + K/9 composite)
    if (homeData.pitcherStats && awayData.pitcherStats) {
      const homeEra = parseFloat(homeData.pitcherStats.era);
      const awayEra = parseFloat(awayData.pitcherStats.era);
      if (rawHomePF > rawAwayPF + 0.08) {
        keyFactors.push(
          `${homeTeamName}'s starter has the pitching edge (ERA ${homeData.pitcherStats.era}, WHIP ${homeData.pitcherStats.whip}, ${homeData.pitcherStats.strikeouts} K)`
        );
      } else if (rawAwayPF > rawHomePF + 0.08) {
        keyFactors.push(
          `${awayTeamName}'s starter has the pitching edge (ERA ${awayData.pitcherStats.era}, WHIP ${awayData.pitcherStats.whip}, ${awayData.pitcherStats.strikeouts} K)`
        );
      } else if (homeEra < awayEra - 0.5) {
        keyFactors.push(
          `${homeTeamName}'s starter has an ERA edge (${homeData.pitcherStats.era} vs ${awayData.pitcherStats.era})`
        );
      } else if (awayEra < homeEra - 0.5) {
        keyFactors.push(
          `${awayTeamName}'s starter has an ERA edge (${awayData.pitcherStats.era} vs ${homeData.pitcherStats.era})`
        );
      }
    }

    // Bullpen strength comparison
    if (homeData.staffStats && awayData.staffStats) {
      const homeStaffEra = parseFloat(homeData.staffStats.era);
      const awayStaffEra = parseFloat(awayData.staffStats.era);
      if (homeStaffEra < awayStaffEra - 0.4) {
        keyFactors.push(
          `${homeTeamName}'s bullpen has an edge (staff ERA ${homeData.staffStats.era} vs ${awayData.staffStats.era})`
        );
      } else if (awayStaffEra < homeStaffEra - 0.4) {
        keyFactors.push(
          `${awayTeamName}'s bullpen has an edge (staff ERA ${awayData.staffStats.era} vs ${homeData.staffStats.era})`
        );
      }
    }

    // Recent pitcher form (if notably better/worse than season ERA)
    if (homeData.pitcherStats && homeData.pitcherRecentEra) {
      const seasonEra = parseFloat(homeData.pitcherStats.era);
      const recentEra = parseFloat(homeData.pitcherRecentEra);
      if (recentEra < seasonEra - 0.75) {
        keyFactors.push(`${homeTeamName}'s starter is in recent good form (last 3 wks ERA: ${homeData.pitcherRecentEra})`);
      } else if (recentEra > seasonEra + 0.75) {
        keyFactors.push(`${homeTeamName}'s starter has struggled recently (last 3 wks ERA: ${homeData.pitcherRecentEra})`);
      }
    }
    if (awayData.pitcherStats && awayData.pitcherRecentEra) {
      const seasonEra = parseFloat(awayData.pitcherStats.era);
      const recentEra = parseFloat(awayData.pitcherRecentEra);
      if (recentEra < seasonEra - 0.75) {
        keyFactors.push(`${awayTeamName}'s starter is in recent good form (last 3 wks ERA: ${awayData.pitcherRecentEra})`);
      } else if (recentEra > seasonEra + 0.75) {
        keyFactors.push(`${awayTeamName}'s starter has struggled recently (last 3 wks ERA: ${awayData.pitcherRecentEra})`);
      }
    }

    // Recent batter form — count batters running hot (recentOPS > seasonOPS + 0.05)
    const homeHot  = homeData.batters.filter((b) => (b.recentOPS ?? 0) > b.seasonOPS + 0.050).length;
    const homeCold = homeData.batters.filter((b) => (b.recentOPS ?? 1) < b.seasonOPS - 0.050 && b.recentGames).length;
    const awayHot  = awayData.batters.filter((b) => (b.recentOPS ?? 0) > b.seasonOPS + 0.050).length;
    const awayCold = awayData.batters.filter((b) => (b.recentOPS ?? 1) < b.seasonOPS - 0.050 && b.recentGames).length;

    if (homeHot >= 3) keyFactors.push(`${homeTeamName} lineup is running hot — ${homeHot} batters above their season pace (last 15 days)`);
    if (homeCold >= 3) keyFactors.push(`${homeTeamName} lineup is in a slump — ${homeCold} batters below their season pace (last 15 days)`);
    if (awayHot >= 3)  keyFactors.push(`${awayTeamName} lineup is running hot — ${awayHot} batters above their season pace (last 15 days)`);
    if (awayCold >= 3) keyFactors.push(`${awayTeamName} lineup is in a slump — ${awayCold} batters below their season pace (last 15 days)`);

    // Platoon advantages
    const homeAdvCount = homeData.batters.filter((b) => b.platoonAdvantage === 'advantage').length;
    const awayAdvCount = awayData.batters.filter((b) => b.platoonAdvantage === 'advantage').length;
    if (homeAdvCount > awayAdvCount + 1) {
      keyFactors.push(`${homeTeamName} has ${homeAdvCount} platoon matchup advantages vs the opposing starter`);
    } else if (awayAdvCount > homeAdvCount + 1) {
      keyFactors.push(`${awayTeamName} has ${awayAdvCount} platoon matchup advantages vs the opposing starter`);
    }

    // Head-to-head history
    const homeH2H = homeData.batters.filter((b) => b.h2hAtBats >= 5).length;
    const awayH2H = awayData.batters.filter((b) => b.h2hAtBats >= 5).length;
    if (homeH2H + awayH2H > 0) {
      keyFactors.push(`${homeH2H + awayH2H} batters have significant head-to-head history vs today's starter`);
    }

    // Lineup strength
    if (homeData.offensiveScore > awayData.offensiveScore + 0.05) {
      keyFactors.push(`${homeTeamName}'s lineup projects stronger against this pitching`);
    } else if (awayData.offensiveScore > homeData.offensiveScore + 0.05) {
      keyFactors.push(`${awayTeamName}'s lineup projects stronger against this pitching`);
    }

    // Pythagorean team quality (RS/RA-based season strength)
    if (hasPythData) {
      const homePythPct = Math.round(homePyth * 100);
      const awayPythPct = Math.round(awayPyth * 100);
      if (Math.abs(homePyth - awayPyth) >= 0.06) {
        const strongerTeam = homePyth > awayPyth ? homeTeamName : awayTeamName;
        const strongerPct  = homePyth > awayPyth ? homePythPct : awayPythPct;
        keyFactors.push(
          `${strongerTeam} has the stronger season résumé by run differential (Pythagorean W%: ${strongerPct}%)`
        );
      }
      if (homeRS > 0 && awayRS > 0 && Math.abs(homeRS - awayRS) >= 0.5) {
        const higherOffense = homeRS > awayRS ? homeTeamName : awayTeamName;
        const higherRS = homeRS > awayRS ? homeRS : awayRS;
        keyFactors.push(`${higherOffense} ranks higher in runs scored per game (${higherRS.toFixed(2)} R/G)`);
      }
    }

    // Team momentum (last 10 games)
    if (hasMomentumData && homeLast10 && awayLast10) {
      const homeL10Wins = homeLast10.wins;
      const awayL10Wins = awayLast10.wins;
      if (homeL10Wins >= 7 && homeL10Wins > awayL10Wins + 1) {
        keyFactors.push(`${homeTeamName} is on a hot streak — ${homeL10Wins}-${homeLast10.losses} in their last 10 games`);
      } else if (awayL10Wins >= 7 && awayL10Wins > homeL10Wins + 1) {
        keyFactors.push(`${awayTeamName} is on a hot streak — ${awayL10Wins}-${awayLast10.losses} in their last 10 games`);
      } else if (homeLast10.losses >= 7 && homeLast10.losses > awayLast10.losses + 1) {
        keyFactors.push(`${homeTeamName} is struggling — ${homeL10Wins}-${homeLast10.losses} in their last 10 games`);
      } else if (awayLast10.losses >= 7 && awayLast10.losses > homeLast10.losses + 1) {
        keyFactors.push(`${awayTeamName} is struggling — ${awayL10Wins}-${awayLast10.losses} in their last 10 games`);
      }
    }

    // FIP vs ERA note (surface when FIP meaningfully diverges from ERA — signals luck)
    if (homeData.pitcherStats?.fip) {
      const era = parseFloat(homeData.pitcherStats.era);
      const fip = parseFloat(homeData.pitcherStats.fip);
      if (era < fip - 0.60) {
        keyFactors.push(`${homeTeamName}'s starter's ERA (${homeData.pitcherStats.era}) may be unsustainably low — FIP is ${homeData.pitcherStats.fip}`);
      } else if (fip < era - 0.60) {
        keyFactors.push(`${homeTeamName}'s starter pitching better than ERA suggests — FIP is ${homeData.pitcherStats.fip} vs ERA ${homeData.pitcherStats.era}`);
      }
    }
    if (awayData.pitcherStats?.fip) {
      const era = parseFloat(awayData.pitcherStats.era);
      const fip = parseFloat(awayData.pitcherStats.fip);
      if (era < fip - 0.60) {
        keyFactors.push(`${awayTeamName}'s starter's ERA (${awayData.pitcherStats.era}) may be unsustainably low — FIP is ${awayData.pitcherStats.fip}`);
      } else if (fip < era - 0.60) {
        keyFactors.push(`${awayTeamName}'s starter pitching better than ERA suggests — FIP is ${awayData.pitcherStats.fip} vs ERA ${awayData.pitcherStats.era}`);
      }
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
        homeWinProbability: finalProb,
        confidence,
        keyFactors,
        isLive,
        liveGameState,
        parkFactor,
      },
    };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
};
