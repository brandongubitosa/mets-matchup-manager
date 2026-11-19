// 2027 payroll and Competitive Balance Tax (luxury tax) for the Season Builder.
// Payroll comes from FanGraphs RosterResource (scripts/refresh-payroll.mjs). MLB has no salary cap:
// teams over the CBT thresholds pay a tax on the overage, with higher rates for repeat payers.

import payrollJson from '../data/payroll.json';
import type { RosterMoves } from '../projection';
import { getFreeAgents } from './projectionData';

interface PlayerPay {
  name: string;
  salary: number;
  cbt: number;
  type: string | null;
  estimate: boolean;
}
interface TeamPay {
  payroll: number | null;
  cbtPayroll: number | null;
  players: Record<string, PlayerPay>;
}

const data = payrollJson as unknown as { season: number; updatedAt: string; teams: Record<string, TeamPay> };

/** Minimum salary used for players with no listed contract (pre-arb, call-ups). 2026 level. */
export const MIN_SALARY = 780_000;

export type PayerStatus = 'first' | 'second' | 'repeat';

export interface CbtSettings {
  /** First CBT threshold. The 2027 level depends on the next CBA; defaults to the 2026 level. */
  threshold: number;
  payerStatus: PayerStatus;
}

export const DEFAULT_CBT: CbtSettings = { threshold: 244_000_000, payerStatus: 'first' };

/** Tiers sit $20M apart above the first threshold. */
export const TIER_STEP = 20_000_000;

const BASE_RATE: Record<PayerStatus, number> = { first: 0.2, second: 0.3, repeat: 0.5 };

/**
 * Luxury tax owed for a CBT payroll: the base rate (20/30/50% by consecutive years over) on
 * everything above the threshold, plus a surcharge on the slice in each $20M band above it:
 * 12% from +$20M to +$40M, 42.5% (45% for repeat payers) from +$40M to +$60M, 60% beyond +$60M.
 * Surcharges apply only to their own band; they do not stack.
 */
export const luxuryTax = (cbtPayroll: number, s: CbtSettings = DEFAULT_CBT): number => {
  const over = (step: number) => Math.max(0, cbtPayroll - (s.threshold + step * TIER_STEP));
  const band = (step: number) => over(step) - over(step + 1);
  return (
    over(0) * BASE_RATE[s.payerStatus] +
    band(1) * 0.12 +
    band(2) * (s.payerStatus === 'first' ? 0.425 : 0.45) +
    over(3) * 0.6
  );
};

/** Lowest threshold the settings allow, so a saved value is always usable. */
export const MIN_THRESHOLD = 100_000_000;

/** 0 = under the threshold, 1-4 = which CBT tier the payroll is in. */
export const cbtTier = (cbtPayroll: number, s: CbtSettings = DEFAULT_CBT): number => {
  let tier = 0;
  for (let i = 0; i < 4; i++) if (cbtPayroll > s.threshold + i * TIER_STEP) tier = i + 1;
  return tier;
};

// Free agents are priced at FanGraphs' median contract estimate (AAV), keyed both ways.
const freeAgentAav = new Map<string, number>();
const freeAgentAavByMlbId = new Map<number, number>();
for (const fa of getFreeAgents()) {
  if (!fa.medianAav) continue;
  freeAgentAav.set(fa.fangraphsId, fa.medianAav);
  if (fa.mlbId != null) freeAgentAavByMlbId.set(fa.mlbId, fa.medianAav);
}

/** A player's 2027 cost: contract (salary and CBT hit), free agent median AAV, or the minimum. */
export const playerCost = (playerId: number): { salary: number; cbt: number; source: 'contract' | 'freeAgent' | 'minimum' } => {
  for (const team of Object.values(data.teams)) {
    const p = team.players[playerId];
    if (p) return { salary: p.salary, cbt: p.cbt, source: 'contract' };
  }
  const aav = freeAgentAavByMlbId.get(playerId);
  if (aav) return { salary: aav, cbt: aav, source: 'freeAgent' };
  return { salary: MIN_SALARY, cbt: MIN_SALARY, source: 'minimum' };
};

export const fixedWarCost = (fangraphsId: string | undefined): number =>
  (fangraphsId && freeAgentAav.get(fangraphsId)) || MIN_SALARY;

export interface TeamPayroll {
  payroll: number;
  cbtPayroll: number;
  /** Change from the team's current payroll caused by the moves. */
  delta: number;
  tax: number;
  tier: number;
}

/**
 * What adding a player changes a team's 2027 payroll by. A player whose contract is already in the
 * team's baseline payroll (e.g. a call-up from its own minors with a big-league contract) adds nothing.
 */
export const addedCost = (teamId: number, playerId: number): { salary: number; cbt: number } => {
  if (data.teams[teamId]?.players[playerId]) return { salary: 0, cbt: 0 };
  const c = playerCost(playerId);
  return { salary: c.salary, cbt: c.cbt };
};

/** A team's 2027 payroll after roster moves, with luxury tax under the given settings. */
export const teamPayroll = (teamId: number, moves: RosterMoves = {}, s: CbtSettings = DEFAULT_CBT): TeamPayroll => {
  const team = data.teams[teamId];
  let payroll = team?.payroll ?? 0;
  let cbtPayroll = team?.cbtPayroll ?? payroll;
  let delta = 0;
  for (const id of moves.add ?? []) {
    const c = addedCost(teamId, id);
    payroll += c.salary;
    cbtPayroll += c.cbt;
    delta += c.cbt;
  }
  for (const id of moves.remove ?? []) {
    // A removed player's contract leaves with him (traded or non-tendered); minimum-salary players
    // free up a minimum slot.
    const own = team?.players[id];
    const salary = own?.salary ?? MIN_SALARY;
    const cbt = own?.cbt ?? MIN_SALARY;
    payroll -= salary;
    cbtPayroll -= cbt;
    delta -= cbt;
  }
  for (const f of moves.addFixedWar ?? []) {
    const cost = fixedWarCost(f.id);
    payroll += cost;
    cbtPayroll += cost;
    delta += cost;
  }
  return { payroll, cbtPayroll, delta, tax: luxuryTax(cbtPayroll, s), tier: cbtTier(cbtPayroll, s) };
};

export const payrollUpdatedAt = data.updatedAt;
