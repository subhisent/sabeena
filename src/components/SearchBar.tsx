import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onSubmit?: () => void;
  onFilterPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search leads, customers, products...',
  onClear,
  onSubmit,
  onFilterPress,
  style,
}) => {
  const handleClear = () => {
    onChangeText('');
    if (onClear) onClear();
  };

  return (
    <View style={styles.outerRow}>
      <View style={[styles.container, style]}>
        <Feather
          name="search"
          size={18}
          color={theme.colors.muted}
          style={styles.searchIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          style={styles.input}
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearButton}
          >
            <Feather name="x-circle" size={16} color={theme.colors.muted} />
          </TouchableOpacity>
        )}
      </View>
      {onFilterPress && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          activeOpacity={0.8}
        >
          <Feather name="sliders" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    ...theme.shadows.card,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
  },
  clearButton: {
    marginLeft: theme.spacing.xs,
  },
});

export default SearchBar;
