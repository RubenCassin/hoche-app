import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { SectionLabel, type SectionIconName } from '@/components/SectionLabel';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DRILLS, CATEGORY_LABEL, customDrillKey, type DrillCategory } from '@/hooks/practiceDrills';
import { usePracticeStore } from '@/hooks/usePracticeStore';

const DARTS_CHOICES = [3, 6, 9];

const CATEGORY_ORDER: DrillCategory[] = ['score', 'doubles', 'checkout', 'parcours'];
const CAT_ICON: Partial<Record<DrillCategory, SectionIconName>> = {
  score: 'target',
  doubles: 'flag',
  checkout: 'trophy',
  parcours: 'layers',
};

export default function PracticeScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const records = usePracticeStore((s) => s.records);

  // Drill perso : cible (fermeture) + nombre de fléchettes par tentative.
  const [target, setTarget] = useState(121);
  const [darts, setDarts] = useState(6);
  const customRec = records[customDrillKey(target, darts)];
  const calcRec = records['calc_checkout'];
  const bumpTarget = (delta: number) => setTarget((t) => Math.max(2, Math.min(180, t + delta)));
  const playCustom = () =>
    router.push({ pathname: '/practice-run', params: { drill: 'custom', target: String(target), darts: String(darts) } });

  const back = (
    <Pressable onPress={() => router.replace('/tabs')} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Accueil</OcheText>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Entraînement" left={back} bell={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <OcheText variant="bodySm" color={C.fg3} style={styles.intro}>
          Des drills solo pour bosser les doubles, les checkouts et le scoring. Ton record est gardé.
        </OcheText>

        {/* ── Entraînement perso ── */}
        <View style={styles.section}>
          <SectionLabel icon="sliders" variant="h5" iconSize={17}>Perso</SectionLabel>
          <View style={styles.customCard}>
            <OcheText variant="bodySm" color={C.fg3}>
              Choisis la fermeture à travailler et le nombre de fléchettes par tentative.
            </OcheText>

            {/* Cible (finish) */}
            <View style={styles.customRow}>
              <OcheText variant="labelMd" allCaps color={C.fg2}>Fermeture</OcheText>
              <View style={styles.stepper}>
                <Pressable onPress={() => bumpTarget(-1)} hitSlop={8} style={styles.stepBtn}>
                  <OcheText variant="h3" color={C.cream}>–</OcheText>
                </Pressable>
                <OcheText variant="displaySm" color={C.amber} style={styles.stepVal}>{target}</OcheText>
                <Pressable onPress={() => bumpTarget(1)} hitSlop={8} style={styles.stepBtn}>
                  <OcheText variant="h3" color={C.cream}>+</OcheText>
                </Pressable>
              </View>
            </View>
            <View style={styles.quickTargets}>
              {[40, 61, 100, 121, 170].map((v) => (
                <Pressable key={v} onPress={() => setTarget(v)} style={[styles.quickChip, target === v && styles.quickChipActive]}>
                  <OcheText variant="labelSm" color={target === v ? C.onAmber : C.fg2}>{v}</OcheText>
                </Pressable>
              ))}
            </View>

            {/* Fléchettes par tentative */}
            <View style={styles.customRow}>
              <OcheText variant="labelMd" allCaps color={C.fg2}>Fléchettes</OcheText>
              <View style={styles.dartsSeg}>
                {DARTS_CHOICES.map((d) => (
                  <Pressable key={d} onPress={() => setDarts(d)} style={[styles.dartsBtn, darts === d && styles.dartsBtnActive]}>
                    <OcheText variant="labelMd" allCaps color={darts === d ? C.onAmber : C.fg2}>{d}</OcheText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.recordRow}>
              <OcheText variant="monoSm" color={customRec ? C.amber : C.fg3}>
                {customRec ? `★ Record : ${customRec.best} / 10` : 'Aucun essai'}
              </OcheText>
              <OcheText variant="monoSm" color={C.fg3}>{target} en {darts} fl.</OcheText>
            </View>
            <OcheButton label="Jouer →" onPress={playCustom} variant="amber" size="md" fullWidth />
          </View>
        </View>

        {/* ── Entraînement calcul (sans fléchettes) ── */}
        <View style={styles.section}>
          <SectionLabel icon="sliders" variant="h5" iconSize={17}>Calcul</SectionLabel>
          <Pressable
            onPress={() => router.push('/practice-calc')}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.cardTop}>
              <OcheText variant="h3" color={C.cream}>🧮 Calcul de checkout</OcheText>
              <OcheText variant="labelMd" allCaps color={C.amber}>Jouer →</OcheText>
            </View>
            <OcheText variant="bodySm" color={C.fg3}>
              Sans fléchettes : 10 questions, trouve la bonne combinaison pour fermer le score affiché.
            </OcheText>
            <View style={styles.recordRow}>
              <OcheText variant="monoSm" color={calcRec ? C.amber : C.fg3}>
                {calcRec ? `★ Record : ${calcRec.best} / 10` : 'Aucun essai'}
              </OcheText>
            </View>
          </Pressable>
        </View>

        {CATEGORY_ORDER.map((cat) => {
          const drills = DRILLS.filter((d) => d.category === cat);
          if (drills.length === 0) return null;
          return (
            <View key={cat} style={styles.section}>
              <SectionLabel icon={CAT_ICON[cat] ?? 'target'} variant="h5" iconSize={17}>
                {CATEGORY_LABEL[cat]}
              </SectionLabel>
              {drills.map((d) => {
                const rec = records[d.key];
                return (
                  <Pressable
                    key={d.key}
                    onPress={() => router.push({ pathname: '/practice-run', params: { drill: d.key } })}
                    style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
                  >
                    <View style={styles.cardTop}>
                      <OcheText variant="h3" color={C.cream}>{d.name}</OcheText>
                      <OcheText variant="labelMd" allCaps color={C.amber}>Jouer →</OcheText>
                    </View>
                    <OcheText variant="bodySm" color={C.fg3}>{d.desc}</OcheText>
                    <View style={styles.recordRow}>
                      <OcheText variant="monoSm" color={rec ? C.amber : C.fg3}>
                        {rec ? `★ Record : ${rec.best} ${d.unit}` : 'Aucun essai'}
                      </OcheText>
                      {rec && (
                        <OcheText variant="monoSm" color={C.fg3}>
                          {rec.attempts} essai{rec.attempts > 1 ? 's' : ''} · dernier {rec.last}
                        </OcheText>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s3, paddingBottom: Spacing.s10, gap: Spacing.s3 },
    intro: { marginBottom: Spacing.s1 },
    section: { gap: Spacing.s2, marginTop: Spacing.s2 },
    sectionTitle: { letterSpacing: 1 },
    card: {
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      borderLeftWidth: 3,
      borderLeftColor: C.amber,
      borderRadius: Radii.lg,
      padding: Spacing.s4,
      gap: Spacing.s2,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    recordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.s1 },
    customCard: {
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.amber,
      borderRadius: Radii.lg,
      padding: Spacing.s4,
      gap: Spacing.s3,
    },
    customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
    stepBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border1,
      backgroundColor: C.walnutUp2,
    },
    stepVal: { minWidth: 56, textAlign: 'center' },
    quickTargets: { flexDirection: 'row', gap: Spacing.s2, flexWrap: 'wrap' },
    quickChip: {
      paddingHorizontal: Spacing.s3,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: C.border1,
      backgroundColor: C.walnutUp2,
    },
    quickChipActive: { backgroundColor: C.amber, borderColor: C.amber },
    dartsSeg: { flexDirection: 'row', borderWidth: 1, borderColor: C.border1, overflow: 'hidden' },
    dartsBtn: { paddingHorizontal: Spacing.s4, paddingVertical: 8, backgroundColor: C.walnutUp2, minWidth: 48, alignItems: 'center' },
    dartsBtnActive: { backgroundColor: C.amber },
  });
