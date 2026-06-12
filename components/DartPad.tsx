import React, { useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { OcheText } from './OcheText';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type DartInput = 'miss' | number;

export type DartModifier = 'S' | 'D' | 'T';

interface DartPadProps {
  onScore: (points: number, modifier: DartModifier, segment: number) => void;
  onUndo?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

// 501 dart pad layout: segments 1-20 + Bull (25) + Bullseye (50)
// Rows: [1-5] [6-10] [11-15] [16-20] [Bull, 25, undo]

const ROWS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
];

const MODIFIERS: DartModifier[] = ['S', 'D', 'T'];
const MODIFIER_LABELS: Record<DartModifier, string> = { S: 'Single', D: 'Double', T: 'Triple' };
const MODIFIER_MULT: Record<DartModifier, number> = { S: 1, D: 2, T: 3 };

export function DartPad({ onScore, onUndo, style, disabled = false }: DartPadProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const [modifier, setModifier] = React.useState<DartModifier>('S');

  const handleSegment = useCallback(
    (segment: number) => {
      if (disabled) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onScore(segment * MODIFIER_MULT[modifier], modifier, segment);
    },
    [modifier, onScore, disabled]
  );

  const handleBull = useCallback(
    (val: 25 | 50) => {
      if (disabled) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const mod: DartModifier = val === 50 ? 'D' : 'S';
      onScore(val, mod, 25);
    },
    [onScore, disabled]
  );

  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUndo?.();
  }, [onUndo]);

  return (
    <View style={[styles.container, style]}>
      {/* Modifier selector */}
      <View style={styles.modifierRow}>
        {MODIFIERS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setModifier(m)}
            style={[styles.modBtn, modifier === m && styles.modBtnActive]}
          >
            <OcheText
              variant="labelMd"
              allCaps
              color={modifier === m ? C.onAmber : C.fg2}
              style={styles.modBtnText}
            >
              {m}
            </OcheText>
          </Pressable>
        ))}
      </View>

      {/* Number grid */}
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((seg) => (
            <Pressable
              key={seg}
              onPress={() => handleSegment(seg)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.segBtn,
                pressed && styles.segBtnPressed,
              ]}
            >
              <OcheText variant="h3" color={C.cream} style={styles.segLabel}>
                {seg}
              </OcheText>
              {modifier !== 'S' && (
                <OcheText variant="labelSm" color={C.fg3} style={styles.segMultiplier}>
                  ×{MODIFIER_MULT[modifier]}
                </OcheText>
              )}
            </Pressable>
          ))}
        </View>
      ))}

      {/* Bottom row: Bull, Bullseye, Miss, Undo */}
      <View style={styles.row}>
        <Pressable
          onPress={() => handleBull(25)}
          disabled={disabled}
          style={({ pressed }) => [styles.segBtn, styles.segBtnBull, pressed && styles.segBtnPressed]}
        >
          <OcheText variant="labelMd" allCaps color={C.amber}>BULL</OcheText>
          <OcheText variant="labelSm" color={C.fg3}>25</OcheText>
        </Pressable>
        <Pressable
          onPress={() => handleBull(50)}
          disabled={disabled}
          style={({ pressed }) => [styles.segBtn, styles.segBtnBullseye, pressed && styles.segBtnPressed]}
        >
          <OcheText variant="labelMd" allCaps color={C.brick}>BULL</OcheText>
          <OcheText variant="labelSm" color={C.brick}>50</OcheText>
        </Pressable>
        <Pressable
          onPress={() => { if (!disabled) { Haptics.selectionAsync(); onScore(0, 'S', 0); }}}
          disabled={disabled}
          style={({ pressed }) => [styles.segBtn, pressed && styles.segBtnPressed]}
        >
          <OcheText variant="labelSm" color={C.fg3} allCaps>Miss</OcheText>
        </Pressable>
        <Pressable
          onPress={handleUndo}
          style={({ pressed }) => [styles.segBtn, styles.undoBtn, pressed && styles.segBtnPressed]}
        >
          <OcheText variant="labelMd" color={C.fg2} allCaps>Undo</OcheText>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    gap: 4,
    paddingHorizontal: Spacing.s2,
  },
  modifierRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  modBtn: {
    flex: 1,
    height: 36,
    borderRadius: Radii.none,
    borderWidth: 1,
    borderColor: C.border1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modBtnActive: {
    backgroundColor: C.amber,
    borderColor: C.amber,
  },
  modBtnText: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  segBtn: {
    flex: 1,
    height: 52,
    backgroundColor: C.walnutUp,
    borderRadius: Radii.none,
    borderWidth: 1,
    borderColor: C.border1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnPressed: {
    backgroundColor: C.oak,
    transform: [{ scale: 0.97 }],
  },
  segBtnBull: {
    borderColor: C.amber,
  },
  segBtnBullseye: {
    borderColor: C.brick,
  },
  segLabel: {
    lineHeight: 22,
  },
  segMultiplier: {
    lineHeight: 14,
  },
  undoBtn: {
    borderColor: C.border2,
    backgroundColor: C.bg1,
  },
});
