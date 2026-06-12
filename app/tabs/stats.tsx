import React from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { Sparkline } from '@/components/Sparkline';
import { ComingSoon } from '@/components/ComingSoon';
import { ConnectPrompt } from '@/components/ConnectPrompt';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { getStats } from '@/services/api';

const GAME_LABELS: Record<string, string> = {
  x01: 'X01',
  cricket: 'Cricket',
  atc: 'Around the Clock',
  killer: 'Killer',
  shanghai: 'Shanghai',
  halveit: 'Halve-it',
};

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sparkW = width - Spacing.s4 * 2 - Spacing.s4 * 2;
  const C = useTheme();
  const styles = makeStyles(C);
  const user = useAuthStore((s) => s.user);
  const guestMode = useAuthStore((s) => s.guestMode);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => getStats(user!.id),
    enabled: !!user,
  });

  if (guestMode) {
    return (
      <ConnectPrompt
        title="Stats"
        subtitle="Crée un compte pour suivre ta moyenne, tes 180, tes checkouts et ta progression dans le temps."
        icon="📊"
      />
    );
  }

  // Empty state — no games played yet.
  if (!isLoading && stats && stats.matches_played === 0) {
    return (
      <View style={styles.container}>
        <OcheHeader title="Stats" />
        <ComingSoon
          title="Pas encore de stats"
          subtitle="Joue ta première partie : moyenne, 180s, checkouts et zones de jeu apparaîtront ici."
        />
      </View>
    );
  }

  const avgHistory = stats?.avg_history ?? [];
  const heroAvg = stats?.three_dart_avg ?? 0;
  const heroDelta =
    avgHistory.length >= 2 ? +(avgHistory[avgHistory.length - 1] - avgHistory[0]).toFixed(1) : 0;

  // Top segments from the real heatmap.
  const hits = stats?.heatmap ?? {};
  const totalHits = Object.values(hits).reduce((s, n) => s + n, 0);
  const topSegments = Object.entries(hits)
    .map(([seg, n]) => ({ seg, n, pct: totalHits > 0 ? (n / totalHits) * 100 : 0 }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const maxPct = topSegments[0]?.pct ?? 1;

  // Per game-type breakdown (most played first).
  const byType = stats?.by_game_type ?? {};
  const typeRows = Object.keys(byType)
    .map((k) => ({ key: k, played: byType[k].played, won: byType[k].won }))
    .sort((a, b) => b.played - a.played);
  const maxPlayed = typeRows[0]?.played ?? 1;
  const hasCheckout = (stats?.checkout_attempts ?? 0) > 0;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Stats" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero — 3-dart average */}
        <View style={styles.card}>
          <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.eyebrow}>
            3-Dart Average
          </OcheText>
          <View style={styles.heroRow}>
            <OcheText variant="displayLg" color={C.cream}>{heroAvg}</OcheText>
            {heroDelta !== 0 && (
              <View style={styles.heroDelta}>
                <OcheText variant="labelMd" allCaps color={heroDelta >= 0 ? C.win : C.loss}>
                  {heroDelta >= 0 ? '+' : ''}{heroDelta} {heroDelta >= 0 ? '↗' : '↘'}
                </OcheText>
                <OcheText variant="bodyXS" color={C.fg3}>sur tes parties</OcheText>
              </View>
            )}
          </View>
          {avgHistory.length >= 2 ? (
            <Sparkline data={avgHistory} width={sparkW} height={72} color={C.amber} area />
          ) : (
            <OcheText variant="bodySm" color={C.fg3} style={{ marginTop: Spacing.s2 }}>
              Joue quelques parties X01 pour voir ta courbe.
            </OcheText>
          )}
        </View>

        {/* Key numbers */}
        <View style={styles.smallRow}>
          <View style={[styles.card, styles.smallCard]}>
            <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.eyebrow}>Parties</OcheText>
            <OcheText variant="displaySm" color={C.cream}>{stats?.matches_played ?? 0}</OcheText>
            <OcheText variant="monoSm" color={C.fg3}>{stats?.win_pct ?? 0}% gagnées</OcheText>
          </View>
          <View style={[styles.card, styles.smallCard]}>
            <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.eyebrow}>180s</OcheText>
            <OcheText variant="displaySm" color={C.amber}>{stats?.total_180s ?? 0}</OcheText>
            <OcheText variant="monoSm" color={C.fg3}>High CO {stats?.highest_checkout ?? 0}</OcheText>
          </View>
        </View>

        {/* Checkout % + current win streak */}
        <View style={styles.smallRow}>
          <View style={[styles.card, styles.smallCard]}>
            <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.eyebrow}>Checkout %</OcheText>
            <OcheText variant="displaySm" color={hasCheckout ? C.win : C.fg3}>
              {hasCheckout ? `${stats?.checkout_pct}%` : '—'}
            </OcheText>
            <OcheText variant="monoSm" color={C.fg3}>
              {stats?.checkout_hits ?? 0}/{stats?.checkout_attempts ?? 0} fermetures
            </OcheText>
          </View>
          <View style={[styles.card, styles.smallCard]}>
            <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.eyebrow}>Série</OcheText>
            <OcheText variant="displaySm" color={(stats?.current_win_streak ?? 0) > 0 ? C.amber : C.cream}>
              {stats?.current_win_streak ?? 0}
            </OcheText>
            <OcheText variant="monoSm" color={C.fg3}>record {stats?.best_win_streak ?? 0}</OcheText>
          </View>
        </View>

        {/* Score bands (X01 visit totals) */}
        {((stats?.highest_score ?? 0) > 0 || (stats?.total_180s ?? 0) > 0) && (
          <View style={styles.card}>
            <OcheText variant="h5" allCaps color={C.fg2} style={{ marginBottom: Spacing.s1 }}>
              Tranches de score
            </OcheText>
            <View style={styles.bandsRow}>
              {[
                { label: '180', value: stats?.total_180s ?? 0, accent: C.amber },
                { label: '140+', value: stats?.scores_140 ?? 0, accent: C.cream },
                { label: '100+', value: stats?.scores_100 ?? 0, accent: C.cream },
                { label: '60+', value: stats?.scores_60 ?? 0, accent: C.cream },
              ].map((b) => (
                <View key={b.label} style={styles.bandCell}>
                  <OcheText variant="displaySm" color={b.accent}>{b.value}</OcheText>
                  <OcheText variant="labelSm" allCaps color={C.fg3}>{b.label}</OcheText>
                </View>
              ))}
            </View>
            <OcheText variant="bodyXS" color={C.fg3}>
              Meilleure volée : {stats?.highest_score ?? 0} · fléchettes/leg : {stats?.darts_per_leg || '—'}
            </OcheText>
          </View>
        )}

        {/* Per game-type breakdown */}
        {typeRows.length > 0 && (
          <View style={styles.card}>
            <OcheText variant="h5" allCaps color={C.fg2} style={{ marginBottom: Spacing.s1 }}>
              Par jeu
            </OcheText>
            {typeRows.map((t) => (
              <View key={t.key} style={styles.segRow}>
                <OcheText variant="labelMd" allCaps color={C.cream} style={styles.typeLabel} numberOfLines={1}>
                  {GAME_LABELS[t.key] ?? t.key}
                </OcheText>
                <View style={styles.segTrack}>
                  <View style={[styles.segFill, { width: `${(t.played / maxPlayed) * 100}%`, backgroundColor: C.brick }]} />
                </View>
                <OcheText variant="monoSm" color={C.fg3} style={styles.typeVal}>
                  {t.won}V · {t.played}
                </OcheText>
              </View>
            ))}
          </View>
        )}

        {/* Records list */}
        <View style={styles.card}>
          {[
            { label: 'Meilleure moyenne', value: String(stats?.best_game_avg ?? 0) },
            { label: 'Moyenne 9 prem.', value: String(stats?.first9_avg ?? 0) },
            { label: 'Meilleure volée', value: String(stats?.highest_score ?? 0) },
            { label: 'Meilleur leg', value: (stats?.best_leg ?? 0) > 0 ? `${stats?.best_leg} flé.` : '—' },
            { label: 'Fléchettes / leg', value: (stats?.darts_per_leg ?? 0) > 0 ? String(stats?.darts_per_leg) : '—' },
            { label: 'High checkout', value: String(stats?.highest_checkout ?? 0) },
            { label: 'Meilleure série', value: `${stats?.best_win_streak ?? 0} V` },
            { label: 'Doubles touchés', value: String(stats?.doubles_hit ?? 0) },
            { label: 'Plus de 180s (1 partie)', value: String(stats?.most_180s_game ?? 0) },
            { label: 'Legs gagnés', value: `${stats?.legs_won ?? 0} / ${stats?.legs_played ?? 0}` },
            { label: 'Total 180s', value: String(stats?.total_180s ?? 0) },
          ].map((r, i, arr) => (
            <View key={r.label} style={[styles.recordRow, i === arr.length - 1 && styles.recordLast]}>
              <OcheText variant="labelMd" allCaps color={C.fg2} style={styles.recordLabel}>
                {r.label}
              </OcheText>
              <OcheText variant="h3" color={C.cream}>{r.value}</OcheText>
            </View>
          ))}
        </View>

        {/* Top segments (from heatmap) */}
        {topSegments.length > 0 && (
          <View style={styles.card}>
            <OcheText variant="h5" allCaps color={C.fg2} style={{ marginBottom: Spacing.s1 }}>
              Top segments
            </OcheText>
            {topSegments.map((s, i) => (
              <View key={s.seg} style={styles.segRow}>
                <OcheText variant="monoSm" color={C.fg3} style={styles.segRank}>#{i + 1}</OcheText>
                <OcheText variant="h3" color={i === 0 ? C.amber : C.cream} style={styles.segNum}>
                  {s.seg === '25' ? 'B' : s.seg}
                </OcheText>
                <View style={styles.segTrack}>
                  <View
                    style={[
                      styles.segFill,
                      { width: `${(s.pct / maxPct) * 100}%`, backgroundColor: i === 0 ? C.amber : C.brick },
                    ]}
                  />
                </View>
                <View style={styles.segVals}>
                  <OcheText variant="monoSm" color={C.cream}>{s.pct.toFixed(0)}%</OcheText>
                  <OcheText variant="monoSm" color={C.fg3}>{s.n}</OcheText>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  scroll: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s10,
    gap: Spacing.s3,
  },
  card: {
    backgroundColor: C.walnutUp,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: C.border1,
    padding: Spacing.s4,
    gap: Spacing.s2,
    overflow: 'hidden',
  },
  eyebrow: { letterSpacing: 1.5 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroDelta: { alignItems: 'flex-end', gap: 1, marginBottom: 6 },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  smallRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  smallCard: { flex: 1 },
  bandsRow: { flexDirection: 'row', gap: Spacing.s2 },
  bandCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.s2,
    borderWidth: 1,
    borderColor: C.border2,
    backgroundColor: C.walnutUp2,
  },
  smallHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: C.border2,
    gap: Spacing.s2,
  },
  recordLast: { borderBottomWidth: 0 },
  recordLabel: { flex: 1, letterSpacing: 0.5 },
  recordNote: { marginRight: Spacing.s2 },
  recordValue: {},
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.s1,
  },
  segRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    paddingVertical: 5,
  },
  segRank: { width: 24 },
  segNum: { width: 34 },
  typeLabel: { width: 92 },
  typeVal: { width: 64, textAlign: 'right' },
  segTrack: {
    flex: 1,
    height: 8,
    backgroundColor: C.bg1,
    borderRadius: Radii.none,
    overflow: 'hidden',
  },
  segFill: { height: '100%' },
  segVals: {
    width: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insight: {
    flexDirection: 'row',
    marginTop: Spacing.s3,
    paddingTop: Spacing.s3,
    borderTopWidth: 1,
    borderTopColor: C.border2,
  },
  insightBar: {
    width: 2,
    backgroundColor: C.amber,
    marginRight: Spacing.s3,
    opacity: 0.7,
  },
  insightText: { flex: 1, lineHeight: 19 },
});
