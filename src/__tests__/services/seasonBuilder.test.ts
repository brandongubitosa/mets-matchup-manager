import {
  acquire,
  callUpCandidates,
  describeMoves,
  freeAgentCandidates,
  removeFixedWar,
  removePlayer,
  restorePlayer,
  sanitizeMoves,
  seasonData,
  tradeCandidates,
} from '../../services/seasonBuilder';
import { projectSeason } from '../../projection';

const METS = 121;
const metsWins = (moves = {}) => projectSeason(seasonData, { [METS]: moves }).find((t) => t.teamId === METS)!.wins;

describe('season builder candidates', () => {
  it('lists unsigned free agents with wins added, best first', () => {
    const fas = freeAgentCandidates(METS, {});
    expect(fas.length).toBeGreaterThan(10);
    expect(fas.every((c) => c.source === 'freeAgent')).toBe(true);
    expect(fas[0].war!).toBeGreaterThanOrEqual(fas[fas.length - 1].war!);
    expect(Math.max(...fas.map((c) => c.winsAdded))).toBeGreaterThan(1);
  });

  it('filters free agents by search and hitter/pitcher', () => {
    const pitchers = freeAgentCandidates(METS, {}, { pitchers: true });
    expect(pitchers.every((c) => /P$/.test(c.position) || c.position === 'TWP')).toBe(true);
    const [first] = freeAgentCandidates(METS, {});
    const found = freeAgentCandidates(METS, {}, { query: first.name.slice(0, 5) });
    expect(found.some((c) => c.key === first.key)).toBe(true);
  });

  it('lists trade targets from other teams only', () => {
    const targets = tradeCandidates(METS, {});
    expect(targets.length).toBe(40);
    expect(targets.every((c) => !seasonData.rosters[METS].includes(c.mlbId!))).toBe(true);
  });

  it('lists call-up candidates not on the 40-man', () => {
    const list = callUpCandidates(METS, {});
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => !seasonData.rosters[METS].includes(c.mlbId!))).toBe(true);
  });
});

describe('roster moves', () => {
  it('signing the top free agent raises the projection by about the wins shown', () => {
    const [top] = freeAgentCandidates(METS, {}).sort((a, b) => b.winsAdded - a.winsAdded);
    const moves = acquire({}, top);
    const gained = metsWins(moves) - metsWins();
    expect(gained).toBeGreaterThan(0);
    expect(Math.abs(gained - top.winsAdded)).toBeLessThan(1.5);
    expect(freeAgentCandidates(METS, moves).some((c) => c.key === top.key)).toBe(false);
  });

  it('removing and restoring a rostered player round-trips', () => {
    const id = seasonData.rosters[METS][0];
    const removed = removePlayer({}, id);
    expect(removed.remove).toEqual([id]);
    expect(restorePlayer(removed, id).remove).toEqual([]);
  });

  it('removing an added player undoes the addition', () => {
    const [target] = tradeCandidates(METS, {});
    const moves = acquire({}, target);
    expect(removePlayer(moves, target.mlbId!).add).toEqual([]);
  });

  it('handles fixed-WAR signings', () => {
    const moves = acquire({}, {
      key: 'fa-x', source: 'freeAgent', mlbId: null, name: 'NPB Star', position: 'SP', age: 28, from: 'NPB',
      war: 2, winsAdded: 2, fixedWar: { id: 'x', name: 'NPB Star', war: 2, isPitcher: true },
    });
    expect(describeMoves(moves)).toEqual([{ kind: 'addFixed', id: 'x', name: 'NPB Star' }]);
    expect(removeFixedWar(moves, 'x').addFixedWar).toEqual([]);
  });

  it('does not duplicate a fixed-WAR signing', () => {
    const c = {
      key: 'fa-x', source: 'freeAgent' as const, mlbId: null, name: 'NPB Star', position: 'SP', age: 28, from: 'NPB',
      war: 2, winsAdded: 2, fixedWar: { id: 'x', name: 'NPB Star', war: 2, isPitcher: true },
    };
    expect(acquire(acquire({}, c), c).addFixedWar).toHaveLength(1);
  });
});

describe('sanitizeMoves', () => {
  it('returns empty moves for malformed storage values', () => {
    expect(sanitizeMoves(null)).toEqual({});
    expect(sanitizeMoves('oops')).toEqual({});
    expect(sanitizeMoves([1, 2])).toEqual({});
  });

  it('keeps valid moves and drops invalid entries', () => {
    expect(
      sanitizeMoves({
        add: [1, 'x', 2.5, 3],
        remove: 'nope',
        addFixedWar: [{ id: 'a', name: 'A', war: 1.5, isPitcher: false }, { name: 'B' }, null],
      }),
    ).toEqual({ add: [1, 3], addFixedWar: [{ id: 'a', name: 'A', war: 1.5, isPitcher: false }] });
  });

  it('gives id-less fixed-WAR signings an identity Undo can remove', () => {
    const moves = sanitizeMoves({ addFixedWar: [{ name: 'NPB Star', war: 2, isPitcher: true }] });
    const [chip] = describeMoves(moves);
    expect(removeFixedWar(moves, chip.id).addFixedWar).toEqual([]);
  });
});
