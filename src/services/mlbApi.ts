import axios from 'axios';
import { Player, MatchupStats, MatchupResult, RosterPlayer } from '../types';
import { METS_TEAM_ID } from '../constants';

const BASE_URL = 'https://statsapi.mlb.com/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const getMetsRoster = async (): Promise<RosterPlayer[]> => {
  try {
    const response = await api.get(`/teams/${METS_TEAM_ID}/roster?rosterType=active`);
    return response.data.roster.map((r: any) => ({
      id: r.person.id,
      fullName: r.person.fullName,
      firstName: r.person.fullName.split(' ')[0],
      lastName: r.person.fullName.split(' ').slice(1).join(' '),
      jerseyNumber: r.jerseyNumber,
      position: r.position,
      status: r.status,
    }));
  } catch (error) {
    console.error('Error fetching Mets roster:', error);
    return [];
  }
};

export const getMetsBatters = async (): Promise<RosterPlayer[]> => {
  const roster = await getMetsRoster();
  return roster.filter(
    (player) => player.position.type !== 'Pitcher' || player.position.abbreviation === 'TWP'
  );
};

export const getMetsPitchers = async (): Promise<RosterPlayer[]> => {
  const roster = await getMetsRoster();
  return roster.filter((player) => player.position.type === 'Pitcher');
};

export const getPlayerDetails = async (playerId: number): Promise<Player | null> => {
  try {
    const response = await api.get(`/people/${playerId}`);
    const person = response.data.people[0];
    return {
      id: person.id,
      fullName: person.fullName,
      firstName: person.firstName,
      lastName: person.lastName,
      primaryNumber: person.primaryNumber,
      position: person.primaryPosition,
      batSide: person.batSide,
      pitchHand: person.pitchHand,
    };
  } catch (error) {
    console.error('Error fetching player details:', error);
    return null;
  }
};

export const searchPlayers = async (query: string, teamId?: number): Promise<Player[]> => {
  try {
    let url = `/sports/1/players?search=${encodeURIComponent(query)}`;
    if (teamId) {
      url = `/teams/${teamId}/roster?rosterType=fullSeason`;
    }

    const response = await api.get(url);
    const players = teamId ? response.data.roster : response.data.people;

    if (!players) return [];

    const filtered = teamId
      ? players.filter((r: any) =>
          r.person.fullName.toLowerCase().includes(query.toLowerCase())
        )
      : players;

    return (teamId ? filtered : players).slice(0, 20).map((p: any) => {
      const person = teamId ? p.person : p;
      return {
        id: person.id,
        fullName: person.fullName,
        firstName: person.fullName.split(' ')[0],
        lastName: person.fullName.split(' ').slice(1).join(' '),
        position: teamId ? p.position : person.primaryPosition,
      };
    });
  } catch (error) {
    console.error('Error searching players:', error);
    return [];
  }
};

export const getTeamRoster = async (teamId: number): Promise<RosterPlayer[]> => {
  try {
    const response = await api.get(`/teams/${teamId}/roster?rosterType=active`);
    return response.data.roster.map((r: any) => ({
      id: r.person.id,
      fullName: r.person.fullName,
      firstName: r.person.fullName.split(' ')[0],
      lastName: r.person.fullName.split(' ').slice(1).join(' '),
      jerseyNumber: r.jerseyNumber,
      position: r.position,
      status: r.status,
    }));
  } catch (error) {
    console.error('Error fetching team roster:', error);
    return [];
  }
};

export const getTeamPitchers = async (teamId: number): Promise<RosterPlayer[]> => {
  const roster = await getTeamRoster(teamId);
  return roster.filter((player) => player.position.type === 'Pitcher');
};

export const getTeamBatters = async (teamId: number): Promise<RosterPlayer[]> => {
  const roster = await getTeamRoster(teamId);
  return roster.filter((player) => player.position.type !== 'Pitcher');
};

const calculateStats = (stats: any): MatchupStats => {
  const atBats = stats.atBats || 0;
  const hits = stats.hits || 0;
  const walks = stats.baseOnBalls || 0;
  const hitByPitch = stats.hitByPitch || 0;
  const sacFlies = stats.sacFlies || 0;
  const totalBases =
    hits +
    (stats.doubles || 0) +
    (stats.triples || 0) * 2 +
    (stats.homeRuns || 0) * 3;

  const avg = atBats > 0 ? (hits / atBats).toFixed(3) : '.000';
  const obpDenom = atBats + walks + hitByPitch + sacFlies;
  const obp = obpDenom > 0 ? ((hits + walks + hitByPitch) / obpDenom).toFixed(3) : '.000';
  const slg = atBats > 0 ? (totalBases / atBats).toFixed(3) : '.000';
  const opsValue = parseFloat(obp) + parseFloat(slg);

  return {
    gamesPlayed: stats.gamesPlayed || 0,
    atBats,
    hits,
    doubles: stats.doubles || 0,
    triples: stats.triples || 0,
    homeRuns: stats.homeRuns || 0,
    rbi: stats.rbi || 0,
    walks,
    strikeouts: stats.strikeOuts || 0,
    avg: avg.replace('0.', '.'),
    obp: obp.replace('0.', '.'),
    slg: slg.replace('0.', '.'),
    ops: opsValue.toFixed(3).replace('0.', '.'),
  };
};

export const getBatterVsPitcher = async (
  batterId: number,
  pitcherId: number
): Promise<MatchupResult | null> => {
  try {
    const [matchupResponse, batterResponse, pitcherResponse] = await Promise.all([
      api.get(
        `/people/${batterId}/stats?stats=vsPlayer&opposingPlayerId=${pitcherId}&group=hitting`
      ),
      api.get(`/people/${batterId}`),
      api.get(`/people/${pitcherId}`),
    ]);

    const batter = batterResponse.data.people[0];
    const pitcher = pitcherResponse.data.people[0];
    const matchupStats = matchupResponse.data.stats?.[0]?.splits?.[0]?.stat;

    if (!matchupStats) {
      return {
        batter: {
          id: batter.id,
          fullName: batter.fullName,
          firstName: batter.firstName,
          lastName: batter.lastName,
          position: batter.primaryPosition,
          batSide: batter.batSide,
        },
        pitcher: {
          id: pitcher.id,
          fullName: pitcher.fullName,
          firstName: pitcher.firstName,
          lastName: pitcher.lastName,
          position: pitcher.primaryPosition,
          pitchHand: pitcher.pitchHand,
        },
        stats: {
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
        },
      };
    }

    return {
      batter: {
        id: batter.id,
        fullName: batter.fullName,
        firstName: batter.firstName,
        lastName: batter.lastName,
        position: batter.primaryPosition,
        batSide: batter.batSide,
      },
      pitcher: {
        id: pitcher.id,
        fullName: pitcher.fullName,
        firstName: pitcher.firstName,
        lastName: pitcher.lastName,
        position: pitcher.primaryPosition,
        pitchHand: pitcher.pitchHand,
      },
      stats: calculateStats(matchupStats),
    };
  } catch (error) {
    console.error('Error fetching batter vs pitcher stats:', error);
    return null;
  }
};

export const getTodaysGame = async (): Promise<any | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get(
      `/schedule?sportId=1&teamId=${METS_TEAM_ID}&date=${today}`
    );

    const games = response.data.dates?.[0]?.games;
    if (!games || games.length === 0) return null;

    return games[0];
  } catch (error) {
    console.error('Error fetching today\'s game:', error);
    return null;
  }
};

export const getOpposingPitcher = async (gameId: number): Promise<Player | null> => {
  try {
    const response = await api.get(`/game/${gameId}/boxscore`);
    const teams = response.data.teams;

    const isHome = teams.home.team.id === METS_TEAM_ID;
    const opposingTeam = isHome ? teams.away : teams.home;

    const startingPitcherId = opposingTeam.pitchers?.[0];
    if (!startingPitcherId) return null;

    return getPlayerDetails(startingPitcherId);
  } catch (error) {
    console.error('Error fetching opposing pitcher:', error);
    return null;
  }
};
