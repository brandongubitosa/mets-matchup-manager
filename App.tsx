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
import { ErrorBoundary } from './src/components';
import { COLORS } from './src/constants';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ErrorBoundary>
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
          options={{ title: 'Batter Matchups' }}
        />
        <Stack.Screen
          name="PitcherMatchup"
          component={PitcherMatchupScreen}
          options={{ title: 'Pitcher Matchups' }}
        />
        <Stack.Screen
          name="MatchupDetail"
          component={MatchupDetailScreen}
          options={{ title: 'Matchup Details' }}
        />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
