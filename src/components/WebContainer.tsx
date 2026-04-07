import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS, getWebMaxContentWidth } from '../constants';

interface WebContainerProps {
  children: React.ReactNode;
}

export const WebContainer: React.FC<WebContainerProps> = ({ children }) => {
  const { width } = useWindowDimensions();
  const maxWidth = getWebMaxContentWidth(width);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.innerContainer, { maxWidth }]}>
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
