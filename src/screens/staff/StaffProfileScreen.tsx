import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme';
import { ScreenContainer, Card, AppButton, Avatar } from '../../components';

export const StaffProfileScreen: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <ScreenContainer scrollable={true}>
      <Card style={styles.card} padding="xl">
        <Avatar name={profile?.name || 'Staff Member'} size="lg" style={styles.avatar} />
        <Text style={styles.name}>{profile?.name || 'Staff Member'}</Text>
        <Text style={styles.roleTitle}>Sabena Sales Executive</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>STAFF ACCOUNT</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Feather name="mail" size={16} color={theme.colors.muted} />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{profile?.email || 'staff@sabeena.test'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="hash" size={16} color={theme.colors.muted} />
            <Text style={styles.infoLabel}>Staff ID:</Text>
            <Text style={styles.infoValue}>{profile?.staffId || 'STF001'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="phone" size={16} color={theme.colors.muted} />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{profile?.phone || 'Not provided'}</Text>
          </View>
        </View>

        <AppButton
          title="Sign Out"
          onPress={signOut}
          variant="danger"
          size="md"
          style={styles.button}
        />
      </Card>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  avatar: {
    marginBottom: theme.spacing.md,
  },
  name: {
    ...theme.typography.h2,
    textAlign: 'center',
    marginBottom: 4,
  },
  roleTitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  badge: {
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    marginBottom: theme.spacing.md,
  },
  badgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.success,
    letterSpacing: 0.5,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  infoList: {
    width: '100%',
    gap: 12,
    marginBottom: theme.spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.muted,
    minWidth: 60,
  },
  infoValue: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  button: {
    width: '100%',
  },
});

export default StaffProfileScreen;
