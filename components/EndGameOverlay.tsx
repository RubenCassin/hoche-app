import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheText } from './OcheText';
import { OcheButton } from './OcheButton';
import { Colors, Spacing, Radii } from '@/constants/theme';

interface EndGameOverlayProps {
  visible: boolean;
  title: string; // e.g. game label ("501", "Cricket")
  winnerName: string;
  players: { name: string; legs: number; sets?: number }[];
  winnerIndex: number;
  statLine?: string;
  /** Show the sets count instead of legs (X01 best-of-sets matches). */
  useSets?: boolean;
  /** Tournament match: show a single "back to bracket" action instead of rematch/new. */
  tournament?: boolean;
  onRematch: () => void;
  onNew: () => void;
  onHome: () => void;
}

export function EndGameOverlay({
  visible,
  title,
  winnerName,
  players,
  winnerIndex,
  statLine,
  useSets = false,
  tournament = false,
  onRematch,
  onNew,
  onHome,
}: EndGameOverlayProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.s8, paddingBottom: insets.bottom + Spacing.s6 },
        ]}
      >
        <OcheText variant="labelSm" allCaps color={Colors.amber} style={styles.eyebrow}>
          {tournament ? 'Match de tournoi' : 'Match terminé'} · {title}
        </OcheText>

        <OcheText variant="displayLg" allCaps color={Colors.amber} style={styles.winner}>
          {winnerName}
        </OcheText>
        <OcheText variant="labelMd" allCaps color={Colors.fg3} style={styles.vainqueurLabel}>
          Vainqueur
        </OcheText>

        {/* Legs score line */}
        <View style={styles.scoreCard}>
          {players.map((p, i) => (
            <View key={i} style={styles.scoreRow}>
              <OcheText
                variant="h4"
                color={i === winnerIndex ? Colors.cream : Colors.fg2}
                numberOfLines={1}
                style={styles.scoreName}
              >
                {p.name}
              </OcheText>
              <OcheText
                variant="displaySm"
                color={i === winnerIndex ? Colors.amber : Colors.fg2}
              >
                {useSets ? (p.sets ?? 0) : p.legs}
              </OcheText>
            </View>
          ))}
        </View>

        {!!statLine && (
          <OcheText variant="monoMd" color={Colors.fg2} style={styles.stat}>
            {statLine}
          </OcheText>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {tournament ? (
            <OcheButton label="Retour au tournoi" onPress={onHome} variant="primary" size="lg" fullWidth />
          ) : (
            <>
              <OcheButton label="Rejouer" onPress={onRematch} variant="primary" size="lg" fullWidth />
              <OcheButton label="Nouvelle partie" onPress={onNew} variant="secondary" size="md" fullWidth />
              <OcheButton label="Accueil" onPress={onHome} variant="ghost" size="md" fullWidth />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.walnut,
    zIndex: 150,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s6,
    gap: Spacing.s2,
  },
  eyebrow: { letterSpacing: 3, marginBottom: Spacing.s2 },
  winner: { textAlign: 'center', letterSpacing: -0.5 },
  vainqueurLabel: { letterSpacing: 3, marginTop: -2 },
  scoreCard: {
    alignSelf: 'stretch',
    backgroundColor: Colors.walnutUp,
    borderWidth: 1,
    borderColor: Colors.border1,
    borderRadius: Radii.none,
    padding: Spacing.s4,
    gap: Spacing.s2,
    marginTop: Spacing.s5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreName: { flex: 1, marginRight: Spacing.s3 },
  stat: { marginTop: Spacing.s3 },
  actions: {
    alignSelf: 'stretch',
    marginTop: Spacing.s8,
    gap: Spacing.s3,
  },
  btn: {
    paddingVertical: Spacing.s4,
    alignItems: 'center',
    borderRadius: Radii.none,
  },
  btnPrimary: { backgroundColor: Colors.brick },
  btnGhost: {
    borderWidth: 1,
    borderColor: Colors.border1,
    backgroundColor: Colors.walnutUp,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
