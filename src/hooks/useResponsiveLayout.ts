import { useWindowDimensions, Platform } from 'react-native';
import { getWebMaxContentWidth } from '../constants';

/** Window size buckets for tuning layout on phones, tablets, and desktop web. */
export const useResponsiveLayout = () => {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const maxContentWidth = isWeb ? getWebMaxContentWidth(width) : width;
  const isCompact = width < 480;
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  return {
    windowWidth: width,
    windowHeight: height,
    maxContentWidth,
    isWeb,
    isCompact,
    isTablet,
    isDesktop,
  };
};
