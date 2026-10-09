import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure default notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PERMISSION_REQUESTED_KEY = 'SABENA_NOTIF_PERMISSION_ASKED';
const NOTIFICATION_MAP_KEY = 'SABENA_SCHEDULED_NOTIFS';

/**
 * Ask for notification permissions on first launch or when requested.
 */
export async function requestNotificationPermissionOnLaunch(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const hasAsked = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
    const settings = await Notifications.getPermissionsAsync();

    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
      return true;
    }

    if (!hasAsked || settings.canAskAgain) {
      await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
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
 * Helper to get tracked notification IDs map
 */
async function getNotificationMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Helper to save tracked notification IDs map
 */
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
    const triggerTime = fifteenMinutesBefore > now ? fifteenMinutesBefore : now + 5000; // if within 15 min, alert in 5 seconds

    const formattedTime = followUpDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Follow-up in 15 mins: ${customerName}`,
        body: `Scheduled at ${formattedTime}${phone ? ` · ${phone}` : ''}`,
        data: { leadId, customerName },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerTime),
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
    const map = await getNotificationMap();
    const existingNotifId = map[leadId];

    if (existingNotifId) {
      await Notifications.cancelScheduledNotificationAsync(existingNotifId);
      delete map[leadId];
      await saveNotificationMap(map);
    }
  } catch (err) {
    console.warn(`Failed to cancel notification for lead ${leadId}:`, err);
  }
}
