import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { PersonRow } from '@/components/PersonRow';
import { ComingSoon } from '@/components/ComingSoon';
import { ConnectPrompt } from '@/components/ConnectPrompt';
import { Spacing, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { flagEmoji } from '@/constants/flag';
import { getLeaderboard, searchPlayers, getChallenges, getLeague, getOnlineFriends, getLiveMatches, type LeaderboardEntry, type LeaderboardScope } from '@/services/api';

type Metric = 'elo' | 'avg' | 's180' | 'wins';

const METRICS: { key: Metric; label: string }[] = [
  { key: 'elo', label: 'Elo' },
  { key: 'avg', label: 'Moyenne' },
  { key: 's180', label: '180s' },
  { key: 'wins', label: 'Victoires' },
];

const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: 'world', label: 'Monde' },
  { key: 'europe', label: 'Europe' },
  { key: 'country', label: 'Pays' },
  { key: 'friends', label: 'Amis' },
];

const valueOf = (e: LeaderboardEntry, m: Metric) =>
  m === 'elo' ? e.elo : m === 'avg' ? e.three_dart_avg : m === 's180' ? e.total_180s : e.matches_won;
const formatValue = (e: LeaderboardEntry, m: Metric) =>
  m === 'avg' ? e.three_dart_avg.toFixed(1) : String(valueOf(e, m));
const subline = (e: LeaderboardEntry, m: Metric) =>
  m === 'elo'
    ? `${e.elo_games} duel${e.elo_games > 1 ? 's' : ''} en ligne${e.flags >= 3 ? ' · ⚠ signalé' : e.elo_games < 5 ? ' · provisoire' : ''}`
    : m === 'wins' ? `${e.win_pct}% · ${e.matches_played} parties` : `${e.matches_played} parties`;

export default function OnlineScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const me = useAuthStore((s) => s.user);
  const guestMode = useAuthStore((s) => s.guestMode);
  const myId = me?.id;
  const [metric, setMetric] = useState<Metric>('elo');
  const [scope, setScope] = useState<LeaderboardScope>('world');
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', scope],
    queryFn: () => getLeaderboard(scope),
    enabled: !guestMode,
  });

  const { data: results } = useQuery({
    queryKey: ['search', query.trim()],
    queryFn: () => searchPlayers(query.trim()),
    enabled: query.trim().length >= 1,
  });

  const { data: league } = useQuery({ queryKey: ['league'], queryFn: getLeague, enabled: !guestMode });
  const { data: challenges } = useQuery({ queryKey: ['challenges'], queryFn: getChallenges, enabled: !guestMode });
  const { data: onlineFriends } = useQuery({ queryKey: ['friends-online'], queryFn: getOnlineFriends, refetchInterval: 15000, enabled: !guestMode });
  const { data: liveMatches } = useQuery({ queryKey: ['live-matches'], queryFn: getLiveMatches, refetchInterval: 15000, enabled: !guestMode });
  const pendingChallenges = (challenges ?? []).filter((c) => c.incoming && c.status === 'pending').length;
  const readyChallenges = (challenges ?? []).filter((c) => c.status === 'accepted').length;

  const ranked = (data ?? [])
    .filter((e) => metric !== 'elo' || e.elo_games > 0)
    .slice()
    .sort((a, b) => valueOf(b, metric) - valueOf(a, metric));
  const searching = query.trim().length >= 1;

  if (guestMode) {
    return (
      <ConnectPrompt
        title="Online"
        subtitle="Crée un compte pour le classement Elo, les défis en direct, les amis et le mode spectateur."
        icon="🌍"
      />
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Online" />

      {/* Player search */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Trouver des joueurs (@pseudo, nom)…"
          placeholderTextColor={C.fg3}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <OcheText variant="labelMd" color={C.fg3}>✕</OcheText>
          </Pressable>
        )}
      </View>

      {searching ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!results ? (
            <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
          ) : results.length === 0 ? (
            <OcheText variant="bodyMd" color={C.fg3} style={styles.empty}>Aucun joueur trouvé.</OcheText>
          ) : (
            results.map((p) => <PersonRow key={p.id} person={p} />)
          )}
        </ScrollView>
      ) : (
        <>
          {/* Live online play */}
          <Pressable onPress={() => router.push('/online-match')} style={({ pressed }) => [styles.liveRow, pressed && { opacity: 0.85 }]}>
            <OcheText variant="h5" color={C.onBrick}>🔴 Jouer en direct</OcheText>
            <View style={styles.challengeRight}>
              <OcheText variant="labelSm" allCaps color={C.onBrick}>X01 · live</OcheText>
              <OcheText variant="labelMd" allCaps color={C.onBrick}>→</OcheText>
            </View>
          </Pressable>

          {/* My league */}
          <Pressable onPress={() => router.push('/league')} style={({ pressed }) => [styles.challengeRow, pressed && { opacity: 0.85 }]}>
            <OcheText variant="h5" color={C.cream}>🏆 Ma ligue{league ? ` · ${league.division.name}` : ''}</OcheText>
            <View style={styles.challengeRight}>
              {league?.you.rank ? (
                <OcheText variant="labelSm" allCaps color={C.amber}>#{league.you.rank}</OcheText>
              ) : null}
              <OcheText variant="labelMd" allCaps color={C.orange}>→</OcheText>
            </View>
          </Pressable>

          {/* My challenges */}
          <Pressable onPress={() => router.push('/challenges')} style={({ pressed }) => [styles.challengeRow, pressed && { opacity: 0.85 }]}>
            <OcheText variant="h5" color={C.cream}>⚔️ Mes défis</OcheText>
            <View style={styles.challengeRight}>
              {readyChallenges > 0 && (
                <OcheText variant="labelSm" allCaps color={C.win}>{readyChallenges} à jouer</OcheText>
              )}
              {pendingChallenges > 0 && (
                <View style={styles.badge}>
                  <OcheText variant="labelSm" allCaps color={C.onBrick}>{pendingChallenges}</OcheText>
                </View>
              )}
              <OcheText variant="labelMd" allCaps color={C.orange}>→</OcheText>
            </View>
          </Pressable>

          {/* Amis en ligne — défi live en un tap */}
          {onlineFriends && onlineFriends.length > 0 && (
            <View style={styles.onlineStrip}>
              <OcheText variant="labelSm" allCaps color={C.win} style={styles.onlineTitle}>● {onlineFriends.length} en ligne</OcheText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onlineRow}>
                {onlineFriends.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => router.push({ pathname: '/online-match', params: { invite: String(f.id), name: f.name } })}
                    style={styles.onlineChip}
                  >
                    <MonogramPortrait name={f.name} size={30} />
                    <OcheText variant="bodyXS" color={C.cream} numberOfLines={1}>{f.name.split(' ')[0]}</OcheText>
                    <OcheText variant="labelSm" allCaps color={C.brick}>Défier</OcheText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* En direct maintenant — spectate */}
          {liveMatches && liveMatches.length > 0 && (
            <View style={styles.liveSection}>
              <OcheText variant="labelSm" allCaps color={C.brick} style={styles.onlineTitle}>🔴 En direct</OcheText>
              {liveMatches.slice(0, 3).map((m) => (
                <Pressable
                  key={m.code}
                  onPress={() => router.push({ pathname: '/online-match', params: { spectate: m.code } })}
                  style={({ pressed }) => [styles.spectateRow, pressed && { opacity: 0.85 }]}
                >
                  <View style={{ flex: 1 }}>
                    <OcheText variant="bodyMd" color={C.cream} numberOfLines={1}>{m.names.join('  vs  ')}</OcheText>
                    <OcheText variant="monoSm" color={C.fg3}>{m.config.startScore} · {m.legs.join('–')}{m.spectators > 0 ? ` · ${m.spectators}👁` : ''}</OcheText>
                  </View>
                  <OcheText variant="labelSm" allCaps color={C.amber}>Regarder →</OcheText>
                </Pressable>
              ))}
            </View>
          )}

          {/* Scope + metric toggles */}
          <View style={styles.toggle}>
            {SCOPES.map((s) => (
              <Pressable key={s.key} onPress={() => setScope(s.key)} style={[styles.seg, scope === s.key && styles.segActive]}>
                <OcheText variant="labelMd" allCaps color={scope === s.key ? C.onAmber : C.fg2} style={styles.segText}>
                  {s.label}
                </OcheText>
              </Pressable>
            ))}
          </View>
          <View style={[styles.toggle, styles.toggleMetric]}>
            {METRICS.map((m) => (
              <Pressable key={m.key} onPress={() => setMetric(m.key)} style={[styles.seg, metric === m.key && styles.segActive]}>
                <OcheText variant="labelMd" allCaps color={metric === m.key ? C.onAmber : C.fg2} style={styles.segText}>
                  {m.label}
                </OcheText>
              </Pressable>
            ))}
          </View>

          {scope === 'country' && !me?.countryCode ? (
            <ComingSoon
              title="Position non définie"
              subtitle="Active ta localisation GPS dans l’onglet Profil pour voir le classement de ton pays."
            />
          ) : isLoading ? (
            <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
          ) : ranked.length === 0 ? (
            <ComingSoon
              title={
                scope === 'friends'
                  ? 'Pas encore d’amis classés'
                  : scope === 'country'
                    ? 'Classement national vide'
                    : scope === 'europe'
                      ? 'Classement européen vide'
                      : 'Classement vide'
              }
              subtitle={
                scope === 'friends'
                  ? 'Suis des joueurs (et qu’ils te suivent) pour les voir ici. Cherche-les en haut.'
                  : 'Joue des parties (3 min.) pour entrer au classement.'
              }
            />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll}>
              {ranked.map((e, i) => {
                const isMe = e.id === myId;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => router.push(`/user/${e.id}`)}
                    style={({ pressed }) => [styles.row, isMe && styles.rowMe, pressed && { opacity: 0.85 }]}
                  >
                    <OcheText variant="displaySm" color={i === 0 ? C.amber : C.fg3} style={styles.rank}>
                      {i + 1}
                    </OcheText>
                    <MonogramPortrait name={e.name} size={36} />
                    <View style={styles.info}>
                      <OcheText variant="h5" color={C.cream} numberOfLines={1}>
                        {e.countryCode ? `${flagEmoji(e.countryCode)} ` : ''}{e.name}{isMe ? ' · toi' : ''}
                      </OcheText>
                      <OcheText variant="bodyXS" color={C.fg3}>{subline(e, metric)}</OcheText>
                    </View>
                    <OcheText variant="h2" color={isMe ? C.amber : C.cream}>
                      {formatValue(e, metric)}
                    </OcheText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  center: { paddingVertical: Spacing.s10, alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: Spacing.s6 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.s3,
  },
  searchInput: {
    flex: 1,
    color: C.cream,
    fontFamily: 'Manrope',
    fontSize: 15,
    paddingVertical: Spacing.s3,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    backgroundColor: C.brick,
    borderWidth: 1,
    borderColor: C.brick,
    borderRadius: Radii.lg,
    ...Shadows.glowBrick,
  },
  challengeRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: Radii.none,
    backgroundColor: C.brick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineStrip: { marginHorizontal: Spacing.s4, marginTop: Spacing.s3, gap: Spacing.s1 },
  onlineTitle: { letterSpacing: 1 },
  onlineRow: { gap: Spacing.s2, paddingVertical: 2 },
  onlineChip: {
    alignItems: 'center',
    gap: 1,
    width: 64,
    paddingVertical: Spacing.s2,
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
  },
  liveSection: { marginHorizontal: Spacing.s4, marginTop: Spacing.s3, gap: Spacing.s1 },
  spectateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderLeftWidth: 3,
    borderLeftColor: C.brick,
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s2,
  },
  toggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.s4,
    marginTop: Spacing.s3,
    borderWidth: 1,
    borderColor: C.border1,
    overflow: 'hidden',
  },
  toggleMetric: { marginTop: Spacing.s2 },
  seg: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: C.walnutUp },
  segActive: { backgroundColor: C.amber },
  segText: { letterSpacing: 1, fontWeight: '700' },
  scroll: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s10,
    gap: Spacing.s2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s3,
  },
  rowMe: { borderColor: C.amber, backgroundColor: C.walnutUp2 },
  rank: { width: 32, textAlign: 'center' },
  info: { flex: 1, gap: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s3,
  },
  followBtn: {
    backgroundColor: C.amber,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s2,
    borderWidth: 1,
    borderColor: C.amber,
  },
  followBtnOn: { backgroundColor: 'transparent', borderColor: C.border1 },
});
