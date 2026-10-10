import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { Activity } from '../../types';

export type ActivityCategory = 'All' | 'Calls' | 'Messages' | 'Visits' | 'Status';

export const StaffActivityScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: { leadId: string; customerName: string } }, 'params'>>();

  const leadId = route.params?.leadId || '';
  const customerName = route.params?.customerName || 'Customer';

  const [category, setCategory] = useState<ActivityCategory>('All');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    try {
      const interactionsRef = collection(db, 'leads', leadId, 'interactions');
      const q = query(interactionsRef, orderBy('createdAt', 'desc'));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: Activity[] = snap.docs.map((d) => {
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
          setActivities(list);
          setLoading(false);
        },
        (err) => {
          console.warn('Interactions listener error in StaffActivityScreen:', err.message);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn('Error fetching activity:', e);
      setLoading(false);
    }
  }, [leadId]);

  const filtered = useMemo(() => {
    if (category === 'All') return activities;
    return activities.filter((act) => {
      const type = (act.type || '').toLowerCase();
      if (category === 'Calls') return type.includes('call');
      if (category === 'Messages') return type.includes('message') || type.includes('whatsapp');
      if (category === 'Visits') return type.includes('visit');
      if (category === 'Status') return type.includes('status');
      return true;
    });
  }, [activities, category]);

  const getActivityIcon = (type: string, title: string) => {
    const t = (type || '').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    if (titleLower.includes('follow-up')) return 'calendar';
    if (t.includes('status') || titleLower.includes('status')) return 'arrow-right';
    if (t.includes('visit') || titleLower.includes('visit')) return 'map-pin';
    if (t.includes('whatsapp') || titleLower.includes('message')) return 'message-circle';
    if (t.includes('call') || titleLower.includes('call')) return 'phone';
    if (titleLower.includes('create')) return 'plus-circle';
    return 'file-text';
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>All activity</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="more-vertical" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.customerHeader}>{customerName}</Text>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['All', 'Calls', 'Messages', 'Visits', 'Status'] as const).map((cat) => {
            const isSel = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterPill, isSel && styles.filterPillSelected]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isSel && styles.filterPillTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timeline list */}
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.text} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="clock" size={32} color={theme.colors.muted} />
            <Text style={styles.emptyTitle}>No activity logged</Text>
            <Text style={styles.emptySub}>Calls, visits and status changes will be recorded here.</Text>
          </View>
        ) : (
          <View style={styles.timelineList}>
            {filtered.map((item, index) => {
              const iconName = getActivityIcon(item.type, item.title) as any;
              const isLast = index === filtered.length - 1;

              return (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.iconCol}>
                    <View style={styles.iconCircle}>
                      <Feather name={iconName} size={16} color={theme.colors.muted} />
                    </View>
                    {!isLast && <View style={styles.verticalLine} />}
                  </View>

                  <View style={styles.contentCol}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
                    <Text style={styles.itemMeta}>
                      {item.createdAt?.toDate ? formatActivityDate(item.createdAt.toDate()) : 'Recently'} · {item.authorName}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backButtonText}>Back to lead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

function formatActivityDate(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

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
  customerHeader: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 70,
  },
  iconCol: {
    alignItems: 'center',
    width: 36,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  contentCol: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 20,
  },
  itemTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  itemNote: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 3,
  },
  itemMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 4,
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
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  backButton: {
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.white,
  },
});

export default StaffActivityScreen;
