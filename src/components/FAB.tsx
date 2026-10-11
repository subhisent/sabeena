import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { useFloatingButtonBottom } from '../hooks/useTabBarHeight';
import { MIN_TOUCH_TARGET } from '../constants/layout';

export interface FABProps {
  label?: string;
  iconName?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  hasTabBar?: boolean;
  bottomOffset?: number;
  floating?: boolean;
}

export const FAB: React.FC<FABProps> = ({
  label,
  iconName = 'plus',
  onPress,
  style,
  hasTabBar = true,
  bottomOffset,
  floating = false,
}) => {
  const calculatedBottom = useFloatingButtonBottom(hasTabBar);
  const bottom = bottomOffset !== undefined ? bottomOffset : calculatedBottom;
  const isRound = !label;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.container,
        isRound && styles.roundContainer,
        floating && [styles.floatingPosition, { bottom }],
        style,
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.iconCircle, isRound && styles.roundIconCircle]}>
        <Feather name={iconName} size={isRound ? 24 : 18} color={theme.colors.white} />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: MIN_TOUCH_TARGET,
    ...theme.shadows.elevated,
    alignSelf: 'center',
  },
  floatingPosition: {
    position: 'absolute',
    right: 20,
    zIndex: 99,
  },
  roundContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    paddingVertical: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  roundIconCircle: {
    marginRight: 0,
  },
  label: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.white,
    letterSpacing: 0.2,
  },
});

export default FAB;
