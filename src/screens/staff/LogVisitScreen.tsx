import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { LeadStatus } from '../../types';

const VISIT_OUTCOMES = [
  'Met customer',
  'Not available',
  'Quote shared',
  'Sample given',
  'Order confirmed',
  'Not interested',
];

const STATUS_OPTIONS: LeadStatus[] = ['New Lead', 'In Progress', 'Won', 'Lost'];

export const LogVisitScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: { leadId?: string; customerName?: string; location?: string } }, 'params'>>();
  const { user } = useAuth();

  const leadId = route.params?.leadId || '';
  const customerName = route.params?.customerName || 'Customer';
  const customerLocation = route.params?.location || 'Chennai';

  const [checkedIn, setCheckedIn] = useState<boolean>(true);
  const [capturedTimeText, setCapturedTimeText] = useState<string>('Captured · Today, 10:00 AM');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('Sample given');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('In Progress');
  const [notes, setNotes] = useState<string>('');
  const [skipFollowUp, setSkipFollowUp] = useState<boolean>(false);
  const [followUpType, setFollowUpType] = useState<'Call' | 'Visit' | 'Send quote'>('Call');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleCheckIn = () => {
    setCheckedIn(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setCapturedTimeText(`Captured · Today, ${timeStr}`);
    Alert.alert('Location Captured', `Checked in at ${customerLocation}`);
  };

  const handleSaveVisit = async () => {
    setSaving(true);
    try {
      if (leadId) {
        // 1. Add interaction
        const leadRef = doc(db, 'leads', leadId);
        const interactionsRef = collection(leadRef, 'interactions');
        await addDoc(interactionsRef, {
          type: 'visit',
          title: `Visit logged: ${selectedOutcome}`,
          note: notes.trim() || `Visit logged with outcome: ${selectedOutcome}`,
          authorId: user?.uid || '',
          authorName: user?.name || 'Staff',
          outcome: selectedOutcome,
          createdAt: serverTimestamp(),
        });

        // 2. Update lead status & follow up date
        const updatePayload: Record<string, any> = {
          status: selectedStatus,
          updatedAt: serverTimestamp(),
        };

        if (!skipFollowUp) {
          // Schedule follow up in 2 days by default
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 2);
          nextDate.setHours(11, 0, 0, 0);
          updatePayload.followUpAt = Timestamp.fromDate(nextDate);
        }

        await updateDoc(leadRef, updatePayload);
      }

      setSavedSuccess(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save visit.');
    } finally {
      setSaving(false);
    }
  };

  if (savedSuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successTopBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Feather name="x" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Log visit</Text>
          <View style={styles.iconBtnPlaceholder} />
        </View>

        <View style={styles.successContent}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={32} color={theme.colors.success} />
          </View>
          <Text style={styles.successTitle}>Visit saved</Text>
          <Text style={styles.successSubtitle}>
            {customerName} · {selectedOutcome}
          </Text>
        </View>

        <View style={styles.successFooter}>
          <TouchableOpacity
            style={styles.backTasksBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backTasksText}>Back to tasks</Text>
          </TouchableOpacity>

          {leadId ? (
            <TouchableOpacity
              style={styles.viewLeadBtn}
              onPress={() => {
                navigation.replace('LeadDetails', {
                  leadId,
                  customerName,
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.viewLeadText}>View lead</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Log visit</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="more-vertical" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.leadNameHeader}>{customerName}</Text>

        {/* Location Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Location</Text>
          <TouchableOpacity
            style={styles.checkInButton}
            onPress={handleCheckIn}
            activeOpacity={0.8}
          >
            <Text style={styles.checkInText}>Check in at location</Text>
          </TouchableOpacity>

          <View style={styles.locationCapturedRow}>
            <Feather name="map-pin" size={16} color={theme.colors.muted} />
            <View style={styles.locationCapturedTexts}>
              <Text style={styles.locationCapturedTitle}>{customerLocation}</Text>
              <Text style={styles.locationCapturedSubtitle}>{capturedTimeText}</Text>
            </View>
          </View>
        </View>

        {/* Visit outcome Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Visit outcome · Select one</Text>
          <View style={styles.chipsWrap}>
            {VISIT_OUTCOMES.map((out) => {
              const isSel = selectedOutcome === out;
              return (
                <TouchableOpacity
                  key={out}
                  style={[styles.outcomeChip, isSel && styles.outcomeChipSelected]}
                  onPress={() => setSelectedOutcome(out)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.outcomeChipText, isSel && styles.outcomeChipTextSelected]}>
                    {out}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Update status Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Update status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((st) => {
              const isSel = selectedStatus === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusOption, isSel && styles.statusOptionSelected]}
                  onPress={() => setSelectedStatus(st)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusOptionText, isSel && styles.statusOptionTextSelected]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Sample given. Share competitive rate card before the next call."
            placeholderTextColor={theme.colors.muted}
            multiline={true}
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Add Photo Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Add photo</Text>
          <View style={styles.photoSlotsRow}>
            <TouchableOpacity style={styles.photoSlot} activeOpacity={0.8}>
              <Feather name="image" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoSlot} activeOpacity={0.8}>
              <Feather name="image" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoSlot} activeOpacity={0.8}>
              <Feather name="image" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.photoHint}>Up to 3 photos</Text>
        </View>

        {/* Next follow-up Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Next follow-up</Text>

          {!skipFollowUp && (
            <>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeField}>
                  <Feather name="calendar" size={16} color={theme.colors.muted} />
                  <Text style={styles.dateTimeLabel}>Date</Text>
                  <Text style={styles.dateTimeValue}>In 2 Days</Text>
                </View>

                <View style={styles.dateTimeField}>
                  <Feather name="clock" size={16} color={theme.colors.muted} />
                  <Text style={styles.dateTimeLabel}>Time</Text>
                  <Text style={styles.dateTimeValue}>11:00 AM</Text>
                </View>
              </View>

              <Text style={styles.subLabel}>Type</Text>
              <View style={styles.typeRow}>
                {(['Call', 'Visit', 'Send quote'] as const).map((tp) => {
                  const isSel = followUpType === tp;
                  return (
                    <TouchableOpacity
                      key={tp}
                      style={[styles.typePill, isSel && styles.typePillSelected]}
                      onPress={() => setFollowUpType(tp)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.typeText, isSel && styles.typeTextSelected]}>
                        {tp}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.skipRow}>
            <Switch
              value={skipFollowUp}
              onValueChange={setSkipFollowUp}
              trackColor={{ false: '#E2E8F0', true: theme.colors.black }}
              thumbColor={theme.colors.white}
            />
            <Text style={styles.skipText}>Skip, no follow-up needed</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveVisit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save visit</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
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
  leadNameHeader: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  checkInButton: {
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    borderRadius: theme.radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  checkInText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  locationCapturedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  locationCapturedTexts: {
    flex: 1,
  },
  locationCapturedTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  locationCapturedSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  outcomeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F8FAFC',
  },
  outcomeChipSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  outcomeChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  outcomeChipTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  statusOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F8FAFC',
  },
  statusOptionSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  statusOptionText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  statusOptionTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
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
    marginTop: 4,
  },
  photoSlotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  photoSlot: {
    flex: 1,
    height: 80,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  photoHint: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 6,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  dateTimeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#F8FAFC',
  },
  dateTimeLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  dateTimeValue: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 'auto',
  },
  subLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  typePillSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  typeText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  typeTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  skipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
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
  backTasksBtn: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTasksText: {
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

export default LogVisitScreen;
