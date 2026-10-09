import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useMyLeads } from '../../hooks';
import { Lead, LeadStatus, LeadPriority } from '../../types';
import {
  ScreenHeader,
  SearchBar,
  Chip,
  Card,
  Avatar,
  EmptyState,
} from '../../components';

export type FilterType = 'All' | 'New' | 'In Progress' | 'Won' | 'Lost' | 'Overdue';

export const MyLeadsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { leads, loading } = useMyLeads();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('All');

  // Helper to determine if a lead is overdue
  const isLeadOverdue = (lead: Lead): boolean => {
    if (lead.status === 'Won' || lead.status === 'Lost') return false;
    if (!lead.followUpAt) return false;
    return lead.followUpAt.toMillis() < Date.now();
  };

  // Live count computations for each filter category
  const filterCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      All: leads.length,
      New: 0,
      'In Progress': 0,
      Won: 0,
      Lost: 0,
      Overdue: 0,
    };

    leads.forEach((l) => {
      if (l.status === 'New Lead') counts.New += 1;
      if (l.status === 'In Progress') counts['In Progress'] += 1;
      if (l.status === 'Won') counts.Won += 1;
      if (l.status === 'Lost') counts.Lost += 1;
      if (isLeadOverdue(l)) counts.Overdue += 1;
    });

    return counts;
  }, [leads]);

  // Filter items definition with labels and counts
  const filters: { key: FilterType; label: string }[] = [
    { key: 'All', label: `All ${filterCounts.All}` },
    { key: 'New', label: `New ${filterCounts.New}` },
    { key: 'In Progress', label: `In Progress ${filterCounts['In Progress']}` },
    { key: 'Overdue', label: `Overdue ${filterCounts.Overdue}` },
    { key: 'Won', label: `Won ${filterCounts.Won}` },
    { key: 'Lost', label: `Lost ${filterCounts.Lost}` },
  ];

  // Sorting logic: Overdue & Urgent first, then nearest follow-up date
  const sortedAndFilteredLeads = useMemo(() => {
    // 1. Filter
    const filtered = leads.filter((lead) => {
      // Category filter
      if (selectedFilter === 'New' && lead.status !== 'New Lead') return false;
      if (selectedFilter === 'In Progress' && lead.status !== 'In Progress') return false;
      if (selectedFilter === 'Won' && lead.status !== 'Won') return false;
      if (selectedFilter === 'Lost' && lead.status !== 'Lost') return false;
      if (selectedFilter === 'Overdue' && !isLeadOverdue(lead)) return false;

      // Client-side search across name, phone, products & summary
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesName = lead.customerName.toLowerCase().includes(query);
        const matchesPhone = lead.phone.toLowerCase().includes(query);
        const matchesProducts =
          lead.products?.some((p) => p.toLowerCase().includes(query)) ||
          lead.requirementSummary.toLowerCase().includes(query);
        return matchesName || matchesPhone || matchesProducts;
      }

      return true;
    });

    // 2. Sort: Overdue & Urgent first, then nearest followUpAt
    return filtered.sort((a, b) => {
      const aOverdue = isLeadOverdue(a);
      const bOverdue = isLeadOverdue(b);

      // Overdue first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Urgent priority next
      const aUrgent = a.priority === 'Urgent';
      const bUrgent = b.priority === 'Urgent';
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      // Nearest followUpAt
      const aTime = a.followUpAt ? a.followUpAt.toMillis() : Infinity;
      const bTime = b.followUpAt ? b.followUpAt.toMillis() : Infinity;
      if (aTime !== bTime) {
        return aTime - bTime;
      }

      // Fallback to receivedDate descending
      const aReceived = a.receivedDate ? a.receivedDate.toMillis() : 0;
      const bReceived = b.receivedDate ? b.receivedDate.toMillis() : 0;
      return bReceived - aReceived;
    });
  }, [leads, selectedFilter, search]);

  const handleCall = (phone: string, customerName: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned) {
      Alert.alert('Phone Unavailable', `No valid phone number for ${customerName}`);
      return;
    }
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Calling Failed', `Could not dial ${phone}`);
    });
  };

  const formatFollowUpText = (lead: Lead) => {
    if (!lead.followUpAt) {
      return { text: 'Not scheduled', isOverdue: false };
    }
    const date = lead.followUpAt.toDate();
    const now = new Date();
    const isOverdue = isLeadOverdue(lead);

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const isTomorrow =
      date.getDate() === now.getDate() + 1 &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return {
        text: isOverdue ? `Overdue · Today ${timeStr}` : `Today ${timeStr} · Visit`,
        isOverdue,
      };
    }

    if (isTomorrow) {
      return {
        text: `Tomorrow ${timeStr}`,
        isOverdue: false,
      };
    }

    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return {
      text: isOverdue ? `Overdue · ${dateStr} ${timeStr}` : `${dateStr} ${timeStr} · Visit`,
      isOverdue,
    };
  };

  const getStatusColor = (status: LeadStatus, isOverdue: boolean) => {
    if (isOverdue) return theme.colors.danger;
    switch (status) {
      case 'New Lead':
        return theme.colors.primary;
      case 'In Progress':
        return theme.colors.warning;
      case 'Won':
        return theme.colors.success;
      case 'Lost':
        return theme.colors.muted;
      default:
        return theme.colors.primary;
    }
  };

  const getPriorityColor = (priority: LeadPriority) => {
    switch (priority) {
      case 'Urgent':
        return theme.colors.danger;
      case 'High':
        return theme.colors.warning;
      case 'Medium':
        return theme.colors.primary;
      case 'Low':
        return theme.colors.muted;
      default:
        return theme.colors.muted;
    }
  };

  return (
    <View style={styles.container}>
      {/* Sticky Header & Search Area */}
      <View style={styles.headerContainer}>
        <ScreenHeader
          title="Leads"
          subtitle={`${sortedAndFilteredLeads.length} leads`}
          rightAction={
            <TouchableOpacity style={styles.bellButton}>
              <Feather name="bell" size={20} color={theme.colors.text} />
              <View style={styles.unreadDot} />
            </TouchableOpacity>
          }
        />

        {/* SearchBar + Filters button matching Figma 1:2379 */}
        <View style={styles.searchRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search leads, products, phone..."
            style={styles.searchBar}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              Alert.alert(
                'Filter Leads',
                'Select a status filter',
                filters.map((f) => ({
                  text: f.label,
                  onPress: () => setSelectedFilter(f.key),
                }))
              );
            }}
            activeOpacity={0.8}
          >
            <Feather name="sliders" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Horizontal Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={selectedFilter === f.key}
              onPress={() => setSelectedFilter(f.key)}
              style={styles.filterChip}
            />
          ))}
        </ScrollView>
      </View>

      {/* FlatList of Lead Cards */}
      <FlatList
        data={sortedAndFilteredLeads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            iconName="search"
            title="No matching leads"
            description="Try another name or clear filters."
            actionLabel="Clear search"
            onAction={() => {
              setSearch('');
              setSelectedFilter('All');
            }}
          />
        }
        renderItem={({ item }) => {
          const overdue = isLeadOverdue(item);
          const followUpInfo = formatFollowUpText(item);
          const statusColor = getStatusColor(item.status, overdue);
          const priorityColor = getPriorityColor(item.priority);

          return (
            <Card
              style={styles.leadCard}
              onPress={() =>
                navigation.navigate('LeadDetails', {
                  leadId: item.id,
                  customerName: item.customerName,
                })
              }
            >
              <View style={styles.cardMainRow}>
                {/* Initials Avatar */}
                <Avatar name={item.customerName} size="md" />

                {/* Lead Information */}
                <View style={styles.leadInfoContainer}>
                  {/* Customer Name & Status */}
                  <View style={styles.nameRow}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {item.customerName}
                    </Text>
                    <View style={styles.chipsRow}>
                      {item.priority === 'Urgent' && (
                        <Chip
                          label="Urgent"
                          statusColor={priorityColor}
                          style={styles.miniPriorityChip}
                        />
                      )}
                      <Chip
                        label={overdue ? 'Overdue' : item.status === 'New Lead' ? 'New' : item.status}
                        statusColor={statusColor}
                      />
                    </View>
                  </View>

                  {/* Requirement Summary */}
                  <Text style={styles.requirementSummary} numberOfLines={1}>
                    {item.requirementSummary}
                  </Text>

                  {/* Follow-up Date & Call Action */}
                  <View style={styles.bottomRow}>
                    <View style={styles.followUpContainer}>
                      <Feather
                        name="clock"
                        size={14}
                        color={followUpInfo.isOverdue ? theme.colors.danger : theme.colors.muted}
                        style={styles.clockIcon}
                      />
                      <Text
                        style={[
                          styles.followUpText,
                          followUpInfo.isOverdue && styles.followUpOverdue,
                        ]}
                      >
                        {followUpInfo.text}
                      </Text>
                    </View>

                    {/* Black Round Call Button */}
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCall(item.phone, item.customerName);
                      }}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="phone" size={13} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />
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
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  bellButton: {
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
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
    borderWidth: 1.5,
    borderColor: theme.colors.card,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  searchBar: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  filterScroll: {
    paddingVertical: theme.spacing.sm,
  },
  filterChip: {
    marginRight: theme.spacing.xs + 2,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 120,
  },
  leadCard: {
    marginBottom: theme.spacing.sm + 2,
    padding: theme.spacing.md,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leadInfoContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    flex: 1,
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniPriorityChip: {
    marginRight: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  requirementSummary: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 18,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  followUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIcon: {
    marginRight: 4,
  },
  followUpText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  followUpOverdue: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.semiBold,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
    ...theme.shadows.card,
  },
});

export default MyLeadsScreen;
