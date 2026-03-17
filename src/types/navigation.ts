import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Home: undefined;
  BatterMatchup: { teamId: number; teamName: string };
  PitcherMatchup: { teamId: number; teamName: string };
  MatchupDetail: { batterId: number; pitcherId: number; mode: 'batter' | 'pitcher' };
  GamePrediction: {
    teamId: number;
    teamName: string;
    opponentTeamId: number;
    opponentTeamName: string;
    isHome: boolean;
    teamPitcherId?: number;
    opponentPitcherId?: number;
  };
};

export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
export type BatterMatchupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BatterMatchup'>;
export type BatterMatchupScreenRouteProp = RouteProp<RootStackParamList, 'BatterMatchup'>;
export type PitcherMatchupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PitcherMatchup'>;
export type PitcherMatchupScreenRouteProp = RouteProp<RootStackParamList, 'PitcherMatchup'>;
export type MatchupDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MatchupDetail'>;
export type MatchupDetailScreenRouteProp = RouteProp<RootStackParamList, 'MatchupDetail'>;
export type GamePredictionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GamePrediction'>;
export type GamePredictionScreenRouteProp = RouteProp<RootStackParamList, 'GamePrediction'>;
