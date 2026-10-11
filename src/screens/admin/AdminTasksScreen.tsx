import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { Screen, ScreenHeader, EmptyState } from '../../components';
import { SCREEN_HORIZONTAL_PADDING } from '../../constants';

export const AdminTasksScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <Screen
      hasTabBar={false}
      scroll
      header={<ScreenHeader title="Team Tasks" onBack={() => navigation.goBack()} />}
      contentContainerStyle={styles.content}
    >
      <EmptyState
        title="No Tasks Assigned"
        description="Assigned follow-ups, calls, and pending tasks across all staff will be tracked here."
        iconName="check-square"
        style={styles.emptyCard}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: SCREEN_HORIZONTAL_PADDING,
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

export default AdminTasksScreen;
