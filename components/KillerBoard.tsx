import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OcheText } from './OcheText';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { applyKillerDarts, type KillerPlayerState, type DartEntry } from '@/hooks/useGameStore';

interface KillerBoardProps {
  players: KillerPlayerState[];
  activeIndex: number;
  maxLives: number;
  visitDarts?: DartEntry[];
  selfHit?: boolean;
  isGameOver?: boolean;
}

export function KillerBoard({
  players,
  activeIndex,
  maxLives,
  visitDarts = [],
  selfHit = true,
  isGameOver = false,
}: KillerBoardProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const view =
    visitDarts.length > 0
      ? applyKillerDarts(players, activeIndex, visitDarts, selfHit)
      : players;

  const fullTile = (p: KillerPlayerState, i: number) => {
    const isActive = i === activeIndex && !isGameOver;
    const dead = p.lives <= 0;
    return (
      <View key={p.id} style={[styles.tile, isActive && styles.tileActive, dead && styles.tileDead]}>
        {isActive && <View style={styles.activeBar} />}
        <View style={styles.header}>
          <OcheText variant="h4" color={isActive ? C.cream : C.fg2} numberOfLines={1}>{p.name}</OcheText>
          <View style={styles.legsRow}>
            {Array.from({ length: p.legs }).map((_, k) => <View key={k} style={styles.legDot} />)}
          </View>
        </View>
        <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.kicker}>Numéro</OcheText>
        <OcheText variant="displayLg" color={dead ? C.fg3 : isActive ? C.amber : C.fg2} style={styles.big}>
          {p.number}
        </OcheText>
        <View style={styles.livesRow}>
          {Array.from({ length: maxLives }).map((_, k) => (
            <View key={k} style={[styles.lifePip, k < p.lives ? styles.lifeOn : styles.lifeOff]} />
          ))}
        </View>
        {dead ? (
          <OcheText variant="labelSm" allCaps color={C.loss} style={styles.status}>Éliminé</OcheText>
        ) : p.isKiller ? (
          <View style={styles.armedBadge}>
            <OcheText variant="labelSm" allCaps color={C.onAmber} style={styles.armedText}>Killer</OcheText>
          </View>
        ) : (
          <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.status}>À armer · D{p.number}</OcheText>
        )}
      </View>
    );
  };

  const compactTile = (p: KillerPlayerState) => {
    const dead = p.lives <= 0;
    return (
      <View key={p.id} style={[styles.compact, dead && styles.tileDead]}>
        <View style={styles.compactLeft}>
          <OcheText variant="h5" color={C.fg2} numberOfLines={1}>
            {p.name}{p.isKiller ? ' ⚔' : ''}
          </OcheText>
          <View style={styles.livesRow}>
            {Array.from({ length: maxLives }).map((_, k) => (
              <View key={k} style={[styles.lifePipSm, k < p.lives ? styles.lifeOn : styles.lifeOff]} />
            ))}
          </View>
        </View>
        <OcheText variant="displaySm" color={dead ? C.fg3 : C.cream}>{p.number}</OcheText>
      </View>
    );
  };

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
  compactLeft: { flexShrink: 1, gap: 3 },
  lifePipSm: {
    width: 10,
    height: 10,
    borderRadius: Radii.none,
    borderWidth: 1,
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
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  tileActive: {
    borderColor: C.amber,
    backgroundColor: C.walnutUp2,
  },
  tileDead: {
    opacity: 0.5,
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
    alignSelf: 'stretch',
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
  livesRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 2,
  },
  lifePip: {
    width: 14,
    height: 14,
    borderRadius: Radii.none,
    borderWidth: 1,
  },
  lifeOn: {
    backgroundColor: C.brick,
    borderColor: C.brick,
  },
  lifeOff: {
    backgroundColor: 'transparent',
    borderColor: C.border1,
  },
  status: {
    letterSpacing: 1,
    marginTop: 4,
  },
  armedBadge: {
    marginTop: 4,
    backgroundColor: C.amber,
    paddingHorizontal: Spacing.s2,
    paddingVertical: 2,
    borderRadius: Radii.none,
  },
  armedText: {
    letterSpacing: 1.5,
    fontWeight: '700',
  },
});
