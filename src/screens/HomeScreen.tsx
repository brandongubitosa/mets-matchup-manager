import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants';

type RootStackParamList = {
  Home: undefined;
  BatterMatchup: undefined;
  PitcherMatchup: undefined;
  MatchupDetail: { batterId: number; pitcherId: number };
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>⚾</Text>
        <Text style={styles.title}>Mets Matchup</Text>
        <Text style={styles.subtitle}>Manager</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('BatterMatchup')}
          activeOpacity={0.8}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>🏏</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Mets Batters</Text>
            <Text style={styles.cardDescription}>
              See how Mets hitters perform against opposing pitchers
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PitcherMatchup')}
          activeOpacity={0.8}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>⚾</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Mets Pitchers</Text>
            <Text style={styles.cardDescription}>
              See how Mets pitchers perform against opposing batters
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Data from MLB Stats API</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logo: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 24,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  arrow: {
    fontSize: 24,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: COLORS.background,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
  },
});
