import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import {
  getTournament,
  joinTournament,
  startTournament,
  type Tournament,
  type TournamentMatch,
} from '@/services/api';
import { onLive } from '@/services/liveSocket';
import { queryClient } from '@/services/queryClient';

const ROUND_LABEL = (round: number, total: number) => {
  const fromEnd = total - 1 - round;
  if (fromEnd === 0) return 'Finale';
  if (fromEnd === 1) return 'Demi-finales';
  if (fromEnd === 2) return 'Quarts';
  return `Tour ${round + 1}`;
};

export default function TournamentOnlineScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(params.id ?? '0', 10);
  const myId = useAuthStore((s) => s.user?.id);

  const { data: t, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => getTournament(id),
    enabled: id > 0,
    refetchInterval: 10000,
  });

  // Maj live : un tournament_update sur ce tournoi → refetch.
  useEffect(
    () =>
      onLive((m: any) => {
        if (m.type === 'tournament_update' && m.tournamentId === id) {
          queryClient.invalidateQueries({ queryKey: ['tournament', id] });
        }
      }),
    [id]
  );

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  if (isLoading || !t) {
    return (
      <View style={styles.container}>
        <OcheHeader title="Tournoi" left={back} bell={false} />
        <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
      </View>
    );
  }

  const joined = t.players.some((p) => p.userId === myId);
  const isCreator = t.createdById === myId;
  const rounds = t.matches.reduce((mx, m) => Math.max(mx, m.round), 0) + 1;
  const myReadyMatch = t.matches.find(
    (m) => m.status === 'ready' && (m.player1Id === myId || m.player2Id === myId)
  );

  const doJoin = async () => { await joinTournament(id).catch(() => {}); queryClient.invalidateQueries({ queryKey: ['tournament', id] }); };
  const doStart = async () => { await startTournament(id).catch(() => {}); queryClient.invalidateQueries({ queryKey: ['tournament', id] }); };
  const playMatch = (m: TournamentMatch) => router.push(`/online-match?tmatch=${m.id}`);

  const MatchCard = ({ m }: { m: TournamentMatch }) => {
    const mine = m.player1Id === myId || m.player2Id === myId;
    const line = (pid: number | null, name: string | null) => (
      <View style={styles.matchPlayer}>
        <OcheText
          variant="bodyMd"
          color={m.winnerId && m.winnerId === pid ? C.amber : pid ? C.cream : C.fg3}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {name || '—'}{pid && pid === myId ? ' (toi)' : ''}
        </OcheText>
        {m.winnerId === pid && pid && <OcheText variant="labelSm" color={C.amber}>✓</OcheText>}
      </View>
    );
    return (
      <View style={[styles.match, mine && styles.matchMine]}>
        {line(m.player1Id, m.player1Name)}
        <View style={styles.matchDivider} />
        {line(m.player2Id, m.player2Name)}
        {m.status === 'playing' && <OcheText variant="labelSm" allCaps color={C.brick} style={styles.matchTag}>● en cours</OcheText>}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title={t.name} subtitle={`${t.config.startScore} · ${t.players.length} joueurs`} left={back} bell={false} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Champion */}
        {t.status === 'done' && (
          <View style={styles.championCard}>
            <OcheText variant="labelSm" allCaps color={C.amber}>🏆 Champion</OcheText>
            <OcheText variant="displayMd" color={C.cream}>{t.winnerName || '—'}</OcheText>
          </View>
        )}

        {/* Mon match à jouer */}
        {myReadyMatch && (
          <View style={styles.callout}>
            <OcheText variant="h4" color={C.cream}>À toi de jouer !</OcheText>
            <OcheText variant="bodySm" color={C.fg3}>
              {myReadyMatch.player1Id === myId ? myReadyMatch.player2Name : myReadyMatch.player1Name} t'attend.
            </OcheText>
            <OcheButton label="🎯 Jouer mon match" onPress={() => playMatch(myReadyMatch)} variant="primary" size="lg" fullWidth />
          </View>
        )}

        {/* Lobby */}
        {t.status === 'lobby' && (
          <>
            <View style={styles.lobbyCard}>
              <OcheText variant="labelSm" allCaps color={C.fg3} style={{ marginBottom: Spacing.s1 }}>Inscrits</OcheText>
              {t.players.map((p) => (
                <View key={p.userId} style={styles.lobbyRow}>
                  <MonogramPortrait name={p.name || '?'} size={30} />
                  <OcheText variant="bodyMd" color={C.cream} numberOfLines={1} style={{ flex: 1 }}>
                    {p.name}{p.userId === t.createdById ? ' 👑' : ''}{p.userId === myId ? ' · toi' : ''}
                  </OcheText>
                </View>
              ))}
            </View>
            {!joined && <OcheButton label="Rejoindre le tournoi" onPress={doJoin} variant="amber" size="lg" fullWidth />}
            {isCreator && (
              <OcheButton
                label={t.players.length < 2 ? 'En attente de joueurs…' : `Lancer le tournoi (${t.players.length})`}
                onPress={doStart}
                variant="primary"
                size="lg"
                fullWidth
                disabled={t.players.length < 2}
              />
            )}
            {!isCreator && joined && (
              <OcheText variant="bodySm" color={C.fg3} style={styles.hint}>En attente du lancement par l'organisateur…</OcheText>
            )}
          </>
        )}

        {/* Bracket */}
        {t.status !== 'lobby' &&
          Array.from({ length: rounds }).map((_, r) => {
            const ms = t.matches.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot);
            if (ms.length === 0) return null;
            return (
              <View key={r} style={styles.roundSection}>
                <OcheText variant="labelSm" allCaps color={C.amber} style={styles.roundLabel}>{ROUND_LABEL(r, rounds)}</OcheText>
                {ms.map((m) => <MatchCard key={m.id} m={m} />)}
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.s4, gap: Spacing.s3, paddingBottom: Spacing.s10 },
  championCard: { alignItems: 'center', gap: Spacing.s1, borderWidth: 1, borderColor: C.amber, backgroundColor: C.walnutUp2, padding: Spacing.s4 },
  callout: { gap: Spacing.s2, borderWidth: 1, borderColor: C.brick, backgroundColor: C.walnutUp2, padding: Spacing.s4 },
  lobbyCard: { backgroundColor: C.walnutUp, borderWidth: 1, borderColor: C.border1, padding: Spacing.s3, gap: Spacing.s2 },
  lobbyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
  hint: { textAlign: 'center' },
  roundSection: { gap: Spacing.s2 },
  roundLabel: { letterSpacing: 1, marginTop: Spacing.s1 },
  match: { backgroundColor: C.walnutUp, borderWidth: 1, borderColor: C.border1, paddingHorizontal: Spacing.s3, paddingVertical: Spacing.s2 },
  matchMine: { borderColor: C.amber },
  matchPlayer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  matchDivider: { height: 1, backgroundColor: C.border1 },
  matchTag: { marginTop: 2 },
});
