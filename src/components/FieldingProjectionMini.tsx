import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants';
import { FieldSlotPlayer } from '../utils/fieldPositions';

/** Percent positions (top-left of field shell); slots centered with margin offset. */
const SLOTS: { key: string; leftPct: number; topPct: number }[] = [
  { key: 'LF', leftPct: 10, topPct: 8 },
  { key: 'CF', leftPct: 50, topPct: 6 },
  { key: 'RF', leftPct: 90, topPct: 8 },
  { key: '3B', leftPct: 22, topPct: 34 },
  { key: 'SS', leftPct: 38, topPct: 40 },
  { key: '2B', leftPct: 62, topPct: 40 },
  { key: '1B', leftPct: 78, topPct: 34 },
  { key: 'P', leftPct: 50, topPct: 52 },
  { key: 'C', leftPct: 50, topPct: 72 },
  { key: 'DH', leftPct: 14, topPct: 82 },
];

const SLOT_WIDTH = 54;

interface FieldHalfProps {
  abbr: string;
  fieldMap: Map<string, FieldSlotPlayer>;
  onPlayerPress?: (playerId: number) => void;
}

const FieldHalf: React.FC<FieldHalfProps> = ({ abbr, fieldMap, onPlayerPress }) => (
  <View style={styles.half}>
    <Text style={styles.teamAbbr}>{abbr}</Text>
    <View style={styles.fieldShell}>
      <View style={styles.grass}>
        {SLOTS.map(({ key, leftPct, topPct }) => {
          const p = fieldMap.get(key);
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.slot,
                {
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  marginLeft: -SLOT_WIDTH / 2,
                },
              ]}
              disabled={!p || !onPlayerPress}
              onPress={() => p && onPlayerPress?.(p.playerId)}
              activeOpacity={0.75}
              accessibilityRole={p && onPlayerPress ? 'button' : undefined}
              accessibilityLabel={p ? `${key} ${p.lastName}` : `${key} empty`}
            >
              <Text style={styles.slotKey}>{key}</Text>
              <Text style={styles.slotName} numberOfLines={1}>
                {p?.lastName ?? '—'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  </View>
);

interface FieldingProjectionMiniProps {
  myAbbr: string;
  oppAbbr: string;
  myFieldMap: Map<string, FieldSlotPlayer>;
  oppFieldMap: Map<string, FieldSlotPlayer>;
  onPlayerPress?: (playerId: number, opponentTeamId: number, opponentTeamName: string) => void;
  opponentTeamId: number;
  opponentTeamName: string;
}

export const FieldingProjectionMini: React.FC<FieldingProjectionMiniProps> = ({
  myAbbr,
  oppAbbr,
  myFieldMap,
  oppFieldMap,
  onPlayerPress,
  opponentTeamId,
  opponentTeamName,
}) => (
  <View style={styles.row}>
    <FieldHalf
      abbr={myAbbr}
      fieldMap={myFieldMap}
      onPlayerPress={onPlayerPress ? (id) => onPlayerPress(id, opponentTeamId, opponentTeamName) : undefined}
    />
    <View style={styles.centerRule} />
    <FieldHalf
      abbr={oppAbbr}
      fieldMap={oppFieldMap}
      onPlayerPress={onPlayerPress ? (id) => onPlayerPress(id, opponentTeamId, opponentTeamName) : undefined}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 210,
  },
  half: {
    flex: 1,
  },
  teamAbbr: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  fieldShell: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  grass: {
    flex: 1,
    minHeight: 188,
    backgroundColor: '#2f5233',
    position: 'relative',
  },
  slot: {
    position: 'absolute',
    width: SLOT_WIDTH,
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 4,
  },
  slotKey: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
  },
  slotName: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    maxWidth: SLOT_WIDTH - 4,
  },
  centerRule: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.xs,
  },
});
