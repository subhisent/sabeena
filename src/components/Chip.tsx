import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

export type ChipVariant = 'default' | 'selected' | 'status' | 'removable' | 'outline';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  statusColor?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  onRemove,
  statusColor,
  icon,
  style,
  textStyle,
}) => {
  const isInteractive = Boolean(onPress);

  const content = (
    <View
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipDefault,
        style,
      ]}
    >
      {statusColor && (
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      )}
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.text,
          selected ? styles.textSelected : styles.textDefault,
          textStyle,
        ]}
      >
        {label}
      </Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeButton}
        >
          <Feather
            name="x"
            size={14}
            color={selected ? theme.colors.white : theme.colors.muted}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  if (isInteractive) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipDefault: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  iconContainer: {
    marginRight: 6,
  },
  removeButton: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  textDefault: {
    color: theme.colors.text,
  },
  textSelected: {
    color: theme.colors.white,
  },
});

export default Chip;
