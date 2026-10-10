import React from 'react';
import { StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { ScreenContainer, EmptyState } from '../../components';

export const AdminStaffScreen: React.FC = () => {
  return (
    <ScreenContainer scrollable={true}>
      <EmptyState
        title="No Staff Members"
        description="Active sales and support staff accounts will be shown here for task assignment."
        iconName="user-check"
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

export default AdminStaffScreen;
