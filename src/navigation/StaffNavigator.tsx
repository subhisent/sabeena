import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

import {
  HomeScreen,
  MyLeadsScreen,
  FollowUpsScreen,
  ProfileScreen,
  LeadDetailsScreen,
} from '../screens/staff';

export type StaffTabParamList = {
  HomeTab: undefined;
  MyLeadsTab: undefined;
  FollowUpsTab: undefined;
  ProfileTab: undefined;
};

export type StaffHomeStackParamList = {
  HomeScreen: undefined;
  LeadDetails: { leadId: string; customerName?: string };
};

export type StaffMyLeadsStackParamList = {
  MyLeadsScreen: undefined;
  LeadDetails: { leadId: string; customerName?: string };
};

export type StaffFollowUpsStackParamList = {
  FollowUpsScreen: undefined;
  LeadDetails: { leadId: string; customerName?: string };
};

export type StaffProfileStackParamList = {
  ProfileScreen: undefined;
};

const Tab = createBottomTabNavigator<StaffTabParamList>();
const HomeStack = createNativeStackNavigator<StaffHomeStackParamList>();
const MyLeadsStack = createNativeStackNavigator<StaffMyLeadsStackParamList>();
const FollowUpsStack = createNativeStackNavigator<StaffFollowUpsStackParamList>();
const ProfileStack = createNativeStackNavigator<StaffProfileStackParamList>();

const HomeStackNavigator: React.FC = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
    <HomeStack.Screen name="LeadDetails" component={LeadDetailsScreen} />
  </HomeStack.Navigator>
);

const MyLeadsStackNavigator: React.FC = () => (
  <MyLeadsStack.Navigator screenOptions={{ headerShown: false }}>
    <MyLeadsStack.Screen name="MyLeadsScreen" component={MyLeadsScreen} />
    <MyLeadsStack.Screen name="LeadDetails" component={LeadDetailsScreen} />
  </MyLeadsStack.Navigator>
);

const FollowUpsStackNavigator: React.FC = () => (
  <FollowUpsStack.Navigator screenOptions={{ headerShown: false }}>
    <FollowUpsStack.Screen name="FollowUpsScreen" component={FollowUpsScreen} />
    <FollowUpsStack.Screen name="LeadDetails" component={LeadDetailsScreen} />
  </FollowUpsStack.Navigator>
);

const ProfileStackNavigator: React.FC = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
  </ProfileStack.Navigator>
);

const TAB_CONFIGS: Record<keyof StaffTabParamList, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  HomeTab: { label: 'Home', icon: 'home' },
  MyLeadsTab: { label: 'My Leads', icon: 'users' },
  FollowUpsTab: { label: 'Follow-ups', icon: 'calendar' },
  ProfileTab: { label: 'Profile', icon: 'user' },
};

const CustomFloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  const currentTabRoute = state.routes[state.index];
  const focusedChildRouteName = getFocusedRouteNameFromRoute(currentTabRoute);

  // Hide tab bar on LeadDetailsScreen
  if (focusedChildRouteName === 'LeadDetails') {
    return null;
  }

  const bottomMargin = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.tabBarWrapper, { bottom: bottomMargin }]}>
      <View style={styles.tabBarContainer}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIGS[route.name as keyof StaffTabParamList];

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

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={[
                styles.tabItem,
                isFocused ? styles.tabItemActive : styles.tabItemInactive,
              ]}
            >
              <Feather
                name={config.icon}
                size={18}
                color={isFocused ? theme.colors.white : theme.colors.muted}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const StaffNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomFloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="MyLeadsTab"
        component={MyLeadsStackNavigator}
        options={{ title: 'My Leads' }}
      />
      <Tab.Screen
        name="FollowUpsTab"
        component={FollowUpsStackNavigator}
        options={{ title: 'Follow-ups' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 6,
    width: '100%',
    justifyContent: 'space-between',
    ...theme.shadows.elevated,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  tabItemActive: {
    backgroundColor: theme.colors.black,
  },
  tabItemInactive: {
    backgroundColor: 'transparent',
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: theme.colors.white,
    fontFamily: theme.fonts.semiBold,
  },
  tabLabelInactive: {
    color: theme.colors.muted,
  },
});

export default StaffNavigator;
