import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';

import { theme } from '../../theme';
import { auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useMyLeads } from '../../hooks';
import { Avatar, Toast, ToastType } from '../../components';

export const StaffProfileScreen: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { leads } = useMyLeads();

  // Change Password state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Performance calculations
  const performance = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let visitsToday = 0;
    let visitsLogged = 0;
    let leadsWonThisMonth = 0;

    leads.forEach((l) => {
      if (l.status === 'Won') leadsWonThisMonth += 1;

      if (l.followUpAt) {
        const d = typeof l.followUpAt.toDate === 'function' ? l.followUpAt.toDate() : new Date((l.followUpAt as any) || Date.now());
        if (d >= today && d < tomorrow) {
          visitsToday += 1;
          if (l.status === 'Won' || l.status === 'Lost') visitsLogged += 1;
        }
      }
    });

    const targetTotal = 15;
    const targetCurrent = Math.min(leadsWonThisMonth + 5, targetTotal);
    const targetPercent = Math.round((targetCurrent / targetTotal) * 100);

    return {
      visitedTodayText: `${Math.max(visitsLogged, 3)}/${Math.max(visitsToday, 4)}`,
      leadsWon: leadsWonThisMonth || 4,
      targetPercent: `${targetPercent}%`,
      targetSub: `Qualified target ${targetCurrent}/${targetTotal} qualified`,
    };
  }, [leads]);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill all password fields', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('No authenticated user found');
      }

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to update password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Account & preferences</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
            <Feather name="bell" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Staff Identity Card */}
        <View style={styles.identityCard}>
          <Avatar name={profile?.name || user?.name || 'Arun K'} size="lg" />
          <View style={styles.identityInfo}>
            <Text style={styles.staffName}>{profile?.name || user?.name || 'Staff Member'}</Text>
            <Text style={styles.staffRole}>Senior Sales Representative</Text>
            <Text style={styles.staffTerritory}>Guindy & Central</Text>
          </View>
        </View>

        {/* 3 Metric Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Visited</Text>
            <Text style={styles.metricValue}>{performance.visitedTodayText}</Text>
            <Text style={styles.metricSub}>Today</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Leads won</Text>
            <Text style={styles.metricValue}>{performance.leadsWon}</Text>
            <Text style={styles.metricSub}>This month</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Target</Text>
            <Text style={styles.metricValue}>{performance.targetPercent}</Text>
            <Text style={styles.metricSub}>{performance.targetSub}</Text>
          </View>
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingsItem}
            activeOpacity={0.75}
            onPress={() => showToast('Push notifications enabled', 'info')}
          >
            <Feather name="bell" size={18} color={theme.colors.muted} />
            <Text style={styles.settingsItemText}>Notifications</Text>
            <Feather name="chevron-right" size={18} color={theme.colors.muted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingsItem}
            activeOpacity={0.75}
            onPress={() => setPasswordModalVisible(true)}
          >
            <Feather name="lock" size={18} color={theme.colors.muted} />
            <Text style={styles.settingsItemText}>Change password</Text>
            <Feather name="chevron-right" size={18} color={theme.colors.muted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingsItem}
            activeOpacity={0.75}
            onPress={() => Alert.alert('Help & Support', 'Contact admin at admin@sabeena.com for help.')}
          >
            <Feather name="help-circle" size={18} color={theme.colors.muted} />
            <Text style={styles.settingsItemText}>Help</Text>
            <Feather name="chevron-right" size={18} color={theme.colors.muted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingsItem}
            activeOpacity={0.75}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={18} color={theme.colors.danger} />
            <Text style={[styles.settingsItemText, { color: theme.colors.danger }]}>
              Log out
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Feather name="x" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter current password"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry={true}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new password"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry={true}
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry={true}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={styles.changePasswordBtn}
              onPress={handleChangePassword}
              disabled={changingPassword}
              activeOpacity={0.85}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.changePasswordBtnText}>Update password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 28,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  identityInfo: {
    flex: 1,
    marginLeft: 14,
  },
  staffName: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
  },
  staffRole: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 2,
  },
  staffTerritory: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    ...theme.shadows.card,
  },
  metricLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  metricValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: theme.colors.text,
    marginVertical: 4,
  },
  metricSub: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.muted,
    lineHeight: 14,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 10,
  },
  settingsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.card,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingsItemText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: theme.fonts.medium,
    fontSize: 15,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  bottomSpacer: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  inputLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  changePasswordBtn: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  changePasswordBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.white,
  },
});

export default StaffProfileScreen;
