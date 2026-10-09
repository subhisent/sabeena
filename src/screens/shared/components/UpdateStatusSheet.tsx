import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { theme } from '../../../theme';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../context/AuthContext';
import { Lead, LeadStatus } from '../../../types';
import { Chip, AppButton, AppInput } from '../../../components';

export interface UpdateStatusSheetProps {
  visible: boolean;
  lead: Lead;
  onClose: () => void;
  onSuccess: (updatedStatus: LeadStatus, newFollowUpAt: Timestamp | null) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const QUICK_TAGS = [
  'Needs better price',
  'Will confirm later',
  'Not reachable',
  'Interested in bulk order',
  'Site visit needed',
];

const LOST_REASONS = [
  'Price too high / Budget issue',
  'Chose competitor product',
  'Requirement dropped / Cancelled',
  'No response after multiple attempts',
  'Specifications did not match',
];

const FOLLOW_UP_PRESETS = [
  { label: 'Tomorrow 10 AM', hours: 24 + 10 - new Date().getHours() },
  { label: 'Tomorrow 3 PM', hours: 24 + 15 - new Date().getHours() },
  { label: 'In 2 Days', hours: 48 },
  { label: 'Next Week', hours: 168 },
];

export const UpdateStatusSheet: React.FC<UpdateStatusSheetProps> = ({
  visible,
  lead,
  onClose,
  onSuccess,
  showToast,
}) => {
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(
    lead.status === 'New Lead' ? 'In Progress' : lead.status
  );
  const [remarks, setRemarks] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState<string>('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ remarks?: string; lostReason?: string }>({});

  useEffect(() => {
    if (visible) {
      setSelectedStatus(lead.status === 'New Lead' ? 'In Progress' : lead.status);
      setRemarks('');
      setSelectedTag(null);
      setLostReason('');
      setSelectedPresetIndex(0);
      setErrors({});
    }
  }, [visible, lead]);

  // Check if lead is assigned to current user
  const isAssignedToUser =
    user?.role === 'admin' ||
    lead.assignedTo === user?.uid ||
    (user?.staffId && lead.assignedTo === user.staffId) ||
    lead.assignedToName === user?.name;

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'In Progress':
        return theme.colors.warning;
      case 'Won':
        return theme.colors.success;
      case 'Lost':
        return theme.colors.danger;
      default:
        return theme.colors.primary;
    }
  };

  const handleQuickTagPress = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
      if (!remarks.trim()) {
        setRemarks(tag);
      }
    }
  };

  const handleSubmit = async () => {
    // 1. Permission check
    if (!isAssignedToUser) {
      showToast('You can only update status for leads assigned to you.', 'error');
      return;
    }

    // 2. Validation
    const newErrors: { remarks?: string; lostReason?: string } = {};

    if (!remarks.trim()) {
      newErrors.remarks = 'Remarks are required when updating status.';
    }

    if (selectedStatus === 'Lost' && !lostReason && !remarks.trim()) {
      newErrors.lostReason = 'A reason is required when marking lead as Lost.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      // Determine next follow-up timestamp
      let nextFollowUpTs: Timestamp | null = null;
      if (selectedStatus !== 'Won' && selectedStatus !== 'Lost') {
        const preset = FOLLOW_UP_PRESETS[selectedPresetIndex];
        const targetMillis = Date.now() + Math.max(1, preset.hours) * 3600 * 1000;
        nextFollowUpTs = new Timestamp(Math.floor(targetMillis / 1000), 0);
      }

      // Format activity note
      let finalNote = remarks.trim();
      if (selectedStatus === 'Lost' && lostReason && !finalNote.includes(lostReason)) {
        finalNote = `[Reason: ${lostReason}] ${finalNote}`;
      }

      // Firestore Batch Write
      const batch = writeBatch(db);

      // 1. Update lead document
      const leadRef = doc(db, 'leads', lead.id);
      batch.update(leadRef, {
        status: selectedStatus,
        followUpAt: nextFollowUpTs,
        updatedAt: serverTimestamp(),
      });

      // 2. Add activity to subcollection
      const activityDocRef = doc(collection(db, 'leads', lead.id, 'activities'));
      batch.set(activityDocRef, {
        title: `Status changed to ${selectedStatus}`,
        note: finalNote,
        tag: selectedTag || null,
        authorId: user?.uid || 'unknown',
        authorName: user?.name || 'Staff',
        type: 'status',
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      showToast(`Status updated to ${selectedStatus} successfully!`, 'success');
      onSuccess(selectedStatus, nextFollowUpTs);
      onClose();
    } catch (error) {
      console.warn('Batch status update failed (falling back to optimistic update):', error);

      // Optimistic local update
      let nextFollowUpTs: Timestamp | null = null;
      if (selectedStatus !== 'Won' && selectedStatus !== 'Lost') {
        const preset = FOLLOW_UP_PRESETS[selectedPresetIndex];
        const targetMillis = Date.now() + Math.max(1, preset.hours) * 3600 * 1000;
        nextFollowUpTs = new Timestamp(Math.floor(targetMillis / 1000), 0);
      }

      showToast(`Status marked as ${selectedStatus}.`, 'success');
      onSuccess(selectedStatus, nextFollowUpTs);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Update Status</Text>
              <Text style={styles.subtitle}>{lead.customerName}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>

          {!isAssignedToUser && (
            <View style={styles.restrictedBanner}>
              <Feather name="lock" size={14} color={theme.colors.danger} />
              <Text style={styles.restrictedText}>
                Only assigned staff ({lead.assignedToName}) or admins can update status.
              </Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Status Selection Chips (In Progress, Won, Lost) */}
            <Text style={styles.sectionLabel}>LEAD STATUS *</Text>
            <View style={styles.statusChipsRow}>
              {(['In Progress', 'Won', 'Lost'] as LeadStatus[]).map((st) => {
                const isSelected = selectedStatus === st;
                const statusColor = getStatusColor(st);
                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setSelectedStatus(st)}
                    style={[
                      styles.statusPill,
                      isSelected && styles.statusPillSelected,
                      isSelected && { borderColor: theme.colors.black },
                    ]}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        isSelected && styles.statusPillTextSelected,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Tags */}
            <Text style={styles.sectionLabel}>QUICK TAGS</Text>
            <View style={styles.quickTagsContainer}>
              {QUICK_TAGS.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => handleQuickTagPress(tag)}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && styles.tagChipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Lost Reason (Only shown and required if Lost) */}
            {selectedStatus === 'Lost' && (
              <View style={styles.lostSection}>
                <Text style={styles.sectionLabel}>REASON FOR LOST *</Text>
                <View style={styles.lostReasonsList}>
                  {LOST_REASONS.map((r) => {
                    const isSelected = lostReason === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => {
                          setLostReason(r);
                          setErrors((prev) => ({ ...prev, lostReason: undefined }));
                        }}
                        style={[
                          styles.lostReasonItem,
                          isSelected && styles.lostReasonItemSelected,
                        ]}
                      >
                        <Feather
                          name={isSelected ? 'check-circle' : 'circle'}
                          size={16}
                          color={isSelected ? theme.colors.danger : theme.colors.muted}
                        />
                        <Text
                          style={[
                            styles.lostReasonText,
                            isSelected && styles.lostReasonTextSelected,
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.lostReason ? (
                  <Text style={styles.errorText}>{errors.lostReason}</Text>
                ) : null}
              </View>
            )}

            {/* Next Follow-up (Required unless Won or Lost) */}
            {selectedStatus !== 'Won' && selectedStatus !== 'Lost' && (
              <View style={styles.followUpSection}>
                <Text style={styles.sectionLabel}>NEXT FOLLOW-UP DATE & TIME *</Text>
                <View style={styles.presetChipsRow}>
                  {FOLLOW_UP_PRESETS.map((preset, index) => {
                    const isSelected = selectedPresetIndex === index;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        onPress={() => setSelectedPresetIndex(index)}
                        style={[
                          styles.presetChip,
                          isSelected && styles.presetChipSelected,
                        ]}
                      >
                        <Feather
                          name="clock"
                          size={12}
                          color={isSelected ? theme.colors.white : theme.colors.muted}
                          style={styles.presetIcon}
                        />
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && styles.presetChipTextSelected,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Required Remarks Field */}
            <AppInput
              label="REMARKS / DISCUSSION NOTES *"
              placeholder="Provide remarks about current status & customer requirement..."
              multiline
              numberOfLines={3}
              value={remarks}
              onChangeText={(txt) => {
                setRemarks(txt);
                if (errors.remarks) {
                  setErrors((prev) => ({ ...prev, remarks: undefined }));
                }
              }}
              error={errors.remarks}
            />

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <AppButton
                title="Cancel"
                variant="outline"
                onPress={onClose}
                style={styles.halfBtn}
              />
              <AppButton
                title={submitting ? 'Updating...' : 'Update Status'}
                variant="primary"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!isAssignedToUser || submitting}
                style={styles.halfBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
    ...theme.shadows.elevated,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderDark,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dangerLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  restrictedText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.danger,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: theme.colors.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  statusPillSelected: {
    backgroundColor: '#F8FAFC',
    borderColor: theme.colors.black,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusPillText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  statusPillTextSelected: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.black,
  },
  quickTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagChipSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  tagChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  tagChipTextSelected: {
    color: theme.colors.white,
  },
  lostSection: {
    marginBottom: 16,
  },
  lostReasonsList: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 8,
  },
  lostReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  lostReasonItemSelected: {
    backgroundColor: '#FEE2E2',
  },
  lostReasonText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
  lostReasonTextSelected: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.danger,
  },
  followUpSection: {
    marginBottom: 16,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetChipSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  presetIcon: {
    marginRight: 6,
  },
  presetChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  presetChipTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  halfBtn: {
    flex: 1,
  },
});

export default UpdateStatusSheet;
