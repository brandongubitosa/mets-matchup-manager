import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  HomeScreen,
  BatterMatchupScreen,
  PitcherMatchupScreen,
  MatchupDetailScreen,
} from './src/screens';
import { ErrorBoundary, WebContainer } from './src/components';
import { COLORS } from './src/constants';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ErrorBoundary>
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
          </Stack.Navigator>
        </NavigationContainer>
      </WebContainer>
    </ErrorBoundary>
  );
}
