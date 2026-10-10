import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { DevLoginScreen } from '../screens/auth/DevLoginScreen';
import { AdminNavigator } from './AdminNavigator';
import { StaffNavigator } from './StaffNavigator';
import { theme } from '../theme';
import { AppButton, Card, LoadingView } from '../components';

export const RootNavigator: React.FC = () => {
  const { user, profile, role, loading, accountError, signOut } = useAuth();

  if (loading) {
    return <LoadingView message="Verifying authentication..." />;
  }

  if (!user) {
    return <DevLoginScreen />;
  }

  if (accountError) {
    return (
      <View style={styles.fallbackContainer}>
        <Card style={styles.card} padding="xl">
          <Text style={styles.title}>Account Issue</Text>
          <Text style={styles.message}>{accountError}</Text>
          <AppButton
            title="Sign Out"
            onPress={signOut}
            variant="danger"
            size="md"
            style={styles.button}
          />
        </Card>
      </View>
    );
  }

  if (role === 'admin') {
    return <AdminNavigator />;
  }

  if (role === 'staff') {
    return <StaffNavigator />;
  }

  return (
    <View style={styles.fallbackContainer}>
      <Card style={styles.card} padding="xl">
        <Text style={styles.title}>Role Unassigned</Text>
        <Text style={styles.message}>
          Your account ({profile?.email || user.email}) is not yet assigned an active role. Please contact an administrator.
        </Text>
        <AppButton
          title="Sign Out"
          onPress={signOut}
          variant="danger"
          size="md"
          style={styles.button}
        />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.sm,
  },
  message: {
    ...theme.typography.body,
    textAlign: 'center',
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg,
  },
  button: {
    minWidth: 160,
  },
});

export default RootNavigator;
