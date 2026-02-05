import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const SkeletonBlock: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = RADIUS.sm,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: COLORS.lightGray,
          opacity: shimmerAnim,
        },
        style,
      ]}
    />
  );
};

export const SkeletonPlayerCard: React.FC = () => {
  return (
    <View style={styles.playerCard}>
      <SkeletonBlock width={50} height={50} borderRadius={25} />
      <View style={styles.playerCardInfo}>
        <SkeletonBlock width={140} height={16} />
        <SkeletonBlock width={60} height={12} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBlock width={60} height={24} borderRadius={4} />
    </View>
  );
};

export const SkeletonPlayerList: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPlayerCard key={i} />
      ))}
    </View>
  );
};

export const SkeletonStatsTable: React.FC = () => {
  return (
    <View style={styles.statsTable}>
      <SkeletonBlock width={120} height={14} style={{ marginBottom: 12 }} />
      <View style={styles.statsRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.statsCell}>
            <SkeletonBlock width={30} height={10} />
            <SkeletonBlock width={36} height={20} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      <View style={[styles.statsRow, { marginTop: 12 }]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.statsCell}>
            <SkeletonBlock width={30} height={10} />
            <SkeletonBlock width={36} height={20} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

export const SkeletonGameCard: React.FC = () => {
  return (
    <View style={styles.gameCard}>
      <View style={styles.gameCardHeader}>
        <SkeletonBlock width={100} height={14} />
        <SkeletonBlock width={60} height={14} />
      </View>
      <View style={styles.gameCardBody}>
        <View style={{ alignItems: 'center' }}>
          <SkeletonBlock width={50} height={50} borderRadius={25} />
          <SkeletonBlock width={40} height={16} style={{ marginTop: 8 }} />
        </View>
        <SkeletonBlock width={24} height={16} />
        <View style={{ alignItems: 'center' }}>
          <SkeletonBlock width={50} height={50} borderRadius={25} />
          <SkeletonBlock width={40} height={16} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  playerCardInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  statsTable: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsCell: {
    alignItems: 'center',
  },
  gameCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  gameCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: SPACING.lg,
  },
});
