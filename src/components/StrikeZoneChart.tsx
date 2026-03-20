import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Rect, Text as SvgText, G, Line } from 'react-native-svg';
import { HotZone } from '../types';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';

interface StrikeZoneChartProps {
  zones: HotZone[];
  batterName: string;
  loading?: boolean;
  noData?: boolean;
}

// Standard 9-zone grid: zone number → [row, col] (0-indexed, top-left origin)
const ZONE_GRID: Record<string, [number, number]> = {
  '01': [0, 0], '02': [0, 1], '03': [0, 2],
  '04': [1, 0], '05': [1, 1], '06': [1, 2],
  '07': [2, 0], '08': [2, 1], '09': [2, 2],
};

// Chase zones positioned around the main grid
// [row, col] using a 5-col, 5-row coordinate system where main zone occupies cols 1-3, rows 1-3
const CHASE_ZONE_POSITIONS: Record<string, { x: number; y: number; width: number; height: number }> = {
  '11': { x: 0, y: 0, width: 3, height: 1 },      // top-left chase
  '12': { x: 3, y: 0, width: 1, height: 3 },      // right chase
  '13': { x: 0, y: 3, width: 3, height: 1 },      // bottom chase
  '14': { x: 0, y: 0, width: 1, height: 3 },      // left chase
};

const getZoneColor = (value: string): string => {
  const avg = parseFloat(value);
  if (isNaN(avg) || avg === 0) return '#E5E7EB';
  if (avg >= 0.350) return '#C62828';
  if (avg >= 0.310) return '#EF5350';
  if (avg >= 0.275) return '#FFA726';
  if (avg >= 0.240) return '#FFEE58';
  if (avg >= 0.210) return '#64B5F6';
  return '#1565C0';
};

const getTextColor = (value: string): string => {
  const avg = parseFloat(value);
  if (isNaN(avg) || avg === 0) return '#9CA3AF';
  if (avg >= 0.320 || avg < 0.220) return '#FFFFFF';
  return '#1A1A2E';
};

const formatAvg = (value: string): string => {
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return '-';
  return num.toFixed(3).replace('0.', '.');
};

export const StrikeZoneChart: React.FC<StrikeZoneChartProps> = ({
  zones,
  batterName,
  loading = false,
  noData = false,
}) => {
  const CELL = 54;
  const CHASE = 18;
  const PAD = 12;
  const TITLE_H = 20;
  const PLATE_H = 18;

  // Main zone area dimensions
  const zoneW = CELL * 3;
  const zoneH = CELL * 3;

  // Total SVG size (main zone + chase strips on 3 sides + padding)
  const svgW = CHASE + zoneW + CHASE + PAD * 2;
  const svgH = TITLE_H + CHASE + zoneH + CHASE + PAD + PLATE_H + PAD;

  // Origin of main 3x3 grid within SVG
  const originX = PAD + CHASE;
  const originY = TITLE_H + PAD + CHASE;

  // Build zone lookup
  const zoneMap: Record<string, HotZone> = {};
  zones.forEach((z) => {
    zoneMap[z.zone.padStart(2, '0')] = z;
  });

  const renderMainZones = () =>
    Object.entries(ZONE_GRID).map(([key, [row, col]]) => {
      const zone = zoneMap[key];
      const x = originX + col * CELL;
      const y = originY + row * CELL;
      const bg = zone ? getZoneColor(zone.value) : '#E5E7EB';
      const fg = zone ? getTextColor(zone.value) : '#9CA3AF';
      const label = zone ? formatAvg(zone.value) : '-';

      return (
        <G key={key}>
          <Rect
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            fill={bg}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          <SvgText
            x={x + CELL / 2}
            y={y + CELL / 2 + 5}
            textAnchor="middle"
            fontSize={13}
            fontWeight="bold"
            fill={fg}
          >
            {label}
          </SvgText>
        </G>
      );
    });

  const renderChaseZones = () => {
    const chaseData: Array<{ key: string; x: number; y: number; w: number; h: number }> = [
      // Top strip (zone 11)
      { key: '11', x: originX, y: originY - CHASE, w: zoneW, h: CHASE },
      // Right strip (zone 12)
      { key: '12', x: originX + zoneW, y: originY, w: CHASE, h: zoneH },
      // Bottom strip (zone 13)
      { key: '13', x: originX, y: originY + zoneH, w: zoneW, h: CHASE },
      // Left strip (zone 14)
      { key: '14', x: originX - CHASE, y: originY, w: CHASE, h: zoneH },
    ];

    return chaseData.map(({ key, x, y, w, h }) => {
      const zone = zoneMap[key];
      const bg = zone ? getZoneColor(zone.value) : '#F3F4F6';
      const fg = zone ? getTextColor(zone.value) : '#9CA3AF';
      const label = zone ? formatAvg(zone.value) : '';

      return (
        <G key={key}>
          <Rect
            x={x}
            y={y}
            width={w}
            height={h}
            fill={bg}
            stroke="#E5E7EB"
            strokeWidth={1}
          />
          {label ? (
            <SvgText
              x={x + w / 2}
              y={y + h / 2 + 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              fill={fg}
            >
              {label}
            </SvgText>
          ) : null}
        </G>
      );
    });
  };

  const renderStrikeZoneBorder = () => (
    <Rect
      x={originX}
      y={originY}
      width={zoneW}
      height={zoneH}
      fill="transparent"
      stroke="#374151"
      strokeWidth={2.5}
    />
  );

  const renderHomePlate = () => {
    const plateY = originY + zoneH + CHASE + 6;
    const plateW = 40;
    const plateX = originX + zoneW / 2 - plateW / 2;
    return (
      <G>
        <Rect
          x={plateX}
          y={plateY}
          width={plateW}
          height={PLATE_H - 4}
          fill="#D1D5DB"
          stroke="#6B7280"
          strokeWidth={1.5}
          rx={3}
        />
        <SvgText
          x={originX + zoneW / 2}
          y={plateY + (PLATE_H - 4) / 2 + 4}
          textAnchor="middle"
          fontSize={8}
          fontWeight="600"
          fill="#4B5563"
        >
          HOME
        </SvgText>
        {/* Center line from plate to zone */}
        <Line
          x1={originX + zoneW / 2}
          y1={originY + zoneH + CHASE}
          x2={originX + zoneW / 2}
          y2={plateY}
          stroke="#D1D5DB"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      </G>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Strike Zone Chart</Text>
      <Text style={styles.subtitle}>{batterName} — Batting Average by Zone</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>Loading zone data...</Text>
        </View>
      ) : noData ? (
        <View style={styles.centered}>
          <Text style={styles.noDataText}>Zone data unavailable for this season</Text>
        </View>
      ) : (
        <>
          <View style={styles.chartWrapper}>
            <Svg width={svgW} height={svgH}>
              <SvgText
                x={svgW / 2}
                y={14}
                textAnchor="middle"
                fontSize={9}
                fontWeight="700"
                fill="#9CA3AF"
                letterSpacing={1}
              >
                PITCHER'S VIEW
              </SvgText>
              {renderChaseZones()}
              {renderMainZones()}
              {renderStrikeZoneBorder()}
              {renderHomePlate()}
            </Svg>
          </View>

          <View style={styles.legend}>
            {[
              { color: '#1565C0', label: 'Cold (<.210)' },
              { color: '#FFEE58', label: 'Neutral' },
              { color: '#FFA726', label: 'Warm' },
              { color: '#C62828', label: 'Hot (>.350)' },
            ].map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </>
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
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
});
