import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import { Player, RosterPlayer } from '../types';

interface PlayerCardProps {
  player: Player | RosterPlayer;
  onPress?: () => void;
  selected?: boolean;
  showPosition?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onPress,
  selected = false,
  showPosition = true,
}) => {
  const jerseyNumber = 'jerseyNumber' in player ? player.jerseyNumber : player.primaryNumber;

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.numberContainer}>
        <Text style={styles.number}>{jerseyNumber || '--'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{player.fullName}</Text>
        {showPosition && (
          <Text style={styles.position}>{player.position?.abbreviation || 'N/A'}</Text>
        )}
      </View>
      {player.batSide && (
        <View style={styles.handedness}>
          <Text style={styles.handednessText}>
            {player.batSide.code === 'S' ? 'Switch' : `Bats: ${player.batSide.code}`}
          </Text>
        </View>
      )}
      {player.pitchHand && (
        <View style={styles.handedness}>
          <Text style={styles.handednessText}>Throws: {player.pitchHand.code}</Text>
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
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selected: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
  },
  numberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  number: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  position: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  handedness: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  handednessText: {
    fontSize: 10,
    color: COLORS.gray,
  },
});
