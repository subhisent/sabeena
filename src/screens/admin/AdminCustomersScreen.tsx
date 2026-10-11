import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Customer, User, LeadSource } from '../../types';
import { Card, Avatar, Toast, ToastType, EmptyState, Screen } from '../../components';
import { useFloatingButtonBottom } from '../../hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRODUCT_CATEGORIES, LEAD_SOURCES } from '../../config/business';

interface CustomerSection {
  title: string;
  data: Customer[];
}

export const AdminCustomersScreen: React.FC = () => {
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Customer Modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [city, setCity] = useState<string>('Chennai');
  const [source, setSource] = useState<LeadSource>('Walk-in');
  const [selectedProduct, setSelectedProduct] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [saving, setSaving] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string }>({});

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'customers'),
      (snap) => {
        const list: Customer[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<Customer, 'id'>),
          id: d.id,
        }));
        setCustomers(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error loading customers:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filter and group customers alphabetically A-Z
  const sections = useMemo<CustomerSection[]>(() => {
    let filtered = customers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.productInterest?.toLowerCase().includes(q)
      );
    }

    // Sort alphabetically by name
    const sorted = [...filtered].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );

    // Group into sections by first letter
    const groups: { [key: string]: Customer[] } = {};
    sorted.forEach((c) => {
      const firstChar = (c.name || '#').charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(c);
    });

    return Object.keys(groups)
      .sort()
      .map((letter) => ({
        title: letter,
        data: groups[letter],
      }));
  }, [customers, searchQuery]);

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() =>
      showToast('Unable to open phone dialer', 'error')
    );
  };

  const validate = (): boolean => {
    const errs: { name?: string; phone?: string } = {};
    if (!customerName.trim()) errs.name = 'Customer name is required';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) errs.phone = 'Valid 10-digit mobile required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateCustomer = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const custRef = collection(db, 'customers');
      await addDoc(custRef, {
        name: customerName.trim(),
        company: companyName.trim() || '',
        phone: cleanPhone,
        email: email.trim().toLowerCase() || '',
        city: city.trim() || 'Chennai',
        address: city.trim() || 'Chennai',
        source: source,
        productInterest: selectedProduct,
        status: 'new',
        assignedTo: null,
        createdBy: user?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showToast(`Customer ${customerName} added successfully`, 'success');
      setModalVisible(false);
      setCompanyName('');
      setCustomerName('');
      setPhone('');
      setEmail('');
      setCity('Chennai');
    } catch (e: any) {
      console.error('Error adding customer:', e);
      Alert.alert('Error', e.message || 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  };

  const insets = useSafeAreaInsets();
  const floatingBottom = useFloatingButtonBottom(true);

  const headerNode = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Customers</Text>
      <Text style={styles.headerSubtitle}>{customers.length} registered packaging clients</Text>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={theme.colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search company, contact person, or location..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.clearSearchBtn}
          >
            <Feather name="x" size={16} color={theme.colors.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Screen
        scroll={false}
        hasTabBar={true}
        header={headerNode}
      >

      {/* Customer List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="No Customers Found"
            description="Add your first customer to build your directory or try adjusting your search."
            iconName="users"
            actionLabel="Add Customer"
            onAction={() => setModalVisible(true)}
            style={styles.emptyCard}
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: floatingBottom + 64 }]}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const displayName = item.company ? item.company : item.name;
            const contactPerson = item.company ? item.name : null;

            return (
              <Card style={styles.customerCard} padding="md">
                <View style={styles.customerRow}>
                  <Avatar name={displayName} size="md" />
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">
                      {displayName}
                    </Text>
                    {contactPerson ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                        <Feather name="user" size={11} color={theme.colors.muted} />
                        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.muted }} numberOfLines={1}>
                          {contactPerson}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.customerPhone} numberOfLines={1}>{item.phone}</Text>
                    <View style={styles.tagRow}>
                      <View style={styles.cityTag}>
                        <Feather name="map-pin" size={10} color={theme.colors.muted} />
                        <Text style={styles.cityTagText}>{item.city || 'Chennai'}</Text>
                      </View>
                      {item.productInterest ? (
                        <View style={styles.productTag}>
                          <Text style={styles.productTagText}>{item.productInterest}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Call Button */}
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(item.phone)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="phone" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
        />
      )}
      </Screen>

      {/* Floating Add Customer Button */}
      <View style={[styles.bottomBar, { bottom: floatingBottom }]}>
        <TouchableOpacity
          style={styles.addCustomerBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.88}
        >
          <Feather name="user-plus" size={18} color="#FFFFFF" />
          <Text style={styles.addCustomerBtnText}>Add Customer</Text>
        </TouchableOpacity>
      </View>

      {/* Add Customer Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Packaging Client</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View>
              {/* Company Name */}
              <Text style={styles.inputLabel}>Company Name</Text>
              <View style={styles.inputWrapper}>
                <Feather name="briefcase" size={16} color={theme.colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Kaveri Agro Foods Pvt Ltd"
                  placeholderTextColor="#94A3B8"
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>

              {/* Contact Person */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                Contact Person <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, formErrors.name ? styles.inputErrorBorder : null]}>
                <Feather name="user" size={16} color={theme.colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Ramesh Kumar (Purchasing Mgr)"
                  placeholderTextColor="#94A3B8"
                  value={customerName}
                  onChangeText={(t) => {
                    setCustomerName(t);
                    if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
                  }}
                />
              </View>
              {formErrors.name ? <Text style={styles.errorText}>{formErrors.name}</Text> : null}

              {/* Phone */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                Phone Number <Text style={styles.requiredStar}>*</Text>
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

              {/* City / Location */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>City / Industrial Area</Text>
              <View style={styles.inputWrapper}>
                <Feather name="map-pin" size={16} color={theme.colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Ambattur IE, Chennai"
                  placeholderTextColor="#94A3B8"
                  value={city}
                  onChangeText={setCity}
                />
              </View>

              {/* Product Interest */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Primary Product Interest</Text>
              <View style={styles.chipsRow}>
                {PRODUCT_CATEGORIES.slice(0, 6).map((p) => {
                  const isSelected = selectedProduct === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setSelectedProduct(p)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Submit button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, saving && styles.modalSubmitBtnDisabled]}
                onPress={handleCreateCustomer}
                disabled={saving}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Save Customer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.text,
  },
  clearSearchBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: theme.spacing.md,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 20,
    paddingVertical: 36,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    backgroundColor: theme.colors.background,
    paddingVertical: 6,
    marginTop: 10,
  },
  sectionHeaderText: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },
  customerCard: {
    marginBottom: 8,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: theme.colors.text,
  },
  customerPhone: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  cityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cityTagText: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.colors.muted,
  },
  productTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productTagText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 10,
    color: theme.colors.primary,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 80,
    left: theme.spacing.md,
    right: theme.spacing.md,
  },
  addCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    ...theme.shadows.elevated,
  },
  addCustomerBtnText: {
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: '#F1F5F9',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  chipTextSelected: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    marginTop: 20,
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

export default AdminCustomersScreen;
