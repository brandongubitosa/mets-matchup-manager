import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants';
import { Player, RosterPlayer } from '../types';

interface PlayerCardProps {
  player: Player | RosterPlayer;
  onPress?: () => void;
  selected?: boolean;
  showPosition?: boolean;
  variant?: 'card' | 'list';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.md * 2 - SPACING.sm) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.35;

const getHeadshotUrl = (playerId: number): string =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`;

const isPitcherPosition = (positionType?: string) => positionType === 'Pitcher';

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onPress,
  selected = false,
  showPosition = true,
  variant = 'card',
}) => {
  const [imageError, setImageError] = useState(false);
  const jerseyNumber = 'jerseyNumber' in player ? player.jerseyNumber : player.primaryNumber;
  const positionType = player.position?.type;
  const isPitcher = isPitcherPosition(positionType);

  // ─── Baseball Card Variant ────────────────────────────────────────────────
  if (variant === 'card') {
    const cardColors: [string, string] = isPitcher
      ? [COLORS.primaryDark, '#1A4A8A']
      : ['#1A1A2E', COLORS.primary];

    const handedness = player.batSide
      ? player.batSide.code === 'S' ? 'Switch' : `Bats ${player.batSide.code}`
      : player.pitchHand
      ? player.pitchHand.code === 'R' ? 'RHP' : 'LHP'
      : null;

    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          styles.cardWrapper,
          selected && styles.cardWrapperSelected,
          Platform.OS === 'web' ? { cursor: 'pointer' as unknown as undefined } : {},
        ]}
      >
        <LinearGradient colors={cardColors} style={styles.cardGradient}>
          {/* Top row: jersey + position */}
          <View style={styles.cardTopRow}>
            {jerseyNumber ? (
              <View style={styles.jerseyBadge}>
                <Text style={styles.jerseyText}>#{jerseyNumber}</Text>
              </View>
            ) : <View />}
            {showPosition && player.position?.abbreviation ? (
              <View style={[styles.positionBadge, isPitcher && styles.positionBadgePitcher]}>
                <Text style={styles.positionBadgeText}>{player.position.abbreviation}</Text>
              </View>
            ) : null}
          </View>

          {/* Headshot */}
          <View style={styles.cardHeadshotContainer}>
            {!imageError ? (
              <Image
                source={{ uri: getHeadshotUrl(player.id) }}
                style={styles.cardHeadshot}
                onError={() => setImageError(true)}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardHeadshotFallback}>
                <Text style={styles.cardHeadshotInitial}>
                  {player.fullName?.charAt(0) ?? '?'}
                </Text>
              </View>
            )}
          </View>

          {/* Bottom gradient overlay with name */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.88)']}
            style={styles.cardBottomOverlay}
          >
            <Text style={styles.cardName} numberOfLines={1}>
              {player.firstName ?? player.fullName.split(' ')[0]}
            </Text>
            <Text style={styles.cardLastName} numberOfLines={1}>
              {player.lastName ?? player.fullName.split(' ').slice(1).join(' ')}
            </Text>
            {handedness ? (
              <Text style={styles.cardHandedness}>{handedness}</Text>
            ) : null}
          </LinearGradient>

          {/* Selected overlay */}
          {selected && (
            <View style={styles.cardSelectedOverlay}>
              <View style={styles.cardCheckCircle}>
                <Text style={styles.cardCheckText}>✓</Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // ─── List Variant (compact horizontal row) ────────────────────────────────
  const accent = isPitcher ? COLORS.primary : COLORS.secondary;

  return (
    <TouchableOpacity
      style={[
        styles.listContainer,
        selected && styles.listSelected,
        { borderLeftColor: accent },
        Platform.OS === 'web' ? { cursor: 'pointer' as unknown as undefined } : {},
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.listPhotoContainer}>
        {!imageError ? (
          <Image
            source={{ uri: getHeadshotUrl(player.id) }}
            style={styles.listHeadshot}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.listFallbackPhoto, { backgroundColor: accent }]}>
            <Text style={styles.listFallbackInitial}>
              {player.fullName?.charAt(0) || '?'}
            </Text>
          </View>
        )}
        {jerseyNumber && (
          <View style={styles.listNumberBadge}>
            <Text style={styles.listNumberText}>{jerseyNumber}</Text>
          </View>
        )}
      </View>
      <View style={styles.listInfo}>
        <Text style={styles.listName} numberOfLines={1}>{player.fullName}</Text>
        {showPosition && (
          <Text style={styles.listPosition}>{player.position?.abbreviation || 'N/A'}</Text>
        )}
      </View>
      {player.batSide && (
        <View style={styles.listHandedness}>
          <Text style={styles.listHandednessText}>
            {player.batSide.code === 'S' ? 'SW' : `B:${player.batSide.code}`}
          </Text>
        </View>
      )}
      {player.pitchHand && (
        <View style={[styles.listHandedness, { backgroundColor: `${COLORS.primary}10` }]}>
          <Text style={[styles.listHandednessText, { color: COLORS.primary }]}>
            T:{player.pitchHand.code}
          </Text>
        </View>
      )}
      {selected && (
        <View style={styles.listSelectedBadge}>
          <Text style={styles.listSelectedCheck}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ── Baseball Card ──────────────────────────────────────────────────────────
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  cardWrapperSelected: {
    borderWidth: 2.5,
    borderColor: COLORS.secondary,
  },
  cardGradient: {
    flex: 1,
    position: 'relative',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    zIndex: 2,
  },
  jerseyBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  jerseyText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  positionBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  positionBadgePitcher: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  positionBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
  },
  cardHeadshotContainer: {
    alignItems: 'center',
    marginTop: SPACING.xs,
    flex: 1,
    justifyContent: 'center',
  },
  cardHeadshot: {
    width: CARD_WIDTH * 0.72,
    height: CARD_WIDTH * 0.72,
    borderRadius: (CARD_WIDTH * 0.72) / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardHeadshotFallback: {
    width: CARD_WIDTH * 0.72,
    height: CARD_WIDTH * 0.72,
    borderRadius: (CARD_WIDTH * 0.72) / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeadshotInitial: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '700',
  },
  cardBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.lg,
  },
  cardName: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardLastName: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardHandedness: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(213,0,50,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: SPACING.sm,
  },
  cardCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCheckText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: FONT_SIZE.sm,
  },

  // ── List Variant ───────────────────────────────────────────────────────────
  listContainer: {
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
  listSelected: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
    borderLeftWidth: 3,
    backgroundColor: `${COLORS.secondary}08`,
  },
  listPhotoContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  listHeadshot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightGray,
  },
  listFallbackPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listFallbackInitial: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  listNumberBadge: {
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
  listNumberText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listPosition: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listHandedness: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  listHandednessText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  listSelectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  listSelectedCheck: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
});
