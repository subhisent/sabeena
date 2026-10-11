import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { Screen, ScreenHeader, EmptyState } from '../../components';

export const StaffHistoryScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <Screen
      hasTabBar={false}
      scroll
      header={<ScreenHeader title="Interaction History" onBack={() => navigation.goBack()} />}
      contentContainerStyle={styles.content}
    >
      <EmptyState
        title="No Past Interactions"
        description="Completed customer calls, notes, and status updates will be logged here."
        iconName="clock"
        style={styles.emptyCard}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.xl * 1.5,
  },
});

export default StaffHistoryScreen;
