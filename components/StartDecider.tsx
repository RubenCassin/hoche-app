import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { OcheText } from './OcheText';
import { OcheButton } from './OcheButton';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface StartDeciderProps {
  /** Display names of the roster, in order. */
  names: string[];
  /** Called with the chosen starter index once confirmed. */
  onChoose: (index: number) => void;
}

/**
 * Pre-game « Qui commence ? » overlay — the bar ritual.
 *  • Tirage au sort : highlight cycles through players, decelerates, lands on one.
 *  • Bull : everyone throws at the bull, you tap whoever landed closest.
 * Confirm with the chosen player; "Passer" keeps player 1 (index 0).
 */
export function StartDecider({ names, onChoose }: StartDeciderProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const [mode, setMode] = useState<'draw' | 'bull'>('draw');
  const [chosen, setChosen] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const runDraw = () => {
    if (spinning) return;
    setSpinning(true);
    setChosen(null);
    const target = Math.floor(Math.random() * names.length);
    const totalTicks = names.length * 3 + target + 4; // a few full loops then land
    let tick = 0;
    const step = () => {
      setChosen(tick % names.length);
      Haptics.selectionAsync();
      tick += 1;
      if (tick <= totalTicks) {
        // Ease out: each tick a little slower than the last.
        const delay = 55 + Math.pow(tick / totalTicks, 3) * 260;
        timer.current = setTimeout(step, delay);
      } else {
        setChosen(target);
        setSpinning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };
    step();
  };

  const pickBull = (i: number) => {
    if (spinning) return;
    Haptics.selectionAsync();
    setChosen(i);
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <OcheText variant="labelSm" allCaps color={C.amber} style={styles.eyebrow}>Avant de lancer</OcheText>
      <OcheText variant="displayMd" allCaps color={C.cream}>Qui commence ?</OcheText>

      {/* Mode selector */}
      <View style={styles.seg}>
        {([['draw', '🎲 Tirage'], ['bull', '🎯 Bull']] as const).map(([m, label]) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => { if (!spinning) { setMode(m); setChosen(null); } }}
              style={[styles.segBtn, active && styles.segBtnActive]}
            >
              <OcheText variant="labelMd" allCaps color={active ? C.onAmber : C.fg2} style={styles.segText}>{label}</OcheText>
            </Pressable>
          );
        })}
      </View>

      {mode === 'bull' && (
        <OcheText variant="bodySm" color={C.fg3} style={styles.hint}>
          Chacun vise le Bull une fléchette. Touchez le joueur le plus proche du centre.
        </OcheText>
      )}

      {/* Player list — highlights the chosen one */}
      <View style={styles.list}>
        {names.map((name, i) => {
          const on = chosen === i;
          return (
            <Pressable
              key={i}
              disabled={mode === 'draw'}
              onPress={() => pickBull(i)}
              style={[styles.row, on && styles.rowOn]}
            >
              <OcheText variant="h3" color={on ? C.onAmber : C.cream} numberOfLines={1}>{name}</OcheText>
              {on && <OcheText variant="labelMd" allCaps color={C.onAmber}>★</OcheText>}
            </Pressable>
          );
        })}
      </View>

      {/* Action */}
      {mode === 'draw' && chosen === null && (
        <OcheButton label="Lancer le tirage" onPress={runDraw} variant="amber" size="lg" fullWidth />
      )}
      {mode === 'draw' && chosen !== null && (
        <View style={styles.confirmWrap}>
          {!spinning && (
            <OcheText variant="h2" color={C.amber} style={styles.winner}>
              {names[chosen]} commence !
            </OcheText>
          )}
          <View style={styles.confirmRow}>
            <OcheButton label="Rejouer" onPress={runDraw} variant="secondary" size="md" style={{ flex: 1 }} disabled={spinning} />
            <OcheButton label="C'est parti" onPress={() => onChoose(chosen)} variant="primary" size="md" style={{ flex: 1 }} disabled={spinning} />
          </View>
        </View>
      )}
      {mode === 'bull' && (
        <OcheButton
          label={chosen !== null ? `${names[chosen]} commence →` : 'Touche le gagnant'}
          onPress={() => chosen !== null && onChoose(chosen)}
          variant="amber"
          size="lg"
          fullWidth
          disabled={chosen === null}
        />
      )}

      <Pressable onPress={() => onChoose(0)} hitSlop={8} style={styles.skip}>
        <OcheText variant="labelSm" allCaps color={C.fg3}>Passer · {names[0]} commence</OcheText>
      </Pressable>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  overlay: {
    backgroundColor: C.walnut,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s6,
    gap: Spacing.s3,
  },
  eyebrow: { letterSpacing: 2 },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.border1, overflow: 'hidden', alignSelf: 'stretch', marginTop: Spacing.s2 },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: C.walnutUp },
  segBtnActive: { backgroundColor: C.amber },
  segText: { letterSpacing: 1, fontWeight: '700' },
  hint: { textAlign: 'center' },
  list: { alignSelf: 'stretch', gap: Spacing.s2, marginVertical: Spacing.s2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
  },
  rowOn: { backgroundColor: C.amber, borderColor: C.amber },
  confirmWrap: { alignSelf: 'stretch', gap: Spacing.s2 },
  winner: { textAlign: 'center' },
  confirmRow: { flexDirection: 'row', gap: Spacing.s2 },
  skip: { marginTop: Spacing.s3, paddingVertical: Spacing.s2 },
});
