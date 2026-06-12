import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OcheText } from './OcheText';
import { OcheButton } from './OcheButton';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface NumpadInputProps {
  /** Commit the entered visit total (0–180). */
  onSubmit: (total: number) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const KEYS: (number | '180' | 'back')[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, '180', 0, 'back'];

export function NumpadInput({ onSubmit, disabled = false, style }: NumpadInputProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const [entry, setEntry] = useState('');

  const total = entry === '' ? 0 : parseInt(entry, 10);

  const press = useCallback(
    (key: number | '180' | 'back') => {
      if (disabled) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (key === 'back') {
        setEntry((e) => e.slice(0, -1));
        return;
      }
      if (key === '180') {
        setEntry('180');
        return;
      }
      setEntry((e) => {
        const next = (e + String(key)).replace(/^0+/, '');
        const n = parseInt(next || '0', 10);
        if (n > 180) return e; // a visit can't exceed 180
        return next;
      });
    },
    [disabled]
  );

  const submit = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(total);
    setEntry('');
  }, [disabled, onSubmit, total]);

  return (
    <View style={[styles.container, style]}>
      {/* Running total */}
      <View style={styles.totalRow}>
        <OcheText variant="monoSm" color={C.fg3} allCaps>Tour en cours</OcheText>
        <OcheText variant="displayMd" color={total > 0 ? C.amber : C.fg3}>
          {total}
        </OcheText>
      </View>

      {/* Keypad */}
      <View style={styles.grid}>
        {KEYS.map((k) => {
          const is180 = k === '180';
          const isBack = k === 'back';
          return (
            <Pressable
              key={String(k)}
              onPress={() => press(k)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.key,
                is180 && styles.key180,
                pressed && styles.keyPressed,
              ]}
            >
              {isBack ? (
                <OcheText variant="h2" color={C.fg2}>←</OcheText>
              ) : (
                <OcheText
                  variant={is180 ? 'h3' : 'displaySm'}
                  allCaps={is180}
                  color={is180 ? C.onAmber : C.cream}
                >
                  {k}
                </OcheText>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Validate */}
      <OcheButton label="Valider le tour" onPress={submit} disabled={disabled} variant="primary" size="lg" fullWidth />
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.s2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s2,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  key: {
    width: '31.5%',
    flexGrow: 1,
    flexBasis: '31.5%',
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.none,
    alignItems: 'center',
    justifyContent: 'center',
  },
  key180: {
    backgroundColor: C.amber,
    borderColor: C.amber,
  },
  keyPressed: {
    backgroundColor: C.oak,
    transform: [{ scale: 0.98 }],
  },
  submit: {
    backgroundColor: C.brick,
    borderRadius: Radii.none,
    paddingVertical: Spacing.s4,
    alignItems: 'center',
  },
  submitPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
