import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { OcheText } from './OcheText';
import type { DartModifier } from './DartPad';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface QuickPadProps {
  /** The single number being aimed at (25 = bull). */
  target: number;
  onScore: (points: number, modifier: DartModifier, segment: number) => void;
  onUndo?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * A compact input for games/drills that aim at ONE number at a time:
 * Triple / Double / Simple / Manqué of the target (or Bull 50 / 25 / Manqué).
 */
export function QuickPad({ target, onScore, onUndo, disabled = false, style }: QuickPadProps) {
  const C = useTheme();
  const styles = makeStyles(C);

  const btns =
    target === 25
      ? [
          { label: 'BULL', sub: '50', pts: 50, mod: 'D' as DartModifier, seg: 25, muted: false },
          { label: '25', sub: 'simple', pts: 25, mod: 'S' as DartModifier, seg: 25, muted: false },
          { label: 'MANQUÉ', sub: '0', pts: 0, mod: 'S' as DartModifier, seg: 0, muted: true },
        ]
      : [
          { label: 'TRIPLE', sub: `T${target} · ${target * 3}`, pts: target * 3, mod: 'T' as DartModifier, seg: target, muted: false },
          { label: 'DOUBLE', sub: `D${target} · ${target * 2}`, pts: target * 2, mod: 'D' as DartModifier, seg: target, muted: false },
          { label: 'SIMPLE', sub: `${target}`, pts: target, mod: 'S' as DartModifier, seg: target, muted: false },
          { label: 'MANQUÉ', sub: '0', pts: 0, mod: 'S' as DartModifier, seg: 0, muted: true },
        ];

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.grid}>
        {btns.map((b) => (
          <Pressable
            key={b.label}
            disabled={disabled}
            onPress={() => onScore(b.pts, b.mod, b.seg)}
            style={({ pressed }) => [
              styles.btn,
              b.muted && styles.btnMuted,
              pressed && { opacity: 0.85 },
              disabled && { opacity: 0.4 },
            ]}
          >
            <OcheText variant="displaySm" color={b.muted ? C.fg2 : C.cream}>{b.label}</OcheText>
            <OcheText variant="monoSm" color={C.fg3}>{b.sub}</OcheText>
          </Pressable>
        ))}
      </View>
      {onUndo && (
        <Pressable onPress={onUndo} style={styles.undo} hitSlop={8}>
          <OcheText variant="labelMd" allCaps color={C.fg2}>↩ Annuler</OcheText>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: { flex: 1, gap: Spacing.s2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s2 },
    btn: {
      flexGrow: 1,
      flexBasis: '47%',
      minHeight: 84,
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: Spacing.s4,
    },
    btnMuted: { backgroundColor: C.walnut, borderColor: C.border2, borderStyle: 'dashed' },
    undo: { alignSelf: 'center', paddingVertical: Spacing.s2, paddingHorizontal: Spacing.s4 },
  });
