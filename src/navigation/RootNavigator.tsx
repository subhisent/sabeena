import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { AdminNavigator } from './AdminNavigator';
import { StaffNavigator } from './StaffNavigator';
import { theme } from '../theme';
import { AppButton, Card, LoadingView } from '../components';

export const RootNavigator: React.FC = () => {
  const { user, profile, role, loading, accountError, signOut } = useAuth();

  useEffect(() => {
    // If authenticated user has an unassigned/invalid role, immediately sign out
    if (user && role !== 'admin' && role !== 'staff' && !loading) {
      console.log(`[ROLE-DEBUG] RootNavigator: user authenticated but role="${role}" is invalid. Triggering signOut.`);
      signOut();
    }
  }, [user, role, loading, signOut]);

  if (loading) {
    console.log('[ROLE-DEBUG] RootNavigator rendering: LoadingView (verifying auth/profile)');
    return <LoadingView message="Verifying authentication..." />;
  }

  if (!user) {
    console.log('[ROLE-DEBUG] RootNavigator rendering: LoginScreen (no active user)');
    return <LoginScreen />;
  }

  if (accountError) {
    console.log(`[ROLE-DEBUG] RootNavigator rendering: Error Card (accountError="${accountError}")`);
    return (
      <View style={styles.fallbackContainer}>
        <Card style={styles.card} padding="xl">
          <Text style={styles.title}>Account Issue</Text>
          <Text style={styles.message}>{accountError}</Text>
          <AppButton
            title="Return to Login"
            onPress={signOut}
            variant="danger"
            size="md"
            style={styles.button}
          />
        </Card>
      </View>
    );
  }

  // Strictly route by Firestore role
  if (role === 'admin') {
    console.log('[ROLE-DEBUG] RootNavigator choosing: AdminNavigator because role === "admin"');
    return <AdminNavigator />;
  }

  if (role === 'staff') {
    console.log('[ROLE-DEBUG] RootNavigator choosing: StaffNavigator because role === "staff"');
    return <StaffNavigator />;
  }

  console.log(`[ROLE-DEBUG] RootNavigator fallback: role is "${role}" (unrecognized) -> rendering fallback`);
  return (
    <View style={styles.fallbackContainer}>
      <Card style={styles.card} padding="xl">
        <Text style={styles.title}>Role Unassigned</Text>
        <Text style={styles.message}>
          Your account ({profile?.email || 'User'}) is not yet assigned an active role. Contact the admin.
        </Text>
        <AppButton
          title="Return to Login"
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
