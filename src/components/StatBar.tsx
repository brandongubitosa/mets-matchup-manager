import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants';

interface StatBarProps {
  label: string;
  value: number;        // The actual value (e.g., 0.300)
  maxValue?: number;    // The max for the bar scale (e.g., 1.0 for AVG)
  displayValue: string; // The formatted string to show (e.g., ".300")
  color?: string;
  thresholds?: {
    good: number;
    average: number;
  };
}

const getColorForValue = (
  value: number,
  thresholds?: { good: number; average: number }
): string => {
  if (!thresholds) return COLORS.primary;
  if (value >= thresholds.good) return COLORS.success;
  if (value >= thresholds.average) return COLORS.warning;
  return COLORS.danger;
};

export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  maxValue = 1,
  displayValue,
  color,
  thresholds,
}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const barColor = color || getColorForValue(value, thresholds);
  const percentage = Math.min((value / maxValue) * 100, 100);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percentage,
      duration: 800,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [percentage, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: barColor }]}>{displayValue}</Text>
      </View>
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: animatedWidth,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
  barBackground: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
});
