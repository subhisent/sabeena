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
import { COLLECTIONS } from '../../constants';
import { Customer } from '../../types';
import { Avatar, SearchBar, EmptyState } from '../../components';

export const ClientsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
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

  return (
    <View style={styles.container}>
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
          contentContainerStyle={styles.listContent}
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
              <Avatar name={item.name} size="md" />
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.name}</Text>
                <Text style={styles.clientReq}>
                  {item.city ? `${item.city} · ` : ''}{item.productInterest || 'General Inquiry'}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
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
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});

export default ClientsScreen;
