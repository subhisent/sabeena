import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Feather } from '@expo/vector-icons';
import {
  doc,
  collection,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Lead,
  Activity,
  ActivityType,
  LeadStatus,
  LeadPriority,
} from '../../types';
import {
  Card,
  Chip,
  AppButton,
  Avatar,
  SectionHeader,
  Toast,
  ToastType,
} from '../../components';
import { UpdateStatusSheet, AddNoteSheet } from './components';
import { SAMPLE_LEADS } from '../../hooks/useMyLeads';

export type LeadDetailsRouteParams = {
  LeadDetails: {
    leadId: string;
    customerName?: string;
  };
};

const SAMPLE_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    title: 'Follow-up scheduled',
    note: '26 Sep · 11:00 AM · Call',
    authorId: 'STF001',
    authorName: 'Arun K',
    type: 'call',
    createdAt: Timestamp.now(),
  },
  {
    id: 'act-2',
    title: 'Status changed to In Progress',
    note: 'Lead status updated following initial discussion.',
    authorId: 'STF001',
    authorName: 'Arun K',
    type: 'status',
    createdAt: new Timestamp(Timestamp.now().seconds - 3600, 0),
  },
  {
    id: 'act-3',
    title: 'Visit logged: Sample given',
    note: 'Sample given. Share competitive rate card before next call.',
    authorId: 'STF001',
    authorName: 'Arun K',
    type: 'note',
    createdAt: new Timestamp(Timestamp.now().seconds - 7200, 0),
  },
];

export const LeadDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<LeadDetailsRouteParams, 'LeadDetails'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { leadId, customerName: initialCustomerName } = route.params || {
    leadId: 'lead-1',
  };

  // State
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bottom Sheets & Modals state
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [noteSheetVisible, setNoteSheetVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [allActivitiesModalVisible, setAllActivitiesModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);

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

  // Call form state
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState('Connected - Requirement Discussed');
  const [followUpNote, setFollowUpNote] = useState('');
  const [submittingCall, setSubmittingCall] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Permission check helper
  const isAssignedToCurrentUser = useMemo(() => {
    if (!lead) return true;
    if (isAdmin) return true;
    return (
      lead.assignedTo === user?.uid ||
      (user?.staffId && lead.assignedTo === user.staffId) ||
      lead.assignedToName === user?.name
    );
  }, [lead, isAdmin, user]);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({
      visible: true,
      message,
      type,
    });
  };

  // 1. Real-time Lead listener
  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    try {
      const leadDocRef = doc(db, 'leads', leadId);
      const unsubscribe = onSnapshot(
        leadDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setLead({ id: snapshot.id, ...snapshot.data() } as Lead);
          } else {
            // Fallback to sample lead if not found in Firestore
            const sample = SAMPLE_LEADS.find((l) => l.id === leadId);
            if (sample) {
              setLead(sample);
            } else {
              setLead({
                id: leadId,
                customerId: 'cust-default',
                customerName: initialCustomerName || 'Anand Interiors',
                phone: '+91 90031 88450',
                source: 'Walk-in',
                receivedDate: Timestamp.now(),
                requirementSummary: 'Velachery · Acrylic sealants (120 tubes)',
                products: ['Acrylic sealants (120 tubes)'],
                estimatedValue: 180000,
                status: 'In Progress',
                priority: 'Medium',
                assignedTo: user?.uid || 'STF001',
                assignedToName: user?.name || 'Arun K',
                followUpAt: new Timestamp(Timestamp.now().seconds + 86400, 0),
                location: { address: 'Plot 42, 2nd Avenue, Velachery, Chennai' },
                createdBy: 'admin',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
            }
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Firestore Lead listener error:', error);
          const sample = SAMPLE_LEADS.find((l) => l.id === leadId) || SAMPLE_LEADS[0];
          setLead(sample);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Error setting up lead listener:', err);
      const sample = SAMPLE_LEADS.find((l) => l.id === leadId) || SAMPLE_LEADS[0];
      setLead(sample);
      setLoading(false);
    }
  }, [leadId, initialCustomerName, user]);

  // 2. Real-time Activities subcollection listener
  useEffect(() => {
    if (!leadId) return;

    try {
      const activitiesRef = collection(db, 'leads', leadId, 'activities');
      const qLatest = query(activitiesRef, orderBy('createdAt', 'desc'), limit(3));
      const qAll = query(activitiesRef, orderBy('createdAt', 'desc'));

      const unsubscribeLatest = onSnapshot(
        qLatest,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Activity[] = snapshot.docs.map(
              (d) => ({ id: d.id, ...d.data() } as Activity)
            );
            setActivities(list);
          } else {
            setActivities(SAMPLE_ACTIVITIES);
          }
        },
        (error) => {
          console.warn('Firestore Activities listener error:', error);
          setActivities(SAMPLE_ACTIVITIES);
        }
      );

      const unsubscribeAll = onSnapshot(
        qAll,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Activity[] = snapshot.docs.map(
              (d) => ({ id: d.id, ...d.data() } as Activity)
            );
            setAllActivities(list);
          } else {
            setAllActivities(SAMPLE_ACTIVITIES);
          }
        },
        () => {
          setAllActivities(SAMPLE_ACTIVITIES);
        }
      );

      return () => {
        unsubscribeLatest();
        unsubscribeAll();
      };
    } catch (err) {
      console.warn('Error setting up activities listener:', err);
      setActivities(SAMPLE_ACTIVITIES);
      setAllActivities(SAMPLE_ACTIVITIES);
    }
  }, [leadId]);

  // Helpers
  const formatCurrency = (val?: number): string => {
    if (val === undefined || val === null) return '₹0';
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(val);
    } catch {
      return `₹${val.toLocaleString('en-IN')}`;
    }
  };

  const formatDate = (ts?: Timestamp | null): string => {
    if (!ts) return 'Not scheduled';
    try {
      const date = ts.toDate();
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  const formatDateTime = (ts?: Timestamp | null): string => {
    if (!ts) return 'Not scheduled';
    try {
      const date = ts.toDate();
      const dayStr = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      const timeStr = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dayStr} · ${timeStr}`;
    } catch {
      return 'Scheduled';
    }
  };

  const formatActivityTime = (ts?: Timestamp | null): string => {
    if (!ts) return 'Just now';
    try {
      const date = ts.toDate();
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const timeStr = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (isToday) {
        return `Today ${timeStr}`;
      }
      const dayStr = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      return `${dayStr} ${timeStr}`;
    } catch {
      return 'Recent';
    }
  };

  const getStatusColor = (status?: LeadStatus) => {
    switch (status) {
      case 'New Lead':
        return theme.colors.primary;
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

  // Staff Quick Actions
  const handleCall = () => {
    if (!lead?.phone) {
      showToast('No contact phone number available for this lead.', 'error');
      return;
    }
    Linking.openURL(`tel:${lead.phone}`).catch(() => {
      showToast('Unable to initiate phone call.', 'error');
    });
  };

  const handleWhatsApp = () => {
    if (!lead?.phone) {
      showToast('No contact phone number available.', 'error');
      return;
    }
    const cleanNumber = lead.phone.replace(/\D/g, '');
    const formatted = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    const url = `https://wa.me/${formatted}`;
    Linking.openURL(url).catch(() => {
      showToast('Could not open WhatsApp.', 'error');
    });
  };

  const handleNavigate = () => {
    if (!lead) return;
    let queryParam = '';
    if (lead.location?.lat && lead.location?.lng) {
      queryParam = `${lead.location.lat},${lead.location.lng}`;
    } else if (lead.location?.address) {
      queryParam = encodeURIComponent(lead.location.address);
    } else {
      queryParam = encodeURIComponent(`${lead.customerName}, Chennai`);
    }

    const mapsUrl = Platform.select({
      ios: `maps:0,0?q=${queryParam}`,
      android: `geo:0,0?q=${queryParam}`,
      default: `https://www.google.com/maps/search/?api=1&query=${queryParam}`,
    });

    Linking.openURL(mapsUrl).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${queryParam}`).catch(() => {
        showToast('Could not open map application.', 'error');
      });
    });
  };

  const handleOpenStatusSheet = () => {
    if (!isAssignedToCurrentUser) {
      showToast('You can only update status for leads assigned to you.', 'error');
      return;
    }
    setStatusSheetVisible(true);
  };

  const handleOpenNoteSheet = () => {
    if (!isAssignedToCurrentUser) {
      showToast('You can only add notes to leads assigned to you.', 'error');
      return;
    }
    setNoteSheetVisible(true);
  };

  // Call Logging Handler
  const handleLogCallSubmit = async () => {
    if (!lead) return;
    if (!isAssignedToCurrentUser) {
      showToast('You can only log calls for leads assigned to you.', 'error');
      return;
    }

    setCallModalVisible(false);
    setSubmittingCall(true);

    const title = `Call logged: ${callOutcome}`;
    const note = callNotes.trim() || 'Call completed with customer.';

    try {
      const activitiesRef = collection(db, 'leads', lead.id, 'activities');
      await addDoc(activitiesRef, {
        title,
        note,
        authorId: user?.uid || 'STF001',
        authorName: user?.name || 'Staff',
        type: 'call',
        createdAt: serverTimestamp(),
      });

      setCallNotes('');
      showToast('Call record added to lead timeline.', 'success');
    } catch (error) {
      console.warn('Log call error:', error);
      const localAct: Activity = {
        id: `act-${Date.now()}`,
        title,
        note,
        authorId: user?.uid || 'STF001',
        authorName: user?.name || 'Staff',
        type: 'call',
        createdAt: Timestamp.now(),
      };
      setActivities((prev) => [localAct, ...prev.slice(0, 2)]);
      setCallNotes('');
      showToast('Call recorded.', 'success');
    } finally {
      setSubmittingCall(false);
    }
  };

  // Follow-up Reschedule Handler
  const handleRescheduleSubmit = async () => {
    if (!lead) return;
    if (!isAssignedToCurrentUser) {
      showToast('You can only reschedule leads assigned to you.', 'error');
      return;
    }

    setRescheduleModalVisible(false);

    const newFollowUpTs = new Timestamp(Timestamp.now().seconds + 86400 * 2, 0); // 2 days later

    try {
      const leadDocRef = doc(db, 'leads', lead.id);
      await updateDoc(leadDocRef, {
        followUpAt: newFollowUpTs,
        updatedAt: serverTimestamp(),
      });

      const activitiesRef = collection(db, 'leads', lead.id, 'activities');
      await addDoc(activitiesRef, {
        title: 'Follow-up rescheduled',
        note: followUpNote.trim() || 'Follow-up rescheduled for upcoming contact.',
        authorId: user?.uid || 'STF001',
        authorName: user?.name || 'Staff',
        type: 'call',
        createdAt: serverTimestamp(),
      });

      setLead((prev) => (prev ? { ...prev, followUpAt: newFollowUpTs } : prev));
      setFollowUpNote('');
      showToast('Follow-up rescheduled successfully.', 'success');
    } catch (error) {
      console.warn('Reschedule error:', error);
      setLead((prev) => (prev ? { ...prev, followUpAt: newFollowUpTs } : prev));
      setFollowUpNote('');
      showToast('Follow-up rescheduled.', 'success');
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'call':
        return 'phone';
      case 'status':
        return 'arrow-right-circle';
      case 'reassign':
        return 'user-check';
      case 'note':
      default:
        return 'message-circle';
    }
  };

  if (loading && !lead) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading lead details...</Text>
      </View>
    );
  }

  const customerName = lead?.customerName || initialCustomerName || 'Lead Details';
  const cityOrArea = lead?.location?.address
    ? lead.location.address.split(',')[0].trim()
    : 'Velachery';
  const displayProducts =
    lead?.products && lead.products.length > 0
      ? lead.products.join(', ')
      : lead?.requirementSummary || 'Acrylic sealants';

  return (
    <View style={styles.screenContainer}>
      {/* Animated Top Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
        style={{ top: insets.top + 10 }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Gradient Background */}
        <LinearGradient
          colors={['#E0E7FF', '#EFF6FF', '#F7F8FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientHeader}
        />

        {/* Top Bar / Navigation */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Lead details</Text>

          <View style={styles.trailingActionContainer}>
            {isAdmin ? (
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => Alert.alert('Admin Options', 'Lead assignment & settings.')}
                activeOpacity={0.7}
              >
                <Feather name="more-vertical" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyActionPlaceholder} />
            )}
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Avatar
            name={customerName}
            size="xl"
            showStatusDot={true}
            isOnline={lead?.status !== 'Lost'}
            style={styles.heroAvatar}
          />
          <Text style={styles.customerTitle}>{customerName}</Text>
          <Text style={styles.contactSubtitle}>
            {lead?.phone || '+91 90031 88450'} · {cityOrArea}
          </Text>

          <View style={styles.heroChipsRow}>
            {lead?.status && (
              <Chip
                label={lead.status}
                statusColor={getStatusColor(lead.status)}
                style={styles.heroChip}
              />
            )}
            {lead?.priority && (
              <Chip
                label={`${lead.priority} priority`}
                statusColor={getPriorityColor(lead.priority)}
                style={styles.heroChip}
              />
            )}
          </View>
        </View>

        {/* 4 Quick Action Tiles */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.actionTile}
            onPress={handleCall}
            activeOpacity={0.75}
          >
            <View style={[styles.actionTileIconCircle, { backgroundColor: theme.colors.primaryLight }]}>
              <Feather name="phone" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionTileLabel}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={handleWhatsApp}
            activeOpacity={0.75}
          >
            <View style={[styles.actionTileIconCircle, { backgroundColor: theme.colors.successLight }]}>
              <Feather name="message-circle" size={20} color={theme.colors.success} />
            </View>
            <Text style={styles.actionTileLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={handleNavigate}
            activeOpacity={0.75}
          >
            <View style={[styles.actionTileIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <Feather name="navigation" size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.actionTileLabel}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={handleOpenNoteSheet}
            activeOpacity={0.75}
          >
            <View style={[styles.actionTileIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <Feather name="file-text" size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.actionTileLabel}>Add Note</Text>
          </TouchableOpacity>
        </View>

        {/* Green Estimated Deal Value Tile */}
        <View style={styles.dealValueCard}>
          <View style={styles.dealValueHeader}>
            <Feather name="trending-up" size={16} color={theme.colors.success} />
            <Text style={styles.dealValueLabel}>ESTIMATED DEAL VALUE</Text>
          </View>
          <Text style={styles.dealValueAmount}>
            {formatCurrency(lead?.estimatedValue)}
          </Text>
        </View>

        {/* Lead Information Grid */}
        <Card style={styles.sectionCard} padding="lg">
          <Text style={styles.cardHeaderTitle}>Lead Information</Text>

          <View style={styles.gridRow}>
            <View style={styles.gridColumn}>
              <Text style={styles.gridLabel}>Product</Text>
              <Text style={styles.gridValue} numberOfLines={2}>
                {displayProducts}
              </Text>
            </View>
            <View style={styles.gridColumn}>
              <Text style={styles.gridLabel}>Lead Source</Text>
              <Text style={styles.gridValue}>{lead?.source || 'IndiaMART'}</Text>
            </View>
          </View>

          <View style={styles.gridDivider} />

          <View style={styles.gridRow}>
            <View style={styles.gridColumn}>
              <Text style={styles.gridLabel}>Received Date</Text>
              <Text style={styles.gridValue}>
                {formatDate(lead?.receivedDate || lead?.createdAt)}
              </Text>
            </View>
            <View style={styles.gridColumn}>
              <Text style={styles.gridLabel}>Lead Status</Text>
              <View style={styles.statusChipContainer}>
                <Chip
                  label={lead?.status || 'In Progress'}
                  statusColor={getStatusColor(lead?.status)}
                  style={styles.gridChip}
                />
              </View>
            </View>
          </View>

          <View style={styles.gridDivider} />

          <View style={styles.gridRow}>
            <View style={styles.gridColumn}>
              <Text style={styles.gridLabel}>Priority (Read-only)</Text>
              <View style={styles.priorityChipWrapper}>
                <Chip
                  label={lead?.priority || 'Medium'}
                  statusColor={getPriorityColor(lead?.priority)}
                  style={styles.gridChip}
                />
              </View>
            </View>
            <View style={styles.gridColumn}>
              <Text style={styles.gridLabel}>Assigned To</Text>
              <Text style={styles.gridValue}>
                {lead?.assignedToName || 'Arun K'}
              </Text>
            </View>
          </View>

          <View style={styles.gridDivider} />

          <View style={styles.fullWidthInfo}>
            <Text style={styles.gridLabel}>Phone</Text>
            <TouchableOpacity onPress={handleCall} activeOpacity={0.7}>
              <Text style={[styles.gridValue, styles.phoneLinkText]}>
                {lead?.phone || '+91 90031 88450'}
              </Text>
            </TouchableOpacity>
          </View>

          {lead?.location?.address && (
            <>
              <View style={styles.gridDivider} />
              <View style={styles.fullWidthInfo}>
                <Text style={styles.gridLabel}>Address / Location</Text>
                <Text style={styles.gridValue}>{lead.location.address}</Text>
              </View>
            </>
          )}
        </Card>

        {/* Next Follow-up Card */}
        <Card style={styles.sectionCard} padding="lg">
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Next follow-up</Text>
            <TouchableOpacity
              onPress={() => {
                if (!isAssignedToCurrentUser) {
                  showToast('You can only reschedule leads assigned to you.', 'error');
                  return;
                }
                setRescheduleModalVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.linkButtonText}>Reschedule</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.followUpDetails}>
            <Feather name="calendar" size={18} color={theme.colors.primary} style={styles.followUpIcon} />
            <View>
              <Text style={styles.followUpDateTime}>
                {formatDateTime(lead?.followUpAt)}
              </Text>
              <Text style={styles.followUpType}>Scheduled Call / Site Visit</Text>
            </View>
          </View>
        </Card>

        {/* Activity Timeline Card */}
        <Card style={styles.sectionCard} padding="lg">
          <SectionHeader
            title="Activity Timeline"
            actionText="View all activity"
            onActionPress={() => setAllActivitiesModalVisible(true)}
            style={styles.activitySectionHeader}
          />

          <View style={styles.timelineContainer}>
            {activities.map((act, index) => {
              const isLast = index === activities.length - 1;
              return (
                <View key={act.id} style={styles.timelineItem}>
                  <View style={styles.timelineRail}>
                    <View style={styles.timelineIconCircle}>
                      <Feather
                        name={getActivityIcon(act.type) as any}
                        size={14}
                        color={theme.colors.text}
                      />
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{act.title}</Text>
                    {act.note ? (
                      <Text style={styles.timelineNote}>{act.note}</Text>
                    ) : null}
                    <Text style={styles.timelineMeta}>
                      {formatActivityTime(act.createdAt)} · {act.authorName || 'Staff'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <AppButton
          title="Update Status"
          onPress={handleOpenStatusSheet}
          variant="primary"
          style={styles.bottomBarButton}
        />
        <AppButton
          title="Log Call"
          onPress={() => {
            if (!isAssignedToCurrentUser) {
              showToast('You can only log calls for leads assigned to you.', 'error');
              return;
            }
            setCallModalVisible(true);
          }}
          variant="outline"
          style={styles.bottomBarButton}
        />
      </View>

      {/* UpdateStatusSheet Bottom Sheet Component */}
      {lead && (
        <UpdateStatusSheet
          visible={statusSheetVisible}
          lead={lead}
          onClose={() => setStatusSheetVisible(false)}
          onSuccess={(newStatus, newFollowUpAt) => {
            setLead((prev) =>
              prev ? { ...prev, status: newStatus, followUpAt: newFollowUpAt } : prev
            );
          }}
          showToast={showToast}
        />
      )}

      {/* AddNoteSheet Bottom Sheet Component */}
      {lead && (
        <AddNoteSheet
          visible={noteSheetVisible}
          lead={lead}
          onClose={() => setNoteSheetVisible(false)}
          onSuccess={(newActivity) => {
            setActivities((prev) => [newActivity, ...prev.slice(0, 2)]);
          }}
          showToast={showToast}
        />
      )}

      {/* Log Call Modal */}
      <Modal
        visible={callModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCallModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCallModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalSheetTitle}>Log Call</Text>
            <Text style={styles.modalSheetSubtitle}>
              Record the call conversation notes and outcome with {customerName}.
            </Text>

            <Text style={styles.inputLabel}>Call Outcome</Text>
            <View style={styles.outcomeChipsRow}>
              {[
                'Connected - Requirement Discussed',
                'Connected - Follow-up Needed',
                'Did Not Pick Up',
                'Busy / Callback Requested',
              ].map((outcome) => (
                <TouchableOpacity
                  key={outcome}
                  style={[
                    styles.outcomeChip,
                    callOutcome === outcome && styles.outcomeChipSelected,
                  ]}
                  onPress={() => setCallOutcome(outcome)}
                >
                  <Text
                    style={[
                      styles.outcomeChipText,
                      callOutcome === outcome && styles.outcomeChipTextSelected,
                    ]}
                  >
                    {outcome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Conversation Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter details of what was discussed..."
              placeholderTextColor={theme.colors.muted}
              multiline
              numberOfLines={4}
              value={callNotes}
              onChangeText={setCallNotes}
            />

            <View style={styles.modalActionsRow}>
              <AppButton
                title="Cancel"
                variant="outline"
                onPress={() => setCallModalVisible(false)}
                style={styles.halfButton}
              />
              <AppButton
                title={submittingCall ? 'Saving...' : 'Save Call'}
                variant="primary"
                onPress={handleLogCallSubmit}
                loading={submittingCall}
                style={styles.halfButton}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRescheduleModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalSheetTitle}>Reschedule Follow-up</Text>
            <Text style={styles.modalSheetSubtitle}>
              Update next scheduled contact with {customerName}.
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="Notes for follow-up (e.g. On-site machinery demonstration)..."
              placeholderTextColor={theme.colors.muted}
              multiline
              numberOfLines={3}
              value={followUpNote}
              onChangeText={setFollowUpNote}
            />

            <View style={styles.modalActionsRow}>
              <AppButton
                title="Cancel"
                variant="outline"
                onPress={() => setRescheduleModalVisible(false)}
                style={styles.halfButton}
              />
              <AppButton
                title="Reschedule (+2 Days)"
                variant="primary"
                onPress={handleRescheduleSubmit}
                style={styles.halfButton}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* View All Activities Modal */}
      <Modal
        visible={allActivitiesModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAllActivitiesModalVisible(false)}
      >
        <View style={styles.fullModalContainer}>
          <View style={[styles.fullModalHeader, { paddingTop: insets.top + 10 }]}>
            <Text style={styles.fullModalTitle}>Activity History</Text>
            <TouchableOpacity
              onPress={() => setAllActivitiesModalVisible(false)}
              style={styles.fullModalCloseButton}
            >
              <Feather name="x" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.fullModalBody}
            contentContainerStyle={styles.fullModalContent}
          >
            <View style={styles.timelineContainer}>
              {allActivities.map((act, index) => {
                const isLast = index === allActivities.length - 1;
                return (
                  <View key={act.id} style={styles.timelineItem}>
                    <View style={styles.timelineRail}>
                      <View style={styles.timelineIconCircle}>
                        <Feather
                          name={getActivityIcon(act.type) as any}
                          size={14}
                          color={theme.colors.text}
                        />
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{act.title}</Text>
                      {act.note ? (
                        <Text style={styles.timelineNote}>{act.note}</Text>
                      ) : null}
                      <Text style={styles.timelineMeta}>
                        {formatActivityTime(act.createdAt)} · {act.authorName || 'Staff'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.muted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  gradientHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  topBarTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  trailingActionContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  actionIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  emptyActionPlaceholder: {
    width: 40,
    height: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  heroAvatar: {
    marginBottom: 12,
  },
  customerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroChip: {
    marginHorizontal: 2,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    gap: 8,
  },
  actionTile: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  actionTileIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTileLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  dealValueCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  dealValueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  dealValueLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: theme.colors.success,
  },
  dealValueAmount: {
    fontFamily: theme.fonts.bold,
    fontSize: 26,
    color: '#15803D',
  },
  sectionCard: {
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 12,
  },
  linkButtonText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.primary,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridColumn: {
    flex: 1,
    paddingRight: 8,
  },
  gridLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  gridValue: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  phoneLinkText: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.semiBold,
  },
  gridDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  statusChipContainer: {
    alignSelf: 'flex-start',
  },
  priorityChipWrapper: {
    alignSelf: 'flex-start',
  },
  gridChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  fullWidthInfo: {
    width: '100%',
  },
  followUpDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followUpIcon: {
    marginRight: 12,
  },
  followUpDateTime: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 2,
  },
  followUpType: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  activitySectionHeader: {
    paddingVertical: 0,
    marginBottom: 16,
  },
  timelineContainer: {
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineRail: {
    alignItems: 'center',
    width: 32,
    marginRight: 10,
  },
  timelineIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  timelineNote: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 18,
    marginBottom: 4,
  },
  timelineMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.muted,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    ...theme.shadows.elevated,
  },
  bottomBarButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderDark,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalSheetTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 4,
  },
  modalSheetSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 8,
  },
  outcomeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  outcomeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  outcomeChipSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  outcomeChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  outcomeChipTextSelected: {
    color: theme.colors.white,
  },
  textArea: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  fullModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  fullModalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  fullModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullModalBody: {
    flex: 1,
  },
  fullModalContent: {
    padding: 20,
  },
});

export default LeadDetailsScreen;
