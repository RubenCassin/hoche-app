import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { ComingSoon } from '@/components/ComingSoon';
import { Spacing, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { flagEmoji } from '@/constants/flag';
import { getLeague } from '@/services/api';

const DIVISION_ICON: Record<string, string> = {
  bronze: '🥉', argent: '🥈', or: '🥇', elite: '👑',
};

export default function LeagueScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const myId = useAuthStore((s) => s.user?.id);

  const { data, isLoading } = useQuery({ queryKey: ['league'], queryFn: getLeague });

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  const divColor = (key?: string) =>
    key === 'elite' ? C.brick : key === 'or' ? C.amber : key === 'argent' ? C.fg2 : C.warn;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Ligue" left={back} bell={false} />

      {isLoading || !data ? (
        <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Division banner */}
          <View style={[styles.banner, { borderColor: divColor(data.division.key) }, Shadows.glowAmber]}>
            <View style={styles.bannerTop}>
              <OcheText variant="h1">{DIVISION_ICON[data.division.key] ?? '🎯'}</OcheText>
              <View style={{ flex: 1 }}>
                <OcheText variant="labelSm" allCaps color={C.fg3}>
                  Division {data.division.index + 1}/{data.division.total}
                </OcheText>
                <OcheText variant="displaySm" allCaps color={divColor(data.division.key)}>
                  {data.division.name}
                </OcheText>
              </View>
              <View style={styles.seasonChip}>
                <OcheText variant="labelSm" allCaps color={C.cream}>{data.seasonLabel}</OcheText>
                <OcheText variant="monoSm" color={C.amber}>{data.daysLeft} j restants</OcheText>
              </View>
            </View>

            {/* Your standing */}
            <View style={styles.youRow}>
              <View style={styles.youCell}>
                <OcheText variant="labelSm" allCaps color={C.fg3}>Ton rang</OcheText>
                <OcheText variant="h2" color={C.cream}>{data.you.rank ? `#${data.you.rank}` : '—'}</OcheText>
              </View>
              <View style={styles.youDivider} />
              <View style={styles.youCell}>
                <OcheText variant="labelSm" allCaps color={C.fg3}>Points</OcheText>
                <OcheText variant="h2" color={C.amber}>{data.you.points}</OcheText>
              </View>
              <View style={styles.youDivider} />
              <View style={styles.youCell}>
                <OcheText variant="labelSm" allCaps color={C.fg3}>Parties</OcheText>
                <OcheText variant="h2" color={C.cream}>{data.you.played}</OcheText>
              </View>
            </View>

            {/* Promotion hint */}
            {data.nextDivisionName && data.avgToPromote != null && (
              <OcheText variant="bodyXS" color={C.fg3} style={styles.promote}>
                Monte en {data.nextDivisionName} : moyenne {data.myAvg} → {data.avgToPromote} carrière
              </OcheText>
            )}
          </View>

          <OcheText variant="labelMd" allCaps color={C.fg3} style={styles.scoring}>
            Victoire = 3 pts · défaite = 1 pt · ce mois-ci
          </OcheText>

          {/* Standings */}
          {data.entries.filter((e) => e.played > 0 || e.id === myId).length <= 1 ? (
            <ComingSoon
              title="Saison ouverte"
              subtitle="Joue des parties ce mois-ci pour marquer des points et grimper dans ta division."
            />
          ) : (
            data.entries.map((e, i) => {
              const isMe = e.id === myId;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => router.push(`/user/${e.id}`)}
                  style={({ pressed }) => [styles.row, isMe && styles.rowMe, pressed && { opacity: 0.85 }]}
                >
                  <OcheText variant="h3" color={i === 0 ? C.amber : C.fg3} style={styles.rank}>{i + 1}</OcheText>
                  <MonogramPortrait name={e.name} size={34} />
                  <View style={styles.info}>
                    <OcheText variant="h5" color={C.cream} numberOfLines={1}>
                      {e.countryCode ? `${flagEmoji(e.countryCode)} ` : ''}{e.name}{isMe ? ' · toi' : ''}
                    </OcheText>
                    <OcheText variant="bodyXS" color={C.fg3}>
                      {e.won}V · {e.played} parties · {e.three_dart_avg} avg
                    </OcheText>
                  </View>
                  <OcheText variant="h2" color={isMe ? C.amber : C.cream}>{e.points}</OcheText>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s4, paddingBottom: Spacing.s10, gap: Spacing.s3 },
    banner: {
      backgroundColor: C.walnutUp2,
      borderWidth: 1,
      borderRadius: Radii.lg,
      padding: Spacing.s4,
      gap: Spacing.s4,
    },
    bannerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
    seasonChip: { alignItems: 'flex-end', gap: 1 },
    youRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: C.border1,
      paddingTop: Spacing.s3,
    },
    youCell: { flex: 1, alignItems: 'center', gap: 2 },
    youDivider: { width: 1, backgroundColor: C.border1, marginVertical: 4 },
    promote: { textAlign: 'center' },
    scoring: { letterSpacing: 1, textAlign: 'center', marginTop: Spacing.s1 },
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
    rank: { width: 28, textAlign: 'center' },
    info: { flex: 1, gap: 1 },
  });
