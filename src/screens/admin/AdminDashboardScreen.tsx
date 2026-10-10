import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme';
import { ScreenContainer, Card, EmptyState, AppButton, Avatar } from '../../components';

export const AdminDashboardScreen: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <ScreenContainer scrollable={true}>
      <Card style={styles.profileCard} padding="lg">
        <View style={styles.headerRow}>
          <Avatar name={profile?.name || 'Admin'} size="lg" />
          <View style={styles.headerInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{profile?.name || 'Administrator'}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ADMINISTRATOR</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="mail" size={14} color={theme.colors.muted} />
            <Text style={styles.metaText}>{profile?.email || 'admin@sabeena.test'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="shield" size={14} color={theme.colors.muted} />
            <Text style={styles.metaText}>Staff ID: {profile?.staffId || 'ADM001'}</Text>
          </View>
        </View>

        <AppButton
          title="Sign Out"
          onPress={signOut}
          variant="danger"
          size="sm"
          style={styles.signOutBtn}
        />
      </Card>

      <Text style={styles.sectionTitle}>Overview & Metrics</Text>

      <EmptyState
        title="No Activity Yet"
        description="Customer inquiries and staff task assignments will appear here in real-time."
        iconName="bar-chart-2"
        style={styles.emptyCard}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  welcomeText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  userName: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
    marginVertical: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  badgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  metaRow: {
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  signOutBtn: {
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xl,
  },
});

export default AdminDashboardScreen;
