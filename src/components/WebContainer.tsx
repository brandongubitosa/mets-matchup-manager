import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS, WEB_MAX_WIDTH } from '../constants';

interface WebContainerProps {
  children: React.ReactNode;
}

export const WebContainer: React.FC<WebContainerProps> = ({ children }) => {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.innerContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_MAX_WIDTH,
    backgroundColor: COLORS.background,
    // Web-only shadow effect
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        }
      : {}),
  },
});
