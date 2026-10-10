import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../theme';
import {
  AdminDashboardScreen,
  AdminLeadsScreen,
  AdminCustomersScreen,
  AdminStaffScreen,
  AdminAddLeadScreen,
  AdminReportsScreen,
} from '../screens/admin';
import { LeadDetailsScreen, StaffActivityScreen } from '../screens/staff';

export type AdminTabParamList = {
  DashboardTab: undefined;
  LeadsTab: undefined;
  CustomersTab: undefined;
  StaffTab: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  LeadDetails: { leadId: string; customerName?: string };
  AddLead: undefined;
  NewLead: undefined;
  Reports: undefined;
  AllActivity: { leadId: string; customerName?: string };
};

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

// Custom Floating Capsule Pill Tab Bar for Admin matching the design
const AdminTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabBarDock}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName: keyof typeof Feather.glyphMap = 'grid';
          let label = 'Dashboard';

          if (route.name === 'DashboardTab') {
            iconName = 'grid';
            label = 'Dashboard';
          } else if (route.name === 'LeadsTab') {
            iconName = 'user-check';
            label = 'Leads';
          } else if (route.name === 'CustomersTab') {
            iconName = 'users';
            label = 'Customers';
          } else if (route.name === 'StaffTab') {
            iconName = 'user';
            label = 'Staff';
          }

          if (isFocused) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.85}
                style={styles.activeTabPill}
              >
                <Feather name={iconName} size={18} color={theme.colors.white} />
                <Text style={styles.activeTabText}>{label}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.75}
              style={styles.inactiveTab}
            >
              <Feather name={iconName} size={20} color={theme.colors.muted} />
              <Text style={styles.inactiveTabText}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const AdminTabsNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <AdminTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="DashboardTab" component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="LeadsTab" component={AdminLeadsScreen} options={{ title: 'Leads' }} />
      <Tab.Screen name="CustomersTab" component={AdminCustomersScreen} options={{ title: 'Customers' }} />
      <Tab.Screen name="StaffTab" component={AdminStaffScreen} options={{ title: 'Staff' }} />
    </Tab.Navigator>
  );
};

export const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminTabs" component={AdminTabsNavigator} />
      <Stack.Screen name="LeadDetails" component={LeadDetailsScreen} />
      <Stack.Screen
        name="AddLead"
        component={AdminAddLeadScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="NewLead"
        component={AdminAddLeadScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="Reports" component={AdminReportsScreen} />
      <Stack.Screen name="AllActivity" component={StaffActivityScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  tabBarDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
    ...theme.shadows.elevated,
  },
  activeTabPill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.black,
    borderRadius: theme.radius.md,
    paddingVertical: 6,
    paddingHorizontal: 14,
    minWidth: 64,
  },
  activeTabText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.white,
    marginTop: 2,
  },
  inactiveTab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 54,
  },
  inactiveTabText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
});

export default AdminNavigator;
