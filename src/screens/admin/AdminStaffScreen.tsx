import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import {
  fetchStaffWithMetrics,
  createStaffAccount,
  toggleStaffActiveStatus,
  StaffMemberWithMetrics,
} from '../../services/staffService';
import { Card, Avatar, Toast, ToastType, EmptyState } from '../../components';

type FilterTab = 'all' | 'active' | 'admin' | 'inactive';

export const AdminStaffScreen: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMemberWithMetrics[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('all');

  // Add Staff Modal State
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('Password@123');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [creating, setCreating] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  const loadStaffData = async () => {
    try {
      const data = await fetchStaffWithMetrics();
      setStaffList(data);
    } catch (err: any) {
      console.warn('Error loading staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();

    // Listen to real-time changes in users collection
    const unsubUsers = onSnapshot(collection(db, 'users'), () => {
      loadStaffData();
    });

    const unsubLeads = onSnapshot(collection(db, 'leads'), () => {
      loadStaffData();
    });

    return () => {
      unsubUsers();
      unsubLeads();
    };
  }, []);

  // Filter counts
  const counts = useMemo(() => {
    const all = staffList.length;
    const active = staffList.filter((s) => s.user.active !== false).length;
    const admin = staffList.filter((s) => s.user.role === 'admin').length;
    const inactive = staffList.filter((s) => s.user.active === false).length;
    return { all, active, admin, inactive };
  }, [staffList]);

  // Filtered list
  const filteredStaff = useMemo(() => {
    if (selectedFilter === 'active') {
      return staffList.filter((s) => s.user.active !== false);
    }
    if (selectedFilter === 'admin') {
      return staffList.filter((s) => s.user.role === 'admin');
    }
    if (selectedFilter === 'inactive') {
      return staffList.filter((s) => s.user.active === false);
    }
    return staffList;
  }, [staffList, selectedFilter]);

  const handleToggleStatus = (member: StaffMemberWithMetrics) => {
    const currentActive = member.user.active !== false;
    Alert.alert(
      currentActive ? 'Deactivate Staff' : 'Activate Staff',
      `Are you sure you want to ${currentActive ? 'deactivate' : 'activate'} ${member.user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentActive ? 'Deactivate' : 'Activate',
          style: currentActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await toggleStaffActiveStatus(member.user.uid, !currentActive);
              showToast(
                `${member.user.name} is now ${!currentActive ? 'Active' : 'Inactive'}`,
                'success'
              );
              loadStaffData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  const validateForm = (): boolean => {
    const errors: { name?: string; email?: string; phone?: string } = {};
    if (!fullName.trim()) errors.name = 'Full name is required';
    if (!email.trim() || !email.includes('@')) errors.email = 'Valid email is required';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) errors.phone = 'Valid 10-digit phone number is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateStaff = async () => {
    if (!validateForm()) return;
    setCreating(true);

    try {
      await createStaffAccount({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password || 'Password@123',
        role: role,
      });

      showToast(`Account for ${fullName} created successfully`, 'success');
      setAddModalVisible(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('Password@123');
      setRole('staff');
      loadStaffData();
    } catch (err: any) {
      console.error('Error creating staff account:', err);
      Alert.alert('Error', err.message || 'Failed to create staff account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Directory</Text>
        <Text style={styles.headerSubtitle}>
          {staffList.length} registered team {staffList.length === 1 ? 'member' : 'members'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'all' && styles.filterTabTextActive]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'active' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('active')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'active' && styles.filterTabTextActive]}>
              Active ({counts.active})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'admin' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('admin')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'admin' && styles.filterTabTextActive]}>
              Admin ({counts.admin})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'inactive' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('inactive')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'inactive' && styles.filterTabTextActive]}>
              Inactive ({counts.inactive})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Staff List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : filteredStaff.length === 0 ? (
          <EmptyState
            title="No Staff Members Found"
            description="Add your first team member or adjust the active filters to see staff."
            iconName="users"
            actionLabel="Add Staff Member"
            onAction={() => setAddModalVisible(true)}
            style={styles.emptyCard}
          />
        ) : (
          filteredStaff.map((member) => {
            const isActive = member.user.active !== false;
            const isAdmin = member.user.role === 'admin';

            return (
              <Card key={member.user.uid} style={styles.staffCard} padding="md">
                <View style={styles.cardTopRow}>
                  <View style={styles.userInfoRow}>
                    <Avatar name={member.user.name} size="md" />
                    <View style={styles.userNameBlock}>
                      <View style={styles.nameBadgeRow}>
                        <Text style={styles.staffName}>{member.user.name}</Text>
                        <View style={[styles.roleBadge, isAdmin ? styles.adminBadge : styles.staffBadge]}>
                          <Text style={[styles.roleBadgeText, isAdmin ? styles.adminBadgeText : styles.staffBadgeText]}>
                            {isAdmin ? 'Admin' : 'Staff'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.staffIdText}>
                        ID: {member.user.staffId || member.user.uid.substring(0, 6).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillInactive]}
                    onPress={() => handleToggleStatus(member)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotInactive]} />
                    <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                      {isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Contact Info */}
                <View style={styles.contactRow}>
                  {member.user.email ? (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() => Linking.openURL(`mailto:${member.user.email}`)}
                    >
                      <Feather name="mail" size={13} color={theme.colors.muted} />
                      <Text style={styles.contactText} numberOfLines={1}>
                        {member.user.email}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {member.user.phone ? (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() => Linking.openURL(`tel:${member.user.phone}`)}
                    >
                      <Feather name="phone" size={13} color={theme.colors.muted} />
                      <Text style={styles.contactText}>{member.user.phone}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Metrics Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.metricItem}>
                    <Feather name="user-check" size={14} color={theme.colors.primary} />
                    <Text style={styles.metricText}>
                      <Text style={styles.metricValue}>{member.leadsCount}</Text> Leads Assigned
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Feather name="check-circle" size={14} color={theme.colors.success} />
                    <Text style={styles.metricText}>
                      <Text style={styles.metricValue}>{member.closedCount}</Text> Closed Deals
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Staff Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addStaffButton}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.88}
        >
          <Feather name="user-plus" size={18} color="#FFFFFF" />
          <Text style={styles.addStaffButtonText}>Add Staff Member</Text>
        </TouchableOpacity>
      </View>

      {/* Add Staff Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Staff Member</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Feather name="x" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Full Name */}
              <Text style={styles.inputLabel}>
                Full Name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, formErrors.name ? styles.inputErrorBorder : null]}>
                <Feather name="user" size={16} color={theme.colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Anand Sharma"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={(t) => {
                    setFullName(t);
                    if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
                  }}
                />
              </View>
              {formErrors.name ? <Text style={styles.errorText}>{formErrors.name}</Text> : null}

              {/* Email */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Email Address <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, formErrors.email ? styles.inputErrorBorder : null]}>
                <Feather name="mail" size={16} color={theme.colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. anand@sabeena.test"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (formErrors.email) setFormErrors((p) => ({ ...p, email: undefined }));
                  }}
                />
              </View>
              {formErrors.email ? <Text style={styles.errorText}>{formErrors.email}</Text> : null}

              {/* Phone */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                Mobile Phone <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, formErrors.phone ? styles.inputErrorBorder : null]}>
                <Feather name="phone" size={16} color={theme.colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 9840123456"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: undefined }));
                  }}
                />
              </View>
              {formErrors.phone ? <Text style={styles.errorText}>{formErrors.phone}</Text> : null}

              {/* Initial Password */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Initial Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color={theme.colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password@123"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/* Role Selection */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>System Role</Text>
              <View style={styles.roleOptionsRow}>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'staff' && styles.roleOptionSelected]}
                  onPress={() => setRole('staff')}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="user"
                    size={16}
                    color={role === 'staff' ? theme.colors.white : theme.colors.muted}
                  />
                  <Text style={[styles.roleOptionText, role === 'staff' && styles.roleOptionTextSelected]}>
                    Sales Staff
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleOption, role === 'admin' && styles.roleOptionSelected]}
                  onPress={() => setRole('admin')}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="shield"
                    size={16}
                    color={role === 'admin' ? theme.colors.white : theme.colors.muted}
                  />
                  <Text style={[styles.roleOptionText, role === 'admin' && styles.roleOptionTextSelected]}>
                    Administrator
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, creating && styles.modalSubmitBtnDisabled]}
                onPress={handleCreateStaff}
                disabled={creating}
                activeOpacity={0.88}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Create Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingBottom: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  filterTabsContainer: {
    backgroundColor: theme.colors.card,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTabsScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  filterTabActive: {
    backgroundColor: theme.colors.black,
  },
  filterTabText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  filterTabTextActive: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 20,
    paddingVertical: 36,
  },
  staffCard: {
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userNameBlock: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staffName: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: theme.colors.text,
  },
  staffIdText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  staffBadge: {
    backgroundColor: '#EFF6FF',
  },
  adminBadge: {
    backgroundColor: '#F5F3FF',
  },
  roleBadgeText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  staffBadgeText: {
    color: theme.colors.primary,
  },
  adminBadgeText: {
    color: theme.colors.purple,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    gap: 5,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#16A34A',
  },
  statusDotInactive: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#16A34A',
  },
  statusTextInactive: {
    color: '#64748B',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  metricText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  metricValue: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 80,
    left: theme.spacing.md,
    right: theme.spacing.md,
  },
  addStaffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    ...theme.shadows.elevated,
  },
  addStaffButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.card,
    borderTopRightRadius: theme.radius.card,
    padding: theme.spacing.lg,
    maxHeight: '85%',
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
    marginBottom: 6,
  },
  requiredStar: {
    color: theme.colors.danger,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 46,
  },
  inputErrorBorder: {
    borderColor: theme.colors.danger,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  roleOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: '#F1F5F9',
  },
  roleOptionSelected: {
    backgroundColor: theme.colors.black,
  },
  roleOptionText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  roleOptionTextSelected: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    marginTop: 24,
    marginBottom: 10,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.white,
  },
});

export default AdminStaffScreen;
