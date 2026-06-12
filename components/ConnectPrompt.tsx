import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OcheHeader } from './OcheHeader';
import { OcheText } from './OcheText';
import { OcheButton } from './OcheButton';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';

/** Shown in account-only tabs while in guest (offline) mode. */
export function ConnectPrompt({ title, subtitle, icon }: { title: string; subtitle: string; icon?: string }) {
  const C = useTheme();
  const styles = makeStyles(C);
  const exitGuest = useAuthStore((s) => s.exitGuest);
  return (
    <View style={styles.container}>
      <OcheHeader title={title} bell={false} />
      <View style={styles.body}>
        <OcheText variant="displaySm">{icon ?? '🔒'}</OcheText>
        <OcheText variant="h2" color={C.cream} style={styles.center}>Réservé aux comptes</OcheText>
        <OcheText variant="bodyMd" color={C.fg3} style={styles.center}>{subtitle}</OcheText>
        <OcheButton
          label="Créer un compte / Se connecter"
          onPress={() => exitGuest()}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: Spacing.s4 }}
        />
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.s6, gap: Spacing.s3 },
    center: { textAlign: 'center' },
  });
