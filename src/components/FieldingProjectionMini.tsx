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

const SQRT2 = Math.SQRT2;

/**
 * Standard top-down infield (like MLB / coaching diagrams): square diamond, equal basepaths,
 * home at bottom corner, 2B at top, 1B right / 3B left. ViewBox 0–100 = % of canvas.
 */
const VB = 100;
/** Base path length in viewBox units (90 ft scaled to diagram) */
const EDGE = 25;
/** Vertex where 1B–home and 3B–home meet; catcher side is larger y (below in view) */
const HOME: { x: number; y: number } = { x: 50, y: 88 };

const B1 = {
  x: HOME.x + EDGE / SQRT2,
  y: HOME.y - EDGE / SQRT2,
};
const B2 = {
  x: HOME.x,
  y: HOME.y - EDGE * SQRT2,
};
const B3 = {
  x: HOME.x - EDGE / SQRT2,
  y: HOME.y - EDGE / SQRT2,
};

/** Rubber: on line home → 2B, ~60% of the way from home toward 2B (diagrammatic) */
const MOUND = {
  x: HOME.x,
  y: HOME.y + (B2.y - HOME.y) * 0.58,
};

/** Fair OF arc — sector radius from home (same apex as diagrammatic foul lines) */
const R = 56;
const fenceK = R / SQRT2;
const FENCE_L = { x: HOME.x - fenceK, y: HOME.y - fenceK };
const FENCE_R = { x: HOME.x + fenceK, y: HOME.y - fenceK };
const FENCE_C = { x: 50, y: 26 };

/** Second baseman — shallow OF, off the 2 bag */
const B2_CHIP = { x: B2.x + 4, y: B2.y - 10 };

/**
 * Player chips (% = viewBox), aligned to square-diamond geometry.
 */
const SLOT_COORDS: { key: string; x: number; y: number }[] = [
  { key: 'LF', x: FENCE_L.x + 11, y: FENCE_L.y - 15 },
  { key: 'CF', x: FENCE_C.x, y: FENCE_C.y + 2 },
  { key: 'RF', x: FENCE_R.x - 11, y: FENCE_R.y - 15 },
  { key: '3B', x: B3.x, y: B3.y - 3 },
  { key: 'SS', x: (B3.x + B2.x) / 2 - 2, y: (B3.y + B2.y) / 2 - 4 },
  { key: '2B', x: B2_CHIP.x, y: B2_CHIP.y },
  { key: '1B', x: B1.x + 4, y: B1.y - 8 },
  { key: 'P', x: MOUND.x, y: MOUND.y - 2 },
  { key: 'C', x: HOME.x, y: HOME.y - 7 },
  { key: 'DH', x: 12, y: 76 },
];

const LABEL_W = 52;
const LABEL_H = 26;

const VB_W = VB;
const VB_H = VB;

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
 * Coaching-style infield markings: bright grass, tan skin with curved cut behind 2B,
 * white chalk (baselines, foul extensions, batter boxes), mound circle and rubber.
 */
const BaseballFieldSvg: React.FC = () => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '') || 'g';
  const grassGrad = `${uid}-grass`;

  /** Skin past the base square toward CF — arc reads like the grass edge behind the infield. */
  const skinBulgeL = { x: B3.x - 5.5, y: B3.y - 9 };
  const skinBulgeR = { x: B1.x + 5.5, y: B1.y - 9 };
  const skinArcCp = { x: B2.x, y: B2.y - 13 };
  const infieldSkinPath = `M ${HOME.x} ${HOME.y} L ${B3.x} ${B3.y} L ${skinBulgeL.x} ${skinBulgeL.y} Q ${skinArcCp.x} ${skinArcCp.y} ${skinBulgeR.x} ${skinBulgeR.y} L ${B1.x} ${B1.y} L ${HOME.x} ${HOME.y} Z`;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs>
        <LinearGradient id={grassGrad} x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#6ec578" />
          <Stop offset="1" stopColor="#4fa85c" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${grassGrad})`} />

      <Path
        d={`M ${FENCE_L.x} ${FENCE_L.y} Q ${FENCE_C.x} ${FENCE_C.y} ${FENCE_R.x} ${FENCE_R.y} L 78 ${B2.y - 16} L 22 ${B2.y - 16} Z`}
        fill="rgba(80, 170, 95, 0.45)"
      />

      <Path
        d={infieldSkinPath}
        fill="#d4b483"
        stroke="rgba(120, 90, 55, 0.55)"
        strokeWidth="0.4"
      />

      <Line
        x1={HOME.x}
        y1={HOME.y}
        x2={FENCE_L.x}
        y2={FENCE_L.y}
        stroke="#f5f8fa"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <Line
        x1={HOME.x}
        y1={HOME.y}
        x2={FENCE_R.x}
        y2={FENCE_R.y}
        stroke="#f5f8fa"
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      <Path
        d={`M ${FENCE_L.x} ${FENCE_L.y} Q ${FENCE_C.x} ${FENCE_C.y} ${FENCE_R.x} ${FENCE_R.y}`}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.55"
        strokeLinecap="round"
      />

      <Path
        d={`M ${B2.x} ${B2.y} L ${B1.x} ${B1.y} M ${B1.x} ${B1.y} L ${HOME.x} ${HOME.y} M ${HOME.x} ${HOME.y} L ${B3.x} ${B3.y} M ${B3.x} ${B3.y} L ${B2.x} ${B2.y}`}
        stroke="#f5f8fa"
        strokeWidth="0.55"
        fill="none"
        strokeLinecap="round"
      />

      <Circle cx={MOUND.x} cy={MOUND.y} r="4.2" fill="#c9a06a" stroke="#f5f8fa" strokeWidth="0.35" />
      <Rect x={MOUND.x - 0.9} y={MOUND.y - 2.4} width="1.8" height="1.15" rx="0.15" fill="#f2ebe0" />

      <BaseBagIcon cx={B1.x} cy={B1.y} n="1" />
      <BaseBagIcon cx={B2.x} cy={B2.y} n="2" />
      <BaseBagIcon cx={B3.x} cy={B3.y} n="3" />

      <Rect
        x={HOME.x - 8.6}
        y={HOME.y - 9}
        width="5.2"
        height="7.6"
        rx="0.35"
        fill="none"
        stroke="#f5f8fa"
        strokeWidth="0.45"
      />
      <Rect
        x={HOME.x + 3.4}
        y={HOME.y - 9}
        width="5.2"
        height="7.6"
        rx="0.35"
        fill="none"
        stroke="#f5f8fa"
        strokeWidth="0.45"
      />
      <Rect x="0" y={HOME.y - 2} width="20" height="11" rx="1.5" fill="rgba(0,0,0,0.12)" />

      <Path
        d={`M ${HOME.x - 2.3} ${HOME.y - 1.2} L ${HOME.x + 2.3} ${HOME.y - 1.2} L ${HOME.x + 2.6} ${HOME.y + 0.3} L ${HOME.x} ${HOME.y + 1.6} L ${HOME.x - 2.6} ${HOME.y + 0.3} Z`}
        fill="#f2ebe0"
        stroke="#f0f4f7"
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
    backgroundColor: '#4fa85c',
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
