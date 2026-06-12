import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { OcheMark } from '@/components/OcheLogo';
import { Spacing, Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGameStore } from '@/hooks/useGameStore';
import { useAuthStore } from '@/hooks/useAuthStore';
import { getStats } from '@/services/api';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const appMode = useGameStore((s) => s.appMode);
  const config = useGameStore((s) => s.config);
  const players = useGameStore((s) => s.players);
  const cricketPlayers = useGameStore((s) => s.cricketPlayers);
  const atcPlayers = useGameStore((s) => s.atcPlayers);
  const killerPlayers = useGameStore((s) => s.killerPlayers);
  const shanghaiPlayers = useGameStore((s) => s.shanghaiPlayers);
  const halvePlayers = useGameStore((s) => s.halvePlayers);
  const matchWinnerIndex = useGameStore((s) => s.matchWinnerIndex);

  const user = useAuthStore((s) => s.user);
  const guestMode = useAuthStore((s) => s.guestMode);
  const meName = user?.name || 'Joueur 1';
  const firstName = meName.split(' ')[0];

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => getStats(user!.id),
    enabled: !!user,
  });

  // Resume only when a game is mid-flight.
  const roster =
    config.gameType === 'cricket' ? cricketPlayers
    : config.gameType === 'atc' ? atcPlayers
    : config.gameType === 'killer' ? killerPlayers
    : config.gameType === 'shanghai' ? shanghaiPlayers
    : config.gameType === 'halveit' ? halvePlayers
    : players;
  const inProgress = roster.length > 0 && matchWinnerIndex === null;
  const resumeLabel =
    config.gameType === 'x01' ? `${config.startScore}`
    : config.gameType === 'cricket' ? 'Cricket'
    : config.gameType === 'atc' ? 'Around the Clock'
    : config.gameType === 'killer' ? 'Killer'
    : config.gameType === 'shanghai' ? 'Shanghai'
    : 'Halve-it';

  // The hero CTA opens the game-choice screen (X01, Cricket, Killer…).
  const chooseGame = () => router.push('/new-game');

  const avgDelta =
    stats && stats.avg_history.length >= 2
      ? +(stats.avg_history[stats.avg_history.length - 1] - stats.avg_history[0]).toFixed(1)
      : 0;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader mode={appMode} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Greeting */}
        <OcheText variant="displaySm" allCaps color={C.cream} style={styles.greeting}>
          Salut {firstName}.
        </OcheText>

        {/* Resume in-progress */}
        {inProgress && (
          <Pressable
            onPress={() => router.push('/tabs/scoring')}
            style={({ pressed }) => [styles.resume, pressed && styles.pressed]}
          >
            <View style={{ flex: 1 }}>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Partie en cours</OcheText>
              <OcheText variant="h3" color={C.cream}>{resumeLabel}</OcheText>
            </View>
            <OcheText variant="labelMd" allCaps color={C.amber}>Reprendre →</OcheText>
          </Pressable>
        )}

        {/* Hero — Nouvelle partie → choix du jeu */}
        <View style={styles.hero}>
          <View style={styles.heroMark} pointerEvents="none">
            <OcheMark size={240} />
          </View>

          <OcheText variant="labelMd" allCaps color={C.orange} style={styles.heroEyebrow}>
            5 jeux · solo · duo · équipes
          </OcheText>
          <OcheText variant="displayLg" allCaps color={C.cream} style={styles.heroTitle}>
            Nouvelle{'\n'}Partie
          </OcheText>

          <OcheButton label="→ Choisir un jeu" onPress={chooseGame} variant="primary" size="lg" fullWidth style={styles.cta} />
        </View>

        {/* Tournoi — soirées entre potes */}
        <Pressable
          onPress={() => router.push('/tournament')}
          style={({ pressed }) => [styles.tournament, pressed && styles.pressed]}
        >
          <View style={{ flex: 1 }}>
            <OcheText variant="labelSm" allCaps color={C.fg3}>Soirée</OcheText>
            <OcheText variant="h3" color={C.cream}>🏆 Tournoi</OcheText>
            <OcheText variant="bodyXS" color={C.fg3}>Bracket / poules, 3-8 joueurs ou équipes</OcheText>
          </View>
          <OcheText variant="labelMd" allCaps color={C.orange}>Lancer →</OcheText>
        </Pressable>

        {/* Entraînement — drills solo */}
        <Pressable
          onPress={() => router.push('/practice')}
          style={({ pressed }) => [styles.tournament, pressed && styles.pressed]}
        >
          <View style={{ flex: 1 }}>
            <OcheText variant="labelSm" allCaps color={C.fg3}>Solo</OcheText>
            <OcheText variant="h3" color={C.cream}>🎯 Entraînement</OcheText>
            <OcheText variant="bodyXS" color={C.fg3}>Bob's 27, doubles, scoring — bats ton record</OcheText>
          </View>
          <OcheText variant="labelMd" allCaps color={C.amber}>Drills →</OcheText>
        </Pressable>

        {/* Cette semaine — stats (compte uniquement) */}
        {!guestMode && (
        <View style={styles.section}>
          <OcheText variant="h5" allCaps color={C.fg2} style={styles.sectionTitle}>
            Tes stats
          </OcheText>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Avg</OcheText>
              <OcheText variant="displaySm" color={C.cream}>{stats?.three_dart_avg ?? 0}</OcheText>
              {avgDelta !== 0 && (
                <OcheText variant="monoSm" color={avgDelta > 0 ? C.win : C.loss}>
                  {avgDelta > 0 ? '+' : ''}{avgDelta}
                </OcheText>
              )}
            </View>
            <View style={styles.statCard}>
              <OcheText variant="labelSm" allCaps color={C.fg3}>180s</OcheText>
              <OcheText variant="displaySm" color={C.amber}>{stats?.total_180s ?? 0}</OcheText>
              <OcheText variant="monoSm" color={C.fg3}>carrière</OcheText>
            </View>
            <View style={styles.statCard}>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Vict.</OcheText>
              <OcheText variant="displaySm" color={C.cream}>{stats?.win_pct ?? 0}%</OcheText>
              <OcheText variant="monoSm" color={C.fg3}>
                {stats?.matches_won ?? 0}/{stats?.matches_played ?? 0}
              </OcheText>
            </View>
          </View>
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
    paddingTop: Spacing.s3,
    paddingBottom: Spacing.s10,
    gap: Spacing.s4,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },

  greeting: { letterSpacing: 1 },

  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s4,
  },
  tournament: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s4,
  },

  // Hero
  hero: {
    backgroundColor: C.walnutUp2,
    borderWidth: 1,
    borderColor: C.orange,
    borderRadius: Radii.lg,
    padding: Spacing.s5,
    gap: Spacing.s3,
    overflow: 'hidden',
    ...Shadows.glowOrange,
  },
  heroMark: { position: 'absolute', right: -56, top: -28, opacity: 0.06 },
  heroEyebrow: { letterSpacing: 2 },
  heroTitle: { letterSpacing: -1, marginTop: -4 },
  cta: { marginTop: Spacing.s1 },

  // Sections
  section: { gap: Spacing.s3 },
  sectionTitle: { letterSpacing: 1 },
  statRow: { flexDirection: 'row', gap: Spacing.s2 },
  statCard: {
    flex: 1,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.lg,
    padding: Spacing.s4,
    gap: 2,
  },
});
