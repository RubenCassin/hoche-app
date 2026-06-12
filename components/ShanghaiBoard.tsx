import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OcheText } from './OcheText';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  shanghaiVisitScore,
  type ShanghaiPlayerState,
  type DartEntry,
} from '@/hooks/useGameStore';

interface ShanghaiBoardProps {
  players: ShanghaiPlayerState[];
  activeIndex: number;
  round: number;
  totalRounds: number;
  visitDarts?: DartEntry[];
  isGameOver?: boolean;
}

export function ShanghaiBoard({
  players,
  activeIndex,
  round,
  totalRounds,
  visitDarts = [],
  isGameOver = false,
}: ShanghaiBoardProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  // Live preview: add the in-progress visit's points to the active player.
  const gained = shanghaiVisitScore(visitDarts, round);

  return (
    <View style={styles.container}>
      {/* Round / target banner */}
      <View style={styles.banner}>
        <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.bannerLabel}>
          Manche {Math.min(round, totalRounds)} / {totalRounds}
        </OcheText>
        <View style={styles.targetWrap}>
          <OcheText variant="labelSm" allCaps color={C.fg3}>Cible</OcheText>
          <OcheText variant="displaySm" color={C.amber} style={styles.targetNum}>
            {round}
          </OcheText>
        </View>
      </View>

      {/* Score tiles */}
      <View style={styles.row}>
        {players.map((p, i) => {
          const isActive = i === activeIndex && !isGameOver;
          const score = p.score + (isActive ? gained : 0);
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
                color={isActive ? C.amber : C.fg2}
                style={styles.score}
              >
                {score}
              </OcheText>
              {isActive && gained > 0 && (
                <OcheText variant="monoSm" color={C.win}>+{gained}</OcheText>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    gap: Spacing.s2,
  },
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
  bannerLabel: {
    letterSpacing: 1.5,
  },
  targetWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  targetNum: {
    letterSpacing: -0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
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
  tileActive: {
    borderColor: C.amber,
    backgroundColor: C.walnutUp2,
  },
  activeBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.amber,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  legDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.none,
    backgroundColor: C.brick,
  },
  score: {
    marginVertical: 2,
  },
});
