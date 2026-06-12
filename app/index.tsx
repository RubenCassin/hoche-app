import React from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useTheme } from '@/hooks/useTheme';


/** Entry route — sends you to the app or the auth screen based on session. */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const C = useTheme();
  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: C.walnut }} />;
  return <Redirect href={status === 'authed' ? '/tabs' : '/auth'} />;
}
