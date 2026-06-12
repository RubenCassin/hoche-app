import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { ComingSoon } from '@/components/ComingSoon';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getHistory, type GameResult } from '@/services/api';

const GAME_LABELS: Record<string, string> = {
  x01: 'X01',
  cricket: 'Cricket',
  atc: 'Around the Clock',
  killer: 'Killer',
  shanghai: 'Shanghai',
  halveit: 'Halve-it',
};

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function MatchRow({ g }: { g: GameResult }) {
  const C = useTheme();
  const styles = makeStyles(C);
  const won = g.matchWon;
  const oppLegs = Math.max(0, g.legsPlayed - g.legsWon);
  const opponents = g.opponents.length ? g.opponents.join(', ') : 'Invité';
  const extra =
    (g.gameType === 'cricket' || g.gameType === 'shanghai') && g.score > 0
      ? ` · ${g.score} pts`
      : g.gameType === 'x01' && g.avg > 0
        ? ` · ${Math.round(g.avg * 100) / 100} avg`
        : '';

  return (
    <Pressable
      onPress={() => router.push(`/game/${g.id}`)}
      style={({ pressed }) => [styles.row, won ? styles.rowWon : styles.rowLost, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.rowLeft}>
        <OcheText variant="h4" color={C.cream} numberOfLines={1}>
          {GAME_LABELS[g.gameType] ?? g.gameType}
        </OcheText>
        <OcheText variant="bodySm" color={C.fg3} numberOfLines={1}>
          {g.online ? '🔴 ' : ''}vs {opponents} · {relativeDate(g.finished_at)}{extra}
        </OcheText>
      </View>

      <View style={styles.rowRight}>
        <OcheText variant="h3" color={C.cream}>
          {g.legsWon}
          <OcheText variant="h4" color={C.fg3}> — {oppLegs}</OcheText>
        </OcheText>
        <View style={[styles.badge, won ? styles.badgeWon : styles.badgeLost]}>
          <OcheText variant="labelSm" allCaps color={C.cream} style={styles.badgeText}>
            {won ? 'Victoire' : 'Défaite'}
          </OcheText>
        </View>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const { data, isLoading } = useQuery({ queryKey: ['history'], queryFn: getHistory });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader
        title="Historique"
        left={
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
          </Pressable>
        }
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.amber} />
        </View>
      ) : !data || data.length === 0 ? (
        <ComingSoon
          title="Aucune partie"
          subtitle="Tes matchs terminés apparaîtront ici, du plus récent au plus ancien."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {data.map((g) => (
            <MatchRow key={g.id} g={g} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s10,
    gap: Spacing.s2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderLeftWidth: 3,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  rowWon: { borderLeftColor: C.win },
  rowLost: { borderLeftColor: C.loss },
  rowLeft: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  badge: {
    paddingHorizontal: Spacing.s2,
    paddingVertical: 2,
    borderRadius: Radii.none,
  },
  badgeWon: { backgroundColor: C.win },
  badgeLost: { backgroundColor: C.loss },
  badgeText: { letterSpacing: 1 },
});
