import {
  buildLeagueTotals,
  buildPlayer,
  collapseFielding,
  collapseSplits,
  inningsToOuts,
  matchFreeAgents,
  normalizeName,
  slimHitting,
} from '../../projection/buildData';
import {
  METS_TEAM_ID,
  getFreeAgents,
  getPlayerTeamId,
  getRoster,
  getSchedule,
  getTeams,
  projectionSeason,
} from '../../services/projectionData';

const hit = (pa: number, hr: number) => ({ plateAppearances: pa, homeRuns: hr, atBats: pa - 10, hits: 50 });

describe('buildData transforms', () => {
  it('converts innings notation to outs', () => {
    expect(inningsToOuts('123.2')).toBe(371);
    expect(inningsToOuts('0.1')).toBe(1);
    expect(inningsToOuts(undefined)).toBe(0);
  });

  it('sums per-team splits for a traded player', () => {
    const lines = collapseSplits(
      [
        { season: '2026', team: { id: 1 }, stat: hit(300, 10) },
        { season: '2026', team: { id: 2 }, stat: hit(200, 5) },
      ],
      slimHitting,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ season: 2026, pa: 500, hr: 15 });
  });

  it('prefers the combined split over team splits when present', () => {
    const lines = collapseSplits(
      [
        { season: '2026', team: { id: 1 }, stat: hit(300, 10) },
        { season: '2026', team: { id: 2 }, stat: hit(200, 5) },
        { season: '2026', stat: hit(500, 15) },
      ],
      slimHitting,
    );
    expect(lines).toEqual([expect.objectContaining({ pa: 500, hr: 15 })]);
  });

  it('collects games by position and skips combined rows', () => {
    const fielding = collapseFielding([
      { season: '2026', team: { id: 1 }, stat: { position: { abbreviation: 'SS' }, gamesPlayed: 100 } },
      { season: '2026', team: { id: 2 }, stat: { position: { abbreviation: 'SS' }, gamesPlayed: 20 } },
      { season: '2026', team: { id: 2 }, stat: { position: { abbreviation: '3B' }, gamesPlayed: 10 } },
      { season: '2026', stat: { position: { abbreviation: 'SS' }, gamesPlayed: 120 } },
    ]);
    expect(fielding).toEqual([{ season: 2026, games: { SS: 120, '3B': 10 } }]);
  });

  it('separates MLB seasons from MiLB levels', () => {
    const person = {
      id: 7,
      fullName: 'Test Prospect',
      primaryPosition: { abbreviation: 'CF' },
      stats: [
        {
          group: { displayName: 'hitting' },
          splits: [
            { season: '2023', sport: { id: 1 }, team: { id: 1 }, stat: hit(100, 1) },
            { season: '2026', sport: { id: 1 }, team: { id: 1 }, stat: hit(200, 6) },
          ],
        },
      ],
    };
    const milb = {
      stats: [
        {
          group: { displayName: 'hitting' },
          splits: [
            { season: '2026', sport: { id: 11 }, team: { id: 9 }, stat: hit(150, 8) },
            { season: '2026', sport: { id: 12 }, team: { id: 8 }, stat: hit(250, 9) },
            { season: '2026', sport: { id: 21 }, stat: hit(400, 17) }, // MiLB aggregate: ignored
          ],
        },
      ],
    };
    const p = buildPlayer(person, milb, [2024, 2025, 2026], [2025, 2026]);
    expect(p.hitting.map((h) => h.season)).toEqual([2026]);
    expect(p.milbHitting.map((h) => [h.level, h.pa])).toEqual(
      expect.arrayContaining([
        ['AAA', 150],
        ['AA', 250],
      ]),
    );
    expect(p.milbHitting).toHaveLength(2);
  });

  it('builds league totals from team rows', () => {
    const rows = [
      { stat: { ...hit(6000, 200), runs: 700, gamesPlayed: 162 } },
      { stat: { ...hit(6100, 180), runs: 750, gamesPlayed: 162 } },
    ];
    const totals = buildLeagueTotals(2026, rows, rows);
    expect(totals).toMatchObject({ season: 2026, runs: 1450, games: 162 });
    expect(totals.hitting.pa).toBe(12100);
  });

  it('normalizes names for matching', () => {
    expect(normalizeName('Luis Arráez Jr.')).toBe('luis arraez');
    expect(normalizeName("Travis d'Arnaud")).toBe('travis darnaud');
  });

  it('matches free agents by name and disambiguates by age', () => {
    const ids = matchFreeAgents(
      [
        { fangraphsId: 'a', name: 'José Ramírez', age: 34 },
        { fangraphsId: 'b', name: 'Will Smith', age: 32 },
        { fangraphsId: 'c', name: 'Nobody Here', age: 30 },
      ],
      [
        { id: 1, fullName: 'Jose Ramirez', currentAge: 34 },
        { id: 2, fullName: 'Will Smith', currentAge: 32 },
        { id: 3, fullName: 'Will Smith', currentAge: 37 },
      ],
    );
    expect(ids).toEqual({ a: 1, b: 2 });
  });
});

describe('projection snapshot', () => {
  it('has all 30 teams with full 40-man rosters', () => {
    expect(getTeams()).toHaveLength(30);
    expect(getRoster(METS_TEAM_ID).length).toBeGreaterThan(30);
  });

  it('has a full regular season schedule', () => {
    expect(getSchedule(METS_TEAM_ID)).toHaveLength(162);
    expect(projectionSeason).toBeGreaterThan(2025);
  });

  it('links most free agents to MLB ids', () => {
    const fas = getFreeAgents();
    expect(fas.filter((f) => f.mlbId != null).length / fas.length).toBeGreaterThan(0.9);
  });

  it('finds the team for a rostered player', () => {
    const [first] = getRoster(METS_TEAM_ID);
    expect(getPlayerTeamId(first.id)).toBe(METS_TEAM_ID);
  });
});
