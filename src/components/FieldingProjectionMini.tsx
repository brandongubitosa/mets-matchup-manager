import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants';
import { FieldSlotPlayer } from '../utils/fieldPositions';

/**
 * Normalized coordinates (0–100 wide, 0–92 tall) for a top-down defensive diagram:
 * home plate bottom center, 2B toward top, 1B right / 3B left, OF toward top edge.
 */
const SLOT_COORDS: { key: string; x: number; y: number }[] = [
  { key: 'LF', x: 18, y: 7 },
  { key: 'CF', x: 50, y: 4 },
  { key: 'RF', x: 82, y: 7 },
  { key: '3B', x: 30, y: 46 },
  { key: 'SS', x: 40, y: 36 },
  { key: '2B', x: 50, y: 24 },
  { key: '1B', x: 70, y: 46 },
  { key: 'P', x: 50, y: 42 },
  /** Above home plate so the label does not cover the pentagon (plate ~y 71–79 in viewBox) */
  { key: 'C', x: 50, y: 54 },
  { key: 'DH', x: 12, y: 82 },
];

const LABEL_W = 58;
const LABEL_H = 30;

/** ViewBox matches coordinate system above */
const VB_W = 100;
const VB_H = 92;

interface FieldHalfProps {
  abbr: string;
  fieldMap: Map<string, FieldSlotPlayer>;
  onPlayerPress?: (playerId: number) => void;
}

const BaseballFieldSvg: React.FC = () => (
  <Svg
    width="100%"
    height="100%"
    viewBox={`0 0 ${VB_W} ${VB_H}`}
    preserveAspectRatio="xMidYMid meet"
  >
    <Defs>
      {/* Outfield: lusher, brighter grass */}
      <LinearGradient id="outfieldGrassGrad" x1="0.5" y1="0" x2="0.5" y2="1">
        <Stop offset="0" stopColor="#4f9a5e" />
        <Stop offset="0.55" stopColor="#3d7a4a" />
        <Stop offset="1" stopColor="#2f5c38" />
      </LinearGradient>
      {/* Infield fair territory: grass, but flatter / less vivid than OF */}
      <LinearGradient id="infieldGrassGrad" x1="0.5" y1="0.35" x2="0.5" y2="1">
        <Stop offset="0" stopColor="#3d6844" />
        <Stop offset="1" stopColor="#335a3a" />
      </LinearGradient>
    </Defs>

    {/* Base: infield-style grass (full canvas) — less saturated than outfield overlay */}
    <Rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#infieldGrassGrad)" />

    {/* Outfield arc — noticeably greener than infield */}
    <Path
      d="M 2 20 Q 50 -4 98 20 L 98 92 L 2 92 Z"
      fill="url(#outfieldGrassGrad)"
      opacity={0.92}
    />

    {/* Fair wedge: subtle infield grass tint (less vivid than outfield arc above) */}
    <Path
      d="M 6 12 L 50 72 L 94 12 L 94 92 L 6 92 Z"
      fill="#3a5f40"
      opacity={0.18}
    />

    {/* Skinned dirt: basepaths + home area (dirt dominant; grass shows around the wedge edges) */}
    {/* Wide dirt from 3B side toward home */}
    <Path
      d="M 29 46 L 50 22 L 50 70 L 38 76 L 26 52 Z"
      fill="#d4b896"
      opacity={0.95}
    />
    {/* Wide dirt from 1B corner toward home */}
    <Path
      d="M 71 46 L 50 22 L 50 70 L 62 76 L 74 52 Z"
      fill="#d4b896"
      opacity={0.95}
    />
    {/* Skinned cutout around home */}
    <Path
      d="M 38 76 Q 50 82 62 76 L 62 72 Q 50 68 38 72 Z"
      fill="#d4b896"
    />
    {/* Inner diamond (bases) */}
    <Path
      d="M 50 22 L 71 46 L 50 70 L 29 46 Z"
      fill="#d4b896"
      stroke="rgba(160,125,80,0.4)"
      strokeWidth="0.35"
    />

    {/* Foul lines (from home toward foul poles) */}
    <Line
      x1="50"
      y1="72"
      x2="6"
      y2="10"
      stroke="rgba(255,255,255,0.9)"
      strokeWidth="0.55"
      strokeLinecap="round"
    />
    <Line
      x1="50"
      y1="72"
      x2="94"
      y2="10"
      stroke="rgba(255,255,255,0.9)"
      strokeWidth="0.55"
      strokeLinecap="round"
    />

    {/* Baselines on dirt */}
    <Path
      d="M 50 22 L 71 46 M 71 46 L 50 70 M 50 70 L 29 46 M 29 46 L 50 22"
      stroke="rgba(255,255,255,0.78)"
      strokeWidth="0.45"
      fill="none"
    />

    {/* Pitcher’s mound */}
    <Circle cx="50" cy="42" r="3.2" fill="#b89560" stroke="rgba(255,255,255,0.45)" strokeWidth="0.28" />

    {/* Second base bag */}
    <Circle cx="50" cy="24" r="1.2" fill="#f5f0e6" opacity={0.95} />

    {/* Dugout / bench strip */}
    <Rect x="4" y="78" width="18" height="10" rx="1" fill="rgba(0,0,0,0.12)" />

    {/* Home plate — pentagon, large and high-contrast (drawn last so it stays visible) */}
    <Path
      d="M 44 71.5 L 56 71.5 L 56.5 74.8 L 50 79.5 L 43.5 74.8 Z"
      fill="#f2ebe0"
      stroke="#5c4a32"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <Path
      d="M 45 72.2 L 55 72.2 L 55.2 74.5 L 50 78.2 L 44.8 74.5 Z"
      fill="none"
      stroke="rgba(255,255,255,0.65)"
      strokeWidth="0.22"
    />
  </Svg>
);

const FieldHalf: React.FC<FieldHalfProps> = ({ abbr, fieldMap, onPlayerPress }) => (
  <View style={styles.half}>
    <Text style={styles.teamAbbr}>{abbr}</Text>
    <View style={styles.fieldShell}>
      <View style={styles.canvas}>
        <View style={styles.svgLayer} pointerEvents="none">
          <BaseballFieldSvg />
        </View>
        {SLOT_COORDS.map(({ key, x, y }) => {
          const p = fieldMap.get(key);
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.slot,
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  marginLeft: -LABEL_W / 2,
                  marginTop: -LABEL_H / 2,
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
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: '#2d5a36',
  },
  canvas: {
    width: '100%',
    aspectRatio: VB_W / VB_H,
    position: 'relative',
  },
  svgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  slot: {
    position: 'absolute',
    width: LABEL_W,
    minHeight: LABEL_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 3,
    backgroundColor: 'rgba(15, 35, 20, 0.82)',
    borderRadius: 5,
    borderWidth: Platform.OS === 'web' ? 0 : StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 2,
        elevation: 3,
      },
    }),
  },
  slotKey: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.4,
  },
  slotName: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    maxWidth: LABEL_W - 6,
  },
  centerRule: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.xs,
    alignSelf: 'stretch',
    minHeight: 200,
  },
});
