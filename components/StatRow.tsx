import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { OcheText } from './OcheText';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface StatRowProps {
  label: string;
  value: string | number;
  delta?: number;     // positive = good, negative = bad
  highlight?: boolean;
  style?: ViewStyle;
}

export function StatRow({ label, value, delta, highlight = false, style }: StatRowProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  return (
    <View style={[styles.row, style]}>
      <OcheText variant="bodySm" color={C.fg3} style={styles.label}>
        {label}
      </OcheText>
      <View style={styles.valueRow}>
        <OcheText
          variant="monoMd"
          color={highlight ? C.amber : C.fg1}
          style={highlight ? styles.highlight : undefined}
        >
          {value}
        </OcheText>
        {delta !== undefined && delta !== 0 && (
          <OcheText
            variant="bodyXS"
            color={delta > 0 ? C.win : C.loss}
            style={styles.delta}
          >
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
          </OcheText>
        )}
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.s2,
    borderBottomWidth: 1,
    borderBottomColor: C.border2,
  },
  label: {
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlight: {
    fontWeight: '700',
  },
  delta: {
    fontWeight: '600',
  },
});
