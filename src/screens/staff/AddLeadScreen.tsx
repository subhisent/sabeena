import React, { useState } from 'react';
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
import { AppButton } from '../../components';

const SOURCES: LeadSource[] = ['Walk-in', 'Site visit' as any, 'Call' as any, 'Website', 'Referral'];
const PRIORITIES: LeadPriority[] = ['Low', 'Medium', 'High'];

export const AddLeadScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('Walk-in');
  const [productRequirement, setProductRequirement] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<LeadPriority>('Medium');
  const [remarks, setRemarks] = useState('');

  const [errors, setErrors] = useState<{ name?: string; mobile?: string }>({});
  const [saving, setSaving] = useState(false);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: { name?: string; mobile?: string } = {};
    if (!customerName.trim()) {
      newErrors.name = 'Customer name is required';
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
      const leadsRef = collection(db, 'leads');
      const docRef = await addDoc(leadsRef, {
        customerName: customerName.trim(),
        phone: mobile.trim(),
        source: selectedSource,
        requirementSummary: `${location.trim() || 'Chennai'} · ${productRequirement.trim() || 'Requirement'}${quantity ? ` (${quantity})` : ''}`,
        products: productRequirement.trim() ? [productRequirement.trim()] : ['General Sealing'],
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
    setCustomerName('');
    setMobile('');
    setLocation('');
    setSelectedSource('Walk-in');
    setProductRequirement('');
    setQuantity('');
    setSelectedPriority('Medium');
    setRemarks('');
    setErrors({});
    setSavedLeadId(null);
  };

  if (savedLeadId) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successTopBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Feather name="x" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>New lead</Text>
          <View style={styles.iconBtnPlaceholder} />
        </View>

        <View style={styles.successContent}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={32} color={theme.colors.success} />
          </View>
          <Text style={styles.successTitle}>Lead saved</Text>
          <Text style={styles.successSubtitle}>
            {customerName} saved for {user?.name || 'Staff'}.
          </Text>
        </View>

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
                customerName: customerName,
              });
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.viewLeadText}>View lead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="x" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>New lead</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="more-vertical" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.requiredNotice}>* Required fields</Text>

        {/* Customer Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer</Text>

          <Text style={styles.label}>Customer name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Enter customer name"
            placeholderTextColor={theme.colors.muted}
            value={customerName}
            onChangeText={(text) => {
              setCustomerName(text);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          <Text style={styles.label}>Mobile *</Text>
          <TextInput
            style={[styles.input, errors.mobile && styles.inputError]}
            placeholder="Enter mobile number"
            placeholderTextColor={theme.colors.muted}
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={(text) => {
              setMobile(text);
              if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }));
            }}
          />
          {errors.mobile ? <Text style={styles.errorText}>{errors.mobile}</Text> : null}

          <Text style={styles.label}>Area / location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter area / location"
            placeholderTextColor={theme.colors.muted}
            value={location}
            onChangeText={setLocation}
          />

          <TouchableOpacity
            style={styles.locationAction}
            onPress={() => setLocation('Current Location (Chennai)')}
            activeOpacity={0.8}
          >
            <Feather name="map-pin" size={16} color={theme.colors.primary} />
            <Text style={styles.locationActionText}>Use current location</Text>
          </TouchableOpacity>
        </View>

        {/* Requirement Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Requirement</Text>

          <Text style={styles.label}>Source</Text>
          <View style={styles.chipRow}>
            {SOURCES.map((src) => {
              const isSelected = selectedSource === src;
              return (
                <TouchableOpacity
                  key={src}
                  style={[styles.sourceChip, isSelected && styles.sourceChipSelected]}
                  onPress={() => setSelectedSource(src)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.sourceChipText,
                      isSelected && styles.sourceChipTextSelected,
                    ]}
                  >
                    {src}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Product / requirement</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter product / requirement"
            placeholderTextColor={theme.colors.muted}
            value={productRequirement}
            onChangeText={setProductRequirement}
          />

          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter quantity"
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
                  <Text
                    style={[
                      styles.priorityText,
                      isSelected && styles.priorityTextSelected,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add any additional details"
            placeholderTextColor={theme.colors.muted}
            multiline={true}
            numberOfLines={3}
            value={remarks}
            onChangeText={setRemarks}
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save lead</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  topBarTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  iconBtn: {
    padding: 6,
  },
  iconBtnPlaceholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  requiredNotice: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  label: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.danger,
    borderWidth: 1.5,
  },
  errorText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 4,
  },
  locationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 4,
  },
  locationActionText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  sourceChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  sourceChipSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  sourceChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  sourceChipTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  priorityPillSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  priorityText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  priorityTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.card,
  },
  saveButtonText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.white,
  },
  bottomSpacer: {
    height: 40,
  },
  // Success state
  successContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  successTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    marginBottom: 20,
  },
  successTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 28,
    color: theme.colors.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  successFooter: {
    gap: 12,
    marginBottom: 20,
  },
  addAnotherBtn: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAnotherText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  viewLeadBtn: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewLeadText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.white,
  },
});

export default AddLeadScreen;
