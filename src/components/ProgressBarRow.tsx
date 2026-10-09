import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../theme';
import { Avatar } from './Avatar';

export interface ProgressBarRowProps {
  name: string;
  countText?: string;
  progress: number; // 0 to 1 or 0 to 100
  barColor?: string;
  showAvatar?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBarRow: React.FC<ProgressBarRowProps> = ({
  name,
  countText,
  progress,
  barColor = theme.colors.black,
  showAvatar = true,
  style,
}) => {
  // Normalize 0-100 or 0-1 to percentage 0-100
  const normalizedProgress = progress > 1 ? Math.min(progress, 100) : Math.min(progress * 100, 100);

  return (
    <View style={[styles.container, style]}>
      {showAvatar && (
        <View style={styles.avatarContainer}>
          <Avatar name={name} size="sm" />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.textRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {countText && <Text style={styles.countText}>{countText}</Text>}
        </View>

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${normalizedProgress}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  avatarContainer: {
    marginRight: theme.spacing.sm + 4,
  },
  content: {
    flex: 1,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  countText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.muted,
  },
  track: {
    height: 8,
    backgroundColor: '#EEF0F3',
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.pill,
  },
});

export default ProgressBarRow;
