import React, { useId } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants';
import { FieldSlotPlayer } from '../utils/fieldPositions';

/**
 * Single coordinate system (0–100 viewBox = % of canvas). Dirt, grass, bags, and chips all derive from here.
 */
const FIELD = {
  VB: 100,
  HOME: { x: 50, y: 88 },
  R: 56,
  fenceC: { x: 50, y: 28 },
  /** Square dirt diamond — 2B up, 1B/3B corners, cut toward home plate */
  B2: { x: 50, y: 54 },
  B1: { x: 68, y: 69 },
  B3: { x: 32, y: 69 },
  dirtHome: { x: 50, y: 82 },
  mound: { x: 50, y: 61 },
} as const;

const fenceK = FIELD.R / Math.SQRT2;
const FENCE_L = { x: FIELD.HOME.x - fenceK, y: FIELD.HOME.y - fenceK };
const FENCE_R = { x: FIELD.HOME.x + fenceK, y: FIELD.HOME.y - fenceK };

/** Geometric center of the dirt quadrilateral (2B–1B–home–3B) — pitcher chip target */
const DIRT_CENTROID = {
  x: (FIELD.B2.x + FIELD.B1.x + FIELD.dirtHome.x + FIELD.B3.x) / 4,
  y: (FIELD.B2.y + FIELD.B1.y + FIELD.dirtHome.y + FIELD.B3.y) / 4,
};

/** Point between 2B bag and 1B bag (2B playing closer to 1B side) */
const B2_TOWARD_B1 = {
  x: FIELD.B2.x + (FIELD.B1.x - FIELD.B2.x) * 0.42,
  y: FIELD.B2.y + (FIELD.B1.y - FIELD.B2.y) * 0.42,
};

/**
 * Player chips (% = viewBox). Spaced to limit overlap; C near plate; P at dirt centroid;
 * 2B toward 1B; 3B hugging 3rd base bag.
 */
const SLOT_COORDS: { key: string; x: number; y: number }[] = [
  { key: 'LF', x: FENCE_L.x + 8, y: FENCE_L.y - 18 },
  { key: 'CF', x: FIELD.fenceC.x, y: FIELD.fenceC.y + 2 },
  { key: 'RF', x: FENCE_R.x - 8, y: FENCE_R.y - 18 },
  { key: '3B', x: FIELD.B3.x, y: FIELD.B3.y - 3 },
  { key: 'SS', x: 44, y: 50 },
  { key: '2B', x: B2_TOWARD_B1.x, y: B2_TOWARD_B1.y },
  { key: '1B', x: FIELD.B1.x + 5, y: FIELD.B1.y - 10 },
  { key: 'P', x: DIRT_CENTROID.x, y: DIRT_CENTROID.y },
  { key: 'C', x: FIELD.HOME.x, y: (FIELD.dirtHome.y + FIELD.HOME.y) / 2 + 1 },
  { key: 'DH', x: 12, y: 76 },
];

const LABEL_W = 52;
const LABEL_H = 26;

const VB_W = FIELD.VB;
const VB_H = FIELD.VB;

/** Rotated square “bag” + number — drawn after dirt so it sits on top of grass */
const BaseBagIcon: React.FC<{ cx: number; cy: number; n: '1' | '2' | '3' }> = ({ cx, cy, n }) => {
  const s = 4.2;
  return (
    <G>
      <Rect
        x={cx - s / 2}
        y={cy - s / 2}
        width={s}
        height={s}
        fill="#faf6ef"
        stroke="#3d2918"
        strokeWidth={0.45}
        transform={`rotate(45, ${cx}, ${cy})`}
      />
      <SvgText
        x={cx}
        y={cy + 1.35}
        fontSize={3.2}
        fontWeight="800"
        fill="#2a1f12"
        textAnchor="middle"
      >
        {n}
      </SvgText>
    </G>
  );
};

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
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '') || 'g';
  const ofg = `${uid}-of`;
  const ifg = `${uid}-if`;

  const { HOME, fenceC, B2, B1, B3, dirtHome, mound } = FIELD;

  const fairSectorPath = `M ${HOME.x} ${HOME.y} L ${FENCE_L.x} ${FENCE_L.y} Q ${fenceC.x} ${fenceC.y} ${FENCE_R.x} ${FENCE_R.y} Z`;

  /** Brighter OF grass only under the fence arc (does not extend over the infield dirt) */
  const outfieldGrassPath = `M ${FENCE_L.x} ${FENCE_L.y} Q ${fenceC.x} ${fenceC.y} ${FENCE_R.x} ${FENCE_R.y} L 74 38 L 26 38 Z`;

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

      {/* 1. Foul — full frame */}
      <Rect x="0" y="0" width={VB_W} height={VB_H} fill="#1e2f22" />

      {/* 2. Fair grass (all grass behind dirt) */}
      <Path d={fairSectorPath} fill="url(#ifg)" />

      {/* 3. Outfield highlight — only the wedge under the fence, above the infield */}
      <Path d={outfieldGrassPath} fill={`url(#${ofg})`} opacity={0.9} />

      {/* 4. Infield dirt on top of grass */}
      <Path
        d={`M ${B2.x} ${B2.y} L ${B1.x} ${B1.y} L ${dirtHome.x} ${dirtHome.y} L ${B3.x} ${B3.y} Z`}
        fill="#c9a574"
        stroke="rgba(95, 72, 45, 0.65)"
        strokeWidth="0.45"
      />

      {/* Foul lines — from home through 3rd / 1st toward fence */}
      <Line
        x1={HOME.x}
        y1={HOME.y}
        x2={FENCE_L.x}
        y2={FENCE_L.y}
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="0.65"
        strokeLinecap="round"
      />
      <Line
        x1={HOME.x}
        y1={HOME.y}
        x2={FENCE_R.x}
        y2={FENCE_R.y}
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="0.65"
        strokeLinecap="round"
      />

      <Path
        d={`M ${FENCE_L.x} ${FENCE_L.y} Q ${fenceC.x} ${fenceC.y} ${FENCE_R.x} ${FENCE_R.y}`}
        fill="none"
        stroke="rgba(20, 35, 22, 0.55)"
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      {/* Baselines on dirt */}
      <Path
        d={`M ${B2.x} ${B2.y} L ${B1.x} ${B1.y} M ${B1.x} ${B1.y} L ${dirtHome.x} ${dirtHome.y} M ${dirtHome.x} ${dirtHome.y} L ${B3.x} ${B3.y} M ${B3.x} ${B3.y} L ${B2.x} ${B2.y}`}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="0.5"
        fill="none"
      />

      <Circle cx={mound.x} cy={mound.y} r="3.5" fill="#b89560" stroke="rgba(255,255,255,0.45)" strokeWidth="0.3" />

      {/* Base bags: numbered diamond icons on the dirt */}
      <BaseBagIcon cx={B1.x} cy={B1.y} n="1" />
      <BaseBagIcon cx={B2.x} cy={B2.y} n="2" />
      <BaseBagIcon cx={B3.x} cy={B3.y} n="3" />

      <Rect x="0" y="88" width="20" height="11" rx="1.5" fill="rgba(0,0,0,0.14)" />

      {/* Home plate — small pentagon at the point of the sector */}
      <Path
        d="M 47.5 85.2 L 52.5 85.2 L 52.85 86.8 L 50 88.4 L 47.15 86.8 Z"
        fill="#f2ebe0"
        stroke="#5c4a32"
        strokeWidth={0.4}
        strokeLinejoin="round"
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
    alignSelf: 'stretch',
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.xs,
  },
});
