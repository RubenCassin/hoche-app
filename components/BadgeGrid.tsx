import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { OcheText } from './OcheText';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { badgesFor, BADGES, type EarnedBadge } from '@/constants/badges';
import type { Stats } from '@/services/api';

interface BadgeGridProps {
  stats?: Stats | null;
  /** Heading text — "Badges" on your own profile, "Ses badges" on others'. */
  title?: string;
}

/** Achievements grid: earned badges in full colour, locked ones dimmed.
 *  Tap a badge for its detail card — how to earn it, and the progress so far. */
export function BadgeGrid({ stats, title = 'Badges' }: BadgeGridProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const items = badgesFor(stats);
  const earned = items.filter((b) => b.on).length;
  const [sel, setSel] = useState<EarnedBadge | null>(null);

  const prog = sel?.progress && stats ? sel.progress(stats) : null;
  const pct = prog ? Math.max(0, Math.min(1, prog.value / prog.target)) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <OcheText variant="h5" allCaps color={C.fg2} style={styles.title}>{title}</OcheText>
        <OcheText variant="monoSm" color={C.amber}>{earned}/{BADGES.length}</OcheText>
      </View>
      <View style={styles.grid}>
        {items.map((b) => (
          <Pressable key={b.id} onPress={() => setSel(b)} style={[styles.badge, !b.on && styles.locked]}>
            <OcheText variant="h2" style={!b.on ? styles.iconLocked : undefined}>{b.icon}</OcheText>
            <OcheText
              variant="bodyXS"
              color={b.on ? C.cream : C.fg3}
              numberOfLines={1}
              style={styles.name}
            >
              {b.name}
            </OcheText>
          </Pressable>
        ))}
      </View>

      {/* Detail card — any tap dismisses. */}
      <Modal visible={!!sel} transparent animationType="fade" onRequestClose={() => setSel(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSel(null)}>
          {sel && (
            <View style={[styles.sheet, sel.on && styles.sheetEarned]}>
              <OcheText variant="displayLg" style={!sel.on ? styles.iconLocked : undefined}>{sel.icon}</OcheText>
              <OcheText variant="h2" allCaps color={C.cream}>{sel.name}</OcheText>
              <OcheText variant="labelSm" allCaps color={sel.on ? C.amber : C.fg3} style={styles.status}>
                {sel.on ? '✓ Obtenu' : 'À débloquer'}
              </OcheText>
              <OcheText variant="bodyMd" color={C.fg2} style={styles.desc}>{sel.desc}</OcheText>
              {prog && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
                  </View>
                  <OcheText variant="monoSm" color={sel.on ? C.amber : C.fg3}>
                    {Math.round(prog.value * 10) / 10} / {prog.target}
                  </OcheText>
                </View>
              )}
              <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.dismissHint}>
                Toucher pour fermer
              </OcheText>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      backgroundColor: C.walnutUp,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: C.border1,
      padding: Spacing.s4,
      gap: Spacing.s3,
    },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { letterSpacing: 1 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s2 },
    badge: {
      width: '23%',
      flexGrow: 1,
      minWidth: 68,
      alignItems: 'center',
      gap: 2,
      paddingVertical: Spacing.s2,
      borderWidth: 1,
      borderColor: C.border2,
      backgroundColor: C.walnutUp2,
    },
    locked: { opacity: 0.35, backgroundColor: C.walnut },
    iconLocked: { opacity: 0.5 },
    name: { textAlign: 'center' },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.s5,
    },
    sheet: {
      alignSelf: 'stretch',
      alignItems: 'center',
      gap: Spacing.s2,
      backgroundColor: C.walnutUp2,
      borderWidth: 1,
      borderColor: C.border1,
      borderRadius: Radii.none,
      padding: Spacing.s5,
    },
    sheetEarned: { borderColor: C.amber },
    status: { letterSpacing: 1 },
    desc: { textAlign: 'center' },
    progressWrap: {
      alignSelf: 'stretch',
      alignItems: 'center',
      gap: Spacing.s1,
      marginTop: Spacing.s2,
    },
    progressTrack: {
      alignSelf: 'stretch',
      height: 6,
      backgroundColor: C.walnut,
      borderWidth: 1,
      borderColor: C.border1,
    },
    progressFill: { height: '100%', backgroundColor: C.amber },
    dismissHint: { marginTop: Spacing.s3, opacity: 0.7 },
  });
