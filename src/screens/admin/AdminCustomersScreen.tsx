import React from 'react';
import { StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { ScreenContainer, EmptyState } from '../../components';

export const AdminCustomersScreen: React.FC = () => {
  return (
    <ScreenContainer scrollable={true}>
      <EmptyState
        title="No Customers Found"
        description="New customer inquiries from web, walk-ins, and referrals will be listed here."
        iconName="users"
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

export default AdminCustomersScreen;
