import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { Lead, User } from '../../types';
import { Card, Avatar, Screen } from '../../components';
import { CONVERSION_TARGET_PERCENT } from '../../constants/layout';

interface StaffWorkload {
  uid: string;
  name: string;
  openLeads: number;
  totalLeads: number;
  closedLeads: number;
  overdueLeads: number;
  percent: number;
}

export const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { profile, signOut } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Month & Year header text
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const loadData = async () => {
    try {
      // 1. Fetch leads
      const leadsRef = collection(db, 'leads');
      const leadsSnap = await getDocs(leadsRef);
      const leadsData: Lead[] = leadsSnap.docs.map((d) => ({
        ...(d.data() as Omit<Lead, 'id'>),
        id: d.id,
      }));
      setLeads(leadsData);

      // 2. Fetch staff users
      const usersRef = collection(db, 'users');
      const qUsers = query(usersRef, where('role', '==', 'staff'), where('active', '==', true));
      const usersSnap = await getDocs(qUsers);
      const usersData: User[] = usersSnap.docs.map((d) => ({
        ...(d.data() as Omit<User, 'uid'>),
        uid: d.id,
      }));
      setStaffUsers(usersData);
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubLeads = onSnapshot(collection(db, 'leads'), () => {
      loadData();
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), () => {
      loadData();
    });

    return () => {
      unsubLeads();
      unsubUsers();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Compute 4 Stat Cards with real month-over-month trends
  const stats = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((l) => l.status === 'Won').length;
    const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const leadsThisMonth = leads.filter((l) => {
      const rawDate: any = l.createdAt || l.receivedDate;
      const d = typeof rawDate?.toDate === 'function' ? rawDate.toDate() : new Date(rawDate || 0);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const leadsPrevMonth = leads.filter((l) => {
      const rawDate: any = l.createdAt || l.receivedDate;
      const d = typeof rawDate?.toDate === 'function' ? rawDate.toDate() : new Date(rawDate || 0);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const wonThisMonth = leadsThisMonth.filter((l) => l.status === 'Won').length;
    const wonPrevMonth = leadsPrevMonth.filter((l) => l.status === 'Won').length;

    let totalTrend: { text: string; isPositive: boolean } | null = null;
    if (leadsPrevMonth.length > 0) {
      const diff = Math.round(((leadsThisMonth.length - leadsPrevMonth.length) / leadsPrevMonth.length) * 100);
      totalTrend = {
        text: `${diff >= 0 ? '+' : ''}${diff}%`,
        isPositive: diff >= 0,
      };
    }

    let wonTrend: { text: string; isPositive: boolean } | null = null;
    if (wonPrevMonth > 0) {
      const diff = Math.round(((wonThisMonth - wonPrevMonth) / wonPrevMonth) * 100);
      wonTrend = {
        text: `${diff >= 0 ? '+' : ''}${diff}%`,
        isPositive: diff >= 0,
      };
    }

    const overdue = leads.filter((l) => {
      if (l.status === 'Won' || l.status === 'Lost') return false;
      if (!l.followUpAt) return false;
      const followUpDate = typeof l.followUpAt.toDate === 'function' ? l.followUpAt.toDate() : new Date((l.followUpAt as any) || Date.now());
      return followUpDate < now;
    }).length;

    return {
      total,
      won,
      conversionRate,
      overdue,
      totalTrend,
      wonTrend,
    };
  }, [leads]);

  // Compute Workload by Staff - ONLY users with role === 'staff'
  const staffWorkloads = useMemo<StaffWorkload[]>(() => {
    const now = new Date();
    const verifiedStaff = staffUsers.filter((u) => u.role === 'staff');

    return verifiedStaff.map((u) => {
      const userLeads = leads.filter((l) => l.assignedTo === u.uid);
      const open = userLeads.filter((l) => l.status !== 'Won' && l.status !== 'Lost').length;
      const closed = userLeads.filter((l) => l.status === 'Won' || l.status === 'Lost').length;
      const overdue = userLeads.filter((l) => {
        if (l.status === 'Won' || l.status === 'Lost') return false;
        if (!l.followUpAt) return false;
        const d = typeof l.followUpAt.toDate === 'function' ? l.followUpAt.toDate() : new Date((l.followUpAt as any) || Date.now());
        return d < now;
      }).length;

      const percent = Math.min(100, Math.round((open / 15) * 100));

      return {
        uid: u.uid,
        name: u.name,
        openLeads: open,
        totalLeads: userLeads.length,
        closedLeads: closed,
        overdueLeads: overdue,
        percent: isNaN(percent) ? 0 : percent,
      };
    });
  }, [leads, staffUsers]);

  // Staff with highest overdue or urgent attention
  const needsAttentionStaff = useMemo(() => {
    return staffWorkloads.filter((s) => s.overdueLeads > 0);
  }, [staffWorkloads]);

  const headerNode = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Avatar name={profile?.name || 'Admin'} size="md" />
        <View style={styles.headerInfo}>
          <View style={styles.badgeRow}>
            <Text style={styles.greetingText}>Welcome back,</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMINISTRATOR</Text>
            </View>
          </View>
          <Text style={styles.adminName} numberOfLines={1} ellipsizeMode="tail">
            {profile?.name || 'Administrator'}
          </Text>
          <Text style={styles.periodText}>{currentMonthStr} Overview</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={signOut}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Feather name="log-out" size={20} color={theme.colors.muted} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Screen
      scroll={true}
      hasTabBar={true}
      header={headerNode}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {/* 4 STAT CARDS GRID */}
          <View style={styles.statsGrid}>
            {/* Stat 1: Total Leads */}
            <Card style={styles.statCard} padding="md">
              <View style={styles.statIconRow}>
                <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="layers" size={16} color={theme.colors.primary} />
                </View>
                {stats.totalTrend && (
                  <View style={stats.totalTrend.isPositive ? styles.trendBadgePositive : styles.trendBadgeDanger}>
                    <Feather
                      name={stats.totalTrend.isPositive ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={stats.totalTrend.isPositive ? theme.colors.success : theme.colors.danger}
                    />
                    <Text style={stats.totalTrend.isPositive ? styles.trendTextPositive : styles.trendTextDanger}>
                      {stats.totalTrend.text}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Leads</Text>
            </Card>

            {/* Stat 2: Leads Won */}
            <Card style={styles.statCard} padding="md">
              <View style={styles.statIconRow}>
                <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Feather name="check-circle" size={16} color={theme.colors.success} />
                </View>
                {stats.wonTrend && (
                  <View style={stats.wonTrend.isPositive ? styles.trendBadgePositive : styles.trendBadgeDanger}>
                    <Feather
                      name={stats.wonTrend.isPositive ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={stats.wonTrend.isPositive ? theme.colors.success : theme.colors.danger}
                    />
                    <Text style={stats.wonTrend.isPositive ? styles.trendTextPositive : styles.trendTextDanger}>
                      {stats.wonTrend.text}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.statValue}>{stats.won}</Text>
              <Text style={styles.statLabel}>Leads Won</Text>
            </Card>

            {/* Stat 3: Conversion Rate */}
            <Card style={styles.statCard} padding="md">
              <View style={styles.statIconRow}>
                <View style={[styles.statIconBox, { backgroundColor: '#F5F3FF' }]}>
                  <Feather name="pie-chart" size={16} color={theme.colors.purple} />
                </View>
                <View style={styles.trendBadgeNeutral}>
                  <Text style={styles.trendTextNeutral}>Target {CONVERSION_TARGET_PERCENT}%</Text>
                </View>
              </View>
              <Text style={styles.statValue}>{stats.conversionRate}%</Text>
              <Text style={styles.statLabel}>Conversion Rate</Text>
            </Card>

              {/* Stat 4: Overdue Follow-ups */}
              <Card style={styles.statCard} padding="md">
                <View style={styles.statIconRow}>
                  <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Feather name="alert-circle" size={16} color={theme.colors.danger} />
                  </View>
                  {stats.overdue > 0 && (
                    <View style={styles.trendBadgeDanger}>
                      <Text style={styles.trendTextDanger}>Urgent</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.statValue, stats.overdue > 0 ? { color: theme.colors.danger } : null]}>
                  {stats.overdue}
                </Text>
                <Text style={styles.statLabel}>Overdue Follow-ups</Text>
              </Card>
            </View>

            {/* NEEDS ATTENTION SECTION */}
            {needsAttentionStaff.length > 0 && (
              <Card style={styles.alertCard} padding="md">
                <View style={styles.alertHeader}>
                  <View style={styles.alertIconCircle}>
                    <Feather name="bell" size={16} color={theme.colors.danger} />
                  </View>
                  <View style={styles.alertHeaderText}>
                    <Text style={styles.alertTitle}>Needs Attention</Text>
                    <Text style={styles.alertSubtitle}>
                      {needsAttentionStaff.length} team member(s) have overdue follow-up tasks.
                    </Text>
                  </View>
                </View>

                {needsAttentionStaff.slice(0, 2).map((st) => (
                  <View key={st.uid} style={styles.overdueStaffRow}>
                    <Avatar name={st.name} size="sm" />
                    <View style={styles.overdueStaffInfo}>
                      <Text style={styles.overdueStaffName}>{st.name}</Text>
                      <Text style={styles.overdueStaffCount}>
                        {st.overdueLeads} overdue {st.overdueLeads === 1 ? 'lead' : 'leads'} requiring follow-up
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => navigation.navigate('LeadsTab')}
                    >
                      <Text style={styles.reviewBtnText}>Review</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            )}

            {/* OPEN LEADS BY STAFF PROGRESS BARS */}
            <Card style={styles.workloadCard} padding="lg">
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Open Leads by Staff</Text>
                <TouchableOpacity onPress={() => navigation.navigate('StaffTab')}>
                  <Text style={styles.sectionLink}>Manage Staff</Text>
                </TouchableOpacity>
              </View>

              {staffWorkloads.length === 0 ? (
                <Text style={styles.emptyText}>No active staff members found.</Text>
              ) : (
                <View style={styles.workloadList}>
                  {staffWorkloads.map((st) => {
                    const isBusy = st.openLeads >= 12;
                    return (
                      <View key={st.uid} style={styles.workloadItem}>
                        <View style={styles.workloadTopRow}>
                          <View style={styles.workloadStaffInfo}>
                            <Avatar name={st.name} size="sm" />
                            <Text style={styles.workloadStaffName}>{st.name}</Text>
                          </View>
                          <View style={styles.workloadStatsRow}>
                            <Text style={styles.workloadLeadNumbers}>
                              <Text style={styles.workloadLeadBold}>{st.openLeads}</Text> / {st.totalLeads} Open
                            </Text>
                            <View style={[styles.healthBadge, isBusy ? styles.healthBadgeBusy : styles.healthBadgeHealthy]}>
                              <Text style={[styles.healthBadgeText, isBusy ? styles.healthTextBusy : styles.healthTextHealthy]}>
                                {isBusy ? 'BUSY' : 'HEALTHY'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarTrack}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(100, Math.max(8, st.percent))}%`,
                                backgroundColor: isBusy ? '#F97316' : theme.colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>

            {/* QUICK ACTIONS BANNER */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('AddLead')}
                activeOpacity={0.85}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="plus-circle" size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.quickActionTitle}>Intake New Lead</Text>
                <Text style={styles.quickActionSub}>Assign to sales rep</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('Reports')}
                activeOpacity={0.85}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Feather name="bar-chart-2" size={20} color={theme.colors.purple} />
                </View>
                <Text style={styles.quickActionTitle}>View Analytics</Text>
                <Text style={styles.quickActionSub}>Conversion & sources</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  adminBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.pill,
  },
  adminBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 9,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  adminName: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
    marginTop: 1,
  },
  periodText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.colors.muted,
  },
  logoutBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    width: '48%',
    borderRadius: theme.radius.card,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadgePositive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  trendTextPositive: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: '#16A34A',
  },
  trendBadgeNeutral: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  trendTextNeutral: {
    fontFamily: theme.fonts.medium,
    fontSize: 10,
    color: theme.colors.muted,
  },
  trendBadgeDanger: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  trendTextDanger: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: '#DC2626',
  },
  statValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: theme.colors.text,
  },
  statLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  alertCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    marginBottom: theme.spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  alertIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertHeaderText: {
    flex: 1,
  },
  alertTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: '#9A3412',
  },
  alertSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: '#C2410C',
  },
  overdueStaffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    padding: 8,
    marginTop: 6,
    gap: 8,
  },
  overdueStaffInfo: {
    flex: 1,
  },
  overdueStaffName: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: theme.colors.text,
  },
  overdueStaffCount: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.danger,
  },
  reviewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FEE2E2',
  },
  reviewBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.danger,
  },
  workloadCard: {
    marginBottom: theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  sectionLink: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.primary,
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    paddingVertical: 10,
  },
  workloadList: {
    gap: 14,
  },
  workloadItem: {
    gap: 6,
  },
  workloadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workloadStaffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workloadStaffName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  workloadStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workloadLeadNumbers: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  workloadLeadBold: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
  },
  healthBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  healthBadgeHealthy: {
    backgroundColor: '#DCFCE7',
  },
  healthBadgeBusy: {
    backgroundColor: '#FEE2E2',
  },
  healthBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  healthTextHealthy: {
    color: '#16A34A',
  },
  healthTextBusy: {
    color: '#DC2626',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: theme.colors.text,
  },
  quickActionSub: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
});

export default AdminDashboardScreen;
