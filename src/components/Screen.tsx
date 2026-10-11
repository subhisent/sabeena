import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
  StatusBar as RNStatusBar,
  KeyboardAvoidingView,
  RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import { SCREEN_HORIZONTAL_PADDING } from '../constants/layout';

export interface ScreenProps {
  children?: React.ReactNode;
  scroll?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  hasTabBar?: boolean;
  keyboardAware?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = true,
  header,
  footer,
  hasTabBar = false,
  keyboardAware = false,
  refreshControl,
  contentContainerStyle,
  style,
  backgroundColor = theme.colors.background,
}) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  // Top inset: insets.top + 12, guaranteed minimum of StatusBar.currentHeight on Android
  const androidStatus = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0;
  const safeTop = Math.max(insets.top, androidStatus);
  const topPadding = safeTop + 12;

  // Bottom inset: includes tab bar clearance if hasTabBar is true
  const bottomPadding = hasTabBar
    ? tabBarHeight + 24
    : footer
    ? 20
    : Math.max(insets.bottom, 12) + 16;

  const content = scroll ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingBottom: bottomPadding,
          paddingTop: header ? 0 : topPadding,
        },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.staticContent,
        {
          paddingBottom: bottomPadding,
          paddingTop: header ? 0 : topPadding,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const innerLayout = (
    <View style={[styles.container, { backgroundColor }, style]}>
      {header && (
        <View style={[styles.headerContainer, { paddingTop: topPadding }]}>
          {header}
        </View>
      )}

      {content}

      {footer && (
        <View
          style={[
            styles.stickyFooter,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          {footer}
        </View>
      )}
    </View>
  );

  if (keyboardAware) {
    return (
      <KeyboardAvoidingView
        style={[styles.keyboardView, { backgroundColor }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {innerLayout}
      </KeyboardAvoidingView>
    );
  }

  return innerLayout;
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
  stickyFooter: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 12,
    ...theme.shadows.card,
  },
});

export default Screen;
