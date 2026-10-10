import React from 'react';
import { StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { ScreenContainer, EmptyState } from '../../components';

export const StaffHistoryScreen: React.FC = () => {
  return (
    <ScreenContainer scrollable={true}>
      <EmptyState
        title="No Past Interactions"
        description="Completed customer calls, notes, and status updates will be logged here."
        iconName="clock"
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

export default StaffHistoryScreen;
