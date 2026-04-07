import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Light tap feedback on supported native platforms; no-op on web. */
export function lightImpact(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
