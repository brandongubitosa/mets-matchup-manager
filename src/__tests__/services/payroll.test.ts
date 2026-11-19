import { DEFAULT_CBT, MIN_SALARY, cbtTier, luxuryTax, playerCost, teamPayroll } from '../../services/payroll';
import { freeAgentCandidates, seasonData } from '../../services/seasonBuilder';

const M = 1_000_000;
const METS = 121;

describe('luxury tax', () => {
  it('is zero under the threshold', () => {
    expect(luxuryTax(200 * M)).toBe(0);
    expect(cbtTier(200 * M)).toBe(0);
  });

  it('applies the base rate by payer status', () => {
    expect(luxuryTax(254 * M, { ...DEFAULT_CBT, payerStatus: 'first' })).toBeCloseTo(2 * M);
    expect(luxuryTax(254 * M, { ...DEFAULT_CBT, payerStatus: 'second' })).toBeCloseTo(3 * M);
    expect(luxuryTax(254 * M, { ...DEFAULT_CBT, payerStatus: 'repeat' })).toBeCloseTo(5 * M);
  });

  it('adds surcharges at each $20M tier', () => {
    // $314M, first-time payer: 70M x 20% + 50M x 12% + 30M x 42.5% + 10M x 60%
    expect(luxuryTax(314 * M)).toBeCloseTo(14 * M + 6 * M + 12.75 * M + 6 * M);
    expect(cbtTier(314 * M)).toBe(4);
    expect(cbtTier(270 * M)).toBe(2);
  });

  it('follows the configured threshold', () => {
    expect(luxuryTax(254 * M, { threshold: 260 * M, payerStatus: 'first' })).toBe(0);
  });
});

describe('team payroll', () => {
  it('has a payroll for every team', () => {
    for (const t of seasonData.teams) expect(teamPayroll(t.id).payroll).toBeGreaterThan(30 * M);
  });

  it('adds a free agent at his estimated AAV', () => {
    const [fa] = freeAgentCandidates(METS, {}).filter((c) => c.mlbId != null && c.medianAav);
    const after = teamPayroll(METS, { add: [fa.mlbId!] });
    expect(after.delta).toBe(fa.medianAav);
    expect(after.cbtPayroll - teamPayroll(METS).cbtPayroll).toBe(fa.medianAav);
  });

  it('removes a rostered player with his contract', () => {
    const contracted = seasonData.rosters[METS].find((id) => playerCost(id).source === 'contract')!;
    const after = teamPayroll(METS, { remove: [contracted] });
    expect(after.delta).toBe(-playerCost(contracted).cbt);
  });

  it('prices players without a contract at the minimum', () => {
    const callUp = seasonData.callUps[METS][0];
    expect(playerCost(callUp)).toEqual({ salary: MIN_SALARY, cbt: MIN_SALARY, source: 'minimum' });
  });
});
