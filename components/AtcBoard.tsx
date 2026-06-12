import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OcheText } from './OcheText';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  ATC_SEQUENCE,
  applyAtcDarts,
  atcCurrentTarget,
  type AtcPlayerState,
  type DartEntry,
} from '@/hooks/useGameStore';

interface AtcBoardProps {
  players: AtcPlayerState[];
  activeIndex: number;
  /** Darts thrown so far in the current (uncommitted) visit, for live preview. */
  visitDarts?: DartEntry[];
  advanceByMarks?: boolean;
  isGameOver?: boolean;
}

const TOTAL = ATC_SEQUENCE.length;
const targetLabel = (t: number) => (t === 25 ? 'BULL' : String(t));

export function AtcBoard({
  players,
  activeIndex,
  visitDarts = [],
  advanceByMarks = false,
  isGameOver = false,
}: AtcBoardProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const view =
    visitDarts.length > 0
      ? applyAtcDarts(players, activeIndex, visitDarts, advanceByMarks)
      : players;

  const fullTile = (p: AtcPlayerState, i: number) => {
    const isActive = i === activeIndex && !isGameOver;
    const current = atcCurrentTarget(p);
    const done = current === null;
    const frac = Math.min(1, p.hits / TOTAL);
    return (
      <View key={p.id} style={[styles.tile, isActive && styles.tileActive]}>
        {isActive && <View style={styles.activeBar} />}
        <View style={styles.header}>
          <OcheText variant="h4" color={isActive ? C.cream : C.fg2} numberOfLines={1}>{p.name}</OcheText>
          <View style={styles.legsRow}>
            {Array.from({ length: p.legs }).map((_, k) => <View key={k} style={styles.legDot} />)}
          </View>
        </View>
        <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.kicker}>
          {done ? 'Terminé' : 'Cible'}
        </OcheText>
        <OcheText variant="displayXL" allCaps color={done ? C.win : isActive ? C.amber : C.fg2} style={styles.big}>
          {done ? 'FINI' : targetLabel(current)}
        </OcheText>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${frac * 100}%`, backgroundColor: done ? C.win : C.amber }]} />
        </View>
        <OcheText variant="monoSm" color={C.fg2} style={styles.progressText}>{p.hits}/{TOTAL}</OcheText>
      </View>
    );
  };

  const compactTile = (p: AtcPlayerState) => {
    const current = atcCurrentTarget(p);
    const done = current === null;
    return (
      <View key={p.id} style={styles.compact}>
        <View style={styles.compactLeft}>
          <OcheText variant="h5" color={C.fg2} numberOfLines={1}>{p.name}</OcheText>
          <OcheText variant="monoSm" color={C.fg3}>{p.hits}/{TOTAL}</OcheText>
        </View>
        <OcheText variant="displaySm" color={done ? C.win : C.cream}>
          {done ? 'FINI' : targetLabel(current)}
        </OcheText>
      </View>
    );
  };

  // Spotlight at 3-4 players: active big, others compact.
  if (players.length > 2) {
    return (
      <View style={styles.spotlight}>
        <View style={styles.row}>{fullTile(view[activeIndex], activeIndex)}</View>
        <View style={styles.row}>
          {view.map((p, i) => (i === activeIndex ? null : compactTile(p)))}
        </View>
      </View>
    );
  }

  return <View style={styles.row}>{view.map((p, i) => fullTile(p, i))}</View>;
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  spotlight: { gap: Spacing.s2 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  compact: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s2,
    gap: Spacing.s2,
  },
  compactLeft: { flexShrink: 1, gap: 1 },
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
  kicker: {
    letterSpacing: 1,
    marginTop: 2,
  },
  big: {
    marginVertical: 2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: C.bg1,
    borderRadius: Radii.none,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    marginTop: 2,
  },
});
