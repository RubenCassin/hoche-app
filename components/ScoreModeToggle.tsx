import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OcheText } from './OcheText';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ScoringMode } from '@/hooks/useGameStore';

const MODES: { key: ScoringMode; label: string }[] = [
  { key: 'grid', label: 'Grille' },
  { key: 'board', label: 'Cible' },
  { key: 'numpad', label: 'Numpad' },
];

interface ScoreModeToggleProps {
  value: ScoringMode;
  onChange: (mode: ScoringMode) => void;
  /** Restrict which modes are offered (e.g. Cricket has no numpad). */
  available?: ScoringMode[];
  style?: ViewStyle;
}

export function ScoreModeToggle({ value, onChange, available, style }: ScoreModeToggleProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const modes = available ? MODES.filter((m) => available.includes(m.key)) : MODES;
  return (
    <View style={[styles.container, style]}>
      {modes.map((m) => {
        const active = m.key === value;
        return (
          <Pressable
            key={m.key}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync();
              onChange(m.key);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <OcheText
              variant="labelMd"
              allCaps
              color={active ? C.onAmber : C.fg2}
              style={styles.label}
            >
              {m.label}
            </OcheText>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.none,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.walnutUp,
  },
  segmentActive: {
    backgroundColor: C.amber,
  },
  label: {
    letterSpacing: 1,
    fontWeight: '700',
  },
});
