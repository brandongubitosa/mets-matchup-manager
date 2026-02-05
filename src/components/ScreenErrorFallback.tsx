import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';

interface ScreenErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  onGoBack?: () => void;
}

export const ScreenErrorFallback: React.FC<ScreenErrorFallbackProps> = ({
  error,
  onRetry,
  onGoBack,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content} accessibilityRole="alert">
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.message}>
          {error?.message || 'Something went wrong while loading this screen.'}
        </Text>
        <View style={styles.buttons}>
          {onRetry && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry loading"
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
          {onGoBack && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onGoBack}
              accessibilityRole="button"
              accessibilityLabel="Go back to previous screen"
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: 280,
  },
  buttons: {
    flexDirection: 'column',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.gray,
    fontWeight: '600',
    fontSize: 16,
  },
});
