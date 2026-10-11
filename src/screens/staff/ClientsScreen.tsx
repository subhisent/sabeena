import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

import { theme } from '../../theme';
import { db } from '../../services/firebase';
import { COLLECTIONS, SCREEN_HORIZONTAL_PADDING } from '../../constants';
import { Customer } from '../../types';
import { Avatar, SearchBar, EmptyState, Screen } from '../../components';
import { useTabBarHeight } from '../../hooks';

export const ClientsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const tabBarHeight = useTabBarHeight();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    try {
      const custRef = collection(db, COLLECTIONS.CUSTOMERS);
      const q = query(custRef, orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: Customer[] = snap.docs.map((d) => ({
            ...(d.data() as Omit<Customer, 'id'>),
            id: d.id,
          }));
          setCustomers(list);
          setLoading(false);
          setRefreshing(false);
        },
        (err) => {
          console.warn('Customers listener warning in ClientsScreen:', err.message);
          setLoading(false);
          setRefreshing(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('Error loading customers:', e);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.productInterest && c.productInterest.toLowerCase().includes(q))
    );
  });

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone) Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
  };

  const renderHeader = () => (
    <View style={styles.pinnedHeader}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Clients</Text>
          <Text style={styles.headerSubtitle}>{customers.length} registered clients</Text>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search clients, phone, city..."
        />
      </View>
    </View>
  );

  return (
    <Screen hasTabBar scroll={false} header={renderHeader()}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.text} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Clients Found"
          description={search ? 'Try a different search keyword.' : 'Registered clients and accounts will be listed here.'}
          iconName="users"
          style={styles.emptyCard}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              tintColor={theme.colors.text}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.clientCard}>
              <Avatar name={item.company || item.name} size="md" />
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.company || item.name}</Text>
                {item.company ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1, gap: 4 }}>
                    <Feather name="user" size={11} color={theme.colors.muted} />
                    <Text style={{ fontSize: 12, color: theme.colors.muted }} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.clientReq}>
                  {item.city ? `${item.city} · ` : ''}{item.productInterest || 'Packaging Machinery'}
                </Text>
                <Text style={styles.clientPhone}>{item.phone}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleWhatsApp(item.phone)}
                  activeOpacity={0.8}
                >
                  <Feather name="message-circle" size={16} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleCall(item.phone)}
                  activeOpacity={0.8}
                >
                  <Feather name="phone" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  pinnedHeader: {
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitles: {
    marginBottom: 4,
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
  searchWrapper: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginBottom: theme.spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    marginHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginTop: theme.spacing.lg,
  },
  listContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 8,
  },
  clientCard: {
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
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  clientReq: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  clientPhone: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});

export default ClientsScreen;
