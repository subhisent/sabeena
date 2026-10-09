import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { theme, getAvatarColors } from '../theme';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
  showStatusDot?: boolean;
  isOnline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  showStatusDot = false,
  isOnline = true,
  style,
}) => {
  const { backgroundColor, textColor } = getAvatarColors(name);

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const dimensions = {
    sm: 32,
    md: 44,
    lg: 56,
    xl: 72,
  }[size];

  const fontSizes = {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 26,
  }[size];

  const dotSizes = {
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
  }[size];

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: dimensions,
            height: dimensions,
            borderRadius: dimensions / 2,
            backgroundColor,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              fontSize: fontSizes,
              color: textColor,
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      </View>
      {showStatusDot && (
        <View
          style={[
            styles.statusDot,
            {
              width: dotSizes,
              height: dotSizes,
              borderRadius: dotSizes / 2,
              backgroundColor: isOnline ? theme.colors.success : theme.colors.muted,
              right: 0,
              bottom: 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: theme.fonts.bold,
    textAlign: 'center',
  },
  statusDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
});

export default Avatar;
