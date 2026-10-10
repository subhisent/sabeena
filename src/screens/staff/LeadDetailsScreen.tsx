import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Lead, Activity } from '../../types';
import { ScheduleFollowUpModal } from './components/ScheduleFollowUpModal';
import { Toast, ToastType } from '../../components';

export const LeadDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: { leadId: string; customerName?: string } }, 'params'>>();
  const { user } = useAuth();

  const leadId = route.params?.leadId || '';
  const initialName = route.params?.customerName || 'Lead details';

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & inputs
  const [scheduleModalVisible, setScheduleModalVisible] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<string>('');
  const [addingNote, setAddingNote] = useState<boolean>(false);

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

  // Real-time listener for lead doc
  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    try {
      const leadRef = doc(db, 'leads', leadId);
      const unsubDoc = onSnapshot(
        leadRef,
        (snap) => {
          if (snap.exists()) {
            setLead({
              ...(snap.data() as Omit<Lead, 'id'>),
              id: snap.id,
            });
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Lead details snapshot error:', err.message);
          setLoading(false);
        }
      );

      // Interactions / Activity
      const interactionsRef = collection(db, 'leads', leadId, 'interactions');
      const q = query(interactionsRef, orderBy('createdAt', 'desc'), limit(5));
      const unsubActivity = onSnapshot(
        q,
        (snap) => {
          const acts: Activity[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || data.type || 'Activity',
              note: data.note || data.remarks || '',
              tag: data.tag || data.outcome || '',
              authorId: data.authorId || '',
              authorName: data.authorName || 'Staff',
              type: data.type || 'note',
              createdAt: data.createdAt,
            };
          });
          setActivities(acts);
        },
        (err) => {
          console.warn('Activity listener error:', err.message);
        }
      );

      return () => {
        unsubDoc();
        unsubActivity();
      };
    } catch (e) {
      console.warn('Error loading lead details:', e);
      setLoading(false);
    }
  }, [leadId]);

  const handleCall = () => {
    if (!lead?.phone) return;
    Linking.openURL(`tel:${lead.phone}`).catch(() => showToast('Unable to open phone dialer', 'error'));
  };

  const handleWhatsApp = () => {
    if (!lead?.phone) return;
    const clean = lead.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() => showToast('Unable to open WhatsApp', 'error'));
  };

  const handleNavigate = () => {
    const dest = encodeURIComponent(lead?.location?.address || lead?.customerName || 'Chennai');
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`).catch(() => {});
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !leadId) return;
    setAddingNote(true);

    try {
      const interactionsRef = collection(db, 'leads', leadId, 'interactions');
      await addDoc(interactionsRef, {
        type: 'note',
        title: 'Note added',
        note: newNote.trim(),
        authorId: user?.uid || '',
        authorName: user?.name || 'Staff',
        createdAt: serverTimestamp(),
      });

      setNewNote('');
      showToast('Note added successfully', 'success');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // Status badge config
  const statusBadge = useMemo(() => {
    if (lead?.status === 'Won') return { label: 'Won', bg: '#DCFCE7', text: '#16A34A', dot: '#16A34A' };
    if (lead?.status === 'Lost') return { label: 'Lost', bg: '#F1F5F9', text: '#64748B', dot: '#64748B' };
    if (lead?.status === 'New Lead') return { label: 'New', bg: '#EFF6FF', text: '#2563EB', dot: '#2563EB' };
    if (lead?.followUpAt) return { label: 'Follow-up', bg: '#F5F3FF', text: '#7C3AED', dot: '#7C3AED' };
    return { label: 'In Progress', bg: '#FEF3C7', text: '#D97706', dot: '#D97706' };
  }, [lead]);

  const formattedFollowUp = useMemo(() => {
    if (!lead?.followUpAt) return 'No follow-up scheduled';
    const d = typeof lead.followUpAt.toDate === 'function' ? lead.followUpAt.toDate() : new Date((lead.followUpAt as any) || Date.now());
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} ${month} · ${time}`;
  }, [lead]);

  const receivedDateText = useMemo(() => {
    if (!lead?.receivedDate && !lead?.createdAt) return '18 Sep';
    const raw: any = lead.receivedDate || lead.createdAt;
    const d = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw || Date.now());
    return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
  }, [lead]);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Lead details</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="more-vertical" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Identity Card */}
        <View style={styles.identityCard}>
          <Text style={styles.customerName}>{lead?.customerName || initialName}</Text>
          <Text style={styles.customerLocation}>
            {lead?.location?.address ? lead.location.address.split(',')[0] : 'Velachery'}
          </Text>

          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusBadge.dot }]} />
              <Text style={[styles.statusText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
            <Text style={styles.priorityText}>
              {lead?.priority || 'Medium'} priority
            </Text>
          </View>
        </View>

        {/* 4-Action Strip */}
        <View style={styles.actionStrip}>
          <TouchableOpacity style={styles.actionItem} onPress={handleCall} activeOpacity={0.8}>
            <View style={styles.actionCircle}>
              <Feather name="phone" size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.actionLabel}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleWhatsApp} activeOpacity={0.8}>
            <View style={styles.actionCircle}>
              <Feather name="message-circle" size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.actionLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleNavigate} activeOpacity={0.8}>
            <View style={styles.actionCircle}>
              <Feather name="navigation" size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.actionLabel}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setScheduleModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Feather name="edit-3" size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.actionLabel}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Details Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Product</Text>
              <Text style={styles.detailValue}>{lead?.products?.[0] || 'Acrylic sealants'}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Quantity</Text>
              <Text style={styles.detailValue}>120 tubes</Text>
            </View>
          </View>

          <View style={[styles.detailsGrid, { marginTop: 14 }]}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Source</Text>
              <Text style={styles.detailValue}>{lead?.source || 'Walk-in'}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Received</Text>
              <Text style={styles.detailValue}>{receivedDateText}</Text>
            </View>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{lead?.phone || '+91 90031 88450'}</Text>
          </View>
        </View>

        {/* Next follow-up Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Next follow-up</Text>
            <TouchableOpacity onPress={() => setScheduleModalVisible(true)} activeOpacity={0.7}>
              <Text style={styles.linkText}>Reschedule</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.followUpDate}>{formattedFollowUp}</Text>
          <Text style={styles.followUpType}>{lead?.priority === 'Urgent' ? 'Visit' : 'Call'}</Text>
        </View>

        {/* Activity Section */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('AllActivity', {
                  leadId: lead?.id || leadId,
                  customerName: lead?.customerName || initialName,
                })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>See all</Text>
            </TouchableOpacity>
          </View>

          {activities.length === 0 ? (
            <Text style={styles.emptyActivityText}>No activity recorded yet.</Text>
          ) : (
            <View style={styles.activityList}>
              {activities.slice(0, 3).map((act, index) => {
                const isLast = index === Math.min(activities.length, 3) - 1;
                return (
                  <View key={act.id} style={styles.activityRow}>
                    <View style={styles.timelineCol}>
                      <View style={styles.timelineCircle}>
                        <Feather name="clock" size={14} color={theme.colors.muted} />
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{act.title}</Text>
                      {act.note ? <Text style={styles.activityNote}>{act.note}</Text> : null}
                      <Text style={styles.activityMeta}>
                        {act.createdAt?.toDate
                          ? act.createdAt.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                          : 'Recently'} · {act.authorName}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Notes Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {lead?.notes ? (
            <View style={styles.noteItem}>
              <Text style={styles.noteText}>{lead.notes}</Text>
              <Text style={styles.noteMeta}>Recent update · {lead.assignedToName || 'Staff'}</Text>
            </View>
          ) : null}

          <View style={styles.addNoteRow}>
            <TextInput
              style={styles.addNoteInput}
              placeholder="Add note"
              placeholderTextColor={theme.colors.muted}
              value={newNote}
              onChangeText={setNewNote}
            />
            {newNote.trim().length > 0 && (
              <TouchableOpacity
                style={styles.addNoteBtn}
                onPress={handleAddNote}
                disabled={addingNote}
                activeOpacity={0.8}
              >
                {addingNote ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Feather name="arrow-up" size={18} color={theme.colors.white} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={styles.logVisitBtn}
          onPress={() =>
            navigation.navigate('LogVisit', {
              leadId: lead?.id || leadId,
              customerName: lead?.customerName || initialName,
              location: lead?.location?.address || 'Chennai',
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.logVisitBtnText}>Log Visit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scheduleBtn}
          onPress={() => setScheduleModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.scheduleBtnText}>Schedule Follow-up</Text>
        </TouchableOpacity>
      </View>

      {/* Schedule Follow-up Modal */}
      <ScheduleFollowUpModal
        visible={scheduleModalVisible}
        leadId={lead?.id || leadId}
        customerName={lead?.customerName || initialName}
        onClose={() => setScheduleModalVisible(false)}
        onSuccess={() => {
          setScheduleModalVisible(false);
          showToast('Follow-up scheduled successfully', 'success');
        }}
      />

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  identityCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  customerName: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: theme.colors.text,
  },
  customerLocation: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 2,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 12,
  },
  priorityText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  actionStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    paddingHorizontal: 4,
  },
  actionItem: {
    alignItems: 'center',
    width: '23%',
  },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...theme.shadows.card,
  },
  actionLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
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
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  linkText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  detailCol: {
    width: '48%',
  },
  detailLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  detailValue: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 2,
  },
  followUpDate: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 2,
  },
  followUpType: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  emptyActivityText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 8,
  },
  activityList: {
    marginTop: 10,
  },
  activityRow: {
    flexDirection: 'row',
    minHeight: 50,
  },
  timelineCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  activityContent: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 14,
  },
  activityTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  activityNote: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  activityMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  noteItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  noteText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.text,
  },
  noteMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 4,
  },
  addNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  addNoteInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  addNoteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 90,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.card,
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.elevated,
  },
  logVisitBtn: {
    flex: 1,
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logVisitBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.white,
  },
  scheduleBtn: {
    flex: 1.2,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
});

export default LeadDetailsScreen;
