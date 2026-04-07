import { LineupPlayer, RosterPlayer } from '../types';

/** Map MLB position abbreviations to a standard defensive slot on the diagram. */
export function normalizeDefenseSlot(abbr: string | undefined | null): string | null {
  if (!abbr) return null;
  const a = abbr.toUpperCase().trim();
  if (['P', 'SP', 'RP'].includes(a)) return 'P';
  if (a === 'C') return 'C';
  if (['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'].includes(a)) return a;
  if (a === 'OF') return 'CF';
  return null;
}

const SLOT_ORDER = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;

export function getLastNameFromFull(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : fullName;
}

export type FieldSlotPlayer = { playerId: number; lastName: string };

/** Prefer lineup (defensive positions); ignore batting order. */
export function buildFieldMapFromLineup(lineup: LineupPlayer[]): Map<string, FieldSlotPlayer> {
  const map = new Map<string, FieldSlotPlayer>();
  for (const p of lineup) {
    const slot = normalizeDefenseSlot(p.position);
    if (!slot || map.has(slot)) continue;
    map.set(slot, { playerId: p.playerId, lastName: getLastNameFromFull(p.fullName) });
  }
  return map;
}

/** Best-effort when boxscore lineup is empty: one player per defensive slot from roster. */
export function buildFieldMapFromRoster(roster: RosterPlayer[]): Map<string, FieldSlotPlayer> {
  const map = new Map<string, FieldSlotPlayer>();
  const used = new Set<number>();
  for (const slot of SLOT_ORDER) {
    const found = roster.find((r) => {
      const abbr = r.position?.abbreviation;
      const slotFor = normalizeDefenseSlot(abbr);
      return slotFor === slot && !used.has(r.id);
    });
    if (found) {
      map.set(slot, { playerId: found.id, lastName: found.lastName });
      used.add(found.id);
    }
  }
  return map;
}
