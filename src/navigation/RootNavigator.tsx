import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { DevLoginScreen } from '../screens/auth/DevLoginScreen';
import { AdminNavigator } from './AdminNavigator';
import { StaffNavigator } from './StaffNavigator';
import { theme } from '../theme';
import { AppButton, Card } from '../components';

export const RootNavigator: React.FC = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <DevLoginScreen />;
  }

  if (user.role === 'admin') {
    return <AdminNavigator />;
  }

  if (user.role === 'staff') {
    return <StaffNavigator />;
  }

  return (
    <View style={styles.fallbackContainer}>
      <Card style={styles.card} padding="xl">
        <Text style={styles.title}>Account Pending</Text>
        <Text style={styles.message}>
          Your account role ({user.role || 'none'}) is not recognized. Please contact an admin.
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
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
