import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { Lead, LeadSource, LeadStatus } from '../../types';
import { Card } from '../../components';

type TimePeriod = 'month' | 'quarter' | 'year';

const SOURCE_LIST: LeadSource[] = ['IndiaMART', 'Walk-in', 'WhatsApp', 'Referral', 'Website'];
const STATUS_LIST: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'Won', label: 'Won', color: '#16A34A' },
  { key: 'In Progress', label: 'In Progress', color: '#D97706' },
  { key: 'New Lead', label: 'New Lead', color: '#2563EB' },
  { key: 'Lost', label: 'Lost', color: '#64748B' },
];

export const AdminReportsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<TimePeriod>('month');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'leads'),
      (snap) => {
        const list: Lead[] = snap.docs.map((d) => ({
          ...(d.data() as Omit<Lead, 'id'>),
          id: d.id,
        }));
        setLeads(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error loading report leads:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const currentDateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Filter leads by selected period
  const filteredLeads = useMemo(() => {
    const now = new Date();
    return leads.filter((l) => {
      const rawDate: any = l.createdAt || l.receivedDate;
      const d = typeof rawDate?.toDate === 'function' ? rawDate.toDate() : new Date(rawDate || Date.now());

      if (period === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (period === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const itemQuarter = Math.floor(d.getMonth() / 3);
        return itemQuarter === currentQuarter && d.getFullYear() === now.getFullYear();
      }
      return d.getFullYear() === now.getFullYear();
    });
  }, [leads, period]);

  // Overall statistics
  const stats = useMemo(() => {
    const data = filteredLeads.length > 0 ? filteredLeads : leads;
    const total = data.length;
    const won = data.filter((l) => l.status === 'Won').length;
    const lost = data.filter((l) => l.status === 'Lost').length;
    const inProgress = data.filter((l) => l.status === 'In Progress').length;
    const newLead = data.filter((l) => l.status === 'New Lead').length;

    const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';

    const totalValue = data.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    const avgDealSize = total > 0 ? Math.round(totalValue / total) : 0;

    return {
      total,
      won,
      lost,
      inProgress,
      newLead,
      conversionRate,
      avgDealSize,
    };
  }, [filteredLeads, leads]);

  // Where leads came from (Distribution by channel)
  const sourceBreakdown = useMemo(() => {
    const data = filteredLeads.length > 0 ? filteredLeads : leads;
    const total = Math.max(1, data.length);

    return SOURCE_LIST.map((src) => {
      const count = data.filter((l) => l.source === src).length;
      const percent = Math.round((count / total) * 100);
      return {
        source: src,
        count,
        percent,
      };
    }).sort((a, b) => b.count - a.count);
  }, [filteredLeads, leads]);

  // Lead outcome distribution
  const outcomeBreakdown = useMemo(() => {
    const data = filteredLeads.length > 0 ? filteredLeads : leads;
    const total = Math.max(1, data.length);

    return STATUS_LIST.map((st) => {
      const count = data.filter((l) => l.status === st.key).length;
      const percent = Math.round((count / total) * 100);
      return {
        ...st,
        count,
        percent,
      };
    });
  }, [filteredLeads, leads]);

  // Dynamic AI / Analytics Insight
  const analyticalInsight = useMemo(() => {
    const topSource = sourceBreakdown[0];
    if (!topSource || topSource.count === 0) {
      return 'Start receiving and converting leads across multiple channels to generate detailed analytics.';
    }
    return `${topSource.source} is your leading acquisition channel generating ${topSource.percent}% of total incoming leads with an overall conversion rate of ${stats.conversionRate}%.`;
  }, [sourceBreakdown, stats]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Analytics & Reports</Text>
          <Text style={styles.headerSubtitle}>{currentDateStr}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector Tabs */}
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
            onPress={() => setPeriod('month')}
            activeOpacity={0.85}
          >
            <Text style={[styles.periodTabText, period === 'month' && styles.periodTabTextActive]}>
              This month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'quarter' && styles.periodTabActive]}
            onPress={() => setPeriod('quarter')}
            activeOpacity={0.85}
          >
            <Text style={[styles.periodTabText, period === 'quarter' && styles.periodTabTextActive]}>
              Quarter
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'year' && styles.periodTabActive]}
            onPress={() => setPeriod('year')}
            activeOpacity={0.85}
          >
            <Text style={[styles.periodTabText, period === 'year' && styles.periodTabTextActive]}>
              Year
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* 4 STAT CARDS GRID */}
            <View style={styles.statsGrid}>
              {/* Card 1: Total Leads */}
              <Card style={styles.statCard} padding="md">
                <View style={styles.statIconRow}>
                  <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Feather name="layers" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={styles.trendBadgePositive}>
                    <Feather name="trending-up" size={10} color="#16A34A" />
                    <Text style={styles.trendTextPositive}>+12%</Text>
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total Leads</Text>
              </Card>

              {/* Card 2: Leads Won */}
              <Card style={styles.statCard} padding="md">
                <View style={styles.statIconRow}>
                  <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                    <Feather name="check-circle" size={16} color={theme.colors.success} />
                  </View>
                  <View style={styles.trendBadgePositive}>
                    <Feather name="trending-up" size={10} color="#16A34A" />
                    <Text style={styles.trendTextPositive}>+8%</Text>
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.won}</Text>
                <Text style={styles.statLabel}>Leads Won</Text>
              </Card>

              {/* Card 3: Conversion Rate */}
              <Card style={styles.statCard} padding="md">
                <View style={styles.statIconRow}>
                  <View style={[styles.statIconBox, { backgroundColor: '#F5F3FF' }]}>
                    <Feather name="pie-chart" size={16} color={theme.colors.purple} />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.conversionRate}%</Text>
                <Text style={styles.statLabel}>Conversion Rate</Text>
              </Card>

              {/* Card 4: Avg Deal Size */}
              <Card style={styles.statCard} padding="md">
                <View style={styles.statIconRow}>
                  <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Feather name="dollar-sign" size={16} color={theme.colors.warning} />
                  </View>
                </View>
                <Text style={styles.statValue}>₹{stats.avgDealSize.toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>Avg Deal Size</Text>
              </Card>
            </View>

            {/* WHERE LEADS CAME FROM */}
            <Card style={styles.sectionCard} padding="lg">
              <Text style={styles.sectionTitle}>Where leads came from</Text>
              <View style={styles.progressList}>
                {sourceBreakdown.map((item) => (
                  <View key={item.source} style={styles.progressItem}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>{item.source}</Text>
                      <Text style={styles.progressValues}>
                        <Text style={styles.progressValueBold}>{item.count}</Text> leads ({item.percent}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.max(4, item.percent)}%`,
                            backgroundColor: theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {/* LEAD OUTCOMES */}
            <Card style={styles.sectionCard} padding="lg">
              <Text style={styles.sectionTitle}>Lead Outcome</Text>
              <View style={styles.progressList}>
                {outcomeBreakdown.map((item) => (
                  <View key={item.key} style={styles.progressItem}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>{item.label}</Text>
                      <Text style={styles.progressValues}>
                        <Text style={styles.progressValueBold}>{item.count}</Text> ({item.percent}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.max(4, item.percent)}%`,
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {/* PERFORMANCE INSIGHT */}
            <Card style={styles.insightCard} padding="lg">
              <View style={styles.insightHeader}>
                <View style={styles.insightIconBox}>
                  <Feather name="zap" size={16} color={theme.colors.purple} />
                </View>
                <Text style={styles.insightTitle}>Performance Insight</Text>
              </View>
              <Text style={styles.insightDescription}>{analyticalInsight}</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 14,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 17,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  headerRight: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 50,
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.radius.pill,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.pill,
  },
  periodTabActive: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.card,
  },
  periodTabText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.muted,
  },
  periodTabTextActive: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
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
  statValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
  },
  statLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  sectionCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 14,
  },
  progressList: {
    gap: 12,
  },
  progressItem: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.text,
  },
  progressValues: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  progressValueBold: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
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
  insightCard: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    marginBottom: theme.spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: '#6B21A8',
  },
  insightDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: '#581C87',
    lineHeight: 18,
  },
});

export default AdminReportsScreen;
