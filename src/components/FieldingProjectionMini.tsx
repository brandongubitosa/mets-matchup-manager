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
  { key: 'C', x: 50, y: 74 },
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
      <LinearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#3d7a4a" />
        <Stop offset="0.45" stopColor="#356f42" />
        <Stop offset="1" stopColor="#2d5a36" />
      </LinearGradient>
      <LinearGradient id="outfieldGrad" x1="0.5" y1="0" x2="0.5" y2="1">
        <Stop offset="0" stopColor="#4a8f58" stopOpacity="0.95" />
        <Stop offset="1" stopColor="#356f42" stopOpacity="0" />
      </LinearGradient>
    </Defs>

    {/* Full grass */}
    <Rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#grassGrad)" />

    {/* Outfield “fence” arc (subtle) */}
    <Path
      d="M 4 18 Q 50 -2 96 18 L 96 92 L 4 92 Z"
      fill="url(#outfieldGrad)"
      opacity={0.45}
    />

    {/* Foul lines (from home toward foul poles) */}
    <Line
      x1="50"
      y1="71"
      x2="6"
      y2="10"
      stroke="rgba(255,255,255,0.88)"
      strokeWidth="0.55"
      strokeLinecap="round"
    />
    <Line
      x1="50"
      y1="71"
      x2="94"
      y2="10"
      stroke="rgba(255,255,255,0.88)"
      strokeWidth="0.55"
      strokeLinecap="round"
    />

    {/* Infield dirt — square between bases (rotated diamond) */}
    <Path
      d="M 50 22 L 71 46 L 50 70 L 29 46 Z"
      fill="#d4b896"
      stroke="rgba(180,140,90,0.5)"
      strokeWidth="0.35"
    />

    {/* Baselines along dirt diamond */}
    <Path
      d="M 50 22 L 71 46 M 71 46 L 50 70 M 50 70 L 29 46 M 29 46 L 50 22"
      stroke="rgba(255,255,255,0.75)"
      strokeWidth="0.45"
      fill="none"
    />

    {/* Pitcher’s mound */}
    <Circle cx="50" cy="42" r="3.2" fill="#c9a574" stroke="rgba(255,255,255,0.4)" strokeWidth="0.25" />

    {/* Second base bag (small) */}
    <Circle cx="50" cy="24" r="1.2" fill="#f5f0e6" opacity={0.9} />

    {/* Home plate + batter’s boxes hint */}
    <Path
      d="M 50 71 L 52 74 L 50 76 L 48 74 Z"
      fill="#f8f4ec"
      stroke="rgba(255,255,255,0.6)"
      strokeWidth="0.2"
    />

    {/* Dugout / bench strip for context */}
    <Rect x="4" y="78" width="18" height="10" rx="1" fill="rgba(0,0,0,0.12)" />
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
