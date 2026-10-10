import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../theme';

export interface LoadingViewProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
  color?: string;
  size?: 'small' | 'large';
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  message = 'Loading...',
  style,
  color = theme.colors.primary,
  size = 'large',
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  message: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
});

export default LoadingView;
