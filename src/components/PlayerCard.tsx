import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';
import { Player, RosterPlayer } from '../types';

interface PlayerCardProps {
  player: Player | RosterPlayer;
  onPress?: () => void;
  selected?: boolean;
  showPosition?: boolean;
}

const getHeadshotUrl = (playerId: number): string => {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;
};

const getAccentColor = (positionType?: string): string => {
  if (positionType === 'Pitcher') return COLORS.primary;
  return COLORS.secondary;
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onPress,
  selected = false,
  showPosition = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const jerseyNumber = 'jerseyNumber' in player ? player.jerseyNumber : player.primaryNumber;
  const positionType = player.position?.type;
  const accent = getAccentColor(positionType);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.selected,
        { borderLeftColor: accent },
        Platform.OS === 'web' ? { cursor: 'pointer' as unknown as undefined } : {},
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.photoContainer}>
        {!imageError ? (
          <Image
            source={{ uri: getHeadshotUrl(player.id) }}
            style={styles.headshot}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.fallbackPhoto, { backgroundColor: accent }]}>
            <Text style={styles.fallbackInitial}>
              {player.fullName?.charAt(0) || '?'}
            </Text>
          </View>
        )}
        {jerseyNumber && (
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{jerseyNumber}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{player.fullName}</Text>
        {showPosition && (
          <Text style={styles.position}>{player.position?.abbreviation || 'N/A'}</Text>
        )}
      </View>
      {player.batSide && (
        <View style={styles.handedness}>
          <Text style={styles.handednessText}>
            {player.batSide.code === 'S' ? 'SW' : `B:${player.batSide.code}`}
          </Text>
        </View>
      )}
      {player.pitchHand && (
        <View style={[styles.handedness, { backgroundColor: `${COLORS.primary}10` }]}>
          <Text style={[styles.handednessText, { color: COLORS.primary }]}>
            T:{player.pitchHand.code}
          </Text>
        </View>
      )}
      {selected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedCheck}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    ...SHADOW.sm,
  },
  selected: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
    borderLeftWidth: 3,
    backgroundColor: `${COLORS.secondary}08`,
  },
  photoContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  headshot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightGray,
  },
  fallbackPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackInitial: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  numberBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  numberText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  position: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  handedness: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  handednessText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  selectedCheck: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
});
