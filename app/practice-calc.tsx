import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { solveCheckout } from '@/components/CheckoutPill';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePracticeStore } from '@/hooks/usePracticeStore';

// Entraînement calcul (sans fléchettes) : QCM de checkout. Le solveur donne la
// bonne route ; les leurres sont des routes valides d'autres nombres.
const TOTAL = 10;
const RECORD_KEY = 'calc_checkout';

const VALID: number[] = (() => {
  const a: number[] = [];
  for (let n = 2; n <= 170; n++) if (solveCheckout(n, 3, 'double')) a.push(n);
  return a;
})();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const routeOf = (n: number): string => (solveCheckout(n, 3, 'double') || []).join('  ');

interface Q { target: number; options: string[]; correct: string }
function makeQuestion(): Q {
  const target = VALID[Math.floor(Math.random() * VALID.length)];
  const correct = routeOf(target);
  const distract = new Set<string>();
  let guard = 0;
  while (distract.size < 3 && guard++ < 80) {
    const m = VALID[Math.floor(Math.random() * VALID.length)];
    const s = routeOf(m);
    if (s && s !== correct && !distract.has(s)) distract.add(s);
  }
  return { target, options: shuffle([correct, ...distract]), correct };
}

export default function PracticeCalcScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const addResult = usePracticeStore((s) => s.addResult);
  const rec = usePracticeStore((s) => s.records[RECORD_KEY]);

  const [qs, setQs] = useState<Q[]>(() => Array.from({ length: TOTAL }, makeQuestion));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isRecord, setIsRecord] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restart = () => { setQs(Array.from({ length: TOTAL }, makeQuestion)); setI(0); setScore(0); setPicked(null); setDone(false); setIsRecord(false); };

  const q = qs[i];
  const pick = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const correct = opt === q.correct;
    Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    const newScore = score + (correct ? 1 : 0);
    setScore(newScore);
    timer.current = setTimeout(() => {
      if (i + 1 >= TOTAL) { setDone(true); setIsRecord(addResult(RECORD_KEY, newScore, true)); }
      else { setI(i + 1); setPicked(null); }
    }, 850);
  };

  const back = (
    <Pressable onPress={() => { if (timer.current) clearTimeout(timer.current); router.back(); }} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Entraînement</OcheText>
    </Pressable>
  );

  if (done) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <OcheHeader title="Calcul" left={back} bell={false} />
        <View style={styles.center}>
          <OcheText variant="labelSm" allCaps color={C.amber}>Calcul · terminé</OcheText>
          {isRecord && <OcheText variant="bodyMd" color={C.win}>★ Nouveau record !</OcheText>}
          <OcheText variant="displayLg" color={C.cream}>{score}<OcheText variant="h3" color={C.fg2}> / {TOTAL}</OcheText></OcheText>
          {!!rec && <OcheText variant="monoSm" color={C.fg3}>Record : {rec.best} / {TOTAL}</OcheText>}
          <View style={styles.endActions}>
            <OcheButton label="Recommencer" onPress={restart} variant="primary" size="md" />
            <OcheButton label="Quitter" onPress={() => router.back()} variant="secondary" size="md" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Calcul" subtitle={`Question ${i + 1}/${TOTAL} · score ${score}`} left={back} bell={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <OcheText variant="h4" color={C.cream} style={styles.q}>Comment fermer</OcheText>
        <OcheText variant="displayLg" color={C.amber} style={styles.target}>{q.target}</OcheText>

        <View style={styles.options}>
          {q.options.map((opt) => {
            const good = !!picked && opt === q.correct;
            const bad = !!picked && opt === picked && opt !== q.correct;
            return (
              <Pressable
                key={opt}
                disabled={!!picked}
                onPress={() => pick(opt)}
                style={[styles.option, good && styles.optionGood, bad && styles.optionBad]}
              >
                <OcheText variant="monoMd" color={good || bad ? '#fff' : C.cream} style={{ fontWeight: '700', letterSpacing: 1 }}>{opt}</OcheText>
              </Pressable>
            );
          })}
        </View>
        <OcheText variant="bodyXS" color={C.fg3} style={styles.hint}>
          Sortie au double — trouve la combinaison qui ferme exactement {q.target}.
        </OcheText>
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.s2, paddingHorizontal: Spacing.s6 },
    endActions: { flexDirection: 'row', gap: Spacing.s2, marginTop: Spacing.s4 },
    scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s4, paddingBottom: Spacing.s10, alignItems: 'center' },
    q: { marginTop: Spacing.s2 },
    target: { fontSize: 84, lineHeight: 88, marginBottom: Spacing.s4 },
    options: { alignSelf: 'stretch', gap: Spacing.s2 },
    option: {
      borderWidth: 1, borderColor: C.border1, backgroundColor: C.walnutUp,
      paddingVertical: Spacing.s4, alignItems: 'center', borderRadius: Radii.none,
    },
    optionGood: { backgroundColor: C.win, borderColor: C.win },
    optionBad: { backgroundColor: C.brick, borderColor: C.brick },
    hint: { textAlign: 'center', marginTop: Spacing.s3 },
  });
