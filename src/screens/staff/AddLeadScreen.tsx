import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { LeadPriority, LeadSource } from '../../types';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_MODELS,
  INDUSTRIES,
  LEAD_SOURCES,
  PRIORITIES,
  Industry,
} from '../../config/business';
import { Screen, ScreenHeader } from '../../components';

export const AddLeadScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  const [company, setCompany] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>('Food');
  const [selectedSource, setSelectedSource] = useState<LeadSource>('Walk-in');

  const [selectedProducts, setSelectedProducts] = useState<string[]>(['Hand Sealers']);
  const [quantity, setQuantity] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<LeadPriority>('Medium');
  const [remarks, setRemarks] = useState('');

  // Models modal
  const [modelsModalVisible, setModelsModalVisible] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  const [errors, setErrors] = useState<{ contact?: string; mobile?: string }>({});
  const [saving, setSaving] = useState(false);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);

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
    const newErrors: { contact?: string; mobile?: string } = {};
    if (!contactPerson.trim() && !company.trim()) {
      newErrors.contact = 'Contact person or company name is required';
    }
    const cleanPhone = mobile.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.mobile = 'Enter a valid 10-digit mobile number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const cleanPhone = mobile.replace(/[^0-9]/g, '');
      const finalDisplayName = contactPerson.trim() || company.trim();

      const summaryText = `${location.trim() || 'Chennai'} · ${selectedProducts.join(', ')}${quantity.trim() ? ` (${quantity.trim()})` : ''}`;

      const leadsRef = collection(db, 'leads');
      const docRef = await addDoc(leadsRef, {
        customerName: finalDisplayName,
        company: company.trim() || '',
        contactPerson: contactPerson.trim() || '',
        industry: selectedIndustry,
        quantity: quantity.trim() || '',
        phone: cleanPhone,
        source: selectedSource,
        requirementSummary: summaryText,
        products: selectedProducts.length > 0 ? selectedProducts : ['Hand Sealers'],
        estimatedValue: 0,
        status: 'New Lead',
        priority: selectedPriority,
        assignedTo: user?.uid || '',
        assignedToName: user?.name || 'Staff',
        followUpAt: null,
        notes: remarks.trim() || '',
        location: { address: location.trim() || 'Chennai' },
        createdBy: user?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSavedLeadId(docRef.id);
    } catch (e: any) {
      alert(`Error saving lead: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCompany('');
    setContactPerson('');
    setMobile('');
    setLocation('');
    setSelectedIndustry('Food');
    setSelectedSource('Walk-in');
    setSelectedProducts(['Hand Sealers']);
    setQuantity('');
    setSelectedPriority('Medium');
    setRemarks('');
    setErrors({});
    setSavedLeadId(null);
  };

  if (savedLeadId) {
    return (
      <Screen
        hasTabBar={false}
        scroll={false}
        header={
          <ScreenHeader
            title="New Lead"
            onBack={() => navigation.goBack()}
          />
        }
        footer={
          <View style={styles.successFooter}>
            <TouchableOpacity
              style={styles.addAnotherBtn}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.addAnotherText}>Add another</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewLeadBtn}
              onPress={() => {
                navigation.replace('LeadDetails', {
                  leadId: savedLeadId,
                  customerName: contactPerson.trim() || company.trim(),
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.viewLeadText}>View lead</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={styles.successContent}>
          <View style={styles.successCircle}>
            <Feather name="check" size={32} color={theme.colors.success} />
          </View>
          <Text style={styles.successTitle}>Lead Saved</Text>
          <Text style={styles.successSub}>
            {company ? `${company} • ` : ''}{contactPerson || 'Customer'} added to your active pipeline.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      hasTabBar={false}
      scroll={true}
      keyboardAware={true}
      header={
        <ScreenHeader
          title="New Lead Intake"
          subtitle="Packaging Machinery & Materials"
          onBack={() => navigation.goBack()}
        />
      }
      footer={
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save Lead</Text>
            )}
          </TouchableOpacity>
        </View>
      }
      contentContainerStyle={styles.scrollContent}
    >
      {/* Client Identity Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Client & Company</Text>

        <Text style={styles.label}>Company Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Kaveri Agro Foods Pvt Ltd"
          placeholderTextColor={theme.colors.muted}
          value={company}
          onChangeText={setCompany}
        />

        <Text style={styles.label}>Contact Person *</Text>
        <TextInput
          style={[styles.input, errors.contact && styles.inputError]}
          placeholder="e.g. Ramesh Kumar (Purchasing Mgr)"
          placeholderTextColor={theme.colors.muted}
          value={contactPerson}
          onChangeText={(text) => {
            setContactPerson(text);
            if (errors.contact) setErrors((prev) => ({ ...prev, contact: undefined }));
          }}
        />
        {errors.contact ? <Text style={styles.errorText}>{errors.contact}</Text> : null}

        <Text style={styles.label}>Mobile Number *</Text>
        <TextInput
          style={[styles.input, errors.mobile && styles.inputError]}
          placeholder="e.g. 9876543210"
          placeholderTextColor={theme.colors.muted}
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={(text) => {
            setMobile(text);
            if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }));
          }}
        />
        {errors.mobile ? <Text style={styles.errorText}>{errors.mobile}</Text> : null}

        <Text style={styles.label}>Area / Location (Chennai)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ambattur IE, Chennai"
          placeholderTextColor={theme.colors.muted}
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>Target Industry</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {INDUSTRIES.map((ind) => {
            const isSelected = selectedIndustry === ind;
            return (
              <TouchableOpacity
                key={ind}
                style={[styles.sourceChip, isSelected && styles.sourceChipSelected]}
                onPress={() => setSelectedIndustry(ind)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sourceChipText, isSelected && styles.sourceChipTextSelected]}>
                  {ind}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Machinery & Requirement Section */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>Machinery & Requirement</Text>
          <TouchableOpacity
            style={styles.moreModelsBtn}
            onPress={() => setModelsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="search" size={12} color={theme.colors.primary} />
            <Text style={styles.moreModelsText}>More models</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Lead Source</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {LEAD_SOURCES.map((src) => {
            const isSelected = selectedSource === src;
            return (
              <TouchableOpacity
                key={src}
                style={[styles.sourceChip, isSelected && styles.sourceChipSelected]}
                onPress={() => setSelectedSource(src)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sourceChipText, isSelected && styles.sourceChipTextSelected]}>
                  {src}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Product Categories (Multi-select)</Text>
        <View style={styles.categoriesWrap}>
          {PRODUCT_CATEGORIES.map((cat) => {
            const isSelected = selectedProducts.includes(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, isSelected && styles.catChipSelected]}
                onPress={() => toggleProduct(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Models preview */}
        {selectedProducts.filter((p) => (PRODUCT_MODELS as readonly string[]).includes(p)).length > 0 && (
          <View style={styles.selectedModelsBox}>
            <Text style={styles.selectedModelsLabel}>Specific models selected:</Text>
            <View style={styles.selectedModelsWrap}>
              {selectedProducts
                .filter((p) => (PRODUCT_MODELS as readonly string[]).includes(p))
                .map((m) => (
                  <View key={m} style={styles.modelPill}>
                    <Text style={styles.modelPillText}>{m}</Text>
                    <TouchableOpacity onPress={() => toggleProduct(m)}>
                      <Feather name="x" size={12} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          </View>
        )}

        <Text style={styles.label}>Required Quantity</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 5 units or 2 machines"
          placeholderTextColor={theme.colors.muted}
          value={quantity}
          onChangeText={setQuantity}
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => {
            const isSelected = selectedPriority === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.priorityPill, isSelected && styles.priorityPillSelected]}
                onPress={() => setSelectedPriority(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.priorityText, isSelected && styles.priorityTextSelected]}>
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Requirement Notes / Discussion Remarks</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. customer wants a demo, quotation requested, preferred call time..."
          placeholderTextColor={theme.colors.muted}
          multiline={true}
          numberOfLines={3}
          value={remarks}
          onChangeText={setRemarks}
        />
      </View>

      {/* More Models Search Sheet Modal */}
      <Modal visible={modelsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Specific Models</Text>
                <Text style={styles.modalSubTitle}>Search and tap to select models</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModelsModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Feather name="search" size={16} color={theme.colors.muted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search models (e.g. Vacuum, Shrink, Cup)..."
                placeholderTextColor={theme.colors.muted}
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
              renderItem={({ item }) => {
                const isSelected = selectedProducts.includes(item);
                return (
                  <TouchableOpacity
                    style={[styles.modelItemRow, isSelected && styles.modelItemRowSelected]}
                    onPress={() => toggleProduct(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modelItemText, isSelected && styles.modelItemTextSelected]}>
                      {item}
                    </Text>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Feather name="check" size={12} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No matching machine models found.</Text>
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
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
  },
  moreModelsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: '#EFF6FF',
  },
  moreModelsText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    color: theme.colors.primary,
  },
  label: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  chipRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  sourceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 40,
    justifyContent: 'center',
  },
  sourceChipSelected: {
    backgroundColor: theme.colors.black,
  },
  sourceChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  sourceChipTextSelected: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 40,
    justifyContent: 'center',
  },
  catChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary,
  },
  catChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  catChipTextSelected: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary,
  },
  selectedModelsBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedModelsLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    color: theme.colors.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  selectedModelsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modelPill: {
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
  modelPillText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.primary,
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  priorityPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 40,
    justifyContent: 'center',
  },
  priorityPillSelected: {
    backgroundColor: theme.colors.black,
  },
  priorityText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  priorityTextSelected: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: theme.colors.white,
  },
  successFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addAnotherBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  addAnotherText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  viewLeadBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
  },
  viewLeadText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.white,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: theme.colors.text,
    marginBottom: 6,
  },
  successSub: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
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
    padding: 16,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalSubTitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  modalSearchBox: {
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
  modelItemText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  modelItemTextSelected: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
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
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default AddLeadScreen;
