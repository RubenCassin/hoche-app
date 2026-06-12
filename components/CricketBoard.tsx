import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OcheText } from './OcheText';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  CRICKET_TARGETS,
  applyCricketDarts,
  isCricketTargetDead,
  type CricketPlayerState,
  type DartEntry,
} from '@/hooks/useGameStore';

interface CricketBoardProps {
  players: CricketPlayerState[];
  activeIndex: number;
  /** Darts thrown so far in the current (uncommitted) visit, for live preview. */
  visitDarts?: DartEntry[];
  cutThroat?: boolean;
  isGameOver?: boolean;
}

const targetLabel = (t: number) => (t === 25 ? 'BULL' : String(t));

/** Marks for one player on one target: 0=∅, 1=/, 2=X, 3=Ⓧ (closed). */
function Marks({ count, dead, active }: { count: number; dead: boolean; active: boolean }) {
  const C = useTheme();
  const styles = makeStyles(C);
  const closed = count >= 3;
  const color = dead
    ? C.fg3
    : closed
      ? C.amber
      : active
        ? C.cream
        : C.fg2;

  let glyph = '';
  if (count === 1) glyph = '/';
  else if (count >= 2) glyph = 'X';

  return (
    <View style={[styles.markBox, closed && !dead && styles.markBoxClosed]}>
      <OcheText variant="h4" color={color} style={styles.markGlyph}>
        {glyph}
      </OcheText>
    </View>
  );
}

export function CricketBoard({
  players,
  activeIndex,
  visitDarts = [],
  cutThroat = false,
  isGameOver = false,
}: CricketBoardProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  // Live view: fold the in-progress visit into the active player's marks/score.
  const view =
    visitDarts.length > 0
      ? applyCricketDarts(players, activeIndex, visitDarts, cutThroat)
      : players;

  return (
    <View style={styles.container}>
      {/* Header: target label spacer + each player (name + running score) */}
      <View style={styles.row}>
        <View style={styles.targetCell} />
        {view.map((p, i) => {
          const isActive = i === activeIndex && !isGameOver;
          return (
            <View key={p.id} style={[styles.headerCell, isActive && styles.headerCellActive]}>
              <OcheText variant="labelSm" allCaps color={isActive ? C.cream : C.fg2} numberOfLines={1}>
                {p.name}
              </OcheText>
              <OcheText variant="h1" color={isActive ? C.amber : C.fg2}>
                {p.score}
              </OcheText>
            </View>
          );
        })}
      </View>

      {/* One row per target */}
      {CRICKET_TARGETS.map((t) => {
        const dead = isCricketTargetDead(view, t);
        return (
          <View key={t} style={styles.row}>
            <View style={styles.targetCell}>
              <OcheText
                variant="h3"
                color={dead ? C.fg3 : C.cream}
                style={styles.targetText}
              >
                {targetLabel(t)}
              </OcheText>
            </View>
            {view.map((p, i) => (
              <View
                key={p.id}
                style={[styles.markCell, i === activeIndex && !isGameOver && styles.markCellActive]}
              >
                <Marks count={p.marks[t] ?? 0} dead={dead} active={i === activeIndex} />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.none,
    backgroundColor: C.walnutUp,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border1,
  },
  targetCell: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
    borderRightWidth: 1,
    borderRightColor: C.border1,
    backgroundColor: C.walnutUp2,
  },
  targetText: {
    letterSpacing: -0.5,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRightWidth: 1,
    borderRightColor: C.border1,
  },
  headerCellActive: {
    backgroundColor: C.walnutUp2,
  },
  markCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
    borderRightWidth: 1,
    borderRightColor: C.border1,
  },
  markCellActive: {
    backgroundColor: C.walnutUp2,
  },
  markBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radii.pill,
  },
  markBoxClosed: {
    borderColor: C.amber,
  },
  markGlyph: {
    lineHeight: 18,
  },
});
