import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken } from './api';

// ─── Expo push registration ───────────────────────────────────────────────────
// IMPORTANT: expo-notifications' remote-push APIs were removed from Expo Go in
// SDK 53 — merely importing/using them there logs a hard error. So we:
//   1. bail immediately when running inside Expo Go, and
//   2. load expo-notifications via a *dynamic* import, so the module is never
//      even evaluated in Expo Go.
// The whole pipeline activates automatically in a dev/EAS build.

/** Running inside the Expo Go sandbox? (remote push unsupported there) */
function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    (Constants as any).executionEnvironment === 'storeClient'
  );
}

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId ??
    undefined
  );
}

/**
 * Request notification permission, fetch the Expo push token and register it
 * with the backend. Returns true on success, false (silently) otherwise.
 */
export async function registerForPush(): Promise<boolean> {
  if (Platform.OS === 'web') return false; // pas de push web pour l'instant
  if (isExpoGo()) return false; // never load expo-notifications in Expo Go

  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');
    if (!Device.isDevice) return false; // no push tokens on simulators

    // Foreground display behaviour.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'HOCHE',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#C8472F',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return false;

    const projectId = resolveProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    if (!token) return false;

    await registerPushToken(token);
    return true;
  } catch (e) {
    // Best-effort — ready for a dev build, harmless otherwise.
    return false;
  }
}
