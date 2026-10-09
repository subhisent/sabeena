import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme';
import {
  ScreenHeader,
  SectionHeader,
  StatCard,
  Card,
  Chip,
  Avatar,
} from '../../components';

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const sampleLeads = [
    {
      id: 'lead-1',
      customerName: 'Vetri Constructions',
      requirement: 'Industrial Sealing Machine',
      location: 'Anna Nagar, Chennai',
      status: 'In Progress' as const,
      statusColor: theme.colors.warning,
      value: '₹1,80,000',
    },
    {
      id: 'lead-2',
      customerName: 'Arul Paints & Hardware',
      requirement: 'Continuous Band Sealer',
      location: 'Ambattur, Chennai',
      status: 'New Lead' as const,
      statusColor: theme.colors.primary,
      value: '₹95,000',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title={`Good morning,`}
        subtitle={user?.name || 'Staff Member'}
        rightAction={
          <TouchableOpacity style={styles.bellButton}>
            <Feather name="bell" size={20} color={theme.colors.text} />
            <View style={styles.unreadDot} />
          </TouchableOpacity>
        }
      />

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <StatCard
            title="Today's Tasks"
            value="4"
            icon={<Feather name="calendar" size={18} color={theme.colors.primary} />}
            iconBackground={theme.colors.primaryLight}
          />
        </View>
        <View style={styles.statCol}>
          <StatCard
            title="Active Leads"
            value="12"
            icon={<Feather name="users" size={18} color={theme.colors.success} />}
            iconBackground={theme.colors.successLight}
          />
        </View>
      </View>

      <SectionHeader
        title="Today's Priority"
        actionText="View all"
        onActionPress={() => navigation.navigate('FollowUpsTab')}
      />

      <Card
        style={styles.taskCard}
        onPress={() =>
          navigation.navigate('LeadDetails', {
            leadId: 'lead-1',
            customerName: 'Vetri Constructions',
          })
        }
      >
        <View style={styles.taskRow}>
          <View style={styles.taskTimeCol}>
            <Text style={styles.taskTime}>2:00 PM</Text>
            <Chip label="Visit" statusColor={theme.colors.primary} style={styles.miniChip} />
          </View>
          <View style={styles.taskInfoCol}>
            <Text style={styles.taskTitle}>Vetri Constructions</Text>
            <Text style={styles.taskSubtitle}>Site demonstration & quote discussion</Text>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={theme.colors.muted} />
              <Text style={styles.locationText}>Anna Nagar, Chennai</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={theme.colors.muted} />
        </View>
      </Card>

      <SectionHeader
        title="Recent Leads"
        actionText="See all"
        onActionPress={() => navigation.navigate('MyLeadsTab')}
      />

      {sampleLeads.map((lead) => (
        <Card
          key={lead.id}
          style={styles.leadCard}
          onPress={() =>
            navigation.navigate('LeadDetails', {
              leadId: lead.id,
              customerName: lead.customerName,
            })
          }
        >
          <View style={styles.leadRow}>
            <Avatar name={lead.customerName} size="md" />
            <View style={styles.leadInfo}>
              <View style={styles.leadHeaderRow}>
                <Text style={styles.leadName}>{lead.customerName}</Text>
                <Chip label={lead.status} statusColor={lead.statusColor} />
              </View>
              <Text style={styles.leadReq}>{lead.requirement}</Text>
              <Text style={styles.leadValue}>{lead.value}</Text>
            </View>
          </View>
        </Card>
      ))}

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
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  statCol: {
    flex: 1,
    paddingHorizontal: theme.spacing.xs,
  },
  taskCard: {
    marginBottom: theme.spacing.md,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTimeCol: {
    alignItems: 'flex-start',
    marginRight: theme.spacing.md,
  },
  taskTime: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  miniChip: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  taskInfoCol: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  taskSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.muted,
    marginVertical: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: theme.colors.muted,
    marginLeft: 4,
  },
  leadCard: {
    marginBottom: theme.spacing.sm + 2,
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  leadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  leadName: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  leadReq: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.muted,
  },
  leadValue: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
    color: theme.colors.primary,
    marginTop: 2,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default HomeScreen;
