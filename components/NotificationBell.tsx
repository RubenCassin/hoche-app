import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { getNotifications } from '@/services/api';

/** Line-style bell with a red unread dot, opens the notifications screen. */
export function NotificationBell({ color }: { color?: string }) {
  const C = useTheme();
  const stroke = color ?? C.fg1;
  const authed = useAuthStore((s) => s.status === 'authed');
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30_000,
    enabled: authed,
  });
  const unread = data?.unread ?? 0;

  // No account (guest/offline) → no notifications bell.
  if (!authed) return null;

  return (
    <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.wrap}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9z"
          stroke={stroke}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M13.73 21a2 2 0 01-3.46 0"
          stroke={stroke}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {unread > 0 && <View style={[styles.dot, { backgroundColor: C.brick, borderColor: C.walnut }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 2 },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
