import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminCustomersScreen } from '../screens/admin/AdminCustomersScreen';
import { AdminStaffScreen } from '../screens/admin/AdminStaffScreen';
import { AdminTasksScreen } from '../screens/admin/AdminTasksScreen';

export type AdminTabParamList = {
  Dashboard: undefined;
  Customers: undefined;
  Staff: undefined;
  Tasks: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export const AdminNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTitleStyle: {
          fontFamily: theme.fonts.bold,
          fontSize: 18,
          color: theme.colors.text,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.medium,
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Customers"
        component={AdminCustomersScreen}
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Staff"
        component={AdminStaffScreen}
        options={{
          title: 'Staff',
          tabBarIcon: ({ color, size }) => <Feather name="user-check" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={AdminTasksScreen}
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => <Feather name="check-square" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminNavigator;
