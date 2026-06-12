import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { Sparkline } from '@/components/Sparkline';
import { ComingSoon } from '@/components/ComingSoon';
import { SectionLabel } from '@/components/SectionLabel';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getGame, type GameResult } from '@/services/api';

const GAME_LABELS: Record<string, string> = {
  x01: 'X01', cricket: 'Cricket', atc: 'Around the Clock', killer: 'Killer', shanghai: 'Shanghai', halveit: 'Halve-it',
};

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function fullDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function GameDetailScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const win = useWindowDimensions();
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(params.id ?? '0', 10);

  const { data: g, isLoading } = useQuery({
    queryKey: ['game', id],
    queryFn: () => getGame(id),
    enabled: id > 0,
  });

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  // Cumulative 3-dart average after each visit (for the curve).
  const avgCurve = useMemo(() => {
    if (!g || !g.visits || g.visits.length < 2) return [];
    let pts = 0;
    let darts = 0;
    return g.visits.map((v) => {
      pts += v.bust ? 0 : v.total;
      darts += v.darts.length || 3;
      return darts > 0 ? +((pts / darts) * 3).toFixed(1) : 0;
    });
  }, [g]);

  // Per-visit rows with a running "remaining" that resets at each leg checkout.
  const rows = useMemo(() => {
    if (!g || !g.visits) return [];
    const start = g.startScore || 0;
    let rem = start;
    return g.visits.map((v, i) => {
      if (start > 0 && !v.bust) rem -= v.total;
      const legEnd = start > 0 && rem === 0;
      const row = { i, v, rem: start > 0 ? rem : null, legEnd };
      if (legEnd) rem = start;
      return row;
    });
  }, [g]);

  if (isLoading || !g) {
    return (
      <View style={styles.container}>
        <OcheHeader title="Match" left={back} bell={false} />
        <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
      </View>
    );
  }

  const won = g.matchWon;
  const oppLegs = Math.max(0, g.legsPlayed - g.legsWon);
  const opponents = g.opponents.length ? g.opponents.join(', ') : 'Invité';
  const isX01 = g.gameType === 'x01';
  const scoreGame = g.gameType === 'cricket' || g.gameType === 'shanghai' || g.gameType === 'halveit';
  const chartW = Math.max(0, win.width - Spacing.s4 * 2 - Spacing.s4 * 2);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title={GAME_LABELS[g.gameType] ?? g.gameType} left={back} bell={false} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Result header */}
        <View style={[styles.hero, { borderLeftColor: won ? C.win : C.loss }]}>
          <View style={{ flex: 1 }}>
            <OcheText variant="labelSm" allCaps color={won ? C.win : C.loss}>
              {won ? 'Victoire' : 'Défaite'}
            </OcheText>
            <OcheText variant="h3" color={C.cream} numberOfLines={1}>vs {opponents}</OcheText>
            <OcheText variant="bodyXS" color={C.fg3}>{g.online ? '🔴 En ligne · ' : ''}{fullDate(g.finished_at)}</OcheText>
          </View>
          <OcheText variant="displayMd" color={C.cream}>
            {g.legsWon}
            <OcheText variant="h2" color={C.fg3}> — {oppLegs}</OcheText>
          </OcheText>
        </View>

        {/* Key stats */}
        <View style={styles.statRow}>
          {isX01 ? (
            <>
              <Stat C={C} label="Moyenne" value={g.avg ? (Math.round(g.avg * 100) / 100).toString() : '—'} accent />
              <Stat C={C} label="180s" value={String(g.total180s ?? 0)} />
              <Stat C={C} label="Meilleur fin." value={g.highestCheckout ? String(g.highestCheckout) : '—'} />
            </>
          ) : (
            <>
              <Stat C={C} label="Score" value={scoreGame && g.score ? String(g.score) : '—'} accent />
              <Stat C={C} label="Legs" value={`${g.legsWon}/${g.legsPlayed}`} />
              <Stat C={C} label="Fléchettes" value={String(g.dartsThrown ?? 0)} />
            </>
          )}
        </View>

        {/* First-9 + checkout % (X01 with data) */}
        {isX01 && (g.first9Darts ?? 0) > 0 && (
          <View style={styles.statRow}>
            <Stat
              C={C}
              label="First-9"
              value={(() => {
                const f = ((g.first9Points ?? 0) / (g.first9Darts || 1)) * 3;
                return f > 0 ? (Math.round(f * 10) / 10).toString() : '—';
              })()}
            />
            <Stat
              C={C}
              label="Checkout %"
              value={
                (g.checkoutAttempts ?? 0) > 0
                  ? `${Math.round(((g.checkoutHits ?? 0) / (g.checkoutAttempts || 1)) * 100)}%`
                  : '—'
              }
            />
            <Stat C={C} label="Doubles" value={String(g.doublesHit ?? 0)} />
          </View>
        )}

        {/* Average curve */}
        {isX01 && avgCurve.length >= 2 && (
          <View style={styles.card}>
            <SectionLabel icon="target" variant="h5" iconSize={17}>Courbe de moyenne</SectionLabel>
            <Sparkline data={avgCurve} width={chartW} height={70} color={C.amber} area />
            <OcheText variant="bodyXS" color={C.fg3}>
              Moyenne 3 fléchettes cumulée · {avgCurve[avgCurve.length - 1]} en fin de partie
            </OcheText>
          </View>
        )}

        {/* Visit-by-visit replay */}
        {rows.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel icon="layers" variant="h5" iconSize={17}>Volée par volée</SectionLabel>
            {rows.map(({ i, v, rem, legEnd }) => (
              <View key={i} style={[styles.visitRow, legEnd && styles.visitRowLeg]}>
                <OcheText variant="monoSm" color={C.fg3} style={styles.visitNum}>{i + 1}</OcheText>
                <View style={styles.dartChips}>
                  {v.darts.length > 0 ? (
                    v.darts.map((d, k) => (
                      <View key={k} style={styles.dartChip}>
                        <OcheText variant="monoSm" color={C.cream}>{d}</OcheText>
                      </View>
                    ))
                  ) : (
                    <OcheText variant="monoSm" color={C.fg3}>volée saisie au total</OcheText>
                  )}
                </View>
                <View style={styles.visitRight}>
                  <OcheText variant="h4" color={v.bust ? C.loss : C.amber}>
                    {v.bust ? 'BUST' : v.total}
                  </OcheText>
                  {rem != null && (
                    <OcheText variant="monoSm" color={legEnd ? C.win : C.fg3}>
                      {legEnd ? '✓ leg' : `reste ${rem}`}
                    </OcheText>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <ComingSoon
            title="Pas de détail volée par volée"
            subtitle={isX01 ? 'Cette partie a été enregistrée avant le suivi des volées.' : 'Le replay détaillé est dispo pour les parties de X01.'}
          />
        )}
      </ScrollView>
    </View>
  );
}

function Stat({
  C,
  label,
  value,
  accent,
}: {
  C: ReturnType<typeof useTheme>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  const styles = makeStyles(C);
  return (
    <View style={styles.statCard}>
      <OcheText variant="labelSm" allCaps color={C.fg3}>{label}</OcheText>
      <OcheText variant="displaySm" color={accent ? C.amber : C.cream}>{value}</OcheText>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s4, paddingBottom: Spacing.s10, gap: Spacing.s4 },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.s3,
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      borderLeftWidth: 4,
      borderRadius: Radii.lg,
      padding: Spacing.s4,
    },
    statRow: { flexDirection: 'row', gap: Spacing.s2 },
    statCard: {
      flex: 1,
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      borderRadius: Radii.lg,
      padding: Spacing.s3,
      gap: 2,
      alignItems: 'flex-start',
    },
    card: {
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      borderRadius: Radii.lg,
      padding: Spacing.s4,
      gap: Spacing.s3,
    },
    section: { gap: Spacing.s2 },
    visitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.s3,
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      borderRadius: Radii.none,
      paddingHorizontal: Spacing.s3,
      paddingVertical: Spacing.s2,
    },
    visitRowLeg: { borderColor: C.win, backgroundColor: C.walnutUp2 },
    visitNum: { width: 22, textAlign: 'center' },
    dartChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    dartChip: {
      borderWidth: 1,
      borderColor: C.border2,
      backgroundColor: C.walnutUp2,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    visitRight: { alignItems: 'flex-end', gap: 1, minWidth: 64 },
  });
