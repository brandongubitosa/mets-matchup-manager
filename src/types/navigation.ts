import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

export type MatchupFlowBaseParams = {
  teamId: number;
  teamName: string;
  opponentTeamId?: number;
  opponentTeamName?: string;
};

export type GamePredictionRouteParams = {
  teamId: number;
  teamName: string;
  opponentTeamId: number;
  opponentTeamName: string;
  isHome: boolean;
  teamPitcherId?: number;
  opponentPitcherId?: number;
};

export type PlayerBackCardParams = {
  playerId: number;
  counterpartPlayerId?: number;
  counterpartPlayerName?: string;
  opponentTeamId?: number;
  opponentTeamName?: string;
  backToBatterMatchup?: MatchupFlowBaseParams;
  backToPitcherMatchup?: MatchupFlowBaseParams;
  backToLiveScores?: { highlightTeamId?: number };
  backToGamePrediction?: GamePredictionRouteParams;
  backToMatchupDetail?: {
    batterId: number;
    pitcherId: number;
    mode: 'batter' | 'pitcher';
  };
};

export type RootStackParamList = {
  Home: undefined;
  LiveScores: { highlightTeamId?: number };
  BatterMatchup: MatchupFlowBaseParams & {
    pendingBatterId?: number;
    clearBatter?: boolean;
  };
  PitcherMatchup: MatchupFlowBaseParams & {
    pendingPitcherId?: number;
    clearPitcher?: boolean;
  };
  MatchupDetail: { batterId: number; pitcherId: number; mode: 'batter' | 'pitcher' };
  GamePrediction: GamePredictionRouteParams;
  PlayerBackCard: PlayerBackCardParams;
};

export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
export type LiveScoresScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LiveScores'>;
export type LiveScoresScreenRouteProp = RouteProp<RootStackParamList, 'LiveScores'>;
export type BatterMatchupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BatterMatchup'>;
export type BatterMatchupScreenRouteProp = RouteProp<RootStackParamList, 'BatterMatchup'>;
export type PitcherMatchupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PitcherMatchup'>;
export type PitcherMatchupScreenRouteProp = RouteProp<RootStackParamList, 'PitcherMatchup'>;
export type MatchupDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MatchupDetail'>;
export type MatchupDetailScreenRouteProp = RouteProp<RootStackParamList, 'MatchupDetail'>;
export type GamePredictionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GamePrediction'>;
export type GamePredictionScreenRouteProp = RouteProp<RootStackParamList, 'GamePrediction'>;
export type PlayerBackCardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlayerBackCard'>;
export type PlayerBackCardScreenRouteProp = RouteProp<RootStackParamList, 'PlayerBackCard'>;
