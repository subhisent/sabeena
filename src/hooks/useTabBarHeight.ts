import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_BASE_HEIGHT } from '../constants/layout';

/**
 * Returns the effective height of the floating tab bar,
 * including its base height and the bottom inset padding.
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, 12);
}

/**
 * Returns the bottom offset for floating action buttons (FABs),
 * ensuring they sit 16px above the tab bar or above the device navigation bar.
 */
export function useFloatingButtonBottom(hasTabBar: boolean = true): number {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  if (hasTabBar) {
    return tabBarHeight + 16;
  }
  return Math.max(insets.bottom, 12) + 16;
}
