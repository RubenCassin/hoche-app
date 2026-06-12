import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { DartPad, DartModifier } from '@/components/DartPad';
import { DartboardInput } from '@/components/DartboardInput';
import { QuickPad } from '@/components/QuickPad';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { DartEntry } from '@/hooks/useGameStore';
import { getDrill, type DrillState } from '@/hooks/practiceDrills';
import { usePracticeStore } from '@/hooks/usePracticeStore';

function dartLabel(d?: DartEntry): string {
  if (!d) return '—';
  if (d.segment === 0) return 'M';
  if (d.segment === 25) return d.points === 50 ? 'BULL' : '25';
  return `${d.modifier !== 'S' ? d.modifier : ''}${d.segment}`;
}

export default function PracticeRunScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const params = useLocalSearchParams<{ drill?: string }>();
  const drill = getDrill(params.drill ?? '');
  const addResult = usePracticeStore((s) => s.addResult);
  const records = usePracticeStore((s) => s.records);

  const [state, setState] = useState<DrillState | null>(() => drill?.init() ?? null);
  const [visit, setVisit] = useState<DartEntry[]>([]);
  const [history, setHistory] = useState<{ state: DrillState; visit: DartEntry[] }[]>([]);
  const [view, setView] = useState<'quick' | 'grid' | 'board'>(drill?.focus ? 'quick' : 'grid');
  const [isRecord, setIsRecord] = useState(false);
  const savedRef = useRef(false);

  // Save the result once the drill is finished.
  useEffect(() => {
    if (!drill || !state || !state.done || savedRef.current) return;
    savedRef.current = true;
    setIsRecord(addResult(drill.key, drill.result(state), drill.higherIsBetter ?? true));
  }, [state?.done]);

  if (!drill || !state) {
    return (
      <View style={[styles.container, styles.center]}>
        <OcheText variant="bodyMd" color={C.fg3}>Drill introuvable.</OcheText>
        <OcheButton label="Retour" onPress={() => router.replace('/practice')} variant="secondary" size="md" />
      </View>
    );
  }

  const score = (points: number, modifier: DartModifier, segment: number) => {
    if (state.done) return;
    // If the previous dart closed a round, the 3 chips were kept on screen —
    // clear them now that a new round begins.
    const curVisit = state.dartsThisRound === 0 && visit.length > 0 ? [] : visit;
    if (curVisit.length >= 3) return;
    const d: DartEntry = { points, modifier, segment };
    setHistory((h) => [...h, { state, visit }]);
    setState(drill.applyDart(state, d));
    setVisit([...curVisit, d]);
  };

  const undo = () => {
    if (history.length === 0 || state.done) return;
    const prev = history[history.length - 1];
    setState(prev.state);
    setVisit(prev.visit);
    setHistory((h) => h.slice(0, -1));
  };

  const restart = () => {
    setState(drill.init());
    setVisit([]);
    setHistory([]);
    setIsRecord(false);
    savedRef.current = false;
  };

  const focusTv = drill.focus ? drill.focus(state) : null;
  const rec = records[drill.key];
  const progressPct = Math.round(Math.min(1, drill.rounds > 0 ? state.round / drill.rounds : 0) * 100);

  const back = (
    <Pressable onPress={() => router.replace('/practice')} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Drills</OcheText>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title={drill.name} left={back} bell={false} />

      <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={false} keyboardShouldPersistTaps="handled">
        {/* Prompt + progress */}
        <View style={styles.head}>
          <OcheText variant="labelSm" allCaps color={C.fg3}>{drill.progress(state)}</OcheText>
          <OcheText variant="h3" color={C.amber} style={styles.prompt}>{drill.prompt(state)}</OcheText>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>

        {/* Live score + record to beat */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCol}>
            <OcheText variant="labelSm" allCaps color={C.fg3}>Score</OcheText>
            <OcheText variant="displayLg" color={C.cream}>{drill.liveScore(state)}</OcheText>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreCol}>
            <OcheText variant="labelSm" allCaps color={C.fg3}>★ Record</OcheText>
            <OcheText variant="displaySm" color={rec ? C.amber : C.fg3}>{rec ? rec.best : '—'}</OcheText>
            <OcheText variant="monoSm" color={C.fg3}>{rec ? drill.unit : 'premier essai'}</OcheText>
          </View>
        </View>

        {/* Input mode toggle */}
        <View style={styles.seg}>
          {(focusTv != null
            ? ([['quick', 'Rapide'], ['grid', 'Grille'], ['board', 'Cible']] as const)
            : ([['grid', 'Grille'], ['board', 'Cible']] as const)
          ).map(([v, label]) => {
            const active = view === v;
            return (
              <Pressable key={v} onPress={() => setView(v)} style={[styles.segBtn, active && styles.segBtnActive]}>
                <OcheText variant="labelMd" allCaps color={active ? C.onAmber : C.fg2} style={styles.segText}>{label}</OcheText>
              </Pressable>
            );
          })}
        </View>

        {/* Visit recap */}
        <View style={styles.recap}>
          {[0, 1, 2].map((i) => {
            const d = visit[i];
            return (
              <View key={i} style={[styles.chip, d ? styles.chipFilled : styles.chipEmpty]}>
                <OcheText variant="monoSm" color={d ? C.cream : C.fg3}>{dartLabel(d)}</OcheText>
              </View>
            );
          })}
        </View>

        {/* Input */}
        {focusTv != null && view === 'quick' ? (
          <QuickPad target={focusTv} disabled={state.done} onScore={score} onUndo={undo} style={styles.pad} />
        ) : view === 'board' ? (
          <DartboardInput onScore={score} onUndo={undo} style={styles.pad} disabled={state.done} />
        ) : (
          <DartPad onScore={score} onUndo={undo} style={styles.pad} disabled={state.done} />
        )}
      </ScrollView>

      {/* Result overlay */}
      {state.done && (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { paddingTop: insets.top + Spacing.s8, paddingBottom: insets.bottom + Spacing.s6 }]}>
          <OcheText variant="labelSm" allCaps color={C.amber} style={styles.overEyebrow}>
            Entraînement terminé · {drill.name}
          </OcheText>
          {isRecord && (
            <OcheText variant="labelMd" allCaps color={C.win} style={styles.recordBadge}>★ Nouveau record</OcheText>
          )}
          <OcheText variant="displayXL" color={C.amber}>{drill.result(state)}</OcheText>
          <OcheText variant="labelMd" allCaps color={C.fg3}>{drill.unit}</OcheText>
          {drill.resultNote && (
            <OcheText variant="monoMd" color={C.fg2} style={styles.note}>{drill.resultNote(state)}</OcheText>
          )}
          <View style={styles.actions}>
            <OcheButton label="Recommencer" onPress={restart} variant="primary" size="lg" fullWidth />
            <OcheButton label="Autres drills" onPress={() => router.replace('/practice')} variant="secondary" size="md" fullWidth />
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.s4 },
    scroll: { paddingHorizontal: Spacing.s3, paddingTop: Spacing.s3, gap: Spacing.s3, flexGrow: 1 },
    head: { alignItems: 'center', gap: 2 },
    prompt: { textAlign: 'center' },
    progressTrack: {
      height: 6,
      backgroundColor: C.walnutUp2,
      borderWidth: 1,
      borderColor: C.border1,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: C.amber },
    scoreCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      borderLeftWidth: 3,
      borderLeftColor: C.amber,
      borderRadius: Radii.lg,
      paddingVertical: Spacing.s3,
    },
    scoreCol: { flex: 1, alignItems: 'center', gap: 1 },
    scoreDivider: { width: 1, alignSelf: 'stretch', backgroundColor: C.border1, marginVertical: Spacing.s2 },
    seg: { flexDirection: 'row', borderWidth: 1, borderColor: C.border1, overflow: 'hidden' },
    segBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: C.walnutUp },
    segBtnActive: { backgroundColor: C.amber },
    segText: { letterSpacing: 1, fontWeight: '700' },
    recap: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
    chip: {
      minWidth: 52,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderWidth: 1,
      alignItems: 'center',
    },
    chipEmpty: { borderColor: C.border2, borderStyle: 'dashed' },
    chipFilled: { backgroundColor: C.walnutUp2, borderColor: C.border1 },
    pad: { flex: 1 },
    overlay: {
      backgroundColor: C.walnut,
      zIndex: 150,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.s6,
      gap: Spacing.s2,
    },
    overEyebrow: { letterSpacing: 2, marginBottom: Spacing.s2 },
    recordBadge: { letterSpacing: 2 },
    note: { marginTop: Spacing.s2 },
    actions: { alignSelf: 'stretch', marginTop: Spacing.s8, gap: Spacing.s3 },
  });
