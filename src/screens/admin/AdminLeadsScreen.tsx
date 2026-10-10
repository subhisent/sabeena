import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { Lead, LeadStatus } from '../../types';
import { Card, Avatar, EmptyState } from '../../components';

type StatusFilter = 'All' | LeadStatus;

export const AdminLeadsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'leads'),
      (snap) => {
        const list: Lead[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<Lead, 'id'>),
          id: d.id,
        }));
        // Sort by receivedDate or createdAt descending
        list.sort((a, b) => {
          const timeA = (a.createdAt as any)?.toMillis?.() || 0;
          const timeB = (b.createdAt as any)?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setLeads(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error loading leads:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filter counts
  const counts = useMemo(() => {
    const all = leads.length;
    const newL = leads.filter((l) => l.status === 'New Lead').length;
    const inProg = leads.filter((l) => l.status === 'In Progress').length;
    const won = leads.filter((l) => l.status === 'Won').length;
    const lost = leads.filter((l) => l.status === 'Lost').length;
    return { all, newL, inProg, won, lost };
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (selectedFilter !== 'All') {
      result = result.filter((l) => l.status === selectedFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.customerName?.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.assignedToName?.toLowerCase().includes(q) ||
          l.requirementSummary?.toLowerCase().includes(q) ||
          l.source?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, selectedFilter, searchQuery]);

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'Won':
        return { bg: '#DCFCE7', text: '#16A34A', label: 'Won' };
      case 'Lost':
        return { bg: '#F1F5F9', text: '#64748B', label: 'Lost' };
      case 'In Progress':
        return { bg: '#FEF3C7', text: '#D97706', label: 'In Progress' };
      case 'New Lead':
      default:
        return { bg: '#EFF6FF', text: '#2563EB', label: 'New Lead' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Leads</Text>
        <Text style={styles.headerSubtitle}>{leads.length} incoming leads in pipeline</Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={theme.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads, customer, rep..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={theme.colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'All' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('All')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'All' && styles.filterTabTextActive]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'New Lead' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('New Lead')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'New Lead' && styles.filterTabTextActive]}>
              New ({counts.newL})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'In Progress' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('In Progress')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'In Progress' && styles.filterTabTextActive]}>
              In Progress ({counts.inProg})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'Won' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('Won')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'Won' && styles.filterTabTextActive]}>
              Won ({counts.won})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'Lost' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('Lost')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'Lost' && styles.filterTabTextActive]}>
              Lost ({counts.lost})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Leads List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            title="No Leads Found"
            description="No leads match your current filter or search criteria."
            iconName="user-check"
            actionLabel="Intake New Lead"
            onAction={() => navigation.navigate('AddLead')}
            style={styles.emptyCard}
          />
        ) : (
          filteredLeads.map((item) => {
            const statusConfig = getStatusBadge(item.status);
            return (
              <Card
                key={item.id}
                style={styles.leadCard}
                padding="md"
                onPress={() =>
                  navigation.navigate('LeadDetails', {
                    leadId: item.id,
                    customerName: item.customerName,
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                    <Text style={styles.leadMeta}>
                      {item.phone} · {item.source}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {item.requirementSummary ? (
                  <Text style={styles.requirementText} numberOfLines={2}>
                    {item.requirementSummary}
                  </Text>
                ) : null}

                {/* Footer with Assigned Rep and Estimated Value */}
                <View style={styles.cardFooter}>
                  <View style={styles.repInfoRow}>
                    <Avatar name={item.assignedToName || 'Staff'} size="sm" />
                    <Text style={styles.repNameText}>{item.assignedToName || 'Unassigned'}</Text>
                  </View>

                  <View style={styles.footerRightRow}>
                    {item.estimatedValue ? (
                      <Text style={styles.dealValueText}>
                        ₹{item.estimatedValue.toLocaleString('en-IN')}
                      </Text>
                    ) : null}
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityBadgeText}>{item.priority || 'Medium'}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Lead Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addLeadBtn}
          onPress={() => navigation.navigate('AddLead')}
          activeOpacity={0.88}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addLeadBtnText}>Intake New Lead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingBottom: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.text,
  },
  filterTabsContainer: {
    backgroundColor: theme.colors.card,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTabsScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 6,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  filterTabActive: {
    backgroundColor: theme.colors.black,
  },
  filterTabText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  filterTabTextActive: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 20,
    paddingVertical: 36,
  },
  leadCard: {
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  customerName: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: theme.colors.text,
  },
  leadMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  statusBadgeText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 11,
  },
  requirementText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  repInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repNameText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
  },
  footerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealValueText: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: theme.colors.text,
  },
  priorityBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontFamily: theme.fonts.medium,
    fontSize: 10,
    color: theme.colors.muted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 80,
    left: theme.spacing.md,
    right: theme.spacing.md,
  },
  addLeadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    ...theme.shadows.elevated,
  },
  addLeadBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.white,
  },
});

export default AdminLeadsScreen;
