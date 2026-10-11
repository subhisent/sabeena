import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { LeadSource, LeadPriority, LeadStatus, User } from '../../types';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_MODELS,
  INDUSTRIES,
  LEAD_SOURCES,
  STATUSES,
  PRIORITIES,
  Industry,
} from '../../config/business';
import { Card, Avatar, Toast, ToastType, Screen, ScreenHeader } from '../../components';
import { SCREEN_HORIZONTAL_PADDING } from '../../constants';

interface StaffWithStats {
  user: User;
  openLeads: number;
  closedLeads: number;
  isBusy: boolean;
}

export const AdminAddLeadScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user: currentUser, profile } = useAuth();

  // Form State
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [industry, setIndustry] = useState<Industry>('Food');
  const [source, setSource] = useState<LeadSource>('IndiaMART');

  const [selectedProducts, setSelectedProducts] = useState<string[]>(['Hand Sealers']);
  const [quantity, setQuantity] = useState('');
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

  // More Models Modal state
  const [modelsModalVisible, setModelsModalVisible] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  // Submission state
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; contactPerson?: string; staff?: string }>({});
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

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

        const leadsRef = collection(db, 'leads');
        const leadsSnap = await getDocs(leadsRef);
        const leadsData = leadsSnap.docs.map((d) => d.data());

        const staffStats: StaffWithStats[] = users.map((u) => {
          const userLeads = leadsData.filter((l) => l.assignedTo === u.uid);
          const open = userLeads.filter((l) => l.status !== 'Won' && l.status !== 'Lost').length;
          const closed = userLeads.filter((l) => l.status === 'Won' || l.status === 'Lost').length;
          return {
            user: u,
            openLeads: open,
            closedLeads: closed,
            isBusy: open >= 12,
          };
        });

        setStaffList(staffStats);
        if (staffStats.length > 0 && !selectedStaff) {
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
            if (!contactPerson && docData.name) {
              setContactPerson(docData.name);
            }
            if (!company && docData.company) {
              setCompany(docData.company);
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

  const filteredModels = useMemo(() => {
    if (!modelSearchQuery.trim()) return PRODUCT_MODELS;
    const q = modelSearchQuery.toLowerCase().trim();
    return PRODUCT_MODELS.filter((m) => m.toLowerCase().includes(q));
  }, [modelSearchQuery]);

  const validate = (): boolean => {
    const newErrors: { phone?: string; contactPerson?: string; staff?: string } = {};
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone = 'Valid 10-digit phone number is required';
    }
    if (!contactPerson.trim() && !company.trim()) {
      newErrors.contactPerson = 'Contact person or company name is required';
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
      const finalContactName = contactPerson.trim() || company.trim();
      let customerId = existingCustomerId;

      // 1. Create or update customer
      if (customerId) {
        const custDocRef = doc(db, 'customers', customerId);
        await updateDoc(custDocRef, {
          name: finalContactName,
          company: company.trim() || '',
          source: source,
          productInterest: selectedProducts.join(', '),
          updatedAt: serverTimestamp(),
        });
      } else {
        const newCustRef = await addDoc(collection(db, 'customers'), {
          name: finalContactName,
          company: company.trim() || '',
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
        customerName: finalContactName,
        company: company.trim() || '',
        contactPerson: contactPerson.trim() || '',
        industry: industry,
        quantity: quantity.trim() || '',
        phone: cleanPhone,
        source: source,
        receivedDate: serverTimestamp(),
        requirementSummary:
          requirementSummary.trim() ||
          `${selectedProducts.join(', ')}${quantity.trim() ? ` (${quantity.trim()})` : ''}`,
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
        note: `Assigned to ${selectedStaff?.user.name || 'Staff'}. Industry: ${industry}. Channel: ${source}. Priority: ${priority}.`,
        authorId: currentUser?.uid || '',
        authorName: profile?.name || 'Administrator',
        createdAt: serverTimestamp(),
      });

      showToast('Lead created and assigned successfully', 'success');
      setTimeout(() => {
        navigation.replace('LeadDetails', {
          leadId: leadDocRef.id,
          customerName: finalContactName,
        });
      }, 400);
    } catch (e: any) {
      console.error('Error creating lead:', e);
      Alert.alert('Error', e.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  const renderFooter = () => (
    <View style={styles.footerContainer}>
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
    </View>
  );

  return (
    <Screen
      hasTabBar={false}
      scroll
      keyboardAware
      contentContainerStyle={styles.scrollContent}
      header={
        <ScreenHeader
          title="New Lead Intake"
          subtitle={currentDateStr}
          onBack={() => navigation.goBack()}
        />
      }
      footer={renderFooter()}
    >
      {/* CARD 1: Customer & Business Details */}
      <Card style={styles.formCard} padding="lg">
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="briefcase" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>CLIENT & BUSINESS DETAILS</Text>
          </View>
          {isVerifiedCustomer && (
            <View style={styles.verifiedBadge}>
              <Feather name="check-circle" size={12} color={theme.colors.success} />
              <Text style={styles.verifiedText}>Verified Customer</Text>
            </View>
          )}
        </View>

        {/* Company Name Field */}
        <Text style={styles.inputLabel}>Company Name</Text>
        <View style={styles.inputWrapper}>
          <Feather name="box" size={16} color={theme.colors.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Kaveri Agro Foods Pvt Ltd"
            placeholderTextColor="#94A3B8"
            value={company}
            onChangeText={setCompany}
          />
        </View>

        {/* Contact Person Field */}
        <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>
          Contact Person <Text style={styles.requiredStar}>*</Text>
        </Text>
        <View style={[styles.inputWrapper, errors.contactPerson ? styles.inputErrorBorder : null]}>
          <Feather name="user" size={16} color={theme.colors.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Ramesh Kumar (Purchasing Mgr)"
            placeholderTextColor="#94A3B8"
            value={contactPerson}
            onChangeText={(txt) => {
              setContactPerson(txt);
              if (errors.contactPerson) setErrors((prev) => ({ ...prev, contactPerson: undefined }));
            }}
          />
        </View>
        {errors.contactPerson ? <Text style={styles.errorText}>{errors.contactPerson}</Text> : null}

        {/* Phone Field */}
        <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>
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

        {/* Industry Selector */}
        <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Target Industry</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
          {INDUSTRIES.map((ind) => {
            const isSelected = industry === ind;
            return (
              <TouchableOpacity
                key={ind}
                onPress={() => setIndustry(ind)}
                activeOpacity={0.8}
                style={[styles.pillOption, isSelected && styles.pillOptionSelected]}
              >
                <Text style={[styles.pillOptionText, isSelected && styles.pillOptionTextSelected]}>
                  {ind}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lead Source */}
        <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Lead Source</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
          {LEAD_SOURCES.map((s) => {
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
              <Feather name="package" size={16} color={theme.colors.purple} />
            </View>
            <Text style={styles.cardTitle}>MACHINERY & REQUIREMENT</Text>
          </View>
          <TouchableOpacity
            style={styles.moreModelsHeaderBtn}
            onPress={() => setModelsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="search" size={12} color={theme.colors.primary} />
            <Text style={styles.moreModelsBtnText}>More models</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Product Categories (Multi-select)</Text>
        <View style={styles.chipsContainer}>
          {PRODUCT_CATEGORIES.map((prod) => {
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

        {/* Selected Models list preview if models were added */}
        {selectedProducts.filter((p) => (PRODUCT_MODELS as readonly string[]).includes(p)).length > 0 && (
          <View style={styles.selectedModelsPreviewBox}>
            <Text style={styles.selectedModelsTitle}>Selected Machinery Models:</Text>
            <View style={styles.selectedModelsChips}>
              {selectedProducts
                .filter((p) => (PRODUCT_MODELS as readonly string[]).includes(p))
                .map((m) => (
                  <View key={m} style={styles.modelTag}>
                    <Text style={styles.modelTagText}>{m}</Text>
                    <TouchableOpacity onPress={() => toggleProduct(m)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="x" size={12} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Quantity Field */}
        <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Required Quantity</Text>
        <View style={styles.inputWrapper}>
          <Feather name="hash" size={16} color={theme.colors.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 5 units or 2 machines"
            placeholderTextColor="#94A3B8"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

        {/* Estimated Deal Value */}
        <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Estimated Deal Value (₹)</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.currencyPrefix}>₹</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 45,000"
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
          placeholder="e.g. 12-inch impulse hand sealer for pouch sealing, 5 units"
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
              <Feather name="chevron-down" size={16} color={theme.colors.muted} />
            </View>
          ) : (
            <View style={styles.selectedRepRow}>
              <Text style={styles.repPickerPlaceholder}>Select a sales representative</Text>
              <Feather name="chevron-down" size={16} color={theme.colors.muted} />
            </View>
          )}
        </TouchableOpacity>
        {errors.staff ? <Text style={styles.errorText}>{errors.staff}</Text> : null}
      </Card>

      {/* CARD 4: Priority & Internal Notes */}
      <Card style={styles.formCard} padding="lg">
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.cardIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Feather name="file-text" size={16} color={theme.colors.muted} />
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
          placeholder="e.g. customer wants a demo, quotation requested, preferred call time..."
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          value={internalNotes}
          onChangeText={setInternalNotes}
        />
      </Card>

      {/* Searchable More Models Sheet Modal */}
      <Modal visible={modelsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Specific Models</Text>
                <Text style={styles.modalSubTitle}>Search and tap to add machinery variants</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModelsModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Model Search Bar */}
            <View style={styles.modalSearchBar}>
              <Feather name="search" size={16} color={theme.colors.muted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search models (e.g. Vacuum, Shrink, Cup)..."
                placeholderTextColor="#94A3B8"
                value={modelSearchQuery}
                onChangeText={setModelSearchQuery}
              />
              {modelSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setModelSearchQuery('')}>
                  <Feather name="x" size={16} color={theme.colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredModels}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedProducts.includes(item);
                return (
                  <TouchableOpacity
                    style={[styles.modelItemRow, isSelected && styles.modelItemRowSelected]}
                    onPress={() => toggleProduct(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modelItemInfo}>
                      <Text style={[styles.modelItemText, isSelected && styles.modelItemTextSelected]}>
                        {item}
                      </Text>
                    </View>
                    <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxSelected]}>
                      {isSelected && <Feather name="check" size={12} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.modalEmptyText}>No matching machine models found.</Text>
              }
            />

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setModelsModalVisible(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sales Rep Selector Modal */}
      <Modal visible={staffModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sales Representative</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setStaffModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
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
    </Screen>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  scrollContent: {
    padding: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 24,
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
  moreModelsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: '#EFF6FF',
  },
  moreModelsBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 12,
    color: theme.colors.primary,
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
    minHeight: 44,
    justifyContent: 'center',
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
    minHeight: 44,
    justifyContent: 'center',
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
  selectedModelsPreviewBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedModelsTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    color: theme.colors.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  selectedModelsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  modelTagText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
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
    maxHeight: '80%',
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
  modalSubTitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  modalCloseBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.text,
  },
  modelItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modelItemRowSelected: {
    backgroundColor: '#EFF6FF',
    borderRadius: theme.radius.sm,
  },
  modelItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  modelItemText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  modelItemTextSelected: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modalDoneBtn: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  modalDoneBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
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
