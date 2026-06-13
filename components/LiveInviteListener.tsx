import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheText } from './OcheText';
import { OcheButton } from './OcheButton';
import { Spacing, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { onLive, liveSend } from '@/services/liveSocket';
import { queryClient } from '@/services/queryClient';

interface Invite {
  code: string;
  fromName: string;
  config: { startScore?: number; legsToWin?: number; finishMode?: string };
}

/** Global overlay: pops anywhere in the app when a friend invites you to a live match. */
export function LiveInviteListener() {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [inv, setInv] = useState<Invite | null>(null);

  useEffect(
    () =>
      onLive((m: any) => {
        if (m.type === 'invited') setInv({ code: m.code, fromName: m.fromName, config: m.config || {} });
        // Chat temps réel : rafraîchit les caches concernés à la réception.
        if (m.type === 'chat_message') {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', m.conversationId] });
          queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['chat-unread'] });
        } else if (m.type === 'chat_read' || m.type === 'chat_member_added') {
          queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['chat-unread'] });
        }
      }),
    []
  );

  if (!inv) return null;
  const styles = makeStyles(C);
  const fmt = `${inv.config.startScore ?? 501} · premier à ${inv.config.legsToWin ?? 3} legs`;

  const accept = () => {
    const code = inv.code;
    setInv(null);
    router.push(`/online-match?join=${code}`);
  };
  const decline = () => {
    liveSend({ type: 'decline_invite', code: inv.code });
    setInv(null);
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.s2 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <OcheText variant="labelSm" allCaps color={C.brick}>🔴 Défi en direct</OcheText>
        <OcheText variant="h4" color={C.cream} numberOfLines={1}>{inv.fromName} t'invite</OcheText>
        <OcheText variant="bodyXS" color={C.fg3}>X01 {fmt}</OcheText>
        <View style={styles.actions}>
          <OcheButton label="Accepter" onPress={accept} variant="primary" size="sm" style={{ flex: 1 }} />
          <OcheButton label="Refuser" onPress={decline} variant="secondary" size="sm" style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: Spacing.s4,
      zIndex: 200,
    },
    card: {
      alignSelf: 'stretch',
      backgroundColor: C.walnutUp2,
      borderWidth: 1,
      borderColor: C.brick,
      borderRadius: Radii.lg,
      padding: Spacing.s4,
      gap: Spacing.s2,
      ...Shadows.glowBrick,
    },
    actions: { flexDirection: 'row', gap: Spacing.s2, marginTop: Spacing.s1 },
  });
