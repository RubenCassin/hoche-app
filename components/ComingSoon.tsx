import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OcheText } from './OcheText';
import { OcheMark } from './OcheLogo';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ComingSoonProps {
  title: string;
  subtitle?: string;
}

/** Branded placeholder for screens that aren't built yet. */
export function ComingSoon({ title, subtitle }: ComingSoonProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  return (
    <View style={styles.wrap}>
      <View style={styles.markWrap}>
        <OcheMark size={64} />
      </View>
      <OcheText variant="displaySm" allCaps color={C.cream} style={styles.title}>
        {title}
      </OcheText>
      <View style={styles.badge}>
        <OcheText variant="labelSm" allCaps color={C.amber} style={styles.badgeText}>
          Bientôt
        </OcheText>
      </View>
      {subtitle && (
        <OcheText variant="bodyMd" color={C.fg3} style={styles.subtitle}>
          {subtitle}
        </OcheText>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.s8,
    gap: Spacing.s3,
  },
  markWrap: {
    opacity: 0.5,
    marginBottom: Spacing.s2,
  },
  title: {
    letterSpacing: 2,
    textAlign: 'center',
  },
  badge: {
    borderWidth: 1,
    borderColor: C.amber,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 4,
  },
  badgeText: {
    letterSpacing: 2,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.s2,
    lineHeight: 22,
  },
});
