// Push notifications (FCM via expo-notifications). The app asks for permission, gets this device's
// native FCM token and registers it with the backend; the backend sends a push for every in-app
// notification. On logout the token is unregistered. iOS is not configured for push yet, so this
// is Android-only for now (and a no-op in Expo Go, which cannot get a native FCM token).
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { api } from './api';

const ANDROID_CHANNEL = 'default'; // must match the backend's android.notification.channelId

let currentToken: string | null = null;

// Show a heads-up banner + sound even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const isExpoGo = Constants.appOwnership === 'expo';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  }).catch(() => {});
}

// Ask permission (if needed) and register this device's FCM token with the backend.
// Safe to call repeatedly; returns true if a token was registered.
export async function registerForPush(): Promise<boolean> {
  try {
    if (Platform.OS === 'web' || isExpoGo) return false; // no native FCM token in Expo Go / web
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return false;

    const devToken = await Notifications.getDevicePushTokenAsync(); // native FCM token on Android
    const token = typeof devToken.data === 'string' ? devToken.data : String(devToken.data);
    if (!token) return false;

    await api.post('/push/register', { token, platform: Platform.OS });
    currentToken = token;
    return true;
  } catch {
    return false; // never block login on push setup
  }
}

// Tell the backend to forget this device's token (called on logout, before the session is cleared).
export async function unregisterForPush(): Promise<void> {
  try {
    if (!currentToken) return;
    await api.post('/push/unregister', { token: currentToken });
  } catch {
    // ignore
  } finally {
    currentToken = null;
  }
}
