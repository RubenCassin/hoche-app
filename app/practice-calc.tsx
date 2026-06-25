import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePracticeStore } from '@/hooks/usePracticeStore';
import { makeCalcQuestion, CALC_MODES, type CalcMode, type CalcQuestion } from '@/hooks/calcModes';

const TOTAL = 10;

export default function PracticeCalcScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (CALC_MODES.find((m) => m.key === params.mode)?.key ?? 'checkout') as CalcMode;
  const cfg = CALC_MODES.find((m) => m.key === mode)!;
  const recKey = `calc_${mode}`;

  const addResult = usePracticeStore((s) => s.addResult);
  const rec = usePracticeStore((s) => s.records[recKey]);

  const [qs, setQs] = useState<CalcQuestion[]>(() => Array.from({ length: TOTAL }, () => makeCalcQuestion(mode)));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [entry, setEntry] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [isRecord, setIsRecord] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = qs[i];
  const isNum = !q.options;

  const next = (correct: boolean) => {
    Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    const ns = score + (correct ? 1 : 0);
    setScore(ns);
    timer.current = setTimeout(() => {
      if (i + 1 >= TOTAL) { setDone(true); setIsRecord(addResult(recKey, ns, true)); }
      else { setI(i + 1); setPicked(null); setEntry(''); setRevealed(false); }
    }, 850);
  };
  const pickOpt = (opt: string) => { if (picked) return; setPicked(opt); next(opt === q.answer); };
  const submitNum = () => { if (revealed || entry === '') return; setRevealed(true); next(entry === q.answer); };
  const restart = () => { setQs(Array.from({ length: TOTAL }, () => makeCalcQuestion(mode))); setI(0); setScore(0); setPicked(null); setEntry(''); setRevealed(false); setDone(false); setIsRecord(false); };

  const back = (
    <Pressable onPress={() => { if (timer.current) clearTimeout(timer.current); router.back(); }} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Entraînement</OcheText>
    </Pressable>
  );

  if (done) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <OcheHeader title={cfg.name} left={back} bell={false} />
        <View style={styles.center}>
          <OcheText variant="labelSm" allCaps color={C.amber}>Terminé</OcheText>
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
      <OcheHeader title={cfg.name} subtitle={`${i + 1}/${TOTAL} · score ${score}`} left={back} bell={false} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <OcheText variant={q.big ? 'h4' : 'displaySm'} color={C.cream} style={styles.prompt}>{q.prompt}</OcheText>
        {!!q.big && <OcheText variant="displayLg" color={C.amber} style={styles.target}>{q.big}</OcheText>}

        {q.options ? (
          <View style={styles.options}>
            {q.options.map((opt) => {
              const good = !!picked && opt === q.answer;
              const bad = !!picked && opt === picked && opt !== q.answer;
              return (
                <Pressable key={opt} disabled={!!picked} onPress={() => pickOpt(opt)} style={[styles.option, good && styles.optionGood, bad && styles.optionBad]}>
                  <OcheText variant="monoMd" color={good || bad ? '#fff' : C.cream} style={styles.optionTxt}>{opt}</OcheText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.numWrap}>
            <TextInput
              style={[styles.numInput, revealed && (entry === q.answer ? styles.numGood : styles.numBad)]}
              value={entry}
              onChangeText={(v) => !revealed && setEntry(v.replace(/[^0-9]/g, '').slice(0, 3))}
              keyboardType="number-pad"
              placeholder="?"
              placeholderTextColor={C.fg3}
              editable={!revealed}
              returnKeyType="done"
              onSubmitEditing={submitNum}
            />
            {revealed && entry !== q.answer && (
              <OcheText variant="bodySm" color={C.fg3} style={styles.reveal}>Réponse : <OcheText variant="bodySm" color={C.win}>{q.answer}</OcheText></OcheText>
            )}
            <OcheButton label="Valider" onPress={submitNum} variant="primary" size="md" disabled={revealed || entry === ''} fullWidth />
          </View>
        )}

        {!!q.hint && <OcheText variant="bodyXS" color={C.fg3} style={styles.hint}>{q.hint}</OcheText>}
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
    prompt: { marginTop: Spacing.s2, textAlign: 'center' },
    target: { fontSize: 84, lineHeight: 88, marginBottom: Spacing.s4 },
    options: { alignSelf: 'stretch', gap: Spacing.s2, marginTop: Spacing.s2 },
    option: { borderWidth: 1, borderColor: C.border1, backgroundColor: C.walnutUp, paddingVertical: Spacing.s4, alignItems: 'center' },
    optionGood: { backgroundColor: C.win, borderColor: C.win },
    optionBad: { backgroundColor: C.brick, borderColor: C.brick },
    optionTxt: { fontWeight: '700', letterSpacing: 1 },
    numWrap: { alignSelf: 'stretch', gap: Spacing.s3, marginTop: Spacing.s2, maxWidth: 320, width: '100%' },
    numInput: {
      backgroundColor: C.walnutUp2, borderWidth: 1, borderColor: C.border1, color: C.amber,
      fontFamily: 'JetBrainsMono', fontSize: 44, textAlign: 'center', letterSpacing: 6, paddingVertical: Spacing.s3,
    },
    numGood: { borderColor: C.win, color: C.win },
    numBad: { borderColor: C.brick, color: C.brick },
    reveal: { textAlign: 'center' },
    hint: { textAlign: 'center', marginTop: Spacing.s3 },
  });
