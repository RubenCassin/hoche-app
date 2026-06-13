import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import {
  getMessages,
  sendMessage,
  markConversationRead,
  getConversations,
  createTournament,
  type ChatMessage,
} from '@/services/api';
import { queryClient } from '@/services/queryClient';

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(params.id ?? '0', 10);
  const myId = useAuthStore((s) => s.user?.id);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Conversation meta (titre, type) — depuis la liste déjà en cache si possible.
  const { data: convs } = useQuery({ queryKey: ['chat-conversations'], queryFn: getConversations });
  const conv = convs?.find((c) => c.id === id);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat-messages', id],
    queryFn: () => getMessages(id),
    enabled: id > 0,
    refetchInterval: 12000, // filet de sécurité si un event WS est manqué
  });

  // Marque lu à l'ouverture et à chaque nouveau message reçu.
  useEffect(() => {
    if (id > 0 && messages) {
      markConversationRead(id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['chat-unread'] });
          queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        })
        .catch(() => {});
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    }
  }, [id, messages?.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(id, t);
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    } catch {
      setText(t); // restaure en cas d'échec
    } finally {
      setSending(false);
    }
  };

  const launchMatch = () => router.push(`/online-match?host=1&conv=${id}`);
  const launchTournament = async () => {
    try {
      const t = await createTournament({
        conversationId: id,
        name: conv?.name ? `Tournoi ${conv.name}` : 'Tournoi',
        startScore: 501,
        legsToWin: 1,
        finishMode: 'double',
      });
      router.push(`/tournament-online/${t.id}`);
    } catch { /* silencieux */ }
  };

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Messages</OcheText>
    </Pressable>
  );

  const title = conv ? (conv.isGroup ? `# ${conv.name}` : conv.name) : 'Conversation';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader
        title={title}
        left={back}
        bell={false}
        right={
          conv && !conv.isGroup && conv.otherId ? (
            <Pressable onPress={() => router.push(`/user/${conv.otherId}`)} hitSlop={10}>
              <OcheText variant="labelMd" color={C.fg2}>Profil</OcheText>
            </Pressable>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
          {isLoading ? (
            <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
          ) : (
            (messages ?? []).map((m: ChatMessage) => {
              const mine = m.senderId === myId;
              if (m.kind === 'match_invite') {
                return (
                  <View key={m.id} style={styles.inviteCard}>
                    <OcheText variant="labelSm" allCaps color={C.brick}>🔴 Match en direct</OcheText>
                    <OcheText variant="bodyMd" color={C.cream}>{m.senderName} lance une partie</OcheText>
                    <OcheButton
                      label="Rejoindre →"
                      onPress={() => router.push(`/online-match?join=${m.meta.code}`)}
                      variant="primary"
                      size="sm"
                      fullWidth
                    />
                    <OcheText variant="monoSm" color={C.fg3}>Code {String(m.meta.code ?? '')}</OcheText>
                  </View>
                );
              }
              if (m.kind === 'tournament') {
                const tid = (m.meta as { tournamentId?: number }).tournamentId;
                return (
                  <Pressable key={m.id} style={styles.tourCard} onPress={() => tid && router.push(`/tournament-online/${tid}`)}>
                    <OcheText variant="labelSm" allCaps color={C.amber}>🏆 Tournoi</OcheText>
                    <OcheText variant="bodyMd" color={C.cream}>{m.text}</OcheText>
                    <OcheText variant="labelSm" allCaps color={C.amber}>Voir le bracket →</OcheText>
                  </Pressable>
                );
              }
              return (
                <View key={m.id} style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {!mine && conv?.isGroup && (
                      <OcheText variant="labelSm" color={C.amber}>{m.senderName}</OcheText>
                    )}
                    <OcheText variant="bodyMd" color={mine ? C.onAmber : C.cream}>{m.text}</OcheText>
                    <OcheText variant="monoSm" color={mine ? C.onAmber : C.fg3} style={styles.time}>{clock(m.created_at)}</OcheText>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Barre d'envoi */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.s2) }]}>
          <Pressable onPress={launchMatch} hitSlop={8} style={styles.matchBtn}>
            <OcheText variant="h4" color={C.brick}>🎯</OcheText>
          </Pressable>
          {conv?.isGroup && (
            <Pressable onPress={launchTournament} hitSlop={8} style={styles.matchBtn}>
              <OcheText variant="h4" color={C.amber}>🏆</OcheText>
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={C.fg3}
            multiline
            onSubmitEditing={send}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable onPress={send} disabled={!text.trim() || sending} hitSlop={8} style={styles.sendBtn}>
            <OcheText variant="labelMd" allCaps color={text.trim() ? C.amber : C.fg3}>Envoi</OcheText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  thread: { padding: Spacing.s3, gap: Spacing.s2, flexGrow: 1, justifyContent: 'flex-end' },
  center: { paddingTop: Spacing.s8, alignItems: 'center' },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: Spacing.s3, paddingVertical: Spacing.s2, gap: 2, borderWidth: 1 },
  bubbleMine: { backgroundColor: C.amber, borderColor: C.amber },
  bubbleTheirs: { backgroundColor: C.walnutUp, borderColor: C.border1 },
  time: { alignSelf: 'flex-end', opacity: 0.7, fontSize: 10 },
  inviteCard: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.s2,
    backgroundColor: C.walnutUp2,
    borderWidth: 1,
    borderColor: C.brick,
    padding: Spacing.s4,
    width: '88%',
  },
  tourCard: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.s1,
    backgroundColor: C.walnutUp2,
    borderWidth: 1,
    borderColor: C.amber,
    padding: Spacing.s4,
    width: '88%',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.s3,
    paddingTop: Spacing.s2,
    borderTopWidth: 1,
    borderTopColor: C.border1,
    backgroundColor: C.walnut,
  },
  matchBtn: { paddingHorizontal: 4, paddingBottom: 6 },
  input: {
    flex: 1,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
    color: C.cream,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 8,
    fontSize: 15,
  },
  sendBtn: { paddingHorizontal: 4, paddingBottom: 8 },
});
