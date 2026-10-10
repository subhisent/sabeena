import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Check if the application is currently running inside the Expo Go store client.
 * In Expo SDK 53+, remote push notification registration is not supported inside Expo Go on Android.
 */
export const isRunningInExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notificationsModule: typeof import('expo-notifications') | null = null;
let isHandlerConfigured = false;

function getNotifications(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web') return null;
  if (!notificationsModule) {
    try {
      notificationsModule = require('expo-notifications');
      if (notificationsModule && !isHandlerConfigured) {
        notificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        isHandlerConfigured = true;
      }
    } catch (e) {
      console.warn('[Notifications] expo-notifications not available in current environment:', e);
      return null;
    }
  }
  return notificationsModule;
}

const PERMISSION_REQUESTED_KEY = 'SABENA_NOTIF_PERMISSION_ASKED';
const NOTIFICATION_MAP_KEY = 'SABENA_SCHEDULED_NOTIFS';
const NOTIFICATION_CHANNEL_ID = 'sabena-crm-followups';

/**
 * Configure Android notification channel (required for Android 8.0+)
 */
export async function setupNotificationChannelAsync(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const notifs = getNotifications();
      if (!notifs) return;
      await notifs.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Follow-up Reminders',
        importance: notifs.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    } catch (err) {
      console.warn('Could not configure Android notification channel:', err);
    }
  }
}

/**
 * Ask for notification permissions on first launch or when requested.
 * Safe to call both in Expo Go and in development builds.
 */
export async function requestNotificationPermissionOnLaunch(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const notifs = getNotifications();
    if (!notifs) return false;

    await setupNotificationChannelAsync();

    const hasAsked = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
    const settings = await notifs.getPermissionsAsync();

    if (
      settings.granted ||
      settings.ios?.status === notifs.IosAuthorizationStatus.AUTHORIZED
    ) {
      return true;
    }

    if (!hasAsked || settings.canAskAgain) {
      await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
      const { status } = await notifs.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: {},
      });
      return status === 'granted';
    }

    return false;
  } catch (err) {
    console.warn('Error requesting notification permissions:', err);
    return false;
  }
}

/**
 * Registers device for remote push notifications.
 * Automatically bypassed when running inside Expo Go to prevent SDK 53+ runtime errors.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (isRunningInExpoGo) {
    console.info(
      '[Notifications] Running inside Expo Go: Remote push notification tokens require a development build (expo-dev-client). Local reminder notifications are active.'
    );
    return null;
  }

  try {
    const notifs = getNotifications();
    if (!notifs) return null;

    await setupNotificationChannelAsync();

    const { status: existingStatus } = await notifs.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await notifs.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenData = await notifs.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (err) {
    console.warn('Failed to get push token for development build:', err);
    return null;
  }
}

async function getNotificationMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveNotificationMap(map: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_MAP_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save notification map:', e);
  }
}

/**
 * Schedules a local reminder notification 15 minutes before the follow-up datetime.
 * Automatically cancels any previously scheduled notification for this lead.
 */
export async function scheduleFollowUpNotification(
  leadId: string,
  customerName: string,
  followUpDate: Date,
  phone?: string
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const notifs = getNotifications();
    if (!notifs) return null;

    await setupNotificationChannelAsync();

    // 1. Cancel existing notification if already scheduled
    await cancelFollowUpNotification(leadId);

    const now = Date.now();
    const followUpTime = followUpDate.getTime();

    // If follow-up time is already in the past, skip scheduling
    if (followUpTime <= now) {
      return null;
    }

    // Target is 15 minutes (900,000 ms) before follow-up
    const fifteenMinutesBefore = followUpTime - 15 * 60 * 1000;
    const triggerTime = fifteenMinutesBefore > now ? fifteenMinutesBefore : now + 5000;

    const formattedTime = followUpDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const notifId = await notifs.scheduleNotificationAsync({
      content: {
        title: `Follow-up in 15 mins: ${customerName}`,
        body: `Scheduled at ${formattedTime}${phone ? ` · ${phone}` : ''}`,
        data: { leadId, customerName },
        sound: true,
      },
      trigger: {
        type: notifs.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerTime),
        channelId: Platform.OS === 'android' ? NOTIFICATION_CHANNEL_ID : undefined,
      },
    });

    // Save mapping
    const map = await getNotificationMap();
    map[leadId] = notifId;
    await saveNotificationMap(map);

    return notifId;
  } catch (err) {
    console.warn(`Failed to schedule notification for lead ${leadId}:`, err);
    return null;
  }
}

/**
 * Cancels any scheduled notification for the given lead.
 */
export async function cancelFollowUpNotification(leadId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const notifs = getNotifications();
    if (!notifs) return;

    const map = await getNotificationMap();
    const existingNotifId = map[leadId];

    if (existingNotifId) {
      await notifs.cancelScheduledNotificationAsync(existingNotifId);
      delete map[leadId];
      await saveNotificationMap(map);
    }
  } catch (err) {
    console.warn(`Failed to cancel notification for lead ${leadId}:`, err);
  }
}
