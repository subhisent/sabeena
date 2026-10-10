import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { LeadSource, LeadPriority, LeadStatus, User } from '../../types';
import { Card, Avatar, Toast, ToastType } from '../../components';

const SOURCES: LeadSource[] = ['IndiaMART', 'Walk-in', 'Referral', 'WhatsApp', 'Website'];
const PRODUCTS_LIST = ['Curtains', 'Blinds', 'Upholstery', 'Wallpapers', 'Mattresses', 'Rods & Tracks'];
const STATUSES: LeadStatus[] = ['New Lead', 'In Progress'];
const PRIORITIES: LeadPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

interface StaffWithStats {
  user: User;
  openLeads: number;
  closedLeads: number;
  isBusy: boolean;
}

export const AdminAddLeadScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user: currentUser, profile } = useAuth();

  // Form State
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [source, setSource] = useState<LeadSource>('IndiaMART');
  
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['Curtains']);
  const [estimatedValue, setEstimatedValue] = useState('');
  const [requirementSummary, setRequirementSummary] = useState('');

  const [leadStatus, setLeadStatus] = useState<LeadStatus>('New Lead');
  const [selectedStaff, setSelectedStaff] = useState<StaffWithStats | null>(null);
  
  const [priority, setPriority] = useState<LeadPriority>('High');
  const [internalNotes, setInternalNotes] = useState('');

  // Autocomplete / Verification state
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null);
  const [isVerifiedCustomer, setIsVerifiedCustomer] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Staff list state
  const [staffList, setStaffList] = useState<StaffWithStats[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffModalVisible, setStaffModalVisible] = useState(false);

  // Submission state
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; customerName?: string; staff?: string }>({});
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Current formatted date
  const currentDateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  // Fetch active staff and calculate open leads count
  useEffect(() => {
    const fetchStaffMembers = async () => {
      setLoadingStaff(true);
      try {
        const usersRef = collection(db, 'users');
        const qUsers = query(usersRef, where('role', '==', 'staff'), where('active', '==', true));
        const usersSnap = await getDocs(qUsers);

        const users: User[] = usersSnap.docs.map((d) => ({
          ...(d.data() as Omit<User, 'uid'>),
          uid: d.id,
        }));

        // Fetch all leads to compute open/closed counts
        const leadsRef = collection(db, 'leads');
        const leadsSnap = await getDocs(leadsRef);

        const staffStats: StaffWithStats[] = users.map((u) => {
          let open = 0;
          let closed = 0;
          leadsSnap.docs.forEach((ld) => {
            const ldata = ld.data();
            if (ldata.assignedTo === u.uid) {
              if (ldata.status === 'Won' || ldata.status === 'Lost') {
                closed++;
              } else {
                open++;
              }
            }
          });

          return {
            user: u,
            openLeads: open,
            closedLeads: closed,
            isBusy: open >= 12,
          };
        });

        setStaffList(staffStats);
        if (staffStats.length > 0 && !selectedStaff) {
          // Default to first available staff member
          setSelectedStaff(staffStats[0]);
        }
      } catch (err: any) {
        console.warn('Error fetching staff members:', err);
      } finally {
        setLoadingStaff(false);
      }
    };

    fetchStaffMembers();
  }, []);

  // Phone lookup for customer autocomplete
  useEffect(() => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 10) {
      setSearchingCustomer(true);
      const searchTimer = setTimeout(async () => {
        try {
          const custRef = collection(db, 'customers');
          const qCust = query(custRef, where('phone', '==', cleanPhone));
          const snap = await getDocs(qCust);

          if (!snap.empty) {
            const docData = snap.docs[0].data();
            setExistingCustomerId(snap.docs[0].id);
            setIsVerifiedCustomer(true);
            if (!customerName) {
              setCustomerName(docData.name || '');
            }
          } else {
            setExistingCustomerId(null);
            setIsVerifiedCustomer(false);
          }
        } catch (e) {
          console.warn('Error searching customer by phone:', e);
        } finally {
          setSearchingCustomer(false);
        }
      }, 400);

      return () => clearTimeout(searchTimer);
    } else {
      setIsVerifiedCustomer(false);
      setExistingCustomerId(null);
    }
  }, [phone]);

  const toggleProduct = (prod: string) => {
    if (selectedProducts.includes(prod)) {
      if (selectedProducts.length > 1) {
        setSelectedProducts(selectedProducts.filter((p) => p !== prod));
      }
    } else {
      setSelectedProducts([...selectedProducts, prod]);
    }
  };

  const validate = (): boolean => {
    const newErrors: { phone?: string; customerName?: string; staff?: string } = {};
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone = 'Valid 10-digit phone number is required';
    }
    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (!selectedStaff) {
      newErrors.staff = 'Please select a sales representative';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateLead = async () => {
    if (!validate()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields marked in red.');
      return;
    }

    setSaving(true);
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      let customerId = existingCustomerId;

      // 1. Create or update customer
      if (customerId) {
        const custDocRef = doc(db, 'customers', customerId);
        await updateDoc(custDocRef, {
          name: customerName.trim(),
          source: source,
          productInterest: selectedProducts.join(', '),
          updatedAt: serverTimestamp(),
        });
      } else {
        const newCustRef = await addDoc(collection(db, 'customers'), {
          name: customerName.trim(),
          phone: cleanPhone,
          source: source,
          productInterest: selectedProducts.join(', '),
          status: 'assigned',
          assignedTo: selectedStaff?.user.uid || null,
          createdBy: currentUser?.uid || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        customerId = newCustRef.id;
      }

      // 2. Create lead
      const numericValue = parseFloat(estimatedValue.replace(/[^0-9.]/g, '')) || 0;
      const leadsRef = collection(db, 'leads');
      const leadDocRef = await addDoc(leadsRef, {
        customerId: customerId,
        customerName: customerName.trim(),
        phone: cleanPhone,
        source: source,
        receivedDate: serverTimestamp(),
        requirementSummary: requirementSummary.trim() || selectedProducts.join(', '),
        products: selectedProducts,
        estimatedValue: numericValue,
        status: leadStatus,
        priority: priority,
        assignedTo: selectedStaff?.user.uid || '',
        assignedToName: selectedStaff?.user.name || 'Sales Rep',
        followUpAt: null,
        notes: internalNotes.trim(),
        createdBy: currentUser?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 3. Add initial interaction
      const interactionsRef = collection(db, 'leads', leadDocRef.id, 'interactions');
      await addDoc(interactionsRef, {
        type: 'note',
        title: 'Lead Intake Completed',
        note: `Assigned to ${selectedStaff?.user.name || 'Staff'}. Intake channel: ${source}. Priority: ${priority}.`,
        authorId: currentUser?.uid || '',
        authorName: profile?.name || 'Administrator',
        createdAt: serverTimestamp(),
      });

      showToast('Lead created and assigned successfully', 'success');
      setTimeout(() => {
        navigation.replace('LeadDetails', {
          leadId: leadDocRef.id,
          customerName: customerName.trim(),
        });
      }, 400);
    } catch (e: any) {
      console.error('Error creating lead:', e);
      Alert.alert('Error', e.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>New Lead Intake</Text>
          <Text style={styles.topBarDate}>{currentDateStr}</Text>
        </View>
        <View style={styles.topBarRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* CARD 1: Customer & Channel */}
        <Card style={styles.formCard} padding="lg">
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="user" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>CUSTOMER & CHANNEL</Text>
            </View>
            {isVerifiedCustomer && (
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={12} color={theme.colors.success} />
                <Text style={styles.verifiedText}>Verified Customer</Text>
              </View>
            )}
          </View>

          {/* Phone Field */}
          <Text style={styles.inputLabel}>
            Phone Number <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={[styles.inputWrapper, errors.phone ? styles.inputErrorBorder : null]}>
            <Feather name="phone" size={16} color={theme.colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(txt) => {
                setPhone(txt);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
            />
            {searchingCustomer && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </View>
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

          {/* Customer Name */}
          <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>
            Customer Name <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={[styles.inputWrapper, errors.customerName ? styles.inputErrorBorder : null]}>
            <Feather name="user" size={16} color={theme.colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#94A3B8"
              value={customerName}
              onChangeText={(txt) => {
                setCustomerName(txt);
                if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: undefined }));
              }}
            />
          </View>
          {errors.customerName ? <Text style={styles.errorText}>{errors.customerName}</Text> : null}

          {/* Lead Source */}
          <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Lead Source</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            {SOURCES.map((s) => {
              const isSelected = source === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSource(s)}
                  activeOpacity={0.8}
                  style={[styles.pillOption, isSelected && styles.pillOptionSelected]}
                >
                  <Text style={[styles.pillOptionText, isSelected && styles.pillOptionTextSelected]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* CARD 2: Product & Requirement */}
        <Card style={styles.formCard} padding="lg">
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: '#F5F3FF' }]}>
                <Feather name="shopping-bag" size={16} color={theme.colors.purple} />
              </View>
              <Text style={styles.cardTitle}>PRODUCT & REQUIREMENT</Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>Interested Products</Text>
          <View style={styles.chipsContainer}>
            {PRODUCTS_LIST.map((prod) => {
              const isSelected = selectedProducts.includes(prod);
              return (
                <TouchableOpacity
                  key={prod}
                  onPress={() => toggleProduct(prod)}
                  activeOpacity={0.8}
                  style={[styles.chipItem, isSelected && styles.chipItemSelected]}
                >
                  <Text style={[styles.chipItemText, isSelected && styles.chipItemTextSelected]}>
                    {prod}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Estimated Deal Value */}
          <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Estimated Deal Value (₹)</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 75,000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={estimatedValue}
              onChangeText={setEstimatedValue}
            />
          </View>

          {/* Requirement Summary */}
          <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Requirement Summary</Text>
          <TextInput
            style={[styles.textInputArea, { minHeight: 70 }]}
            placeholder="e.g. 3BHK flat, living room motorized curtains + 2 bedroom roller blinds."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            value={requirementSummary}
            onChangeText={setRequirementSummary}
          />
        </Card>

        {/* CARD 3: Status & Assignment */}
        <Card style={styles.formCard} padding="lg">
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="user-check" size={16} color={theme.colors.warning} />
              </View>
              <Text style={styles.cardTitle}>STATUS & ASSIGNMENT</Text>
            </View>
          </View>

          {/* Initial Status */}
          <Text style={styles.inputLabel}>Initial Status</Text>
          <View style={styles.pillsRow}>
            {STATUSES.map((st) => {
              const isSelected = leadStatus === st;
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => setLeadStatus(st)}
                  activeOpacity={0.8}
                  style={[styles.pillOption, isSelected && styles.pillOptionSelected]}
                >
                  <Text style={[styles.pillOptionText, isSelected && styles.pillOptionTextSelected]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Assign Sales Rep */}
          <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>
            Assign Sales Representative <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.repPickerButton, errors.staff ? styles.inputErrorBorder : null]}
            onPress={() => setStaffModalVisible(true)}
            activeOpacity={0.85}
          >
            {selectedStaff ? (
              <View style={styles.selectedRepRow}>
                <Avatar name={selectedStaff.user.name} size="sm" />
                <View style={styles.selectedRepInfo}>
                  <Text style={styles.selectedRepName}>{selectedStaff.user.name}</Text>
                  <Text style={styles.selectedRepStats}>
                    {selectedStaff.openLeads} Leads · {selectedStaff.closedLeads} Closed
                  </Text>
                </View>
                <View
                  style={[
                    styles.repHealthBadge,
                    selectedStaff.isBusy ? styles.repBusyBadge : styles.repHealthyBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.repHealthBadgeText,
                      selectedStaff.isBusy ? styles.repBusyText : styles.repHealthyText,
                    ]}
                  >
                    {selectedStaff.isBusy ? 'BUSY' : 'HEALTHY'}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.repPickerPlaceholder}>Select Sales Representative</Text>
            )}
            <Feather name="chevron-down" size={18} color={theme.colors.muted} />
          </TouchableOpacity>
          {errors.staff ? <Text style={styles.errorText}>{errors.staff}</Text> : null}
        </Card>

        {/* CARD 4: Internal Notes & Priority */}
        <Card style={styles.formCard} padding="lg">
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Feather name="file-text" size={16} color={theme.colors.danger} />
              </View>
              <Text style={styles.cardTitle}>INTERNAL NOTES & PRIORITY</Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>Priority</Text>
          <View style={styles.pillsRow}>
            {PRIORITIES.map((pr) => {
              const isSelected = priority === pr;
              let activeBg = theme.colors.black;
              if (isSelected && pr === 'Urgent') activeBg = theme.colors.danger;
              if (isSelected && pr === 'High') activeBg = '#EA580C';

              return (
                <TouchableOpacity
                  key={pr}
                  onPress={() => setPriority(pr)}
                  activeOpacity={0.8}
                  style={[
                    styles.pillOption,
                    isSelected && { backgroundColor: activeBg, borderColor: activeBg },
                  ]}
                >
                  <Text style={[styles.pillOptionText, isSelected && styles.pillOptionTextSelected]}>
                    {pr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Internal Intake Notes</Text>
          <TextInput
            style={[styles.textInputArea, { minHeight: 80 }]}
            placeholder="Customer preferred time for visit, special fabric requests, or custom remarks..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            value={internalNotes}
            onChangeText={setInternalNotes}
          />
        </Card>

        {/* Bottom CTA Button */}
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleCreateLead}
          disabled={saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="plus-circle" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Create & Assign Lead</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Sales Rep Selector Modal */}
      <Modal visible={staffModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sales Representative</Text>
              <TouchableOpacity onPress={() => setStaffModalVisible(false)}>
                <Feather name="x" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {loadingStaff ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <FlatList
                data={staffList}
                keyExtractor={(item) => item.user.uid}
                renderItem={({ item }) => {
                  const isSelected = selectedStaff?.user.uid === item.user.uid;
                  return (
                    <TouchableOpacity
                      style={[styles.staffModalItem, isSelected && styles.staffModalItemSelected]}
                      onPress={() => {
                        setSelectedStaff(item);
                        setStaffModalVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Avatar name={item.user.name} size="md" />
                      <View style={styles.staffModalItemInfo}>
                        <Text style={styles.staffModalItemName}>{item.user.name}</Text>
                        <Text style={styles.staffModalItemStats}>
                          {item.openLeads} Active Leads · {item.closedLeads} Closed
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.repHealthBadge,
                          item.isBusy ? styles.repBusyBadge : styles.repHealthyBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.repHealthBadgeText,
                            item.isBusy ? styles.repBusyText : styles.repHealthyText,
                          ]}
                        >
                          {item.isBusy ? 'BUSY' : 'HEALTHY'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.modalEmptyText}>No active sales staff available.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 17,
    color: theme.colors.text,
  },
  topBarDate: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  topBarRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  formCard: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  verifiedText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    color: theme.colors.success,
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
    height: 48,
  },
  inputErrorBorder: {
    borderColor: theme.colors.danger,
  },
  inputIcon: {
    marginRight: 8,
  },
  currencyPrefix: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  textInputArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
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
  pillsScroll: {
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pillOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 8,
  },
  pillOptionSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  pillOptionText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  pillOptionTextSelected: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chipItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary,
  },
  chipItemText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  chipItemTextSelected: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary,
  },
  repPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedRepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  selectedRepInfo: {
    flex: 1,
  },
  selectedRepName: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedRepStats: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
  repHealthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    marginRight: 8,
  },
  repHealthyBadge: {
    backgroundColor: '#DCFCE7',
  },
  repBusyBadge: {
    backgroundColor: '#FEE2E2',
  },
  repHealthBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  repHealthyText: {
    color: '#16A34A',
  },
  repBusyText: {
    color: '#DC2626',
  },
  repPickerPlaceholder: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    marginTop: theme.spacing.sm,
    ...theme.shadows.card,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
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
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 17,
    color: theme.colors.text,
  },
  modalLoading: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  staffModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  staffModalItemSelected: {
    backgroundColor: '#F8FAFC',
  },
  staffModalItemInfo: {
    flex: 1,
  },
  staffModalItemName: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.text,
  },
  staffModalItemStats: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
});

export default AdminAddLeadScreen;
