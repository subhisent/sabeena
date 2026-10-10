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
  Modal,
  FlatList,
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
  updateDoc,
  getDocs,
  where,
  serverTimestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Lead, Activity, LeadStatus, LeadPriority, User } from '../../types';
import { ScheduleFollowUpModal } from './components/ScheduleFollowUpModal';
import { Toast, ToastType, Avatar, Card } from '../../components';

const STATUS_OPTIONS: LeadStatus[] = ['New Lead', 'In Progress', 'Won', 'Lost'];
const PRIORITY_OPTIONS: LeadPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

interface StaffWithStats {
  user: User;
  openLeads: number;
  closedLeads: number;
  isBusy: boolean;
}

export const LeadDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: { leadId: string; customerName?: string } }, 'params'>>();
  const { user, profile, role } = useAuth();
  const isAdmin = role === 'admin';

  const leadId = route.params?.leadId || '';
  const initialName = route.params?.customerName || 'Lead details';

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & inputs
  const [scheduleModalVisible, setScheduleModalVisible] = useState<boolean>(false);
  const [reassignModalVisible, setReassignModalVisible] = useState<boolean>(false);
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);
  const [priorityModalVisible, setPriorityModalVisible] = useState<boolean>(false);

  // Staff list for reassigning
  const [staffList, setStaffList] = useState<StaffWithStats[]>([]);
  const [loadingStaff, setLoadingStaff] = useState<boolean>(false);

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
      const q = query(interactionsRef, orderBy('createdAt', 'desc'), limit(10));
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

  // Load staff list for reassign modal
  const fetchStaffForReassign = async () => {
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

      const staffStats: StaffWithStats[] = users.map((u) => {
        let open = 0;
        let closed = 0;
        leadsSnap.docs.forEach((ld) => {
          const ldata = ld.data();
          if (ldata.assignedTo === u.uid) {
            if (ldata.status === 'Won' || ldata.status === 'Lost') {
              closed++;
            } else {
              open++;
            }
          }
        });

        return {
          user: u,
          openLeads: open,
          closedLeads: closed,
          isBusy: open >= 12,
        };
      });

      setStaffList(staffStats);
    } catch (err: any) {
      console.warn('Error fetching staff list for reassign:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleOpenReassignModal = () => {
    fetchStaffForReassign();
    setReassignModalVisible(true);
  };

  const handleReassignToStaff = async (staffMember: StaffWithStats) => {
    if (!leadId) return;

    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        assignedTo: staffMember.user.uid,
        assignedToName: staffMember.user.name,
        updatedAt: serverTimestamp(),
      });

      // Write activity note
      const interactionsRef = collection(db, 'leads', leadId, 'interactions');
      await addDoc(interactionsRef, {
        type: 'reassign',
        title: 'Lead Reassigned',
        note: `Reassigned to ${staffMember.user.name} by ${profile?.name || 'Administrator'}`,
        authorId: user?.uid || '',
        authorName: profile?.name || 'Administrator',
        createdAt: serverTimestamp(),
      });

      setReassignModalVisible(false);
      showToast(`Lead reassigned to ${staffMember.user.name}`, 'success');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reassign lead');
    }
  };

  const handleUpdateStatus = async (newStatus: LeadStatus) => {
    if (!leadId || !lead) return;
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      const interactionsRef = collection(db, 'leads', leadId, 'interactions');
      await addDoc(interactionsRef, {
        type: 'status',
        title: `Status changed to ${newStatus}`,
        note: `Updated from ${lead.status} to ${newStatus}`,
        authorId: user?.uid || '',
        authorName: profile?.name || 'Administrator',
        createdAt: serverTimestamp(),
      });

      setStatusModalVisible(false);
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    }
  };

  const handleUpdatePriority = async (newPriority: LeadPriority) => {
    if (!leadId || !lead) return;
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        priority: newPriority,
        updatedAt: serverTimestamp(),
      });

      const interactionsRef = collection(db, 'leads', leadId, 'interactions');
      await addDoc(interactionsRef, {
        type: 'note',
        title: `Priority updated to ${newPriority}`,
        note: `Changed priority from ${lead.priority} to ${newPriority}`,
        authorId: user?.uid || '',
        authorName: profile?.name || 'Administrator',
        createdAt: serverTimestamp(),
      });

      setPriorityModalVisible(false);
      showToast(`Priority set to ${newPriority}`, 'success');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update priority');
    }
  };

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
        authorName: profile?.name || 'Staff',
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
    if (lead?.status === 'New Lead') return { label: 'New Lead', bg: '#EFF6FF', text: '#2563EB', dot: '#2563EB' };
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
    if (!lead?.receivedDate && !lead?.createdAt) return 'Today';
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
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Lead Details</Text>
          <Text style={styles.leadIdBadge}>
            {lead?.id ? `ID: ${lead.id.substring(0, 8).toUpperCase()}` : 'Lead'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setStatusModalVisible(true)}
        >
          <Feather name="more-vertical" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Identity Card */}
        <Card style={styles.identityCard} padding="lg">
          <View style={styles.identityHeader}>
            <View style={styles.identityLeft}>
              <Text style={styles.customerName}>{lead?.customerName || initialName}</Text>
              <Text style={styles.customerLocation}>
                {lead?.location?.address || 'Chennai'} · {lead?.source || 'Walk-in'}
              </Text>
            </View>
            <Avatar name={lead?.customerName || 'Customer'} size="lg" />
          </View>

          <View style={styles.badgeRow}>
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}
              onPress={() => setStatusModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.statusDot, { backgroundColor: statusBadge.dot }]} />
              <Text style={[styles.statusText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
              {isAdmin && <Feather name="chevron-down" size={12} color={statusBadge.text} style={{ marginLeft: 4 }} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.priorityBadge}
              onPress={() => setPriorityModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.priorityText}>{lead?.priority || 'Medium'} priority</Text>
              {isAdmin && <Feather name="chevron-down" size={12} color={theme.colors.muted} style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
          </View>
        </Card>

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
            onPress={isAdmin ? handleOpenReassignModal : () => setScheduleModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.actionCircle}>
              <Feather name={isAdmin ? 'user-check' : 'edit-3'} size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.actionLabel}>{isAdmin ? 'Reassign' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* 6-TILE INFORMATION GRID (ADMIN & STAFF) */}
        <Card style={styles.sectionCard} padding="lg">
          <Text style={styles.sectionTitle}>Lead Information</Text>
          
          <View style={styles.gridContainer}>
            {/* Tile 1: Status */}
            <TouchableOpacity
              style={styles.gridTile}
              onPress={() => setStatusModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.tileLabel}>Status</Text>
              <View style={styles.tileValueRow}>
                <Text style={styles.tileValueText}>{lead?.status || 'New Lead'}</Text>
                {isAdmin && <Feather name="edit-2" size={12} color={theme.colors.muted} />}
              </View>
            </TouchableOpacity>

            {/* Tile 2: Priority */}
            <TouchableOpacity
              style={styles.gridTile}
              onPress={() => setPriorityModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.tileLabel}>Priority</Text>
              <View style={styles.tileValueRow}>
                <Text style={styles.tileValueText}>{lead?.priority || 'Medium'}</Text>
                {isAdmin && <Feather name="edit-2" size={12} color={theme.colors.muted} />}
              </View>
            </TouchableOpacity>

            {/* Tile 3: Assigned Rep */}
            <TouchableOpacity
              style={styles.gridTile}
              onPress={handleOpenReassignModal}
              activeOpacity={0.8}
            >
              <Text style={styles.tileLabel}>Assigned Rep</Text>
              <View style={styles.tileValueRow}>
                <Text style={[styles.tileValueText, { color: theme.colors.primary }]}>
                  {lead?.assignedToName || 'Unassigned'}
                </Text>
                {isAdmin && <Feather name="refresh-cw" size={12} color={theme.colors.primary} />}
              </View>
            </TouchableOpacity>

            {/* Tile 4: Estimated Deal Value */}
            <View style={styles.gridTile}>
              <Text style={styles.tileLabel}>Deal Value</Text>
              <Text style={styles.tileValueText}>
                {lead?.estimatedValue
                  ? `₹${lead.estimatedValue.toLocaleString('en-IN')}`
                  : '₹0'}
              </Text>
            </View>

            {/* Tile 5: Source */}
            <View style={styles.gridTile}>
              <Text style={styles.tileLabel}>Channel Source</Text>
              <Text style={styles.tileValueText}>{lead?.source || 'Direct'}</Text>
            </View>

            {/* Tile 6: Received Date */}
            <View style={styles.gridTile}>
              <Text style={styles.tileLabel}>Received Date</Text>
              <Text style={styles.tileValueText}>{receivedDateText}</Text>
            </View>
          </View>
        </Card>

        {/* Requirements & Products */}
        <Card style={styles.sectionCard} padding="lg">
          <Text style={styles.sectionTitle}>Requirement Summary</Text>
          <Text style={styles.requirementText}>
            {lead?.requirementSummary || 'No specific requirement details provided.'}
          </Text>

          {lead?.products && lead.products.length > 0 && (
            <View style={styles.productsContainer}>
              <Text style={styles.subSectionTitle}>Interested Categories</Text>
              <View style={styles.productChipsRow}>
                {lead.products.map((p) => (
                  <View key={p} style={styles.productChip}>
                    <Feather name="check" size={12} color={theme.colors.primary} />
                    <Text style={styles.productChipText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Follow-up Section */}
        <Card style={styles.sectionCard} padding="lg">
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Follow-up Schedule</Text>
            <TouchableOpacity onPress={() => setScheduleModalVisible(true)} activeOpacity={0.7}>
              <Text style={styles.linkText}>Schedule</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.followUpDate}>{formattedFollowUp}</Text>
        </Card>

        {/* Activity Section */}
        <Card style={styles.sectionCard} padding="lg">
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Activity History</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('AllActivity', {
                  leadId: lead?.id || leadId,
                  customerName: lead?.customerName || initialName,
                })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>See all ({activities.length})</Text>
            </TouchableOpacity>
          </View>

          {activities.length === 0 ? (
            <Text style={styles.emptyActivityText}>No activity recorded yet.</Text>
          ) : (
            <View style={styles.activityList}>
              {activities.slice(0, 4).map((act, index) => {
                const isLast = index === Math.min(activities.length, 4) - 1;
                return (
                  <View key={act.id} style={styles.activityRow}>
                    <View style={styles.timelineCol}>
                      <View style={styles.timelineCircle}>
                        <Feather
                          name={act.type === 'reassign' ? 'refresh-cw' : act.type === 'status' ? 'tag' : 'file-text'}
                          size={12}
                          color={act.type === 'reassign' ? theme.colors.purple : theme.colors.primary}
                        />
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{act.title}</Text>
                      {act.note ? <Text style={styles.activityNote}>{act.note}</Text> : null}
                      <Text style={styles.activityMeta}>
                        {act.createdAt?.toDate
                          ? act.createdAt.toDate().toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : 'Just now'}{' '}
                        · {act.authorName}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Add Note Input */}
          <View style={styles.addNoteRow}>
            <TextInput
              style={styles.addNoteInput}
              placeholder="Add internal note or remarks..."
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
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.stickyFooter}>
        {isAdmin ? (
          <>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setStatusModalVisible(true)}
              activeOpacity={0.85}
            >
              <Feather name="tag" size={16} color={theme.colors.text} />
              <Text style={styles.secondaryBtnText}>Update Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleOpenReassignModal}
              activeOpacity={0.85}
            >
              <Feather name="user-check" size={16} color={theme.colors.white} />
              <Text style={styles.primaryBtnText}>Reassign Lead</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() =>
                navigation.navigate('LogVisit', {
                  leadId: lead?.id || leadId,
                  customerName: lead?.customerName || initialName,
                  location: lead?.location?.address || 'Chennai',
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Log Visit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setScheduleModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Schedule Follow-up</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Reassign Lead Modal */}
      <Modal visible={reassignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reassign Lead to Staff</Text>
              <TouchableOpacity onPress={() => setReassignModalVisible(false)}>
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
                  const isCurrent = lead?.assignedTo === item.user.uid;
                  return (
                    <TouchableOpacity
                      style={[styles.staffModalItem, isCurrent && styles.staffModalItemCurrent]}
                      onPress={() => handleReassignToStaff(item)}
                      activeOpacity={0.75}
                    >
                      <Avatar name={item.user.name} size="md" />
                      <View style={styles.staffModalItemInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.staffModalItemName}>{item.user.name}</Text>
                          {isCurrent && <Text style={styles.currentBadge}>(Current)</Text>}
                        </View>
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

      {/* Status Picker Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalCard}>
            <Text style={styles.centerModalTitle}>Update Lead Status</Text>
            {STATUS_OPTIONS.map((st) => {
              const isSelected = lead?.status === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.modalOptionRow, isSelected && styles.modalOptionRowSelected]}
                  onPress={() => handleUpdateStatus(st)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                    {st}
                  </Text>
                  {isSelected && <Feather name="check" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Priority Picker Modal */}
      <Modal visible={priorityModalVisible} transparent animationType="fade">
        <View style={styles.centerModalOverlay}>
          <View style={styles.centerModalCard}>
            <Text style={styles.centerModalTitle}>Update Priority</Text>
            {PRIORITY_OPTIONS.map((pr) => {
              const isSelected = lead?.priority === pr;
              return (
                <TouchableOpacity
                  key={pr}
                  style={[styles.modalOptionRow, isSelected && styles.modalOptionRowSelected]}
                  onPress={() => handleUpdatePriority(pr)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                    {pr}
                  </Text>
                  {isSelected && <Feather name="check" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setPriorityModalVisible(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 17,
    color: theme.colors.text,
  },
  leadIdBadge: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.colors.muted,
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
    marginBottom: theme.spacing.md,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  identityLeft: {
    flex: 1,
    marginRight: 10,
  },
  customerName: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: theme.colors.text,
  },
  customerLocation: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
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
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: '#F1F5F9',
  },
  priorityText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
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
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 12,
    marginBottom: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  linkText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.primary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridTile: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tileLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileValueText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  requirementText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  productsContainer: {
    marginTop: 6,
  },
  productChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  productChipText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.primary,
  },
  followUpDate: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  emptyActivityText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginVertical: 8,
  },
  activityList: {
    marginTop: 4,
  },
  activityRow: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    paddingBottom: 12,
  },
  activityTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  activityNote: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  activityMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
  addNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  addNoteInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  addNoteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.white,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
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
    maxHeight: '75%',
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
  staffModalItemCurrent: {
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
  currentBadge: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.colors.primary,
  },
  staffModalItemStats: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  repHealthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
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
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  centerModalCard: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    ...theme.shadows.elevated,
  },
  centerModalTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 17,
    color: theme.colors.text,
    marginBottom: 14,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalOptionRowSelected: {
    backgroundColor: '#F8FAFC',
  },
  modalOptionText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
  },
  modalOptionTextSelected: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  modalCancelBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.muted,
  },
});

export default LeadDetailsScreen;
