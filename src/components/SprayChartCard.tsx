import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path, Text as SvgText, Circle, Line } from 'react-native-svg';
import { SprayChartData } from '../services/mlbApi';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';

interface SprayChartCardProps {
  data: SprayChartData | null;
  batterName: string;
  /** Defaults to current calendar year (regular season spray chart). */
  seasonYear?: number;
  loading?: boolean;
  noData?: boolean;
}

// Colour based on hit share in each zone
const getZoneColor = (pct: number): string => {
  if (pct >= 0.35) return '#1E3A8A';
  if (pct >= 0.28) return '#1D4ED8';
  if (pct >= 0.22) return '#3B82F6';
  if (pct >= 0.16) return '#93C5FD';
  return '#DBEAFE';
};

const getTextColor = (pct: number): string => (pct >= 0.22 ? '#FFFFFF' : '#1E3A8A');

// Convert clockwise-from-north angle + radius to SVG x,y
const polar = (angleDeg: number, r: number, cx: number, cy: number) => ({
  x: cx + r * Math.sin((angleDeg * Math.PI) / 180),
  y: cy - r * Math.cos((angleDeg * Math.PI) / 180),
});

// Build an annular wedge path (arc between two radii)
const wedgePath = (
  startAngle: number,
  endAngle: number,
  innerR: number,
  outerR: number,
  cx: number,
  cy: number
): string => {
  const is = polar(startAngle, innerR, cx, cy);
  const ie = polar(endAngle, innerR, cx, cy);
  const os = polar(startAngle, outerR, cx, cy);
  const oe = polar(endAngle, outerR, cx, cy);
  return [
    `M ${is.x.toFixed(2)} ${is.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 0 1 ${ie.x.toFixed(2)} ${ie.y.toFixed(2)}`,
    `L ${oe.x.toFixed(2)} ${oe.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 0 0 ${os.x.toFixed(2)} ${os.y.toFixed(2)}`,
    'Z',
  ].join(' ');
};

// Draw a foul line
const foulLinePath = (angleDeg: number, r: number, cx: number, cy: number): string => {
  const start = polar(angleDeg, 20, cx, cy);
  const end = polar(angleDeg, r, cx, cy);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
};

const SECTIONS: Array<{ key: keyof Omit<SprayChartData, 'total'>; label: string; startAngle: number; endAngle: number }> = [
  { key: 'leftField',       label: 'LF',  startAngle: -45, endAngle: -27 },
  { key: 'leftCenterField', label: 'LCF', startAngle: -27, endAngle:  -9 },
  { key: 'centerField',     label: 'CF',  startAngle:  -9, endAngle:   9 },
  { key: 'rightCenterField',label: 'RCF', startAngle:   9, endAngle:  27 },
  { key: 'rightField',      label: 'RF',  startAngle:  27, endAngle:  45 },
];

export const SprayChartCard: React.FC<SprayChartCardProps> = ({
  data,
  batterName,
  seasonYear = new Date().getFullYear(),
  loading = false,
  noData = false,
}) => {
  const W = 280;
  const H = 200;
  const cx = W / 2;
  const cy = H - 20;
  const INNER_R = 38;
  const OUTER_R = 155;
  const LABEL_R = (INNER_R + OUTER_R) / 2;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spray Chart</Text>
      <Text style={styles.subtitle}>
        {batterName} — share of balls in play by field ({seasonYear} season; MLB index, zones sum to 100)
      </Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>Loading spray chart...</Text>
        </View>
      ) : noData || !data ? (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>Spray chart data unavailable</Text>
        </View>
      ) : (
        <View style={styles.chartWrapper}>
          <Svg width={W} height={H}>
            {/* Foul lines */}
            <Path
              d={foulLinePath(-45, OUTER_R + 10, cx, cy)}
              stroke="#9CA3AF"
              strokeWidth={1.5}
              strokeDasharray="4,3"
              fill="none"
            />
            <Path
              d={foulLinePath(45, OUTER_R + 10, cx, cy)}
              stroke="#9CA3AF"
              strokeWidth={1.5}
              strokeDasharray="4,3"
              fill="none"
            />

            {/* Field sections */}
            {SECTIONS.map((section) => {
              const count = data[section.key];
              const pct = count / data.total;
              const midAngle = (section.startAngle + section.endAngle) / 2;
              const labelPt = polar(midAngle, LABEL_R, cx, cy);
              const pctPt = polar(midAngle, LABEL_R + 16, cx, cy);

              return (
                <React.Fragment key={section.key}>
                  <Path
                    d={wedgePath(section.startAngle, section.endAngle, INNER_R, OUTER_R, cx, cy)}
                    fill={getZoneColor(pct)}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={labelPt.x}
                    y={labelPt.y - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight="700"
                    fill={getTextColor(pct)}
                  >
                    {section.label}
                  </SvgText>
                  <SvgText
                    x={pctPt.x}
                    y={labelPt.y + 8}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="800"
                    fill={getTextColor(pct)}
                  >
                    {Math.round(pct * 100)}%
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Outer arc border */}
            <Path
              d={`M ${polar(-45, OUTER_R, cx, cy).x.toFixed(2)} ${polar(-45, OUTER_R, cx, cy).y.toFixed(2)} A ${OUTER_R} ${OUTER_R} 0 0 1 ${polar(45, OUTER_R, cx, cy).x.toFixed(2)} ${polar(45, OUTER_R, cx, cy).y.toFixed(2)}`}
              fill="none"
              stroke="#374151"
              strokeWidth={2}
            />

            {/* Home plate */}
            <Circle cx={cx} cy={cy} r={10} fill="#D1D5DB" stroke="#6B7280" strokeWidth={1.5} />
            <SvgText x={cx} y={cy + 4} textAnchor="middle" fontSize={7} fontWeight="700" fill="#4B5563">
              HOME
            </SvgText>
          </Svg>

          {/* Legend */}
          <View style={styles.statsRow}>
            {SECTIONS.map((section) => {
              const count = data[section.key];
              const pct = Math.round((count / data.total) * 100);
              return (
                <View key={section.key} style={styles.statCell}>
                  <Text style={styles.statLabel}>{section.label}</Text>
                  <Text style={styles.statValue}>{count}</Text>
                  <Text style={styles.statPct}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.md,
  },
  title: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  statPct: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  statusText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  noDataText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
