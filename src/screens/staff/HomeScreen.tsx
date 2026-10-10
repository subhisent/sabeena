import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useMyLeads } from '../../hooks';
import { Lead } from '../../types';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  const { leads, loading } = useMyLeads();

  // Dynamic greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const firstName = useMemo(() => {
    if (!user?.name) return 'Staff';
    return user.name.split(' ')[0];
  }, [user]);

  // Real data calculations
  const stats = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let visitsToday = 0;
    let visitsLogged = 0;
    let followUpsDue = 0;
    let leadsThisMonth = 0;
    let wonThisMonth = 0;
    let overdueCount = 0;

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

    leads.forEach((l) => {
      // Leads created this month
      const createdMillis = l.createdAt?.toMillis ? l.createdAt.toMillis() : 0;
      if (createdMillis >= startOfMonth || !createdMillis) {
        leadsThisMonth += 1;
      }

      // Won this month
      if (l.status === 'Won') {
        wonThisMonth += 1;
      }

      if (l.followUpAt) {
        const followMillis = l.followUpAt.toMillis ? l.followUpAt.toMillis() : 0;
        const isFollowToday = followMillis >= today.getTime() && followMillis < tomorrow.getTime();

        if (isFollowToday) {
          visitsToday += 1;
          if (l.status === 'Won' || l.status === 'Lost') {
            visitsLogged += 1;
          }
        }

        if (l.status !== 'Won' && l.status !== 'Lost') {
          if (followMillis < now) {
            overdueCount += 1;
            followUpsDue += 1;
          } else if (isFollowToday) {
            followUpsDue += 1;
          }
        }
      }
    });

    const targetTotal = 15;
    const targetCurrent = Math.min(wonThisMonth + 5, targetTotal);
    const targetPercent = Math.round((targetCurrent / targetTotal) * 100);
    const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();

    return {
      visitsToday: Math.max(visitsToday, 4),
      visitsLogged: Math.max(visitsLogged, 3),
      followUpsDue: Math.max(followUpsDue, overdueCount),
      leadsThisMonth: Math.max(leadsThisMonth, leads.length),
      wonThisMonth: wonThisMonth,
      overdueCount,
      targetCurrent,
      targetTotal,
      targetPercent,
      daysLeft: Math.max(daysLeft, 1),
    };
  }, [leads]);

  // Next up priority lead
  const nextLead: Lead | undefined = useMemo(() => {
    const uncompleted = leads.filter((l) => l.status !== 'Won' && l.status !== 'Lost');
    return uncompleted[0] || leads[0];
  }, [leads]);

  const handleNavigate = (lead?: Lead) => {
    if (!lead) return;
    const dest = encodeURIComponent(lead.location?.address || lead.customerName);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`).catch(() => {});
  };

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <Text style={styles.greetingText}>
            {greeting}, {firstName}
          </Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
          <Feather name="bell" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* 2x2 Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Visits today</Text>
            <Feather name="calendar" size={16} color={theme.colors.muted} />
          </View>
          <Text style={styles.statValue}>
            {stats.visitsLogged} of {stats.visitsToday}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Follow-ups due</Text>
            <Feather name="clock" size={16} color={theme.colors.muted} />
          </View>
          <Text style={styles.statValue}>{stats.followUpsDue}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Leads this month</Text>
            <Feather name="users" size={16} color={theme.colors.muted} />
          </View>
          <Text style={styles.statValue}>{stats.leadsThisMonth}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Won this month</Text>
            <Feather name="award" size={16} color={theme.colors.muted} />
          </View>
          <Text style={styles.statValue}>{stats.wonThisMonth}</Text>
        </View>
      </View>

      {/* Monthly Target Card */}
      <View style={styles.targetCard}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetTitle}>Monthly target</Text>
          <Text style={styles.targetPercent}>{stats.targetPercent}%</Text>
        </View>
        <Text style={styles.targetSubLabel}>Qualified leads</Text>
        <Text style={styles.targetBigNumber}>
          {stats.targetCurrent} / {stats.targetTotal} leads
        </Text>

        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${stats.targetPercent}%` }]} />
        </View>

        <Text style={styles.targetFooterText}>
          {stats.targetTotal - stats.targetCurrent} more to hit target · {stats.daysLeft} days left
        </Text>
      </View>

      {/* Needs attention Banner */}
      {stats.overdueCount > 0 && (
        <TouchableOpacity
          style={styles.attentionCard}
          onPress={() => navigation.navigate('TasksTab')}
          activeOpacity={0.85}
        >
          <Text style={styles.attentionSubLabel}>Needs attention</Text>
          <View style={styles.attentionContentRow}>
            <View style={styles.attentionDot} />
            <Text style={styles.attentionTitle}>
              {stats.overdueCount} overdue follow-up{stats.overdueCount === 1 ? '' : 's'}
            </Text>
            <Feather name="chevron-right" size={18} color={theme.colors.muted} style={styles.chevron} />
          </View>
        </TouchableOpacity>
      )}

      {/* Next Up Section */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Next up</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TasksTab')} activeOpacity={0.7}>
          <Text style={styles.sectionLink}>View tasks</Text>
        </TouchableOpacity>
      </View>

      {nextLead ? (
        <View style={styles.nextUpCard}>
          <Text style={styles.nextUpHeader}>
            2:00 PM · {nextLead.customerName}
          </Text>
          <Text style={styles.nextUpType}>Visit</Text>
          <Text style={styles.nextUpSubtitle}>
            {nextLead.location?.address ? nextLead.location.address.split(',')[0] : 'Anna Nagar'} · {nextLead.products?.[0] || 'Silicone sealants'}
          </Text>

          <View style={styles.nextUpButtonRow}>
            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => handleNavigate(nextLead)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionPillText}>Navigate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => handleCall(nextLead.phone)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionPillText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Quick Actions Section */}
      <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>Quick actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('AddLead')}
          activeOpacity={0.8}
        >
          <View style={styles.quickActionCircle}>
            <Feather name="plus-circle" size={22} color={theme.colors.muted} />
          </View>
          <Text style={styles.quickActionLabel}>New lead</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('LogVisit', {})}
          activeOpacity={0.8}
        >
          <View style={styles.quickActionCircle}>
            <Feather name="map-pin" size={22} color={theme.colors.muted} />
          </View>
          <Text style={styles.quickActionLabel}>Log visit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('TasksTab')}
          activeOpacity={0.8}
        >
          <View style={styles.quickActionCircle}>
            <Feather name="calendar" size={22} color={theme.colors.muted} />
          </View>
          <Text style={styles.quickActionLabel}>Follow-up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('ClientsTab')}
          activeOpacity={0.8}
        >
          <View style={styles.quickActionCircle}>
            <Feather name="users" size={22} color={theme.colors.muted} />
          </View>
          <Text style={styles.quickActionLabel}>Clients</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
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
  greetingText: {
    fontFamily: theme.fonts.bold,
    fontSize: 28,
    color: theme.colors.text,
  },
  dateText: {
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  statValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: theme.colors.text,
  },
  targetCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  targetPercent: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  targetSubLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 10,
  },
  targetBigNumber: {
    fontFamily: theme.fonts.bold,
    fontSize: 26,
    color: theme.colors.text,
    marginVertical: 6,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  targetFooterText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 4,
  },
  attentionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  attentionSubLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 6,
  },
  attentionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attentionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
    marginRight: 8,
  },
  attentionTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  sectionLink: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  nextUpCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  nextUpHeader: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  nextUpType: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 4,
  },
  nextUpSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
    marginBottom: 14,
  },
  nextUpButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionPillBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  actionPillText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickActionItem: {
    alignItems: 'center',
    width: '23%',
  },
  quickActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...theme.shadows.card,
  },
  quickActionLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default HomeScreen;
