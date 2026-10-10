import React from 'react';
import { StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { ScreenContainer, EmptyState } from '../../components';

export const AdminTasksScreen: React.FC = () => {
  return (
    <ScreenContainer scrollable={true}>
      <EmptyState
        title="No Tasks Assigned"
        description="Assigned follow-ups, calls, and pending tasks across all staff will be tracked here."
        iconName="check-square"
        style={styles.emptyCard}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
