import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { ComingSoon } from '@/components/ComingSoon';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  getNotifications,
  markNotificationsRead,
  confirmMatch,
  rejectMatch,
  acceptChallenge,
  declineChallenge,
  type AppNotification,
} from '@/services/api';
import { BADGES } from '@/constants/badges';
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

function text(n: AppNotification): string {
  switch (n.type) {
    case 'follow': return "s'est abonné à toi";
    case 'like': return 'a aimé ton post';
    case 'comment': return 'a commenté ton post';
    case 'match': {
      const m = n.match;
      if (!m) return 'a enregistré un match contre toi';
      const label = GAME_LABELS[m.gameType] ?? m.gameType;
      return `dit avoir joué un ${label} ${m.actorLegs}–${m.oppLegs} contre toi`;
    }
    case 'challenge': {
      const c = n.challenge;
      const label = c ? GAME_LABELS[c.gameType] ?? c.gameType : '';
      if (c && c.pending) return `te lance un défi : ${label} (premier à ${c.legsToWin})`;
      return c && c.status === 'accepted' ? 'défi accepté' : 'défi refusé';
    }
    case 'challenge_result':
      return n.challenge?.status === 'accepted' ? 'a accepté ton défi !' : 'a refusé ton défi';
    default:
      return '';
  }
}

function Row({ n }: { n: AppNotification }) {
  const C = useTheme();
  const styles = makeStyles(C);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['challenges'] });
  };
  const act = (fn: () => Promise<unknown>) => async () => {
    if (busy) return;
    setBusy(true);
    try { await fn(); refresh(); } catch { setBusy(false); }
  };
  const confirm = act(() => confirmMatch(n.gameId!));
  const reject = act(() => rejectMatch(n.gameId!));
  const accept = act(() => acceptChallenge(n.challengeId!));
  const decline = act(() => declineChallenge(n.challengeId!));

  // ── Badge unlock — a self-notification, rendered as a trophy card.
  if (n.type === 'badge') {
    const b = BADGES.find((x) => x.id === n.badge);
    return (
      <View style={[styles.row, !n.read && styles.rowUnread]}>
        <View style={styles.top}>
          <View style={styles.badgeIcon}><OcheText variant="h2">{b?.icon ?? '🏆'}</OcheText></View>
          <View style={{ flex: 1 }}>
            <OcheText variant="bodySm" color={C.cream}>
              <OcheText variant="bodySm" color={C.fg1} style={{ fontWeight: '700' }}>Badge débloqué </OcheText>
              <OcheText variant="bodySm" color={C.amber}>{b?.name ?? ''}</OcheText>
            </OcheText>
            <OcheText variant="bodyXS" color={C.fg3}>{ago(n.created_at)}</OcheText>
          </View>
          {!n.read && <View style={styles.dot} />}
        </View>
      </View>
    );
  }

  const matchPending = n.type === 'match' && n.match?.pending;
  const challengePending = n.type === 'challenge' && n.challenge?.pending;
  const actionable = matchPending || challengePending || n.type === 'match' || n.type === 'challenge';

  const go = () => {
    if (actionable) return; // actions handled by buttons / no nav
    if (n.type === 'follow' || n.type === 'challenge_result') router.push(`/user/${n.actorId}`);
    else if (n.postId != null) router.push(`/post/${n.postId}`);
  };

  return (
    <Pressable
      onPress={go}
      disabled={actionable}
      style={({ pressed }) => [styles.row, !n.read && styles.rowUnread, pressed && !actionable && { opacity: 0.85 }]}
    >
      <View style={styles.top}>
        <MonogramPortrait name={n.actorName} size={40} />
        <View style={{ flex: 1 }}>
          <OcheText variant="bodySm" color={C.cream}>
            <OcheText variant="bodySm" color={C.fg1} style={{ fontWeight: '700' }}>{n.actorName} </OcheText>
            <OcheText variant="bodySm" color={C.fg2}>{text(n)}</OcheText>
          </OcheText>
          {!!n.postSnippet && (
            <OcheText variant="bodyXS" color={C.fg3} numberOfLines={1}>« {n.postSnippet} »</OcheText>
          )}
          <OcheText variant="bodyXS" color={C.fg3}>{ago(n.created_at)}</OcheText>
        </View>
        {!n.read && <View style={styles.dot} />}
      </View>

      {matchPending && (
        <View style={styles.actions}>
          <OcheButton label="Confirmer" onPress={confirm} loading={busy} variant="primary" size="sm" />
          <OcheButton label="Refuser" onPress={reject} disabled={busy} variant="secondary" size="sm" />
        </View>
      )}
      {n.type === 'match' && !matchPending && (
        <OcheText variant="bodyXS" color={C.win} style={styles.confirmed}>✓ Match confirmé</OcheText>
      )}
      {challengePending && (
        <View style={styles.actions}>
          <OcheButton label="Accepter" onPress={accept} loading={busy} variant="primary" size="sm" />
          <OcheButton label="Refuser" onPress={decline} disabled={busy} variant="secondary" size="sm" />
        </View>
      )}
      {n.type === 'challenge' && !challengePending && (
        <OcheText variant="bodyXS" color={n.challenge?.status === 'accepted' ? C.win : C.fg3} style={styles.confirmed}>
          {n.challenge?.status === 'accepted' ? '✓ Défi accepté' : '✕ Défi refusé'}
        </OcheText>
      )}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });

  // Mark everything read on open (and refresh the badge).
  useEffect(() => {
    (async () => {
      try {
        await markNotificationsRead();
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch {
        // ignore
      }
    })();
  }, []);

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Notifications" left={back} bell={false} />
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
      ) : !data || data.items.length === 0 ? (
        <ComingSoon title="Rien de neuf" subtitle="Abonnés, likes, défis et badges débloqués apparaîtront ici." />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {data.items.map((n) => <Row key={n.id} n={n} />)}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s3, paddingBottom: Spacing.s10, gap: Spacing.s2 },
  row: {
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s3,
    gap: Spacing.s2,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
  rowUnread: { backgroundColor: C.walnutUp2, borderColor: C.border1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brick },
  actions: { flexDirection: 'row', gap: Spacing.s2, marginLeft: 52 },
  confirmed: { marginLeft: 52 },
  badgeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.amber,
    backgroundColor: C.walnutUp2,
  },
});
