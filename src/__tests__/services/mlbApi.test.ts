import axios, { AxiosError } from 'axios';

// Mock axios before importing the module
jest.mock('axios', () => {
  const mockGet = jest.fn();

  // Create a mock AxiosError class
  class MockAxiosError extends Error {
    isAxiosError = true;
    code?: string;
    response?: { status: number };

    constructor(message: string) {
      super(message);
      this.name = 'AxiosError';
    }
  }

  return {
    create: jest.fn(() => ({
      get: mockGet,
    })),
    AxiosError: MockAxiosError,
    __mockGet: mockGet,
  };
});

// Get reference to mock function
const mockGet = (axios as any).__mockGet;
const MockAxiosError = (axios as any).AxiosError;

// Import after mocking
import {
  getTeamRoster,
  getTeamBatters,
  getTeamPitchers,
  getBatterVsPitcher,
  getTodaysGame,
  getPlayerDetails,
} from '../../services/mlbApi';

describe('mlbApi', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  describe('getTeamRoster', () => {
    it('returns roster on success', async () => {
      const mockRoster = {
        roster: [
          {
            person: { id: 1, fullName: 'Test Player', firstName: 'Test', lastName: 'Player' },
            jerseyNumber: '7',
            position: { type: 'Outfielder', abbreviation: 'RF' },
            status: { code: 'A' },
          },
        ],
      };

      mockGet.mockResolvedValueOnce({ data: mockRoster });

      const result = await getTeamRoster(121);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].fullName).toBe('Test Player');
      }
    });

    it('returns error on network failure', async () => {
      const axiosError = new MockAxiosError('timeout');
      axiosError.code = 'ECONNABORTED';
      mockGet.mockRejectedValueOnce(axiosError);

      const result = await getTeamRoster(121);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('timed out');
      }
    });

    it('handles 404 response', async () => {
      const axiosError = new MockAxiosError('Not found');
      axiosError.response = { status: 404 };
      mockGet.mockRejectedValueOnce(axiosError);

      const result = await getTeamRoster(121);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('handles empty roster', async () => {
      mockGet.mockResolvedValueOnce({ data: { roster: [] } });

      const result = await getTeamRoster(121);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('handles null roster', async () => {
      mockGet.mockResolvedValueOnce({ data: {} });

      const result = await getTeamRoster(121);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe('getTeamBatters', () => {
    it('filters out pitchers', async () => {
      const mockRoster = {
        roster: [
          {
            person: { id: 1, fullName: 'Batter One' },
            jerseyNumber: '7',
            position: { type: 'Outfielder', abbreviation: 'RF' },
            status: { code: 'A' },
          },
          {
            person: { id: 2, fullName: 'Pitcher One' },
            jerseyNumber: '45',
            position: { type: 'Pitcher', abbreviation: 'P' },
            status: { code: 'A' },
          },
        ],
      };

      mockGet.mockResolvedValueOnce({ data: mockRoster });

      const batters = await getTeamBatters(121);

      expect(batters).toHaveLength(1);
      expect(batters[0].fullName).toBe('Batter One');
    });

    // Note: Two-way player filtering (TWP) is handled by the filter logic in getTeamBatters
    // Filter: position.type !== 'Pitcher' || position.abbreviation === 'TWP'
    // This allows TWP players to be included in batters list

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const batters = await getTeamBatters(121);

      expect(batters).toEqual([]);
    });
  });

  describe('getTeamPitchers', () => {
    it('returns only pitchers', async () => {
      const mockRoster = {
        roster: [
          {
            person: { id: 1, fullName: 'Batter One' },
            jerseyNumber: '7',
            position: { type: 'Outfielder', abbreviation: 'RF' },
            status: { code: 'A' },
          },
          {
            person: { id: 2, fullName: 'Pitcher One' },
            jerseyNumber: '45',
            position: { type: 'Pitcher', abbreviation: 'P' },
            status: { code: 'A' },
          },
        ],
      };

      mockGet.mockResolvedValueOnce({ data: mockRoster });

      const pitchers = await getTeamPitchers(121);

      expect(pitchers).toHaveLength(1);
      expect(pitchers[0].fullName).toBe('Pitcher One');
    });
  });

  describe('getBatterVsPitcher', () => {
    it('returns matchup stats', async () => {
      mockGet
        .mockResolvedValueOnce({
          data: {
            stats: [{
              splits: [{
                stat: {
                  gamesPlayed: 10,
                  atBats: 25,
                  hits: 8,
                  doubles: 2,
                  triples: 0,
                  homeRuns: 1,
                  rbi: 5,
                  baseOnBalls: 3,
                  strikeOuts: 6,
                },
              }],
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            people: [{
              id: 123,
              fullName: 'Test Batter',
              firstName: 'Test',
              lastName: 'Batter',
              primaryPosition: { type: 'Outfielder' },
              batSide: { code: 'R', description: 'Right' },
            }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            people: [{
              id: 456,
              fullName: 'Test Pitcher',
              firstName: 'Test',
              lastName: 'Pitcher',
              primaryPosition: { type: 'Pitcher' },
              pitchHand: { code: 'L', description: 'Left' },
            }],
          },
        });

      const result = await getBatterVsPitcher(123, 456);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.batter.fullName).toBe('Test Batter');
        expect(result.data.pitcher.fullName).toBe('Test Pitcher');
        expect(result.data.stats.atBats).toBe(25);
        expect(result.data.stats.hits).toBe(8);
      }
    });

    it('returns empty stats when no matchup history', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { stats: [] } })
        .mockResolvedValueOnce({
          data: { people: [{ id: 123, fullName: 'Batter', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 456, fullName: 'Pitcher', primaryPosition: {} }] },
        });

      const result = await getBatterVsPitcher(123, 456);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stats.atBats).toBe(0);
        expect(result.data.stats.avg).toBe('.000');
      }
    });

    it('handles player not found', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { stats: [] } })
        .mockResolvedValueOnce({ data: { people: [] } })
        .mockResolvedValueOnce({ data: { people: [] } });

      const result = await getBatterVsPitcher(123, 456);

      expect(result.success).toBe(false);
    });

    it('calculates stats correctly', async () => {
      // Test stats calculation with known values
      mockGet
        .mockResolvedValueOnce({
          data: {
            stats: [{
              splits: [{
                stat: {
                  atBats: 10,
                  hits: 3,
                  doubles: 1,
                  triples: 0,
                  homeRuns: 1,
                  rbi: 2,
                  baseOnBalls: 2,
                  strikeOuts: 3,
                  hitByPitch: 0,
                  sacFlies: 0,
                },
              }],
            }],
          },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 1, fullName: 'B', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 2, fullName: 'P', primaryPosition: {} }] },
        });

      const result = await getBatterVsPitcher(1, 2);

      expect(result.success).toBe(true);
      if (result.success) {
        // AVG = 3/10 = .300
        expect(result.data.stats.avg).toBe('.300');
        // OBP = (3+2+0)/(10+2+0+0) = 5/12 = .417
        expect(result.data.stats.obp).toBe('.417');
      }
    });
  });

  describe('getTodaysGame', () => {
    it('returns game info when scheduled', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          dates: [{
            games: [{
              gamePk: 12345,
              gameDate: '2024-06-15T19:10:00Z',
              teams: {
                home: { team: { id: 121, name: 'New York Mets' } },
                away: { team: { id: 143, name: 'Philadelphia Phillies' } },
              },
            }],
          }],
        },
      });

      const result = await getTodaysGame();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gameId).toBe(12345);
        expect(result.data.homeTeam.name).toBe('New York Mets');
      }
    });

    it('returns error when no game scheduled', async () => {
      mockGet.mockResolvedValueOnce({
        data: { dates: [] },
      });

      const result = await getTodaysGame();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('No game');
      }
    });

    it('handles empty games array', async () => {
      mockGet.mockResolvedValueOnce({
        data: { dates: [{ games: [] }] },
      });

      const result = await getTodaysGame();

      expect(result.success).toBe(false);
    });
  });

  describe('getPlayerDetails', () => {
    it('returns player details', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          people: [{
            id: 123,
            fullName: 'Test Player',
            firstName: 'Test',
            lastName: 'Player',
            primaryNumber: '7',
            primaryPosition: { type: 'Outfielder', abbreviation: 'RF' },
            batSide: { code: 'R' },
            pitchHand: { code: 'R' },
          }],
        },
      });

      const result = await getPlayerDetails(123);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe('Test Player');
        expect(result.data.primaryNumber).toBe('7');
      }
    });

    it('returns error for unknown player', async () => {
      mockGet.mockResolvedValueOnce({
        data: { people: [] },
      });

      const result = await getPlayerDetails(99999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });
});
