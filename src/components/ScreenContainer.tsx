import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import { Screen } from './Screen';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  hasTabBar?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  header,
  footer,
  hasTabBar = false,
}) => {
  return (
    <Screen
      scroll={scrollable}
      header={header}
      footer={footer}
      hasTabBar={hasTabBar}
      style={style}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </Screen>
  );
};

export default ScreenContainer;
