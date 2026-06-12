import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OcheText } from './OcheText';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  HALVE_TARGETS,
  halveVisitScore,
  type HalvePlayerState,
  type DartEntry,
} from '@/hooks/useGameStore';

interface HalveBoardProps {
  players: HalvePlayerState[];
  activeIndex: number;
  round: number; // index into HALVE_TARGETS
  visitDarts?: DartEntry[];
  isGameOver?: boolean;
}

export function HalveBoard({
  players,
  activeIndex,
  round,
  visitDarts = [],
  isGameOver = false,
}: HalveBoardProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const total = HALVE_TARGETS.length;
  const target = HALVE_TARGETS[Math.min(round, total - 1)];
  const gained = halveVisitScore(visitDarts, target);
  // 3 darts thrown and nothing hit → this visit will halve the score.
  const willHalve = visitDarts.length === 3 && gained === 0;

  return (
    <View style={styles.container}>
      {/* Round / target banner */}
      <View style={styles.banner}>
        <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.bannerLabel}>
          Manche {Math.min(round + 1, total)} / {total}
        </OcheText>
        <View style={styles.targetWrap}>
          <OcheText variant="labelSm" allCaps color={C.fg3}>Cible</OcheText>
          <OcheText variant="displaySm" color={C.amber} style={styles.targetNum}>
            {target.label}
          </OcheText>
        </View>
      </View>

      {/* Score tiles */}
      <View style={styles.row}>
        {players.map((p, i) => {
          const isActive = i === activeIndex && !isGameOver;
          const score = isActive
            ? willHalve
              ? Math.floor(p.score / 2)
              : p.score + gained
            : p.score;
          return (
            <View key={p.id} style={[styles.tile, isActive && styles.tileActive]}>
              {isActive && <View style={styles.activeBar} />}
              <View style={styles.header}>
                <OcheText variant="h4" color={isActive ? C.cream : C.fg2} numberOfLines={1}>
                  {p.name}
                </OcheText>
                <View style={styles.legsRow}>
                  {Array.from({ length: p.legs }).map((_, k) => (
                    <View key={k} style={styles.legDot} />
                  ))}
                </View>
              </View>
              <OcheText
                variant="displayLg"
                color={isActive ? (willHalve ? C.loss : C.amber) : C.fg2}
                style={styles.score}
              >
                {score}
              </OcheText>
              {isActive && gained > 0 && (
                <OcheText variant="monoSm" color={C.win}>+{gained}</OcheText>
              )}
              {isActive && willHalve && (
                <OcheText variant="monoSm" color={C.loss}>÷2 raté</OcheText>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { gap: Spacing.s2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s2,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.none,
  },
  bannerLabel: { letterSpacing: 1.5 },
  targetWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
  targetNum: { letterSpacing: -0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s2 },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    backgroundColor: C.walnutUp,
    borderRadius: Radii.none,
    borderWidth: 1,
    borderColor: C.border1,
    padding: Spacing.s4,
    gap: 4,
    overflow: 'hidden',
  },
  tileActive: { borderColor: C.amber, backgroundColor: C.walnutUp2 },
  activeBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: C.amber },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legsRow: { flexDirection: 'row', gap: 4 },
  legDot: { width: 8, height: 8, borderRadius: Radii.none, backgroundColor: C.brick },
  score: { marginVertical: 2 },
});
