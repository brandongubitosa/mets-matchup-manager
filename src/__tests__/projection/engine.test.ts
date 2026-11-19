import projectionJson from '../../data/projectionData.json';
import type { ProjectionData, ProjectionPlayer } from '../../types/projection';
import { projectSeason } from '../../projection';
import {
  ageFactor,
  ageInSeason,
  buildLeagueContext,
  hitterPositions,
  projectHitter,
  projectPitcher,
} from '../../projection/players';
import { buildLineup, projectTeam, pythagWinPct } from '../../projection/team';

const data = projectionJson as unknown as ProjectionData;
const lg = buildLeagueContext(data.league, data.season);
const METS = 121;

const blankPlayer = (over: Partial<ProjectionPlayer> = {}): ProjectionPlayer => ({
  id: 1,
  name: 'Test Player',
  birthDate: `${data.season - 29}-01-01`,
  bats: 'R',
  throws: 'R',
  position: 'SS',
  mlbDebut: null,
  hitting: [],
  pitching: [],
  fielding: [],
  milbHitting: [],
  milbPitching: [],
  ...over,
});

const goodSeason = (season: number) => ({
  season,
  age: 28,
  g: 155,
  pa: 650,
  ab: 560,
  h: 170,
  d: 35,
  t: 3,
  hr: 35,
  bb: 80,
  ibb: 5,
  hbp: 6,
  so: 120,
  sf: 4,
  sb: 15,
  cs: 4,
});

describe('league context', () => {
  it('derives a sane run environment', () => {
    expect(lg.ra9).toBeGreaterThan(3.8);
    expect(lg.ra9).toBeLessThan(5.2);
    expect(lg.runsPerWin).toBeGreaterThan(9);
    expect(lg.runsPerWin).toBeLessThan(11);
    expect(lg.runsPerTeam).toBeGreaterThan(620);
    expect(lg.runsPerTeam).toBeLessThan(820);
  });
});

describe('aging', () => {
  it('computes baseball age as of June 30', () => {
    expect(ageInSeason('1998-06-30', 2027)).toBe(29);
    expect(ageInSeason('1998-07-01', 2027)).toBe(28);
    expect(ageInSeason(null, 2027)).toBeNull();
  });

  it('improves young players and declines old ones', () => {
    expect(ageFactor(24)).toBeGreaterThan(1);
    expect(ageFactor(29)).toBe(1);
    expect(ageFactor(36)).toBeLessThan(1);
  });
});

describe('hitter projections', () => {
  it('projects a player with no history as league average', () => {
    const h = projectHitter(blankPlayer(), lg);
    expect(h.runsPerPa).toBeCloseTo(0, 3);
  });

  it('regresses a strong track record toward average but stays above it', () => {
    const p = blankPlayer({ hitting: [goodSeason(data.season - 1), goodSeason(data.season - 2)] });
    const h = projectHitter(p, lg);
    expect(h.runsPerPa).toBeGreaterThan(0.02);
    expect(h.warPer600).toBeGreaterThan(3);
  });

  it('discounts minor league stats by level', () => {
    const line = { ...goodSeason(data.season - 1) };
    const mlb = projectHitter(blankPlayer({ hitting: [line] }), lg);
    const aaa = projectHitter(blankPlayer({ milbHitting: [{ ...line, level: 'AAA' }] }), lg);
    const a = projectHitter(blankPlayer({ milbHitting: [{ ...line, level: 'A' }] }), lg);
    expect(aaa.runsPerPa).toBeLessThan(mlb.runsPerPa);
    expect(a.runsPerPa).toBeLessThan(aaa.runsPerPa);
  });

  it('makes shortstops eligible at 2B and 3B and everyone at DH', () => {
    const p = blankPlayer({ fielding: [{ season: data.season - 1, games: { SS: 140 } }] });
    const { primary, eligible } = hitterPositions(p, data.season);
    expect(primary).toBe('SS');
    expect(eligible).toEqual(expect.arrayContaining(['SS', '2B', '3B', 'DH']));
    expect(eligible).not.toContain('C');
  });
});

describe('pitcher projections', () => {
  it('classifies starters and values strikeouts', () => {
    const line = (so: number) => ({
      season: data.season - 1,
      age: 28,
      g: 30,
      gs: 30,
      outs: 540,
      bf: 750,
      h: 150,
      hr: 18,
      bb: 50,
      ibb: 2,
      hbp: 6,
      so,
      r: 75,
      er: 70,
      sv: 0,
      hld: 0,
    });
    const ace = projectPitcher(blankPlayer({ position: 'P', pitching: [line(230)] }), lg);
    const meh = projectPitcher(blankPlayer({ position: 'P', pitching: [line(130)] }), lg);
    expect(ace.role).toBe('SP');
    expect(ace.ra9).toBeLessThan(meh.ra9);
    expect(ace.warPerRole).toBeGreaterThan(meh.warPerRole);
  });
});

describe('team projection', () => {
  it('is .500 when runs scored equal runs allowed', () => {
    expect(pythagWinPct(720, 720)).toBeCloseTo(0.5, 5);
    expect(pythagWinPct(800, 650)).toBeGreaterThan(0.55);
  });

  it('fills every lineup position when the roster allows', () => {
    const metsPlayers = data.rosters[METS].map((id) => data.players[id]);
    const hitters = metsPlayers.filter((p) => p.position !== 'P').map((p) => projectHitter(p, lg));
    const starters = buildLineup(hitters, lg).filter((s) => s.starter);
    expect(new Set(starters.map((s) => s.pos)).size).toBe(starters.length);
    expect(starters.length).toBeGreaterThanOrEqual(8);
  });

  it('projects a full staff and plausible totals for the Mets', () => {
    const t = projectTeam({ teamId: METS, players: data.rosters[METS].map((id) => data.players[id]) }, lg);
    expect(t.rotation.length).toBeGreaterThanOrEqual(5);
    expect(t.wins).toBeGreaterThan(55);
    expect(t.wins).toBeLessThan(110);
  });
});

describe('season projection', () => {
  const base = projectSeason(data);

  it('averages 81 wins across the league with a realistic spread', () => {
    const wins = base.map((t) => t.wins);
    const mean = wins.reduce((a, b) => a + b, 0) / wins.length;
    expect(mean).toBeCloseTo(81, 0);
    expect(Math.max(...wins) - Math.min(...wins)).toBeGreaterThan(10);
  });

  it('adds wins when the Mets sign a star and removes them from his old team', () => {
    const star = Object.values(data.players)
      .filter((p) => p.position !== 'P' && !data.rosters[METS].includes(p.id))
      .map((p) => projectHitter(p, lg))
      .sort((a, b) => b.warPer600 - a.warPer600)[0];
    const oldTeam = Number(Object.entries(data.rosters).find(([, ids]) => ids.includes(star.playerId))?.[0]);
    const after = projectSeason(data, { [METS]: { add: [star.playerId] } });
    const wins = (rows: typeof base, id: number) => rows.find((t) => t.teamId === id)!.wins;
    expect(wins(after, METS) - wins(base, METS)).toBeGreaterThan(2);
    if (oldTeam) expect(wins(after, oldTeam)).toBeLessThan(wins(base, oldTeam));
  });

  it('counts fixed-WAR signings', () => {
    const after = projectSeason(data, { [METS]: { addFixedWar: [{ name: 'NPB Ace', war: 3, isPitcher: true }] } });
    const before = base.find((t) => t.teamId === METS)!;
    expect(after.find((t) => t.teamId === METS)!.wins - before.wins).toBeGreaterThan(1.5);
  });
});
