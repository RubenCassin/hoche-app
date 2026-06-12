import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { OcheText } from './OcheText';
import { Spacing, Radii, Durations } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ScoreTileProps {
  playerName: string;
  remaining: number;
  average: number;
  dartsThrown: number;
  isActive: boolean;
  legs: number;
  sets?: number;
  /** Compact one-line tile for non-active players (3-4 player spotlight layout). */
  compact?: boolean;
  /** Dense full tile for the spotlight active player: score + stats on one row. */
  dense?: boolean;
}

export function ScoreTile({
  playerName,
  remaining,
  average,
  dartsThrown,
  isActive,
  legs,
  sets = 0,
  compact = false,
  dense = false,
}: ScoreTileProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const prevRemaining = useRef(remaining);

  useEffect(() => {
    if (prevRemaining.current !== remaining) {
      // Flip animation signature OCHE
      Animated.sequence([
        Animated.timing(flipAnim, {
          toValue: 1,
          duration: Durations.flip / 2,
          useNativeDriver: true,
        }),
        Animated.timing(flipAnim, {
          toValue: 0,
          duration: Durations.flip / 2,
          useNativeDriver: true,
        }),
      ]).start();
      prevRemaining.current = remaining;
    }
  }, [remaining]);

  const flipScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.85, 1],
  });

  const flipTranslate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -4, 0],
  });

  // Compact: a small one-line card (name + remaining) for players not in turn.
  if (compact) {
    return (
      <View style={[styles.compact, isActive && styles.containerActive]}>
        <View style={styles.compactLeft}>
          <OcheText variant="h5" color={isActive ? C.cream : C.fg2} numberOfLines={1}>
            {playerName}
          </OcheText>
          <View style={styles.legsRow}>
            {sets > 0 && <OcheText variant="monoSm" color={C.amber}>{sets}🏆</OcheText>}
            {Array.from({ length: legs }).map((_, i) => (
              <View key={i} style={styles.legDotSm} />
            ))}
          </View>
        </View>
        <OcheText variant="displaySm" color={isActive ? C.amber : C.cream}>
          {remaining}
        </OcheText>
      </View>
    );
  }

  // Dense: full tile squeezed to two rows so the spotlight layout (3-4 players)
  // leaves the input pad fully on screen.
  if (dense) {
    return (
      <View style={[styles.container, styles.denseContainer, isActive && styles.containerActive]}>
        {isActive && <View style={styles.activeBar} />}
        <View style={styles.header}>
          <OcheText variant="h4" color={isActive ? C.cream : C.fg2}>
            {playerName}
          </OcheText>
          <View style={styles.legsRow}>
            {sets > 0 && <OcheText variant="monoSm" color={C.amber} style={styles.setsBadge}>{sets} set{sets > 1 ? 's' : ''}</OcheText>}
            {Array.from({ length: legs }).map((_, i) => (
              <View key={i} style={styles.legDot} />
            ))}
          </View>
        </View>
        <View style={styles.denseRow}>
          <Animated.View style={{ transform: [{ scaleY: flipScale }, { translateY: flipTranslate }] }}>
            <OcheText variant="displayLg" allCaps color={isActive ? C.amber : C.fg2}>
              {remaining}
            </OcheText>
          </Animated.View>
          <View style={styles.denseStats}>
            <View style={styles.statItem}>
              <OcheText variant="monoSm" color={C.fg3}>AVG</OcheText>
              <OcheText variant="monoMd" color={C.fg2}>{average.toFixed(1)}</OcheText>
            </View>
            <View style={styles.statItem}>
              <OcheText variant="monoSm" color={C.fg3}>DARTS</OcheText>
              <OcheText variant="monoMd" color={C.fg2}>{dartsThrown}</OcheText>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isActive && styles.containerActive]}>
      {isActive && <View style={styles.activeBar} />}

      <View style={styles.header}>
        <OcheText variant="h4" color={isActive ? C.cream : C.fg2}>
          {playerName}
        </OcheText>
        <View style={styles.legsRow}>
          {sets > 0 && <OcheText variant="monoSm" color={C.amber} style={styles.setsBadge}>{sets} set{sets > 1 ? 's' : ''}</OcheText>}
          {Array.from({ length: legs }).map((_, i) => (
            <View key={i} style={styles.legDot} />
          ))}
        </View>
      </View>

      <Animated.View
        style={{
          transform: [{ scaleY: flipScale }, { translateY: flipTranslate }],
        }}
      >
        <OcheText
          variant={remaining <= 170 ? 'displayXL' : 'displayLg'}
          allCaps
          color={isActive ? C.amber : C.fg2}
          style={styles.score}
        >
          {remaining}
        </OcheText>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.statItem}>
          <OcheText variant="monoSm" color={C.fg3}>AVG</OcheText>
          <OcheText variant="monoMd" color={C.fg2}>{average.toFixed(1)}</OcheText>
        </View>
        <View style={styles.statItem}>
          <OcheText variant="monoSm" color={C.fg3}>DARTS</OcheText>
          <OcheText variant="monoMd" color={C.fg2}>{dartsThrown}</OcheText>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.walnutUp,
    borderRadius: Radii.none,
    borderWidth: 1,
    borderColor: C.border1,
    padding: Spacing.s4,
    gap: 4,
    overflow: 'hidden',
  },
  containerActive: {
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
    alignItems: 'center',
    gap: 4,
  },
  setsBadge: { marginRight: 4 },
  legDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.none,
    backgroundColor: C.brick,
  },
  legDotSm: {
    width: 6,
    height: 6,
    borderRadius: Radii.none,
    backgroundColor: C.brick,
  },
  compact: {
    // Sized for the horizontal spotlight strip: grows to share the row when few
    // players, keeps a readable floor and scrolls sideways when many.
    flexGrow: 1,
    minWidth: 150,
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
  compactLeft: {
    flexShrink: 1,
    gap: 2,
  },
  score: {
    marginVertical: 4,
  },
  denseContainer: {
    padding: Spacing.s3,
    gap: 2,
  },
  denseRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  denseStats: {
    flexDirection: 'row',
    gap: Spacing.s4,
    paddingBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.s4,
    marginTop: 4,
  },
  statItem: {
    gap: 2,
  },
});
