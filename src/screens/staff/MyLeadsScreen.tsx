import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { theme } from '../../theme';
import { useMyLeads } from '../../hooks';
import { Lead, LeadStatus } from '../../types';
import { SearchBar, FAB, Avatar } from '../../components';

export type FilterCategory = 'All' | 'New' | 'In Progress' | 'Follow-up' | 'Won' | 'Lost';

export const MyLeadsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { leads, loading, error } = useMyLeads();

  const [search, setSearch] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('All');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Compute live category counts
  const filterCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      All: leads.length,
      New: 0,
      'In Progress': 0,
      'Follow-up': 0,
      Won: 0,
      Lost: 0,
    };

    leads.forEach((l) => {
      if (l.status === 'New Lead') counts.New += 1;
      else if (l.status === 'In Progress') counts['In Progress'] += 1;
      else if (l.status === 'Won') counts.Won += 1;
      else if (l.status === 'Lost') counts.Lost += 1;

      // Count follow-ups (leads that have a pending followUpAt scheduled)
      if (l.followUpAt && l.status !== 'Won' && l.status !== 'Lost') {
        counts['Follow-up'] += 1;
      }
    });

    return counts;
  }, [leads]);

  const filterTabs: { key: FilterCategory; label: string }[] = [
    { key: 'All', label: `All ${filterCounts.All}` },
    { key: 'New', label: `New ${filterCounts.New}` },
    { key: 'In Progress', label: `In Progress ${filterCounts['In Progress']}` },
    { key: 'Follow-up', label: `Follow-up ${filterCounts['Follow-up']}` },
    { key: 'Won', label: `Won ${filterCounts.Won}` },
    { key: 'Lost', label: `Lost ${filterCounts.Lost}` },
  ];

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Category filter
      if (selectedFilter === 'New' && lead.status !== 'New Lead') return false;
      if (selectedFilter === 'In Progress' && lead.status !== 'In Progress') return false;
      if (selectedFilter === 'Follow-up' && (!lead.followUpAt || lead.status === 'Won' || lead.status === 'Lost')) return false;
      if (selectedFilter === 'Won' && lead.status !== 'Won') return false;
      if (selectedFilter === 'Lost' && lead.status !== 'Lost') return false;

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = lead.customerName.toLowerCase().includes(q);
        const matchesPhone = lead.phone.toLowerCase().includes(q);
        const matchesReq = lead.requirementSummary?.toLowerCase().includes(q) || false;
        const matchesLocation = lead.location?.address?.toLowerCase().includes(q) || false;
        return matchesName || matchesPhone || matchesReq || matchesLocation;
      }

      return true;
    });
  }, [leads, selectedFilter, search]);

  const getStatusBadgeConfig = (status: LeadStatus, followUpAt: any) => {
    if (status === 'Won') {
      return {
        label: 'Won',
        bg: '#DCFCE7',
        text: '#16A34A',
        dot: '#16A34A',
      };
    }
    if (status === 'Lost') {
      return {
        label: 'Lost',
        bg: '#F1F5F9',
        text: '#64748B',
        dot: '#64748B',
      };
    }
    if (status === 'New Lead') {
      return {
        label: 'New',
        bg: '#EFF6FF',
        text: '#2563EB',
        dot: '#2563EB',
      };
    }
    if (followUpAt) {
      return {
        label: 'Follow-up',
        bg: '#F5F3FF',
        text: '#7C3AED',
        dot: '#7C3AED',
      };
    }
    return {
      label: 'In Progress',
      bg: '#FEF3C7',
      text: '#D97706',
      dot: '#D97706',
    };
  };

  const formatFollowUpLine = (lead: Lead): string => {
    if (!lead.followUpAt) return 'Not scheduled';
    const d = typeof lead.followUpAt.toDate === 'function' ? lead.followUpAt.toDate() : new Date((lead.followUpAt as any) || Date.now());
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const type = lead.priority === 'Urgent' ? 'Visit' : 'Call';

    if (d.getTime() < now) {
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      return `Overdue ${day} ${month} · ${type}`;
    }
    if (d >= today && d < tomorrow) {
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `Today ${time} · ${type}`;
    }
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} ${month} ${time} · ${type}`;
  };

  // Error State Render
  if (error) {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.errorCircle}>
          <Feather name="alert-triangle" size={36} color={theme.colors.danger} />
        </View>
        <Text style={styles.stateTitle}>Unable to load leads</Text>
        <Text style={styles.stateSubtitle}>Please check your connection.</Text>

        <TouchableOpacity
          style={styles.statePrimaryBtn}
          onPress={() => setRefreshing(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.statePrimaryBtnText}>Try again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stateSecondaryBtn}
          onPress={() => navigation.navigate('HomeTab')}
          activeOpacity={0.85}
        >
          <Text style={styles.stateSecondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Leads</Text>
          <Text style={styles.headerSubtitle}>{leads.length} leads</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
          <Feather name="bell" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search leads"
          onFilterPress={() => {}}
        />
      </View>

      {/* Horizontal Filter Tabs */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterTabs.map((tab) => {
            const isSelected = selectedFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                onPress={() => setSelectedFilter(tab.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Loading Skeleton */}
      {loading ? (
        <ScrollView contentContainerStyle={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map((idx) => (
            <View key={idx} style={styles.skeletonCard}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonInfo}>
                <View style={styles.skeletonLineLong} />
                <View style={styles.skeletonLineMed} />
                <View style={styles.skeletonLineShort} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : filteredLeads.length === 0 ? (
        /* Empty Search / Empty Leads State */
        <View style={styles.emptyContainer}>
          <Feather name="search" size={44} color={theme.colors.muted} />
          <Text style={styles.emptyTitle}>No matching leads</Text>
          <Text style={styles.emptySubtitle}>Try another name or clear filters.</Text>
          {search ? (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => setSearch('')}
              activeOpacity={0.85}
            >
              <Text style={styles.clearSearchBtnText}>Clear search</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        /* Leads List */
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              tintColor={theme.colors.text}
            />
          }
          renderItem={({ item }) => {
            const badge = getStatusBadgeConfig(item.status, item.followUpAt);
            const followLine = formatFollowUpLine(item);

            // Extract location & product
            let locationText = 'Chennai';
            if (item.location?.address) {
              locationText = item.location.address.split(',')[0];
            } else if (item.requirementSummary && item.requirementSummary.includes('·')) {
              locationText = item.requirementSummary.split('·')[0].trim();
            }
            const productText = item.products?.[0] || 'Silicone sealants';

            return (
              <TouchableOpacity
                style={styles.leadCard}
                activeOpacity={0.75}
                onPress={() =>
                  navigation.navigate('LeadDetails', {
                    leadId: item.id,
                    customerName: item.customerName,
                  })
                }
              >
                <Avatar name={item.customerName} size="md" />

                <View style={styles.leadInfo}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {item.customerName}
                    </Text>

                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
                      <Text style={[styles.statusText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reqLocation} numberOfLines={1}>
                    {locationText} · {productText}
                  </Text>

                  <View style={styles.scheduleRow}>
                    <Feather name="clock" size={13} color={theme.colors.muted} />
                    <Text style={styles.scheduleText}>{followLine}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Floating Action Button */}
      <FAB
        onPress={() => navigation.navigate('AddLead')}
        style={styles.fabPosition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
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
  searchWrapper: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  filterScrollWrapper: {
    marginBottom: theme.spacing.md,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  filterPillSelected: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  filterPillText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  filterPillTextSelected: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 110,
  },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: 10,
    ...theme.shadows.card,
  },
  leadInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customerName: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    marginRight: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
  },
  reqLocation: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  fabPosition: {
    position: 'absolute',
    bottom: 85,
    right: 20,
  },
  // Skeleton styles
  skeletonContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: 10,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  skeletonLineLong: {
    height: 14,
    width: '60%',
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  skeletonLineMed: {
    height: 12,
    width: '80%',
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  skeletonLineShort: {
    height: 10,
    width: '40%',
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  // Empty & Error states
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  clearSearchBtn: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 20,
  },
  clearSearchBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.white,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  errorCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: theme.colors.text,
    marginBottom: 6,
  },
  stateSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 24,
  },
  statePrimaryBtn: {
    width: '100%',
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statePrimaryBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.white,
  },
  stateSecondaryBtn: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateSecondaryBtnText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
});

export default MyLeadsScreen;
