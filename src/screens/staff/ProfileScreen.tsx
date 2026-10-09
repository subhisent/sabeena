import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import {
  ScreenHeader,
  Card,
  Avatar,
  Chip,
  AppButton,
  AppInput,
  Toast,
  ToastType,
} from '../../components';

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { leads, loading: loadingLeads } = useMyLeads();

  // Change Password state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

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

  // Performance calculations from Firestore leads
  const performance = useMemo(() => {
    const totalHandled = leads.length;
    const wonLeads = leads.filter((l) => l.status === 'Won');
    const wonCount = wonLeads.length;
    const lostCount = leads.filter((l) => l.status === 'Lost').length;
    const inProgressCount = leads.filter((l) => l.status === 'In Progress' || l.status === 'New Lead').length;

    const conversionRate =
      totalHandled > 0 ? Math.round((wonCount / totalHandled) * 100) : 0;

    const totalWonValue = wonLeads.reduce(
      (acc, l) => acc + (l.estimatedValue || 0),
      0
    );

    return {
      totalHandled,
      wonCount,
      lostCount,
      inProgressCount,
      conversionRate,
      totalWonValue,
    };
  }, [leads]);

  const formatCurrency = (val: number): string => {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(val);
    } catch {
      return `₹${val.toLocaleString('en-IN')}`;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Sabena CRM?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (err) {
              console.warn('Logout error:', err);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleOpenPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setPasswordModalVisible(true);
  };

  const handleChangePasswordSubmit = async () => {
    const errors: { current?: string; new?: string; confirm?: string } = {};

    if (!currentPassword.trim()) {
      errors.current = 'Current password is required.';
    }
    if (!newPassword || newPassword.length < 6) {
      errors.new = 'New password must be at least 6 characters.';
    }
    if (newPassword !== confirmPassword) {
      errors.confirm = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setChangingPassword(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('No authenticated user session found.');
      }

      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      setPasswordModalVisible(false);
      showToast('Password updated successfully!', 'success');
    } catch (err: any) {
      console.warn('Change password error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordErrors({ current: 'Incorrect current password.' });
      } else {
        setPasswordErrors({ new: err.message || 'Failed to update password.' });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const staffName = user?.name || 'Staff Member';
  const staffId = user?.staffId || 'STF001';
  const staffEmail = user?.email || 'staff@sabeena.test';
  const staffPhone = user?.phone || '+91 98401 23456';

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
        style={{ top: insets.top + 10 }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Profile" subtitle="Account details & performance" />

        {/* User Identity Card */}
        <Card style={styles.profileCard} padding="lg">
          <Avatar
            name={staffName}
            size="xl"
            showStatusDot={true}
            isOnline={user?.active !== false}
            style={styles.avatar}
          />
          <Text style={styles.staffName}>{staffName}</Text>

          <View style={styles.staffIdBadge}>
            <Text style={styles.staffIdText}>STAFF ID: {staffId}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.contactDetails}>
            <View style={styles.contactRow}>
              <View style={styles.contactIconCircle}>
                <Feather name="mail" size={14} color={theme.colors.muted} />
              </View>
              <Text style={styles.contactText}>{staffEmail}</Text>
            </View>

            <View style={styles.contactRow}>
              <View style={styles.contactIconCircle}>
                <Feather name="phone" size={14} color={theme.colors.muted} />
              </View>
              <Text style={styles.contactText}>{staffPhone}</Text>
            </View>
          </View>
        </Card>

        {/* Performance Card */}
        <Text style={styles.sectionTitle}>PERFORMANCE OVERVIEW</Text>
        <Card style={styles.performanceCard} padding="lg">
          {loadingLeads ? (
            <View style={styles.loadingPerformance}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingPerformanceText}>Calculating performance...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsRow}>
                {/* Leads Handled */}
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>HANDLED</Text>
                  <Text style={styles.statValue}>{performance.totalHandled}</Text>
                  <Text style={styles.statSubtext}>Total Assigned</Text>
                </View>

                <View style={styles.statDividerVertical} />

                {/* Won */}
                <View style={styles.statTile}>
                  <Text style={[styles.statLabel, { color: theme.colors.success }]}>WON</Text>
                  <Text style={[styles.statValue, { color: theme.colors.success }]}>
                    {performance.wonCount}
                  </Text>
                  <Text style={styles.statSubtext}>Closed Deals</Text>
                </View>

                <View style={styles.statDividerVertical} />

                {/* Conversion % */}
                <View style={styles.statTile}>
                  <Text style={[styles.statLabel, { color: theme.colors.primary }]}>CONVERSION</Text>
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                    {performance.conversionRate}%
                  </Text>
                  <Text style={styles.statSubtext}>Win Rate</Text>
                </View>
              </View>

              <View style={styles.dealValueBanner}>
                <View style={styles.dealValueLeft}>
                  <Feather name="award" size={18} color={theme.colors.success} />
                  <Text style={styles.dealValueBannerLabel}>Won Deals Revenue</Text>
                </View>
                <Text style={styles.dealValueBannerAmount}>
                  {formatCurrency(performance.totalWonValue)}
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* Account Settings Options */}
        <Text style={styles.sectionTitle}>SECURITY & SETTINGS</Text>
        <Card style={styles.settingsCard} padding={0}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={handleOpenPasswordModal}
            activeOpacity={0.7}
          >
            <View style={styles.settingsIconCircle}>
              <Feather name="lock" size={16} color={theme.colors.text} />
            </View>
            <View style={styles.settingsRowContent}>
              <Text style={styles.settingsRowTitle}>Change Password</Text>
              <Text style={styles.settingsRowSubtitle}>Update your login credentials</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.muted} />
          </TouchableOpacity>

          <View style={styles.settingsDivider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() =>
              Alert.alert(
                'Support Desk',
                'For technical assistance or territory reassignments, please contact support@sabeenasealers.com'
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.settingsIconCircle}>
              <Feather name="help-circle" size={16} color={theme.colors.text} />
            </View>
            <View style={styles.settingsRowContent}>
              <Text style={styles.settingsRowTitle}>Help & Support</Text>
              <Text style={styles.settingsRowSubtitle}>Contact administrator or tech support</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.muted} />
          </TouchableOpacity>
        </Card>

        {/* Black Logout Button */}
        <View style={styles.logoutButtonWrapper}>
          <AppButton
            title="Log Out"
            variant="primary"
            icon={<Feather name="log-out" size={16} color={theme.colors.white} />}
            onPress={handleLogout}
            style={styles.logoutButton}
          />
        </View>

        <Text style={styles.versionFooter}>
          Sabena Sealers CRM • Version 1.0.0 (Build 2026)
        </Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPasswordModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalGrabber} />

            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={18} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>

            <AppInput
              label="Current Password *"
              placeholder="Enter current password"
              secureTextEntry
              value={currentPassword}
              onChangeText={(txt) => {
                setCurrentPassword(txt);
                if (passwordErrors.current) {
                  setPasswordErrors((prev) => ({ ...prev, current: undefined }));
                }
              }}
              error={passwordErrors.current}
            />

            <AppInput
              label="New Password *"
              placeholder="Minimum 6 characters"
              secureTextEntry
              value={newPassword}
              onChangeText={(txt) => {
                setNewPassword(txt);
                if (passwordErrors.new) {
                  setPasswordErrors((prev) => ({ ...prev, new: undefined }));
                }
              }}
              error={passwordErrors.new}
            />

            <AppInput
              label="Confirm New Password *"
              placeholder="Re-enter new password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={(txt) => {
                setConfirmPassword(txt);
                if (passwordErrors.confirm) {
                  setPasswordErrors((prev) => ({ ...prev, confirm: undefined }));
                }
              }}
              error={passwordErrors.confirm}
            />

            <View style={styles.modalActionsRow}>
              <AppButton
                title="Cancel"
                variant="outline"
                onPress={() => setPasswordModalVisible(false)}
                style={styles.halfButton}
              />
              <AppButton
                title={changingPassword ? 'Updating...' : 'Update Password'}
                variant="primary"
                onPress={handleChangePasswordSubmit}
                loading={changingPassword}
                style={styles.halfButton}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  scrollContent: {
    paddingHorizontal: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    marginBottom: 12,
  },
  staffName: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  staffIdBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 12,
  },
  staffIdText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  contactDetails: {
    width: '100%',
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contactText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: theme.colors.muted,
    marginBottom: 8,
    marginLeft: 4,
  },
  performanceCard: {
    marginBottom: 20,
  },
  loadingPerformance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  loadingPerformanceText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: theme.colors.muted,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: theme.colors.text,
    marginBottom: 2,
  },
  statSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.muted,
  },
  statDividerVertical: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.border,
  },
  dealValueBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  dealValueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealValueBannerLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: '#15803D',
  },
  dealValueBannerAmount: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: '#15803D',
  },
  settingsCard: {
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsRowContent: {
    flex: 1,
  },
  settingsRowTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingsRowSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 64,
  },
  logoutButtonWrapper: {
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: theme.colors.black,
  },
  versionFooter: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderDark,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  halfButton: {
    flex: 1,
  },
});

export default ProfileScreen;
