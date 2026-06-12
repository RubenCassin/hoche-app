import React from 'react';
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
import { useGameStore } from '@/hooks/useGameStore';
import { useAuthStore } from '@/hooks/useAuthStore';
import {
  getChallenges,
  acceptChallenge,
  declineChallenge,
  type Challenge,
  type GameTypeId,
} from '@/services/api';
import { queryClient } from '@/services/queryClient';

const GAME_LABELS: Record<GameTypeId, string> = {
  x01: 'X01', cricket: 'Cricket', atc: 'Around the Clock', killer: 'Killer', shanghai: 'Shanghai', halveit: 'Halve-it',
};

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const meName = useAuthStore((s) => s.user?.name) || 'Joueur 1';

  const initPlayers = useGameStore((s) => s.initPlayers);
  const initCricket = useGameStore((s) => s.initCricket);
  const initAtc = useGameStore((s) => s.initAtc);
  const initKiller = useGameStore((s) => s.initKiller);
  const initShanghai = useGameStore((s) => s.initShanghai);

  const { data, isLoading } = useQuery({ queryKey: ['challenges'], queryFn: getChallenges });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['challenges'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };
  const accept = async (id: number) => { try { await acceptChallenge(id); refresh(); } catch { /* ignore */ } };
  const decline = async (id: number) => { try { await declineChallenge(id); refresh(); } catch { /* ignore */ } };

  const play = (c: Challenge) => {
    const roster = [
      { id: 1, name: meName },
      { id: 2, name: c.opponentName, accountId: c.opponentId },
    ];
    if (c.gameType === 'cricket') initCricket(roster, { legsToWin: c.legsToWin });
    else if (c.gameType === 'atc') initAtc(roster, { legsToWin: c.legsToWin });
    else if (c.gameType === 'killer') initKiller(roster, { legsToWin: c.legsToWin });
    else if (c.gameType === 'shanghai') initShanghai(roster, { legsToWin: c.legsToWin });
    else initPlayers(roster, { variant: '501', startScore: 501, finishMode: 'double', legsToWin: c.legsToWin });
    router.push('/tabs/scoring');
  };

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  const all = data ?? [];
  const incoming = all.filter((c) => c.incoming && c.status === 'pending');
  const ready = all.filter((c) => c.status === 'accepted');
  const sent = all.filter((c) => !c.incoming && c.status === 'pending');
  const history = all.filter((c) => c.status === 'declined');

  const fmt = (c: Challenge) => `${GAME_LABELS[c.gameType]} · premier à ${c.legsToWin}`;

  const Card = ({ c, children }: { c: Challenge; children?: React.ReactNode }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <MonogramPortrait name={c.opponentName} size={40} />
        <View style={{ flex: 1 }}>
          <OcheText variant="h5" color={C.cream} numberOfLines={1}>{c.opponentName}</OcheText>
          <OcheText variant="bodyXS" color={C.fg3}>{fmt(c)}</OcheText>
          {!!c.message && <OcheText variant="bodyXS" color={C.fg2} numberOfLines={2}>« {c.message} »</OcheText>}
        </View>
      </View>
      {children}
    </View>
  );

  const Section = ({ title, items, render }: { title: string; items: Challenge[]; render: (c: Challenge) => React.ReactNode }) =>
    items.length === 0 ? null : (
      <View style={styles.section}>
        <OcheText variant="h5" allCaps color={C.fg2} style={styles.sectionTitle}>{title} · {items.length}</OcheText>
        {items.map((c) => (
          <Card key={c.id} c={c}>{render(c)}</Card>
        ))}
      </View>
    );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Défis" left={back} bell={false} />
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
      ) : all.length === 0 ? (
        <ComingSoon title="Aucun défi" subtitle="Va sur le profil d'un joueur et touche « ⚔️ Défier » pour lancer un duel." />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Section
            title="À toi de répondre"
            items={incoming}
            render={(c) => (
              <View style={styles.actions}>
                <OcheButton label="Accepter" onPress={() => accept(c.id)} variant="primary" size="sm" />
                <OcheButton label="Refuser" onPress={() => decline(c.id)} variant="secondary" size="sm" />
              </View>
            )}
          />
          <Section
            title="Prêts à jouer"
            items={ready}
            render={(c) => (
              <View style={styles.actions}>
                <OcheButton label="🎯 Jouer" onPress={() => play(c)} variant="primary" size="sm" />
              </View>
            )}
          />
          <Section
            title="En attente"
            items={sent}
            render={() => <OcheText variant="bodyXS" color={C.fg3} style={styles.pending}>En attente de sa réponse…</OcheText>}
          />
          <Section
            title="Refusés"
            items={history}
            render={() => <OcheText variant="bodyXS" color={C.fg3} style={styles.pending}>Défi refusé</OcheText>}
          />
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s3, paddingBottom: Spacing.s10, gap: Spacing.s4 },
    section: { gap: Spacing.s2 },
    sectionTitle: { letterSpacing: 1 },
    card: {
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      borderRadius: Radii.lg,
      padding: Spacing.s3,
      gap: Spacing.s2,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
    actions: { flexDirection: 'row', gap: Spacing.s2, marginLeft: 52 },
    pending: { marginLeft: 52 },
  });
