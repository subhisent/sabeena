import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../theme';
import {
  HomeScreen,
  StaffTasksScreen,
  MyLeadsScreen,
  ClientsScreen,
  StaffProfileScreen,
  LeadDetailsScreen,
  AddLeadScreen,
  LogVisitScreen,
  StaffActivityScreen,
} from '../screens/staff';

export type StaffTabParamList = {
  HomeTab: undefined;
  TasksTab: undefined;
  LeadsTab: undefined;
  ClientsTab: undefined;
  ProfileTab: undefined;
};

export type StaffStackParamList = {
  StaffTabs: undefined;
  LeadDetails: { leadId: string; customerName?: string };
  AddLead: undefined;
  LogVisit: { leadId?: string; customerName?: string; location?: string };
  AllActivity: { leadId: string; customerName?: string };
};

const Tab = createBottomTabNavigator<StaffTabParamList>();
const Stack = createNativeStackNavigator<StaffStackParamList>();

// Custom Capsule Pill Tab Bar matching Figma design
const StaffTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabBarDock}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
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

          let iconName: keyof typeof Feather.glyphMap = 'home';
          let label = 'Home';

          if (route.name === 'HomeTab') {
            iconName = 'home';
            label = 'Home';
          } else if (route.name === 'TasksTab') {
            iconName = 'check-square';
            label = 'Tasks';
          } else if (route.name === 'LeadsTab') {
            iconName = 'user-check';
            label = 'Leads';
          } else if (route.name === 'ClientsTab') {
            iconName = 'users';
            label = 'Clients';
          } else if (route.name === 'ProfileTab') {
            iconName = 'user';
            label = 'Profile';
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

const StaffTabsNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <StaffTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="TasksTab" component={StaffTasksScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="LeadsTab" component={MyLeadsScreen} options={{ title: 'Leads' }} />
      <Tab.Screen name="ClientsTab" component={ClientsScreen} options={{ title: 'Clients' }} />
      <Tab.Screen name="ProfileTab" component={StaffProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

export const StaffNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="StaffTabs" component={StaffTabsNavigator} />
      <Stack.Screen name="LeadDetails" component={LeadDetailsScreen} />
      <Stack.Screen
        name="AddLead"
        component={AddLeadScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="LogVisit"
        component={LogVisitScreen}
        options={{ presentation: 'modal' }}
      />
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
    paddingHorizontal: 12,
    minWidth: 54,
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
    paddingHorizontal: 8,
    minWidth: 50,
  },
  inactiveTabText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
});

export default StaffNavigator;
