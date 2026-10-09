import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { AppButton, Card, Avatar } from '../components';

const Stack = createNativeStackNavigator();

const AdminHomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Card style={styles.card} padding="xl">
        <Avatar name={user?.name || 'Admin'} size="lg" style={styles.avatar} />
        <Text style={styles.title}>Admin app</Text>
        <Text style={styles.subtitle}>Welcome, {user?.name || 'Administrator'}</Text>
        <Text style={styles.info}>Role: {user?.role}</Text>
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

export const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.card },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontFamily: theme.fonts.bold },
      }}
    >
      <Stack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: 'Admin Dashboard' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    alignItems: 'center',
  },
  avatar: {
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h1,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.headline,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  info: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xl,
  },
  button: {
    minWidth: 160,
  },
});

export default AdminNavigator;
