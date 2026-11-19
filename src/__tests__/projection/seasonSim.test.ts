import projectionJson from '../../data/projectionData.json';
import type { ProjectionData } from '../../types/projection';
import { buildLeagueContext, describeFinish, projectSeason, simulateOneSeason } from '../../projection';

const data = projectionJson as unknown as ProjectionData;
const lg = buildLeagueContext(data.league, data.season);
const projections = projectSeason(data);
const sim = simulateOneSeason(projections, data.teams, data.schedule, lg, 7);
const abbr = (id: number) => data.teams.find((t) => t.id === id)!.abbr;

describe('single season simulation', () => {
  it('plays every game with a winner and consistent standings', () => {
    expect(sim.games).toHaveLength(data.schedule.length);
    expect(sim.games.every((g) => g.homeScore !== g.awayScore)).toBe(true);
    for (const r of sim.standings) expect(r.wins + r.losses).toBe(162);
    const totalWins = sim.standings.reduce((s, r) => s + r.wins, 0);
    expect(totalWins).toBe(data.schedule.length);
  });

  it('produces a realistic run environment and extra-inning rate', () => {
    const runsPerGame = sim.standings.reduce((s, r) => s + r.runsScored, 0) / sim.games.length / 2;
    expect(runsPerGame).toBeGreaterThan(3.8);
    expect(runsPerGame).toBeLessThan(5.2);
    const extra = sim.games.filter((g) => g.extraInnings).length / sim.games.length;
    expect(extra).toBeGreaterThan(0.04);
    expect(extra).toBeLessThan(0.15);
  });

  it('seeds 6 teams per league and runs the full bracket', () => {
    expect(sim.playoffSeeds).toHaveLength(12);
    const rounds = sim.series.map((s) => s.round);
    expect(rounds.filter((r) => r === 'Wild Card')).toHaveLength(4);
    expect(rounds.filter((r) => r === 'Division Series')).toHaveLength(4);
    expect(rounds.filter((r) => r === 'Championship Series')).toHaveLength(2);
    expect(rounds.filter((r) => r === 'World Series')).toHaveLength(1);
    for (const s of sim.series) {
      const need = s.round === 'Wild Card' ? 2 : s.round === 'Division Series' ? 3 : 4;
      expect(Math.max(s.highWins, s.lowWins)).toBe(need);
    }
    expect(sim.playoffSeeds.some((p) => p.teamId === sim.champion)).toBe(true);
  });

  it('gives top-two seeds a bye past the Wild Card round', () => {
    for (const p of sim.playoffSeeds.filter((s) => s.seed <= 2)) {
      expect(sim.series.some((s) => s.round === 'Wild Card' && (s.high === p.teamId || s.low === p.teamId))).toBe(false);
    }
  });

  it('is reproducible for a seed', () => {
    const again = simulateOneSeason(projections, data.teams, data.schedule, lg, 7);
    expect(again.champion).toBe(sim.champion);
    expect(again.standings).toEqual(sim.standings);
  });

  it('describes how each team finished', () => {
    const short = (l: string) => (l.startsWith('National') ? 'NL' : 'AL');
    expect(describeFinish(sim, sim.champion, abbr, short)).toBe('Won the World Series');
    const missed = data.teams.find((t) => !sim.playoffSeeds.some((p) => p.teamId === t.id))!;
    expect(describeFinish(sim, missed.id, abbr, short)).toBe('Missed the playoffs');
  });
});
