import React, { useId } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants';
import { FieldSlotPlayer } from '../utils/fieldPositions';

/**
 * Slot positions (% of canvas) — match SVG diamond (B2 54, B1/B3 69, mound ~61, home ~82–88).
 * OF pulled in toward diamond; 2B nudged right (1B side); infield + C shifted up toward OF.
 */
const SLOT_COORDS: { key: string; x: number; y: number }[] = [
  { key: 'LF', x: 22, y: 22 },
  { key: 'CF', x: 50, y: 22 },
  { key: 'RF', x: 78, y: 22 },
  { key: '3B', x: 30, y: 44 },
  { key: 'SS', x: 38, y: 38 },
  { key: '2B', x: 56, y: 36 },
  { key: '1B', x: 70, y: 44 },
  { key: 'P', x: 50, y: 48 },
  { key: 'C', x: 50, y: 62 },
  { key: 'DH', x: 14, y: 72 },
];

const LABEL_W = 56;
const LABEL_H = 28;

const VB_W = 100;
const VB_H = 100;

interface FieldHalfProps {
  abbr: string;
  fieldMap: Map<string, FieldSlotPlayer>;
  onPlayerPress?: (playerId: number) => void;
}

/**
 * Stock-style top view: fair territory = 90° circular sector (fence arc centered on home).
 * https://en.wikipedia.org/wiki/Baseball_field — diagrammatic sector matches common vectors.
 */
const BaseballFieldSvg: React.FC = () => {
  /** SVG id must be valid in HTML; useId() can emit characters that break url(#…) on web */
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '') || 'g';
  const ofg = `${uid}-of`;
  const ifg = `${uid}-if`;

  const HOME = { x: 50, y: 88 };
  /** 90° sector endpoints (same geometry as R=56 circular arc, without buggy SVG A on RN-web) */
  const k = 56 / Math.SQRT2;
  const fenceL = { x: HOME.x - k, y: HOME.y - k };
  const fenceR = { x: HOME.x + k, y: HOME.y - k };
  /** Quadratic control — CF “peak”; reads like stock diagrams, stable across web/native */
  const fenceC = { x: 50, y: 28 };

  const fairSectorPath = `M ${HOME.x} ${HOME.y} L ${fenceL.x} ${fenceL.y} Q ${fenceC.x} ${fenceC.y} ${fenceR.x} ${fenceR.y} Z`;

  const outfieldGrassPath = `M ${fenceL.x} ${fenceL.y} Q ${fenceC.x} ${fenceC.y} ${fenceR.x} ${fenceR.y} L ${HOME.x} ${HOME.y - 22} Z`;

  const B2 = { x: 50, y: 54 };
  const B1 = { x: 68, y: 69 };
  const B3 = { x: 32, y: 69 };
  const dirtHome = { x: 50, y: 82 };

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs>
        <LinearGradient id={ofg} x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#5aad68" />
          <Stop offset="0.4" stopColor="#4a8f58" />
          <Stop offset="1" stopColor="#3d6b44" />
        </LinearGradient>
        <LinearGradient id={ifg} x1="0.5" y1="0.15" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#448a52" />
          <Stop offset="0.55" stopColor="#3a6b42" />
          <Stop offset="1" stopColor="#2d4a32" />
        </LinearGradient>
      </Defs>

      {/* Foul territory — full frame; corners stay dark outside the sector */}
      <Rect x="0" y="0" width={VB_W} height={VB_H} fill="#1e2f22" />

      {/* Fair territory — sector (classic diagram: arc centered on home plate) */}
      <Path d={fairSectorPath} fill="url(#ifg)" />

      {/* Outfield grass — brighter band under the fence arc */}
      <Path d={outfieldGrassPath} fill={`url(#${ofg})`} opacity={0.85} />

      {/* Skinned infield dirt (diamond) */}
      <Path
        d={`M ${B2.x} ${B2.y} L ${B1.x} ${B1.y} L ${dirtHome.x} ${dirtHome.y} L ${B3.x} ${B3.y} Z`}
        fill="#d4b896"
        stroke="rgba(120, 92, 58, 0.55)"
        strokeWidth="0.4"
      />

      {/* Foul lines */}
      <Line
        x1={HOME.x}
        y1={HOME.y}
        x2={fenceL.x}
        y2={fenceL.y}
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="0.65"
        strokeLinecap="round"
      />
      <Line
        x1={HOME.x}
        y1={HOME.y}
        x2={fenceR.x}
        y2={fenceR.y}
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="0.65"
        strokeLinecap="round"
      />

      {/* Fence curve (quadratic, matches fair sector) */}
      <Path
        d={`M ${fenceL.x} ${fenceL.y} Q ${fenceC.x} ${fenceC.y} ${fenceR.x} ${fenceR.y}`}
        fill="none"
        stroke="rgba(20, 35, 22, 0.55)"
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      {/* Baselines */}
      <Path
        d={`M ${B2.x} ${B2.y} L ${B1.x} ${B1.y} M ${B1.x} ${B1.y} L ${dirtHome.x} ${dirtHome.y} M ${dirtHome.x} ${dirtHome.y} L ${B3.x} ${B3.y} M ${B3.x} ${B3.y} L ${B2.x} ${B2.y}`}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="0.5"
        fill="none"
      />

      <Circle cx="50" cy="61" r="3.5" fill="#b89560" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />
      <Circle cx={B1.x} cy={B1.y} r="1.2" fill="#f5f0e6" opacity={0.95} />
      <Circle cx={B2.x} cy={B2.y} r="1.3" fill="#f5f0e6" opacity={0.95} />
      <Circle cx={B3.x} cy={B3.y} r="1.2" fill="#f5f0e6" opacity={0.95} />

      <Rect x="0" y="88" width="20" height="11" rx="1.5" fill="rgba(0,0,0,0.14)" />

      {/* Home plate — below diamond vertex */}
      <Path
        d="M 44 84.5 L 56 84.5 L 56.5 87.5 L 50 91.5 L 43.5 87.5 Z"
        fill="#f2ebe0"
        stroke="#5c4a32"
        strokeWidth="0.55"
        strokeLinejoin="round"
      />
      <Path
        d="M 45.2 85.2 L 54.8 85.2 L 55.1 87 L 50 89.8 L 44.9 87 Z"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="0.22"
      />
    </Svg>
  );
};

const FieldHalf: React.FC<FieldHalfProps> = ({ abbr, fieldMap, onPlayerPress }) => (
  <View style={styles.half}>
    <Text style={styles.teamAbbr}>{abbr}</Text>
    {/* Outer shell: overflow visible so labels are not clipped; inner clips only the SVG */}
    <View style={styles.fieldShell}>
      <View style={styles.canvas}>
        <View style={styles.svgClip} pointerEvents="none">
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
              <Text style={styles.slotName} numberOfLines={1} ellipsizeMode="tail">
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
    overflow: 'visible',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: '#2d5a36',
  },
  canvas: {
    width: '100%',
    aspectRatio: VB_W / VB_H,
    position: 'relative',
    ...Platform.select({
      web: {
        display: 'block',
        minHeight: 1,
      },
      default: {},
    }),
  },
  /** Clips only the grass graphic to rounded corners; labels sit above in canvas */
  svgClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        display: 'block',
      },
      default: {},
    }),
  },
  slot: {
    position: 'absolute',
    width: LABEL_W,
    minHeight: LABEL_H,
    maxWidth: LABEL_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
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
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    maxWidth: LABEL_W - 4,
  },
  centerRule: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.xs,
    alignSelf: 'stretch',
    minHeight: 200,
  },
});
