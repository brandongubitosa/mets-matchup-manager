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
                  plateAppearances: 28,
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
        })
        .mockResolvedValueOnce({
          data: {
            stats: [{ splits: [{ stat: { gamesPlayed: 100, atBats: 400, hits: 110 } }] }],
          },
        });

      const result = await getBatterVsPitcher(123, 456);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.batter.fullName).toBe('Test Batter');
        expect(result.data.pitcher.fullName).toBe('Test Pitcher');
        expect(result.data.stats.atBats).toBe(25);
        expect(result.data.stats.plateAppearances).toBe(28);
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
        })
        .mockResolvedValueOnce({
          data: { stats: [{ splits: [{ stat: { gamesPlayed: 50, atBats: 200, hits: 50 } }] }] },
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
        .mockResolvedValueOnce({ data: { people: [] } })
        .mockResolvedValueOnce({ data: { stats: [] } });

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
                  plateAppearances: 12,
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
        })
        .mockResolvedValueOnce({
          data: { stats: [{ splits: [{ stat: { gamesPlayed: 80, atBats: 300, hits: 90 } }] }] },
        });

      const result = await getBatterVsPitcher(1, 2);

      expect(result.success).toBe(true);
      if (result.success) {
        // AVG = 3/10 = .300
        expect(result.data.stats.avg).toBe('.300');
        // OBP = (3+2+0)/(10+2+0+0) = 5/12 = .417
        expect(result.data.stats.obp).toBe('.417');
        expect(result.data.stats.plateAppearances).toBe(12);
      }
    });

    it('aggregates multiple splits correctly, summing PA and AB across splits', async () => {
      // Two seasonal splits — combineVsPlayerTotalSplits must add them together
      mockGet
        .mockResolvedValueOnce({
          data: {
            stats: [{
              splits: [
                {
                  stat: {
                    gamesPlayed: 5,
                    plateAppearances: 15,
                    atBats: 13,
                    hits: 4,
                    doubles: 1,
                    triples: 0,
                    homeRuns: 1,
                    rbi: 2,
                    baseOnBalls: 2,
                    strikeOuts: 3,
                    hitByPitch: 0,
                    sacFlies: 0,
                  },
                },
                {
                  stat: {
                    gamesPlayed: 5,
                    plateAppearances: 13,
                    atBats: 12,
                    hits: 3,
                    doubles: 0,
                    triples: 0,
                    homeRuns: 0,
                    rbi: 1,
                    baseOnBalls: 1,
                    strikeOuts: 2,
                    hitByPitch: 0,
                    sacFlies: 0,
                  },
                },
              ],
            }],
          },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 10, fullName: 'Multi Batter', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 20, fullName: 'Multi Pitcher', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { stats: [{ splits: [{ stat: { gamesPlayed: 120, atBats: 450, hits: 130 } }] }] },
        });

      const result = await getBatterVsPitcher(10, 20);

      expect(result.success).toBe(true);
      if (result.success) {
        // Totals: atBats = 13+12 = 25, PA = 15+13 = 28, hits = 4+3 = 7
        expect(result.data.stats.atBats).toBe(25);
        expect(result.data.stats.plateAppearances).toBe(28);
        expect(result.data.stats.hits).toBe(7);
        // gamesPlayed = 5+5 = 10
        expect(result.data.stats.gamesPlayed).toBe(10);
        // AVG = 7/25 = .280
        expect(result.data.stats.avg).toBe('.280');
      }
    });

    it('omits plateAppearances from stats when not provided by API splits', async () => {
      // API split has no plateAppearances field
      mockGet
        .mockResolvedValueOnce({
          data: {
            stats: [{
              splits: [{
                stat: {
                  gamesPlayed: 8,
                  atBats: 20,
                  hits: 6,
                  doubles: 1,
                  triples: 0,
                  homeRuns: 0,
                  rbi: 2,
                  baseOnBalls: 2,
                  strikeOuts: 4,
                  // no plateAppearances field
                },
              }],
            }],
          },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 11, fullName: 'Batter No PA', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 22, fullName: 'Pitcher', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { stats: [{ splits: [{ stat: { gamesPlayed: 60, atBats: 220, hits: 60 } }] }] },
        });

      const result = await getBatterVsPitcher(11, 22);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stats.atBats).toBe(20);
        // plateAppearances should not appear when API did not provide it (PA sums to 0)
        expect(result.data.stats.plateAppearances).toBeUndefined();
      }
    });

    it('returns emptyStats when all splits have zero atBats and zero plateAppearances', async () => {
      // Splits exist but all counts are zero → combineVsPlayerTotalSplits returns null
      mockGet
        .mockResolvedValueOnce({
          data: {
            stats: [{
              splits: [{
                stat: {
                  gamesPlayed: 0,
                  plateAppearances: 0,
                  atBats: 0,
                  hits: 0,
                },
              }],
            }],
          },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 30, fullName: 'Zero Batter', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 40, fullName: 'Zero Pitcher', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { stats: [{ splits: [{ stat: { gamesPlayed: 80, atBats: 300, hits: 90 } }] }] },
        });

      const result = await getBatterVsPitcher(30, 40);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stats.atBats).toBe(0);
        expect(result.data.stats.avg).toBe('.000');
        expect(result.data.stats.ops).toBe('.000');
        expect(result.data.stats.plateAppearances).toBeUndefined();
      }
    });

    it('uses the vsPlayerTotal endpoint (not vsPlayer)', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { stats: [] } })
        .mockResolvedValueOnce({
          data: { people: [{ id: 50, fullName: 'B', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 60, fullName: 'P', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({ data: { stats: [] } });

      await getBatterVsPitcher(50, 60);

      // First call must use vsPlayerTotal, not the old vsPlayer
      const firstCallArg: string = mockGet.mock.calls[0][0];
      expect(firstCallArg).toContain('vsPlayerTotal');
      expect(firstCallArg).not.toContain('stats=vsPlayer&');
    });

    it('skips splits whose stat object is missing', async () => {
      // One valid split, one with no stat — the valid split should still be used
      mockGet
        .mockResolvedValueOnce({
          data: {
            stats: [{
              splits: [
                { /* no stat key */ },
                {
                  stat: {
                    gamesPlayed: 3,
                    plateAppearances: 10,
                    atBats: 9,
                    hits: 3,
                    doubles: 0,
                    triples: 0,
                    homeRuns: 1,
                    rbi: 1,
                    baseOnBalls: 1,
                    strikeOuts: 2,
                  },
                },
              ],
            }],
          },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 70, fullName: 'Skip Batter', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 80, fullName: 'Skip Pitcher', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { stats: [{ splits: [{ stat: { gamesPlayed: 100, atBats: 400, hits: 120 } }] }] },
        });

      const result = await getBatterVsPitcher(70, 80);

      expect(result.success).toBe(true);
      if (result.success) {
        // Only the valid split counts
        expect(result.data.stats.atBats).toBe(9);
        expect(result.data.stats.plateAppearances).toBe(10);
        expect(result.data.stats.hits).toBe(3);
      }
    });

    it('includes seasonStats in result when season response has data', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { stats: [] } })
        .mockResolvedValueOnce({
          data: { people: [{ id: 90, fullName: 'Season Batter', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 91, fullName: 'Season Pitcher', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: {
            stats: [{
              splits: [{
                stat: {
                  gamesPlayed: 100,
                  atBats: 380,
                  hits: 110,
                  doubles: 20,
                  triples: 3,
                  homeRuns: 18,
                  rbi: 65,
                  baseOnBalls: 40,
                  strikeOuts: 80,
                },
              }],
            }],
          },
        });

      const result = await getBatterVsPitcher(90, 91);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.seasonStats).toBeDefined();
        expect(result.data.seasonStats!.atBats).toBe(380);
        expect(result.data.seasonStats!.hits).toBe(110);
        // AVG = 110/380 ≈ .289
        expect(result.data.seasonStats!.avg).toBe('.289');
      }
    });

    it('does not include seasonStats when season response has no splits', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { stats: [] } })
        .mockResolvedValueOnce({
          data: { people: [{ id: 92, fullName: 'No Season Batter', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 93, fullName: 'No Season Pitcher', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({ data: { stats: [] } });

      const result = await getBatterVsPitcher(92, 93);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.seasonStats).toBeUndefined();
      }
    });

    it('plateAppearances is excluded when it is explicitly zero across all splits', async () => {
      // plateAppearances: 0 in the stat → treated same as absent → not in final stats
      mockGet
        .mockResolvedValueOnce({
          data: {
            stats: [{
              splits: [{
                stat: {
                  gamesPlayed: 4,
                  plateAppearances: 0,
                  atBats: 0,
                  hits: 0,
                },
              }],
            }],
          },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 94, fullName: 'Zero PA Batter', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({
          data: { people: [{ id: 95, fullName: 'Zero PA Pitcher', primaryPosition: {} }] },
        })
        .mockResolvedValueOnce({ data: { stats: [] } });

      const result = await getBatterVsPitcher(94, 95);

      expect(result.success).toBe(true);
      if (result.success) {
        // Both PA and AB are 0 → combineVsPlayerTotalSplits returns null → emptyStats used
        expect(result.data.stats.atBats).toBe(0);
        expect(result.data.stats.plateAppearances).toBeUndefined();
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