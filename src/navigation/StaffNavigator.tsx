import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { StaffTasksScreen } from '../screens/staff/StaffTasksScreen';
import { StaffHistoryScreen } from '../screens/staff/StaffHistoryScreen';
import { StaffProfileScreen } from '../screens/staff/StaffProfileScreen';

export type StaffTabParamList = {
  MyTasks: undefined;
  History: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<StaffTabParamList>();

export const StaffNavigator: React.FC = () => {
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
        name="MyTasks"
        component={StaffTasksScreen}
        options={{
          title: 'My Tasks',
          tabBarIcon: ({ color, size }) => <Feather name="check-circle" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={StaffHistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={StaffProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default StaffNavigator;
