import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { theme } from '../theme';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  iconBackground?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  subtitle?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconBackground = theme.colors.primaryLight,
  trend,
  subtitle,
  onPress,
  style,
}) => {
  const content = (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        {icon && (
          <View style={[styles.iconBadge, { backgroundColor: iconBackground }]}>
            {icon}
          </View>
        )}
        {trend && (
          <View
            style={[
              styles.trendBadge,
              trend.isPositive ? styles.trendPositive : styles.trendNegative,
            ]}
          >
            <Text
              style={[
                styles.trendText,
                trend.isPositive ? styles.trendTextPositive : styles.trendTextNegative,
              ]}
            >
              {trend.value}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm + 4,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  trendPositive: {
    backgroundColor: theme.colors.successLight,
  },
  trendNegative: {
    backgroundColor: theme.colors.dangerLight,
  },
  trendText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
  },
  trendTextPositive: {
    color: theme.colors.success,
  },
  trendTextNegative: {
    color: theme.colors.danger,
  },
  value: {
    fontFamily: theme.fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.colors.text,
    marginBottom: 2,
  },
  title: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
});

export default StatCard;
