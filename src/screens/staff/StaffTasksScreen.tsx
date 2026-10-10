import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { COLLECTIONS } from '../../constants';
import { EmptyState, FAB, Toast, ToastType } from '../../components';

export type TaskSegment = 'Today' | 'Overdue' | 'Upcoming';

export interface UnifiedTaskItem {
  id: string;
  source: 'task' | 'lead';
  rawId: string;
  leadId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  taskType: 'Visit' | 'Call' | 'Send quote' | 'Meeting' | 'Demo';
  location: string;
  scheduledAt: Date | null;
  status: 'pending' | 'completed' | 'in_progress';
  completedAtText?: string;
  remarks?: string;
}

export const StaffTasksScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  const [activeSegment, setActiveSegment] = useState<TaskSegment>('Today');
  const [tasks, setTasks] = useState<UnifiedTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Quick Log Visit Modal
  const [selectedTaskForLog, setSelectedTaskForLog] = useState<UnifiedTaskItem | null>(null);
  const [logNotes, setLogNotes] = useState<string>('');
  const [submittingLog, setSubmittingLog] = useState<boolean>(false);

  // Toast
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

  // Real-time listener for assigned tasks & scheduled leads from Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const staffIdentifiers = [user.uid];
    if (user.staffId && user.staffId !== user.uid) {
      staffIdentifiers.push(user.staffId);
    }

    let unsubTasks: (() => void) | null = null;
    let unsubLeads: (() => void) | null = null;

    try {
      // 1. Listen to 'tasks' collection
      const tasksRef = collection(db, COLLECTIONS.TASKS);
      const qTasks =
        user.role === 'admin'
          ? query(tasksRef)
          : query(tasksRef, where('assignedTo', 'in', staffIdentifiers));

      unsubTasks = onSnapshot(
        qTasks,
        (taskSnap) => {
          const directTasks: UnifiedTaskItem[] = taskSnap.docs.map((d) => {
            const data = d.data();
            const schedDate = data.dueDate?.toDate ? data.dueDate.toDate() : null;
            const isDone = data.status === 'completed';
            const compText = isDone && data.updatedAt?.toDate
              ? `Visited ${formatTimeOnly(data.updatedAt.toDate())}`
              : isDone
              ? 'Visited'
              : undefined;

            return {
              id: `task-${d.id}`,
              source: 'task',
              rawId: d.id,
              customerId: data.customerId,
              customerName: data.customerName || 'Customer',
              customerPhone: data.customerPhone || '',
              taskType: (data.taskType as any) || 'Visit',
              location: data.location || data.address || 'Chennai',
              scheduledAt: schedDate,
              status: isDone ? 'completed' : 'pending',
              completedAtText: compText,
              remarks: data.lastRemarks || data.outcome,
            };
          });

          // 2. Listen to 'leads' collection with scheduled follow-ups
          const leadsRef = collection(db, 'leads');
          const qLeads =
            user.role === 'admin'
              ? query(leadsRef)
              : query(leadsRef, where('assignedTo', 'in', staffIdentifiers));

          unsubLeads = onSnapshot(
            qLeads,
            (leadSnap) => {
              const leadTasks: UnifiedTaskItem[] = [];

              leadSnap.docs.forEach((ld) => {
                const lData = ld.data();
                if (lData.followUpAt) {
                  const followDate = lData.followUpAt.toDate ? lData.followUpAt.toDate() : null;
                  const isWonOrLost = lData.status === 'Won' || lData.status === 'Lost';
                  const compText = isWonOrLost && lData.updatedAt?.toDate
                    ? `Completed ${formatTimeOnly(lData.updatedAt.toDate())}`
                    : undefined;

                  // Extract location from requirementSummary or location object
                  let loc = 'Chennai';
                  if (lData.location?.address) {
                    loc = lData.location.address.split(',')[0];
                  } else if (lData.requirementSummary && lData.requirementSummary.includes('·')) {
                    loc = lData.requirementSummary.split('·')[0].trim();
                  }

                  leadTasks.push({
                    id: `lead-${ld.id}`,
                    source: 'lead',
                    rawId: ld.id,
                    leadId: ld.id,
                    customerId: lData.customerId,
                    customerName: lData.customerName || 'Lead',
                    customerPhone: lData.phone || '',
                    taskType: (lData.priority === 'Urgent' ? 'Visit' : 'Call') as any,
                    location: loc,
                    scheduledAt: followDate,
                    status: isWonOrLost ? 'completed' : 'pending',
                    completedAtText: compText,
                    remarks: lData.notes,
                  });
                }
              });

              // Merge and deduplicate
              const combined = [...directTasks, ...leadTasks];
              setTasks(combined);
              setLoading(false);
              setRefreshing(false);
            },
            (err) => {
              console.warn('Leads listener warning in StaffTasksScreen:', err.message);
              setTasks(directTasks);
              setLoading(false);
              setRefreshing(false);
            }
          );
        },
        (err) => {
          console.warn('Tasks listener warning in StaffTasksScreen:', err.message);
          setLoading(false);
          setRefreshing(false);
        }
      );
    } catch (e) {
      console.warn('Error initiating Firestore snapshot listeners:', e);
      setLoading(false);
      setRefreshing(false);
    }

    return () => {
      if (unsubTasks) unsubTasks();
      if (unsubLeads) unsubLeads();
    };
  }, [user]);

  // Date classification helpers
  const categorizedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayItems: UnifiedTaskItem[] = [];
    const overdueItems: UnifiedTaskItem[] = [];
    const upcomingItems: UnifiedTaskItem[] = [];

    tasks.forEach((t) => {
      if (!t.scheduledAt) {
        todayItems.push(t);
        return;
      }

      const taskDate = new Date(t.scheduledAt);
      const isPast = taskDate.getTime() < Date.now();
      const isTodayDate = taskDate >= today && taskDate < tomorrow;

      if (t.status === 'completed') {
        todayItems.push(t);
      } else if (isTodayDate) {
        todayItems.push(t);
      } else if (isPast) {
        overdueItems.push(t);
      } else {
        upcomingItems.push(t);
      }
    });

    // Sort today items by scheduled time
    todayItems.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return -1;
      if (b.status === 'completed' && a.status !== 'completed') return 1;
      const timeA = a.scheduledAt ? a.scheduledAt.getTime() : 0;
      const timeB = b.scheduledAt ? b.scheduledAt.getTime() : 0;
      return timeA - timeB;
    });

    // Sort overdue by oldest first
    overdueItems.sort((a, b) => {
      const timeA = a.scheduledAt ? a.scheduledAt.getTime() : 0;
      const timeB = b.scheduledAt ? b.scheduledAt.getTime() : 0;
      return timeA - timeB;
    });

    // Sort upcoming by nearest first
    upcomingItems.sort((a, b) => {
      const timeA = a.scheduledAt ? a.scheduledAt.getTime() : 0;
      const timeB = b.scheduledAt ? b.scheduledAt.getTime() : 0;
      return timeA - timeB;
    });

    return {
      today: todayItems,
      overdue: overdueItems,
      upcoming: upcomingItems,
    };
  }, [tasks]);

  // Metrics for Route Card
  const todayVisits = categorizedTasks.today;
  const loggedVisitsCount = todayVisits.filter((t) => t.status === 'completed').length;
  const totalVisitsCount = todayVisits.length;
  // Estimated route distance (derived ~3.5 km per stop for realism)
  const estimatedKm = (totalVisitsCount * 3.55).toFixed(1);

  // Formatted current date for header (e.g. "Wed 24 Sep")
  const formattedToday = useMemo(() => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    };
    return d.toLocaleDateString('en-US', options);
  }, []);

  // Action: Launch Navigation / Route
  const handleStartRoute = () => {
    if (todayVisits.length === 0) {
      Alert.alert('No Visits Today', 'You have no scheduled customer visits for today.');
      return;
    }
    const unvisited = todayVisits.find((t) => t.status !== 'completed');
    const target = unvisited || todayVisits[0];
    const destination = encodeURIComponent(`${target.customerName}, ${target.location}`);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    Linking.openURL(mapsUrl).catch(() => {
      Alert.alert('Route Details', `Next stop: ${target.customerName} (${target.location})`);
    });
  };

  // Action: Single task navigation
  const handleNavigateToTask = (task: UnifiedTaskItem) => {
    const destination = encodeURIComponent(`${task.customerName}, ${task.location}`);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    Linking.openURL(mapsUrl).catch(() => {
      showToast(`Address: ${task.location}`, 'info');
    });
  };

  // Action: Call phone number
  const handleCall = (phone: string) => {
    if (!phone) {
      showToast('No phone number recorded', 'info');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      showToast('Unable to open dialer', 'error');
    });
  };

  // Action: Save Log Visit to Firestore
  const handleSaveVisitLog = async () => {
    if (!selectedTaskForLog) return;
    setSubmittingLog(true);

    try {
      if (selectedTaskForLog.source === 'task') {
        const taskRef = doc(db, COLLECTIONS.TASKS, selectedTaskForLog.rawId);
        await updateDoc(taskRef, {
          status: 'completed',
          outcome: 'Visited & Logged',
          lastRemarks: logNotes || 'Visit completed on site.',
          updatedAt: serverTimestamp(),
        });
      } else {
        // Record in interactions sub-collection
        const leadRef = doc(db, 'leads', selectedTaskForLog.rawId);
        const interactionsRef = collection(leadRef, 'interactions');
        await addDoc(interactionsRef, {
          type: 'visit',
          title: 'Customer Visit Completed',
          note: logNotes || 'Site visit completed successfully.',
          authorId: user?.uid || '',
          authorName: user?.name || 'Staff',
          createdAt: serverTimestamp(),
        });

        await updateDoc(leadRef, {
          updatedAt: serverTimestamp(),
        });
      }

      showToast('Visit logged successfully', 'success');
      setSelectedTaskForLog(null);
      setLogNotes('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to log visit.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const currentList =
    activeSegment === 'Today'
      ? categorizedTasks.today
      : activeSegment === 'Overdue'
      ? categorizedTasks.overdue
      : categorizedTasks.upcoming;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(true)}
            tintColor={theme.colors.text}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Tasks</Text>
            <Text style={styles.headerSubtitle}>{formattedToday}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.8}
            onPress={() => showToast('No new notifications', 'info')}
          >
            <Feather name="bell" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Route / Daily Summary Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeTopRow}>
            <Text style={styles.routeTitle}>
              {totalVisitsCount} visits today · {estimatedKm} km
            </Text>
            <TouchableOpacity
              style={styles.startRouteButton}
              activeOpacity={0.8}
              onPress={handleStartRoute}
            >
              <Text style={styles.startRouteText}>Start route</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.routeSubtitle}>
            {loggedVisitsCount} of {totalVisitsCount} visits logged
          </Text>
        </View>

        {/* Segmented Filter Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeSegment === 'Today' && styles.segmentItemActive,
            ]}
            onPress={() => setActiveSegment('Today')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'Today' && styles.segmentTextActive,
              ]}
            >
              Today {categorizedTasks.today.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeSegment === 'Overdue' && styles.segmentItemActive,
            ]}
            onPress={() => setActiveSegment('Overdue')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'Overdue' && styles.segmentTextActive,
              ]}
            >
              Overdue {categorizedTasks.overdue.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeSegment === 'Upcoming' && styles.segmentItemActive,
            ]}
            onPress={() => setActiveSegment('Upcoming')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'Upcoming' && styles.segmentTextActive,
              ]}
            >
              Upcoming {categorizedTasks.upcoming.length}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overdue Attention Sub-Header */}
        {activeSegment === 'Overdue' && (
          <Text style={styles.attentionText}>
            {categorizedTasks.overdue.length}{' '}
            {categorizedTasks.overdue.length === 1 ? 'follow-up needs' : 'follow-ups need'}{' '}
            your attention
          </Text>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.text} />
          </View>
        ) : currentList.length === 0 ? (
          /* Empty State */
          <EmptyState
            title={
              activeSegment === 'Today'
                ? 'No Visits Today'
                : activeSegment === 'Overdue'
                ? 'No Overdue Tasks'
                : 'No Upcoming Tasks'
            }
            description={
              activeSegment === 'Today'
                ? 'Your scheduled customer site visits and follow-ups will appear here.'
                : activeSegment === 'Overdue'
                ? 'Great job! All scheduled customer follow-ups are up to date.'
                : 'Future scheduled follow-ups and meetings will be listed here.'
            }
            iconName={activeSegment === 'Overdue' ? 'check-circle' : 'calendar'}
            style={styles.emptyCard}
          />
        ) : (
          /* Task List */
          currentList.map((item) => {
            const isCompleted = item.status === 'completed';

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.taskCard}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.leadId) {
                    navigation.navigate('LeadDetails', {
                      leadId: item.leadId,
                      customerName: item.customerName,
                    });
                  } else {
                    setSelectedTaskForLog(item);
                  }
                }}
              >
                {/* Left Column: Time or Due Date */}
                <View style={styles.timeColumn}>
                  {activeSegment === 'Overdue' ? (
                    <Text style={styles.overdueDueText}>
                      {formatDueShort(item.scheduledAt)}
                    </Text>
                  ) : (
                    <Text style={styles.timeText}>
                      {formatTimeOnly(item.scheduledAt)}
                    </Text>
                  )}
                </View>

                {/* Middle Column: Customer, Type, Location, Status */}
                <View style={styles.taskInfoColumn}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {item.customerName}
                  </Text>

                  <View style={styles.typeLocationRow}>
                    <Feather
                      name={
                        item.taskType === 'Call'
                          ? 'phone'
                          : item.taskType === 'Send quote'
                          ? 'send'
                          : 'map-pin'
                      }
                      size={14}
                      color={theme.colors.muted}
                    />
                    <Text style={styles.taskTypeText}>{item.taskType}</Text>
                  </View>

                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location}
                  </Text>

                  {isCompleted && item.completedAtText ? (
                    <Text style={styles.completedSubtext}>
                      {item.completedAtText}
                    </Text>
                  ) : null}
                </View>

                {/* Right Column: Action / Status Icon */}
                <View style={styles.actionColumn}>
                  {activeSegment === 'Overdue' ? (
                    <TouchableOpacity
                      style={styles.actionIconButton}
                      activeOpacity={0.8}
                      onPress={() => handleCall(item.customerPhone)}
                    >
                      <Feather name="phone" size={18} color={theme.colors.text} />
                    </TouchableOpacity>
                  ) : isCompleted ? (
                    <View style={styles.checkIconContainer}>
                      <Feather name="check" size={20} color={theme.colors.success} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.navIconButton}
                      activeOpacity={0.8}
                      onPress={() => handleNavigateToTask(item)}
                    >
                      <Feather name="navigation" size={18} color={theme.colors.text} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <FAB
        onPress={() => {
          // Open lead or task creation
          showToast('Tap on any task to view details or log visits', 'info');
        }}
        style={styles.fabPosition}
      />

      {/* Quick Log Visit Modal */}
      <Modal
        visible={!!selectedTaskForLog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedTaskForLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Visit</Text>
              <TouchableOpacity
                onPress={() => setSelectedTaskForLog(null)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCustomerName}>
              {selectedTaskForLog?.customerName}
            </Text>
            <Text style={styles.modalCustomerLocation}>
              {selectedTaskForLog?.location}
            </Text>

            <Text style={styles.inputLabel}>Visit Notes / Remarks</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Met manager, demonstrated band sealer, quote requested..."
              placeholderTextColor={theme.colors.muted}
              multiline={true}
              numberOfLines={4}
              value={logNotes}
              onChangeText={setLogNotes}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSelectedTaskForLog(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSaveVisitLog}
                disabled={submittingLog}
              >
                {submittingLog ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Mark Visited</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

// Helper formatters
function formatTimeOnly(d: Date | null): string {
  if (!d) return '10:00 AM';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDueShort(d: Date | null): string {
  if (!d) return 'Due today';
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `Due ${day}\n${month}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 28,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  routeCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  routeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
  },
  startRouteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    backgroundColor: theme.colors.card,
  },
  startRouteText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  routeSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 6,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.radius.pill,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  segmentItemActive: {
    backgroundColor: theme.colors.black,
  },
  segmentText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.muted,
  },
  segmentTextActive: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  attentionText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  timeColumn: {
    width: 68,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  timeText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  overdueDueText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 12,
    color: theme.colors.danger,
    lineHeight: 16,
  },
  taskInfoColumn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  customerName: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 2,
  },
  typeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  taskTypeText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: '#334155',
    marginLeft: 4,
  },
  locationText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 1,
  },
  completedSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 3,
  },
  actionColumn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xl * 1.5,
    marginTop: theme.spacing.sm,
  },
  fabPosition: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  bottomSpacer: {
    height: 90,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCustomerName: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalCustomerLocation: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#F8FAFC',
    marginBottom: theme.spacing.lg,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.white,
  },
});

export default StaffTasksScreen;
