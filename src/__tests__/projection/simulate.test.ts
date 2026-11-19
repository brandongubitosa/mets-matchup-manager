import projectionJson from '../../data/projectionData.json';
import type { ProjectionData } from '../../types/projection';
import { buildLeagueContext, projectSeason, simulateSeason, summarizeOutlook, teamGameOutlook } from '../../projection';
import { buildTeamRating, expectedHomeWinProb, gameWinProb, mulberry32 } from '../../projection/simulate';

const data = projectionJson as unknown as ProjectionData;
const lg = buildLeagueContext(data.league, data.season);
const projections = projectSeason(data);
const METS = 121;

describe('game model', () => {
  it('gives even teams a 50/50 game', () => {
    expect(gameWinProb(4.5, 4.5)).toBeCloseTo(0.5, 6);
    expect(gameWinProb(5.5, 4)).toBeGreaterThan(0.6);
  });

  it('favors the home team in a mirror matchup', () => {
    const r = buildTeamRating(projections[0], lg, 0.58);
    expect(expectedHomeWinProb(r, r)).toBeGreaterThan(0.52);
    expect(expectedHomeWinProb(r, r)).toBeLessThan(0.56);
  });

  it('prefers facing a worse starter', () => {
    const t = buildTeamRating(projections.find((p) => p.teamId === METS)!, lg, 0.58);
    const opp = buildTeamRating(projections.find((p) => p.teamId !== METS)!, lg, 0.58);
    const ace = { ...opp, starters: [{ name: 'Ace', throws: 'R', ra9: 3, share: 1 }] };
    const scrub = { ...opp, starters: [{ name: 'Scrub', throws: 'R', ra9: 6, share: 1 }] };
    expect(expectedHomeWinProb(t, scrub)).toBeGreaterThan(expectedHomeWinProb(t, ace));
  });

  it('rewards a lefty-heavy lineup against right-handed starters', () => {
    const base = buildTeamRating(projections[0], lg, 0.58);
    const opp = { ...base, starters: [{ name: 'RHP', throws: 'R', ra9: lg.ra9, share: 1 }] };
    const lefty = { ...base, lineupLeftShare: 0.8 };
    const righty = { ...base, lineupLeftShare: 0.2 };
    expect(expectedHomeWinProb(lefty, opp)).toBeGreaterThan(expectedHomeWinProb(righty, opp));
  });

  it('has a reproducible PRNG', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('season simulation', () => {
  const result = simulateSeason(projections, data.teams, data.schedule, lg, { sims: 400 });

  it('awards exactly 6 division titles and 12 playoff spots per simulation', () => {
    const div = result.teams.reduce((s, t) => s + t.divisionPct, 0);
    const po = result.teams.reduce((s, t) => s + t.playoffPct, 0);
    expect(div).toBeCloseTo(6, 6);
    expect(po).toBeCloseTo(12, 6);
  });

  it('tracks the projected record and produces a realistic range', () => {
    for (const t of result.teams) {
      const proj = projections.find((p) => p.teamId === t.teamId)!;
      expect(Math.abs(t.meanWins - proj.wins)).toBeLessThan(3);
      expect(t.p90 - t.p10).toBeGreaterThan(10);
      expect(t.p90 - t.p10).toBeLessThan(30);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const again = simulateSeason(projections, data.teams, data.schedule, lg, { sims: 400 });
    expect(again.teams.map((t) => t.meanWins)).toEqual(result.teams.map((t) => t.meanWins));
  });
});

describe('Mets schedule outlook', () => {
  const games = teamGameOutlook(METS, projections, data.schedule, lg);
  const summary = summarizeOutlook(games);

  it('covers all 162 games with probabilities that sum near the projection', () => {
    expect(games).toHaveLength(162);
    const proj = projections.find((p) => p.teamId === METS)!;
    expect(Math.abs(summary.expectedWins - proj.wins)).toBeLessThan(2);
  });

  it('finds a toughest stretch and monthly split', () => {
    expect(summary.toughestStretch).not.toBeNull();
    expect(summary.months.reduce((s, m) => s + m.games, 0)).toBe(162);
  });
});
