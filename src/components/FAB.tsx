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

export interface FABProps {
  label?: string;
  iconName?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const FAB: React.FC<FABProps> = ({
  label = 'New lead',
  iconName = 'plus',
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, style]}
    >
      <View style={styles.iconCircle}>
        <Feather name={iconName} size={18} color={theme.colors.white} />
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    ...theme.shadows.elevated,
    alignSelf: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  label: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.white,
    letterSpacing: 0.2,
  },
});

export default FAB;
