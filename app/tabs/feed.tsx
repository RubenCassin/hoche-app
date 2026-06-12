import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { ComingSoon } from '@/components/ComingSoon';
import { ConnectPrompt } from '@/components/ConnectPrompt';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { getFeed, createPost, likePost, type FeedItem } from '@/services/api';
import { queryClient } from '@/services/queryClient';

const GAME_LABELS: Record<string, string> = {
  x01: 'X01', cricket: 'Cricket', atc: 'Around the Clock', killer: 'Killer', shanghai: 'Shanghai',
};

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

function PostCard({ item }: { item: FeedItem }) {
  const C = useTheme();
  const styles = makeStyles(C);
  const [liked, setLiked] = useState(!!item.liked);
  const [count, setCount] = useState(item.likeCount ?? 0);

  const toggle = async () => {
    if (item.postId == null) return;
    // optimistic
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    Haptics.selectionAsync();
    try {
      const r = await likePost(item.postId);
      setLiked(r.liked);
      setCount(r.likeCount);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={() => router.push(`/user/${item.user_id}`)}>
        <MonogramPortrait name={item.userName} size={40} />
      </Pressable>
      <View style={styles.body}>
        <View style={styles.headRow}>
          <Pressable onPress={() => router.push(`/user/${item.user_id}`)}>
            <OcheText variant="bodySm" color={C.fg1} style={{ fontWeight: '700' }}>
              {item.userName}
            </OcheText>
          </Pressable>
          <OcheText variant="bodyXS" color={C.fg3}>{ago(item.created_at)}</OcheText>
        </View>
        <OcheText variant="bodyMd" color={C.cream}>{item.text}</OcheText>
        <View style={styles.actions}>
          <Pressable onPress={toggle} hitSlop={8}>
            <OcheText variant="bodySm" color={liked ? C.brick : C.fg3}>
              {liked ? '♥' : '♡'} {count}
            </OcheText>
          </Pressable>
          <Pressable onPress={() => item.postId != null && router.push(`/post/${item.postId}`)} hitSlop={8}>
            <OcheText variant="bodySm" color={C.fg3}>💬 {item.commentCount ?? 0}</OcheText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MatchCard({ item }: { item: FeedItem }) {
  const C = useTheme();
  const styles = makeStyles(C);
  const label = GAME_LABELS[item.gameType ?? ''] ?? item.gameType;
  const opp = item.opponents && item.opponents.length ? ` contre ${item.opponents.join(', ')}` : '';
  const result = item.matchWon
    ? `a gagné ${item.legsWon}–${item.oppLegs} au ${label}`
    : `s'est incliné ${item.legsWon}–${item.oppLegs} au ${label}`;

  return (
    <View style={styles.card}>
      <Pressable onPress={() => router.push(`/user/${item.user_id}`)}>
        <MonogramPortrait name={item.userName} size={40} />
      </Pressable>
      <View style={styles.body}>
        <View style={styles.headRow}>
          <OcheText variant="bodySm" color={C.cream} style={{ flex: 1 }}>
            <OcheText variant="bodySm" color={C.fg1} style={{ fontWeight: '700' }}>{item.userName}</OcheText>
            <OcheText variant="bodySm" color={C.fg2}> {result}{opp}.</OcheText>
          </OcheText>
          <OcheText variant="bodyXS" color={C.fg3}>{ago(item.created_at)}</OcheText>
        </View>
        <View style={styles.tags}>
          {item.matchWon && (
            <View style={[styles.tag, styles.tagWin]}><OcheText variant="labelSm" allCaps color={C.onBrick}>Victoire</OcheText></View>
          )}
          {!!item.total180s && item.total180s > 0 && (
            <View style={[styles.tag, styles.tagAmber]}><OcheText variant="labelSm" allCaps color={C.onAmber}>{item.total180s}×180</OcheText></View>
          )}
          {!!item.highestCheckout && item.highestCheckout >= 100 && (
            <View style={[styles.tag, styles.tagBrick]}><OcheText variant="labelSm" allCaps color={C.onBrick}>CO {item.highestCheckout}</OcheText></View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [scope, setScope] = useState<'foryou' | 'friends'>('foryou');
  const guestMode = useAuthStore((s) => s.guestMode);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feed', scope],
    queryFn: () => getFeed(scope),
    refetchInterval: 30_000,
    enabled: !guestMode,
  });

  if (guestMode) {
    return (
      <ConnectPrompt
        title="Feed"
        subtitle="Crée un compte pour suivre tes amis, partager tes parties et réagir."
        icon="📣"
      />
    );
  }

  const publish = async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await createPost(text);
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Feed" />

      {/* Pour toi / Amis */}
      <View style={styles.tabs}>
        {([['foryou', 'Pour toi'], ['friends', 'Amis']] as const).map(([k, label]) => (
          <Pressable key={k} onPress={() => setScope(k)} style={[styles.tab, scope === k && styles.tabActive]}>
            <OcheText variant="labelMd" allCaps color={scope === k ? C.amber : C.fg3} style={styles.tabText}>
              {label}
            </OcheText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.amber} />
        }
      >
        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Quoi de neuf sur l'oche ?"
            placeholderTextColor={C.fg3}
            multiline
            maxLength={280}
          />
          <OcheButton
            label="Publier"
            onPress={publish}
            loading={posting}
            disabled={!draft.trim()}
            variant="primary"
            size="sm"
            style={styles.publish}
          />
        </View>

        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
        ) : !data || data.length === 0 ? (
          <ComingSoon
            title={scope === 'friends' ? 'Rien chez tes amis' : 'Feed vide'}
            subtitle={
              scope === 'friends'
                ? 'Abonne-toi à des joueurs (onglet Online) pour voir leurs posts et leurs matchs ici.'
                : 'Le feed se remplit dès que des joueurs publient ou enchaînent les 180.'
            }
          />
        ) : (
          data.map((item) =>
            item.kind === 'post' ? <PostCard key={item.id} item={item} /> : <MatchCard key={item.id} item={item} />
          )
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  center: { paddingVertical: Spacing.s10, alignItems: 'center' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border1,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.s3,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.amber },
  tabText: { letterSpacing: 1, fontWeight: '700' },
  scroll: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s10,
    gap: Spacing.s2,
  },
  composer: {
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s3,
    gap: Spacing.s2,
    marginBottom: Spacing.s2,
  },
  input: {
    color: C.cream,
    fontFamily: 'Manrope',
    fontSize: 15,
    minHeight: 40,
    maxHeight: 120,
  },
  publish: { alignSelf: 'flex-end' },
  card: {
    flexDirection: 'row',
    gap: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s4,
    alignItems: 'flex-start',
  },
  body: { flex: 1, gap: Spacing.s2 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.s2 },
  actions: { flexDirection: 'row', gap: Spacing.s5, paddingTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: Spacing.s2, paddingVertical: 2, borderRadius: Radii.none },
  tagWin: { backgroundColor: C.win },
  tagAmber: { backgroundColor: C.amber },
  tagBrick: { backgroundColor: C.brick },
});
