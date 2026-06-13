import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getConversations, type Conversation } from '@/services/api';

/** Relative time: « 14:05 », « hier », « lun. », « 12/06 ». */
function shortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays <= 1) return 'hier';
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function preview(c: Conversation): string {
  if (!c.lastMessage) return 'Nouvelle conversation';
  if (c.lastMessage.kind === 'match_invite') return '🎯 Invitation à un match';
  if (c.lastMessage.kind === 'tournament') return '🏆 Tournoi';
  return c.lastMessage.text;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const { data, isLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: getConversations,
    refetchInterval: 20000,
  });

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader
        title="Messages"
        left={back}
        bell={false}
        right={
          <Pressable onPress={() => router.push('/new-group')} hitSlop={10}>
            <OcheText variant="labelMd" allCaps color={C.amber}>+ Groupe</OcheText>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
        ) : !data || data.length === 0 ? (
          <View style={styles.empty}>
            <OcheText variant="bodyMd" color={C.fg3} style={{ textAlign: 'center' }}>
              Aucune conversation. Va sur le profil d'un joueur pour lui écrire, ou crée un groupe avec tes potes.
            </OcheText>
            <OcheButton label="Créer un groupe" onPress={() => router.push('/new-group')} variant="amber" size="md" style={{ marginTop: Spacing.s4 }} />
          </View>
        ) : (
          data.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/chat/${c.id}`)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              {c.isGroup ? (
                <View style={styles.groupAvatar}><OcheText variant="h4" color={C.amber}>#</OcheText></View>
              ) : (
                <MonogramPortrait name={c.name} avatarUrl={c.avatarUrl} size={48} />
              )}
              <View style={styles.info}>
                <View style={styles.topLine}>
                  <OcheText variant="h5" color={C.cream} numberOfLines={1} style={{ flex: 1 }}>
                    {c.isGroup ? `# ${c.name}` : c.name}
                  </OcheText>
                  {c.lastMessage && (
                    <OcheText variant="bodyXS" color={C.fg3}>{shortTime(c.lastMessage.created_at)}</OcheText>
                  )}
                </View>
                <View style={styles.bottomLine}>
                  <OcheText variant="bodySm" color={c.unread > 0 ? C.cream : C.fg3} numberOfLines={1} style={{ flex: 1 }}>
                    {preview(c)}
                  </OcheText>
                  {c.unread > 0 && (
                    <View style={styles.badge}>
                      <OcheText variant="labelSm" color={C.onBrick}>{c.unread}</OcheText>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  scroll: { padding: Spacing.s4, gap: Spacing.s2 },
  center: { paddingTop: Spacing.s8, alignItems: 'center' },
  empty: { paddingTop: Spacing.s8, paddingHorizontal: Spacing.s4, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.none,
    padding: Spacing.s3,
  },
  groupAvatar: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.amber, backgroundColor: C.walnutUp2,
  },
  info: { flex: 1, gap: 3 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
  bottomLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
  badge: {
    minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10,
    backgroundColor: C.brick, alignItems: 'center', justifyContent: 'center',
  },
});
