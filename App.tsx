import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  HomeScreen,
  LiveScoresScreen,
  BatterMatchupScreen,
  PitcherMatchupScreen,
  MatchupDetailScreen,
  GamePredictionScreen,
  PlayerBackCardScreen,
  PredictionHistoryScreen,
} from './src/screens';
import { ErrorBoundary, WebContainer } from './src/components';
import { WebDocumentHead } from './src/components/WebDocumentHead';
import { COLORS } from './src/constants';
import { RootStackParamList } from './src/types';
import { Analytics } from '@vercel/analytics/react';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ErrorBoundary>
      <WebDocumentHead />
      <WebContainer>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.primary,
              },
              headerTintColor: COLORS.white,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              headerBackTitle: '',
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="LiveScores"
              component={LiveScoresScreen}
              options={{ title: 'Live Scores', headerShown: false }}
            />
            <Stack.Screen
              name="BatterMatchup"
              component={BatterMatchupScreen}
              options={{ title: 'Batter Matchups', headerShown: false }}
            />
            <Stack.Screen
              name="PitcherMatchup"
              component={PitcherMatchupScreen}
              options={{ title: 'Pitcher Matchups', headerShown: false }}
            />
            <Stack.Screen
              name="MatchupDetail"
              component={MatchupDetailScreen}
              options={{ title: 'Matchup Details', headerShown: false }}
            />
            <Stack.Screen
              name="GamePrediction"
              component={GamePredictionScreen}
              options={{ title: 'Game Prediction', headerShown: false }}
            />
            <Stack.Screen
              name="PlayerBackCard"
              component={PlayerBackCardScreen}
              options={{ title: 'Player Card', headerShown: false }}
            />
            <Stack.Screen
              name="PredictionHistory"
              component={PredictionHistoryScreen}
              options={{ title: 'Prediction Record', headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </WebContainer>
      <Analytics />
    </ErrorBoundary>
  );
}
