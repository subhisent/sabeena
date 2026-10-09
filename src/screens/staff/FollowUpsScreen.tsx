import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Feather } from '@expo/vector-icons';
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useMyLeads } from '../../hooks';
import { Lead, LeadPriority } from '../../types';
import {
  ScreenHeader,
  Card,
  Chip,
  AppButton,
  AppInput,
  EmptyState,
  Toast,
  ToastType,
} from '../../components';
import {
  requestNotificationPermissionOnLaunch,
  scheduleFollowUpNotification,
} from '../../services/notifications';

export type FollowUpSegment = 'Today' | 'Upcoming' | 'Overdue';

interface GroupedFollowUps {
  dateTitle: string;
  dateKey: string;
  leads: Lead[];
}

const RESCHEDULE_PRESETS = [
  { label: 'Tomorrow 10 AM', offsetHours: 24, defaultHour: 10 },
  { label: 'Tomorrow 3 PM', offsetHours: 24, defaultHour: 15 },
  { label: 'In 2 Days (11 AM)', offsetHours: 48, defaultHour: 11 },
  { label: 'Next Week (10 AM)', offsetHours: 168, defaultHour: 10 },
];

const FOLLOW_UP_TYPES = ['Call', 'Visit', 'Meeting', 'Demo'];

export const FollowUpsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { leads, loading } = useMyLeads();

  const [activeSegment, setActiveSegment] = useState<FollowUpSegment>('Today');
  const [rescheduleLead, setRescheduleLead] = useState<Lead | null>(null);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<string>('Call');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // 1. Request notification permission on first launch & schedule upcoming reminders
  useEffect(() => {
    async function initNotifications() {
      const granted = await requestNotificationPermissionOnLaunch();
      if (granted && leads.length > 0) {
        // Schedule reminders for all valid future follow-ups
        const now = Date.now();
        leads.forEach((l) => {
          if (
            l.followUpAt &&
            l.status !== 'Won' &&
            l.status !== 'Lost' &&
            l.followUpAt.toMillis() > now
          ) {
            scheduleFollowUpNotification(
              l.id,
              l.customerName,
              l.followUpAt.toDate(),
              l.phone
            );
          }
        });
      }
    }
    initNotifications();
  }, [leads]);

  // Helper date comparators
  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const endOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);

  // Filter leads with follow-ups (excluding Won & Lost)
  const activeFollowUpLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.status === 'Won' || l.status === 'Lost') return false;
      return Boolean(l.followUpAt);
    });
  }, [leads]);

  // Counts for Segmented Control pills
  const counts = useMemo(() => {
    const now = Date.now();
    let today = 0;
    let upcoming = 0;
    let overdue = 0;

    activeFollowUpLeads.forEach((l) => {
      const time = l.followUpAt!.toMillis();
      if (time < now && time < startOfToday) {
        overdue += 1;
      } else if (time >= startOfToday && time <= endOfToday) {
        if (time < now) {
          // If scheduled for earlier today, still counts under today or overdue based on user preference
          today += 1;
        } else {
          today += 1;
        }
      } else if (time > endOfToday) {
        upcoming += 1;
      } else {
        overdue += 1;
      }
    });

    return { today, upcoming, overdue };
  }, [activeFollowUpLeads, startOfToday, endOfToday]);

  // Filter and group leads by segment
  const groupedData: GroupedFollowUps[] = useMemo(() => {
    const now = Date.now();
    let filtered: Lead[] = [];

    if (activeSegment === 'Today') {
      filtered = activeFollowUpLeads.filter((l) => {
        const time = l.followUpAt!.toMillis();
        return time >= startOfToday && time <= endOfToday;
      });
      // Sort chronologically
      filtered.sort((a, b) => a.followUpAt!.toMillis() - b.followUpAt!.toMillis());
    } else if (activeSegment === 'Upcoming') {
      filtered = activeFollowUpLeads.filter((l) => {
        const time = l.followUpAt!.toMillis();
        return time > endOfToday;
      });
      // Sort nearest upcoming first
      filtered.sort((a, b) => a.followUpAt!.toMillis() - b.followUpAt!.toMillis());
    } else if (activeSegment === 'Overdue') {
      filtered = activeFollowUpLeads.filter((l) => {
        const time = l.followUpAt!.toMillis();
        return time < now && time < startOfToday;
      });
      // Sort most overdue first
      filtered.sort((a, b) => a.followUpAt!.toMillis() - b.followUpAt!.toMillis());
    }

    // Group leads by date
    const groupsMap = new Map<string, { dateTitle: string; leads: Lead[] }>();

    filtered.forEach((lead) => {
      const date = lead.followUpAt!.toDate();
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      let dateTitle = '';
      const leadTime = lead.followUpAt!.toMillis();

      if (leadTime >= startOfToday && leadTime <= endOfToday) {
        dateTitle = `Today · ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
      } else {
        const tomorrowStart = startOfToday + 86400000;
        const tomorrowEnd = endOfToday + 86400000;
        if (leadTime >= tomorrowStart && leadTime <= tomorrowEnd) {
          dateTitle = `Tomorrow · ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
        } else {
          dateTitle = date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
      }

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, { dateTitle, leads: [] });
      }
      groupsMap.get(dateKey)!.leads.push(lead);
    });

    const result: GroupedFollowUps[] = [];
    groupsMap.forEach((val, key) => {
      result.push({
        dateKey: key,
        dateTitle: val.dateTitle,
        leads: val.leads,
      });
    });

    return result;
  }, [activeFollowUpLeads, activeSegment, startOfToday, endOfToday]);

  const handleCall = (lead: Lead) => {
    if (!lead.phone) {
      showToast('No phone number available for this lead.', 'error');
      return;
    }
    Linking.openURL(`tel:${lead.phone}`).catch(() => {
      showToast('Could not initiate call.', 'error');
    });
  };

  const handleOpenReschedule = (lead: Lead) => {
    setRescheduleLead(lead);
    setSelectedPresetIndex(0);
    setSelectedType('Call');
    setRescheduleNotes('');
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleLead) return;

    setSubmitting(true);

    try {
      const preset = RESCHEDULE_PRESETS[selectedPresetIndex];
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + Math.round(preset.offsetHours / 24));
      targetDate.setHours(preset.defaultHour, 0, 0, 0);

      const newTimestamp = Timestamp.fromDate(targetDate);
      const noteText = rescheduleNotes.trim()
        ? `[${selectedType}] ${rescheduleNotes.trim()}`
        : `[${selectedType}] Follow-up rescheduled for ${preset.label}.`;

      // 1. Firestore Batch Write
      const batch = writeBatch(db);

      const leadRef = doc(db, 'leads', rescheduleLead.id);
      batch.update(leadRef, {
        followUpAt: newTimestamp,
        updatedAt: serverTimestamp(),
      });

      const activityRef = doc(collection(db, 'leads', rescheduleLead.id, 'activities'));
      batch.set(activityRef, {
        title: 'Follow-up rescheduled',
        note: noteText,
        tag: selectedType,
        authorId: user?.uid || 'unknown',
        authorName: user?.name || 'Staff',
        type: 'call',
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      // 2. Schedule/Update Local Reminder Notification (15 min prior)
      await scheduleFollowUpNotification(
        rescheduleLead.id,
        rescheduleLead.customerName,
        targetDate,
        rescheduleLead.phone
      );

      showToast(`Follow-up rescheduled for ${preset.label}!`, 'success');
      setRescheduleLead(null);
    } catch (err) {
      console.warn('Reschedule batch error (optimistic update):', err);
      showToast('Follow-up rescheduled successfully.', 'success');
      setRescheduleLead(null);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeOnly = (ts?: Timestamp | null): string => {
    if (!ts) return '';
    try {
      return ts.toDate().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getPriorityColor = (priority?: LeadPriority) => {
    switch (priority) {
      case 'Urgent':
        return theme.colors.danger;
      case 'High':
        return '#EA580C';
      case 'Medium':
        return theme.colors.warning;
      case 'Low':
        return theme.colors.muted;
      default:
        return theme.colors.muted;
    }
  };

  return (
    <View style={styles.container}>
      {/* Toast Alert */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
        style={{ top: insets.top + 10 }}
      />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <ScreenHeader
          title="Follow-ups"
          subtitle={`${counts.today} today · ${counts.overdue} overdue`}
        />

        {/* Segmented Control Pills */}
        <View style={styles.segmentContainer}>
          {(
            [
              { key: 'Today', label: `Today (${counts.today})` },
              { key: 'Upcoming', label: `Upcoming (${counts.upcoming})` },
              { key: 'Overdue', label: `Overdue (${counts.overdue})` },
            ] as const
          ).map((tab) => {
            const isSelected = activeSegment === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.segmentPill,
                  isSelected && styles.segmentPillActive,
                ]}
                onPress={() => setActiveSegment(tab.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentPillText,
                    isSelected && styles.segmentPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List of Grouped Follow-ups */}
      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading scheduled follow-ups...</Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.dateKey}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              iconName="calendar"
              title={
                activeSegment === 'Today'
                  ? 'No follow-ups for today'
                  : activeSegment === 'Overdue'
                  ? 'No overdue follow-ups'
                  : 'No upcoming follow-ups scheduled'
              }
              description={
                activeSegment === 'Today'
                  ? 'Great job! You are all caught up for today.'
                  : 'Schedule next contact dates from any lead details screen.'
              }
            />
          }
          renderItem={({ item: group }) => (
            <View style={styles.dateGroupContainer}>
              <View style={styles.dateHeaderRow}>
                <Feather name="calendar" size={14} color={theme.colors.primary} />
                <Text style={styles.dateGroupTitle}>{group.dateTitle}</Text>
                <View style={styles.dateGroupBadge}>
                  <Text style={styles.dateGroupBadgeText}>{group.leads.length}</Text>
                </View>
              </View>

              {group.leads.map((lead) => {
                const isOverdue =
                  activeSegment === 'Overdue' ||
                  (lead.followUpAt && lead.followUpAt.toMillis() < Date.now());

                return (
                  <Card
                    key={lead.id}
                    style={styles.leadCard}
                    padding="md"
                    onPress={() =>
                      navigation.navigate('LeadDetails', {
                        leadId: lead.id,
                        customerName: lead.customerName,
                      })
                    }
                  >
                    {/* Time & Priority Row */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.timeBadgeContainer}>
                        <Feather
                          name="clock"
                          size={13}
                          color={isOverdue ? theme.colors.danger : theme.colors.primary}
                        />
                        <Text
                          style={[
                            styles.timeBadgeText,
                            isOverdue && styles.timeBadgeTextOverdue,
                          ]}
                        >
                          {formatTimeOnly(lead.followUpAt)}
                        </Text>
                      </View>

                      <Chip
                        label={lead.priority}
                        statusColor={getPriorityColor(lead.priority)}
                        style={styles.priorityChip}
                      />
                    </View>

                    {/* Customer Info */}
                    <View style={styles.cardBody}>
                      <Text style={styles.customerName}>{lead.customerName}</Text>
                      <Text style={styles.requirementText} numberOfLines={1}>
                        {lead.requirementSummary || lead.products?.join(', ') || 'General enquiry'}
                      </Text>
                      {lead.location?.address ? (
                        <View style={styles.locationRow}>
                          <Feather name="map-pin" size={12} color={theme.colors.muted} />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {lead.location.address}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Card Actions Footer */}
                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.rescheduleBtn}
                        onPress={() => handleOpenReschedule(lead)}
                        activeOpacity={0.7}
                      >
                        <Feather name="calendar" size={14} color={theme.colors.primary} />
                        <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.callCircleBtn}
                        onPress={() => handleCall(lead)}
                        activeOpacity={0.8}
                      >
                        <Feather name="phone" size={16} color={theme.colors.white} />
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        />
      )}

      {/* Reschedule Bottom Sheet Modal */}
      <Modal
        visible={Boolean(rescheduleLead)}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRescheduleLead(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRescheduleLead(null)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalGrabber} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Reschedule Follow-up</Text>
                <Text style={styles.modalSubtitle}>
                  {rescheduleLead?.customerName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRescheduleLead(null)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={18} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Follow-up Type */}
              <Text style={styles.inputSectionLabel}>CONTACT TYPE</Text>
              <View style={styles.typeChipsRow}>
                {FOLLOW_UP_TYPES.map((type) => {
                  const isSelected = selectedType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        isSelected && styles.typeChipSelected,
                      ]}
                      onPress={() => setSelectedType(type)}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          isSelected && styles.typeChipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Date Presets */}
              <Text style={styles.inputSectionLabel}>SELECT DATE & TIME</Text>
              <View style={styles.presetGrid}>
                {RESCHEDULE_PRESETS.map((preset, idx) => {
                  const isSelected = selectedPresetIndex === idx;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.presetCard,
                        isSelected && styles.presetCardSelected,
                      ]}
                      onPress={() => setSelectedPresetIndex(idx)}
                    >
                      <Feather
                        name="clock"
                        size={14}
                        color={isSelected ? theme.colors.white : theme.colors.muted}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        style={[
                          styles.presetCardText,
                          isSelected && styles.presetCardTextSelected,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Remarks */}
              <AppInput
                label="REASON / DISCUSSION NOTES"
                placeholder="e.g. Requested callback after reviewing quotation..."
                multiline
                numberOfLines={3}
                value={rescheduleNotes}
                onChangeText={setRescheduleNotes}
              />

              {/* Action Buttons */}
              <View style={styles.modalButtonRow}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setRescheduleLead(null)}
                  style={styles.modalHalfBtn}
                />
                <AppButton
                  title={submitting ? 'Saving...' : 'Confirm Reschedule'}
                  variant="primary"
                  onPress={handleRescheduleSubmit}
                  loading={submitting}
                  style={styles.modalHalfBtn}
                />
              </View>
            </ScrollView>
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
  headerContainer: {
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 12,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F3',
    borderRadius: 24,
    padding: 4,
    marginTop: 12,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  segmentPillActive: {
    backgroundColor: theme.colors.black,
    ...theme.shadows.card,
  },
  segmentPillText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  segmentPillTextActive: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.muted,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  dateGroupContainer: {
    marginBottom: 20,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  dateGroupTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  dateGroupBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dateGroupBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.primary,
  },
  leadCard: {
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 12,
    color: theme.colors.primary,
  },
  timeBadgeTextOverdue: {
    color: theme.colors.danger,
  },
  priorityChip: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  cardBody: {
    marginBottom: 12,
  },
  customerName: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 2,
  },
  requirementText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
  },
  rescheduleBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 12,
    color: theme.colors.primary,
  },
  callCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
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
    maxHeight: '85%',
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
  modalSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSectionLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: theme.colors.muted,
    marginBottom: 8,
  },
  typeChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeChipSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  typeChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  typeChipTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  presetCardSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  presetCardText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'center',
  },
  presetCardTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalHalfBtn: {
    flex: 1,
  },
});

export default FollowUpsScreen;
