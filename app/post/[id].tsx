import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getPost, getComments, addComment, likePost } from '@/services/api';
import { queryClient } from '@/services/queryClient';

function ago(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} j`;
  return `${Math.floor(d / 7)} sem`;
}

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(params.id ?? '0', 10);
  const C = useTheme();
  const styles = makeStyles(C);

  const post = useQuery({ queryKey: ['post', id], queryFn: () => getPost(id), enabled: id > 0 });
  const comments = useQuery({ queryKey: ['comments', id], queryFn: () => getComments(id), enabled: id > 0 });

  const [liked, setLiked] = useState<boolean | null>(null);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const p = post.data;
  const isLiked = liked ?? p?.liked ?? false;
  const count = likeCount ?? p?.likeCount ?? 0;

  const toggleLike = async () => {
    if (!p) return;
    const next = !isLiked;
    setLiked(next);
    setLikeCount(count + (next ? 1 : -1));
    Haptics.selectionAsync();
    try {
      const r = await likePost(p.id);
      setLiked(r.liked);
      setLikeCount(r.likeCount);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch {
      setLiked(!next);
      setLikeCount(count);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await addComment(id, text);
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <OcheHeader title="Post" left={back} />

        {post.isLoading || !p ? (
          <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* The post */}
            <View style={styles.post}>
              <Pressable style={styles.postHead} onPress={() => router.push(`/user/${p.user_id}`)}>
                <MonogramPortrait name={p.userName} size={44} />
                <View style={{ flex: 1 }}>
                  <OcheText variant="h5" color={C.cream}>{p.userName}</OcheText>
                  <OcheText variant="bodyXS" color={C.fg3}>{p.username} · {ago(p.created_at)}</OcheText>
                </View>
              </Pressable>
              <OcheText variant="bodyLg" color={C.cream} style={styles.postText}>{p.text}</OcheText>
              <Pressable onPress={toggleLike} hitSlop={8} style={styles.likeRow}>
                <OcheText variant="bodyMd" color={isLiked ? C.brick : C.fg3}>
                  {isLiked ? '♥' : '♡'} {count}
                </OcheText>
              </Pressable>
            </View>

            <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.commentsLabel}>
              {p.commentCount} commentaire{p.commentCount > 1 ? 's' : ''}
            </OcheText>

            {(comments.data ?? []).map((c) => (
              <View key={c.id} style={styles.comment}>
                <Pressable onPress={() => router.push(`/user/${c.user_id}`)}>
                  <MonogramPortrait name={c.userName} size={32} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <OcheText variant="bodySm" color={C.cream}>
                    <OcheText variant="bodySm" color={C.fg1} style={{ fontWeight: '700' }}>{c.userName} </OcheText>
                    {c.text}
                  </OcheText>
                  <OcheText variant="bodyXS" color={C.fg3}>{ago(c.created_at)}</OcheText>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Comment composer */}
        <View style={[styles.composer, { paddingBottom: insets.bottom + Spacing.s2 }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ajoute un commentaire…"
            placeholderTextColor={C.fg3}
            multiline
            maxLength={280}
          />
          <OcheButton
            label="Envoyer"
            onPress={send}
            loading={sending}
            disabled={!draft.trim()}
            variant="primary"
            size="sm"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s4, paddingBottom: Spacing.s8, gap: Spacing.s2 },
  post: {
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
  postText: { lineHeight: 24 },
  likeRow: { alignSelf: 'flex-start' },
  commentsLabel: { letterSpacing: 1, marginTop: Spacing.s3, marginBottom: Spacing.s1 },
  comment: {
    flexDirection: 'row',
    gap: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s3,
    alignItems: 'flex-start',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s2,
    borderTopWidth: 1,
    borderTopColor: C.border1,
    backgroundColor: C.walnutUp,
  },
  input: {
    flex: 1,
    color: C.cream,
    fontFamily: 'Manrope',
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: Spacing.s2,
  },
});
