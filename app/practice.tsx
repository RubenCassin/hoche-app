import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { SectionLabel, type SectionIconName } from '@/components/SectionLabel';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DRILLS, CATEGORY_LABEL, type DrillCategory } from '@/hooks/practiceDrills';
import { usePracticeStore } from '@/hooks/usePracticeStore';

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
  });
