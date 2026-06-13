import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { StatRow } from '@/components/StatRow';
import { BadgeGrid } from '@/components/BadgeGrid';
import { Sparkline } from '@/components/Sparkline';
import { Spacing, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  getUserProfile,
  followUser,
  unfollowUser,
  getH2H,
  getEloHistory,
  blockUser,
  unblockUser,
  openDirectConversation,
} from '@/services/api';
import { queryClient } from '@/services/queryClient';

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(params.id ?? '0', 10);
  const C = useTheme();
  const styles = makeStyles(C);

  const { data, isLoading } = useQuery({
    queryKey: ['user-profile', id],
    queryFn: () => getUserProfile(id),
    enabled: id > 0,
  });
  const { data: h2h } = useQuery({
    queryKey: ['h2h', id],
    queryFn: () => getH2H(id),
    enabled: id > 0,
  });
  const { data: eloHistory } = useQuery({
    queryKey: ['elo-history', id],
    queryFn: () => getEloHistory(id),
    enabled: id > 0,
  });

  const [following, setFollowing] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  useEffect(() => {
    if (data) setFollowing(data.relation.following);
  }, [data]);

  const refreshAfterBlock = () => {
    queryClient.invalidateQueries({ queryKey: ['user-profile', id] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['blocked'] });
    queryClient.invalidateQueries({ queryKey: ['follow-counts'] });
  };

  const doBlock = async () => {
    if (!confirmBlock) {
      setConfirmBlock(true);
      return;
    }
    setConfirmBlock(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await blockUser(id).catch(() => {});
    refreshAfterBlock();
  };

  const doUnblock = async () => {
    Haptics.selectionAsync();
    await unblockUser(id).catch(() => {});
    refreshAfterBlock();
  };

  const openChat = async () => {
    Haptics.selectionAsync();
    try {
      const conv = await openDirectConversation(id);
      router.push(`/chat/${conv.id}`);
    } catch { /* bloqué / hors-ligne : silencieux */ }
  };

  const toggleFollow = async () => {
    if (!data) return;
    const next = !following;
    setFollowing(next);
    Haptics.selectionAsync();
    try {
      if (next) await followUser(id);
      else await unfollowUser(id);
      queryClient.invalidateQueries({ queryKey: ['user-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['follow-counts'] });
    } catch {
      setFollowing(!next);
    }
  };

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  if (isLoading || !data) {
    return (
      <View style={styles.container}>
        <OcheHeader title="Profil" left={back} />
        <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
      </View>
    );
  }

  const { user, stats, counts, relation } = data;
  const losses = Math.max(0, stats.legs_played - stats.legs_won);
  const label = relation.mutual ? 'Amis' : following ? 'Suivi' : 'Suivre';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title={user.name.split(' ')[0]} left={back} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.top}>
            <MonogramPortrait name={user.name} avatarUrl={user.avatarUrl} size={64} shape="square" />
            <View style={styles.topInfo}>
              <OcheText variant="h2" color={C.cream} numberOfLines={1}>{user.name}</OcheText>
              <OcheText variant="bodyMd" color={C.fg3}>{user.username}</OcheText>
            </View>
          </View>

          {/* Counts */}
          <View style={styles.counts}>
            <Pressable
              style={styles.countCell}
              onPress={() => router.push(`/follows?id=${id}&tab=followers`)}
            >
              <OcheText variant="h3" color={C.cream}>{counts.followers}</OcheText>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Abonnés</OcheText>
            </Pressable>
            <View style={styles.countDivider} />
            <Pressable
              style={styles.countCell}
              onPress={() => router.push(`/follows?id=${id}&tab=following`)}
            >
              <OcheText variant="h3" color={C.cream}>{counts.following}</OcheText>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Abonnements</OcheText>
            </Pressable>
            <View style={styles.countDivider} />
            <View style={styles.countCell}>
              <OcheText variant="h3" color={C.amber}>{stats.three_dart_avg}</OcheText>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Moyenne</OcheText>
            </View>
          </View>

          {/* Follow + challenge (not for self, not when blocked) */}
          {!relation.isSelf && relation.blocked && (
            <View style={styles.blockedBanner}>
              <OcheText variant="labelMd" allCaps color={C.cream}>🚫 Joueur bloqué</OcheText>
              <OcheButton label="Débloquer" onPress={doUnblock} variant="secondary" size="sm" />
            </View>
          )}
          {!relation.isSelf && !relation.blocked && (
            <>
              <View style={styles.actions}>
                <OcheButton
                  label={`${label}${relation.followsMe && !relation.mutual ? ' · te suit' : ''}`}
                  onPress={toggleFollow}
                  variant={following ? 'secondary' : 'amber'}
                  size="md"
                  style={{ flex: 1 }}
                />
                <OcheButton
                  label="⚔️ Défier"
                  onPress={() => router.push({ pathname: '/challenge', params: { to: String(id), name: user.name } })}
                  variant="secondary"
                  size="md"
                  style={{ flex: 1 }}
                />
              </View>
              <View style={styles.actions}>
                <OcheButton
                  label="💬 Message"
                  onPress={openChat}
                  variant="secondary"
                  size="md"
                  style={{ flex: 1 }}
                />
                <OcheButton
                  label="🔴 Défier en direct"
                  onPress={() => router.push({ pathname: '/online-match', params: { invite: String(id), name: user.name } })}
                  variant="primary"
                  size="md"
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}
        </View>

        {/* W / L / 180 */}
        <View style={styles.trioRow}>
          <View style={styles.trioCell}>
            <OcheText variant="displayMd" color={C.win}>{stats.legs_won}</OcheText>
            <OcheText variant="labelSm" allCaps color={C.fg3}>W</OcheText>
          </View>
          <View style={styles.trioCell}>
            <OcheText variant="displayMd" color={C.loss}>{losses}</OcheText>
            <OcheText variant="labelSm" allCaps color={C.fg3}>L</OcheText>
          </View>
          <View style={styles.trioCell}>
            <OcheText variant="displayMd" color={C.amber}>{stats.total_180s}</OcheText>
            <OcheText variant="labelSm" allCaps color={C.fg3}>180</OcheText>
          </View>
        </View>

        <View style={styles.statCard}>
          <StatRow
            label="Classement Elo"
            value={`${user.elo ?? 1000}${(user.eloGames ?? 0) > 0 ? ` · ${user.eloGames} duels${(user.flags ?? 0) >= 3 ? ' ⚠' : ''}` : ' · provisoire'}`}
            highlight
          />
          <StatRow label="3-dart avg" value={stats.three_dart_avg} highlight />
          <StatRow label="High checkout" value={stats.highest_checkout} highlight />
          <StatRow label="Parties jouées" value={stats.matches_played} />
          <StatRow label="Victoires" value={`${stats.matches_won} (${stats.win_pct}%)`} />
        </View>

        {/* Head-to-head record (your duels vs this player) */}
        {!relation.isSelf && h2h && h2h.played > 0 && (
          <View style={styles.h2hCard}>
            <OcheText variant="labelSm" allCaps color={C.fg3}>Vos duels</OcheText>
            <View style={styles.h2hRow}>
              <OcheText variant="displaySm" color={C.win}>{h2h.won}<OcheText variant="h4" color={C.fg3}> V</OcheText></OcheText>
              <OcheText variant="h3" color={C.fg3}>—</OcheText>
              <OcheText variant="displaySm" color={C.loss}>{h2h.lost}<OcheText variant="h4" color={C.fg3}> D</OcheText></OcheText>
            </View>
            <OcheText variant="bodyXS" color={C.fg3}>{h2h.played} match{h2h.played > 1 ? 's' : ''} enregistré{h2h.played > 1 ? 's' : ''}</OcheText>
          </View>
        )}

        {/* Courbe Elo — un point par duel online classé */}
        {eloHistory && eloHistory.length >= 2 && (
          <View style={styles.statCard}>
            <View style={styles.eloHead}>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Courbe Elo</OcheText>
              <OcheText variant="monoSm" color={C.amber}>{eloHistory[eloHistory.length - 1].elo}</OcheText>
            </View>
            <Sparkline data={eloHistory.map((p) => p.elo)} width={width - Spacing.s4 * 4} height={56} color={C.amber} area />
          </View>
        )}

        {/* Achievements */}
        <BadgeGrid stats={stats} title={relation.isSelf ? 'Badges' : 'Ses badges'} />

        {/* Bloquer — en bas, à double confirmation */}
        {!relation.isSelf && !relation.blocked && (
          <Pressable onPress={doBlock} style={styles.blockLink} hitSlop={8}>
            <OcheText variant="labelSm" allCaps color={confirmBlock ? C.brick : C.fg3}>
              {confirmBlock ? 'Confirmer le blocage ?' : '🚫 Bloquer ce joueur'}
            </OcheText>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s4, paddingBottom: Spacing.s10, gap: Spacing.s3 },
  card: {
    backgroundColor: C.walnutUp2,
    borderWidth: 1,
    borderColor: C.amber,
    borderRadius: Radii.lg,
    padding: Spacing.s5,
    gap: Spacing.s4,
    ...Shadows.glowAmber,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s4 },
  topInfo: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: Spacing.s2 },
  counts: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.border1,
    paddingTop: Spacing.s3,
  },
  countCell: { flex: 1, alignItems: 'center', gap: 2 },
  countDivider: { width: 1, backgroundColor: C.border1, marginVertical: 4 },
  trioRow: { flexDirection: 'row' },
  trioCell: { flex: 1, alignItems: 'center', gap: 2 },
  statCard: {
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s4,
    gap: Spacing.s2,
  },
  h2hCard: {
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderLeftWidth: 3,
    borderLeftColor: C.brick,
    borderRadius: Radii.lg,
    padding: Spacing.s4,
    gap: 2,
    alignItems: 'flex-start',
  },
  h2hRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.brick,
    borderRadius: Radii.none,
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s3,
  },
  eloHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockLink: { alignSelf: 'center', paddingVertical: Spacing.s2, paddingHorizontal: Spacing.s4 },
});

