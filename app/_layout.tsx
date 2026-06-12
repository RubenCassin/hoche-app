import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { queryClient } from '@/services/queryClient';
import { useAuthStore } from '@/hooks/useAuthStore';
import { registerForPush } from '@/services/pushService';
import { detectAndSyncLocation } from '@/services/locationService';
import { initSounds } from '@/services/soundService';
import { connectLive, disconnectLive } from '@/services/liveSocket';
import { LiveInviteListener } from '@/components/LiveInviteListener';
import {
  BigShouldersDisplay_700Bold,
  BigShouldersDisplay_800ExtraBold,
  BigShouldersDisplay_900Black,
} from '@expo-google-fonts/big-shoulders-display';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useTheme, useThemeStore } from '@/hooks/useTheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Weight-specific families (OcheText resolves these by variant weight).
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_800ExtraBold,
    BigShouldersDisplay_900Black,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    // Aliases for direct `fontFamily` references in styles.
    BigShouldersDisplay: BigShouldersDisplay_900Black,
    Manrope: Manrope_400Regular,
    JetBrainsMono: JetBrainsMono_400Regular,
  });

  const ready = fontsLoaded || !!fontError;

  const status = useAuthStore((s) => s.status);
  const guestMode = useAuthStore((s) => s.guestMode);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const router = useRouter();
  const segments = useSegments();
  const setupRef = useRef(false);

  const C = useTheme();
  const scheme = useThemeStore((s) => s.scheme);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  // Restore any saved session + theme preference once. Sounds preload in the
  // background (best-effort).
  useEffect(() => {
    bootstrap();
    hydrateTheme();
    initSounds();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Once signed in (per session): register for push, and auto-detect location
  // via GPS the first time the account has none. Both are best-effort.
  useEffect(() => {
    if (status !== 'authed') {
      setupRef.current = false;
      disconnectLive();
      return;
    }
    if (setupRef.current || !user) return;
    setupRef.current = true;
    connectLive(useAuthStore.getState().token);
    registerForPush().catch(() => {});
    if (!user.countryCode) {
      detectAndSyncLocation().then((r) => {
        if (r.status === 'ok') refreshUser();
      });
    }
  }, [status, user]);

  // Auth gate: require an account OR explicit guest mode to enter the app.
  useEffect(() => {
    if (!ready || status === 'loading') return;
    const inAuth = segments[0] === 'auth';
    const allowed = status === 'authed' || guestMode;
    if (!allowed && !inAuth) router.replace('/auth');
    else if (allowed && inAuth) router.replace('/tabs');
  }, [ready, status, guestMode, segments]);

  if (!ready || status === 'loading') return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.walnut }}>
          <StatusBar style={scheme === 'light' ? 'dark' : 'light'} backgroundColor={C.walnut} />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: C.walnut },
            }}
          >
            <Stack.Screen name="auth" options={{ animation: 'fade' }} />
            <Stack.Screen name="tabs" options={{ headerShown: false }} />
            <Stack.Screen name="new-game" options={{ presentation: 'modal' }} />
            <Stack.Screen name="new-tournament" options={{ presentation: 'modal' }} />
            <Stack.Screen name="tournament" />
            <Stack.Screen name="practice" />
            <Stack.Screen name="practice-run" />
            <Stack.Screen name="challenge" options={{ presentation: 'modal' }} />
            <Stack.Screen name="challenges" />
            <Stack.Screen name="history" />
            <Stack.Screen name="game" />
            <Stack.Screen name="league" />
            <Stack.Screen name="online-match" />
            <Stack.Screen name="user" />
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
            <Stack.Screen name="blocked" options={{ presentation: 'modal' }} />
            <Stack.Screen name="post" />
            <Stack.Screen name="follows" />
            <Stack.Screen name="notifications" />
          </Stack>
          {status === 'authed' && <LiveInviteListener />}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}