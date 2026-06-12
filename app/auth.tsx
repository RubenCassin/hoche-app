import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { OcheLogo } from '@/components/OcheLogo';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const C = useTheme();
  const styles = makeStyles(C);

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (isRegister) await register(name, username, password);
      else await login(username, password);
      // On success the auth gate redirects automatically.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <OcheLogo markSize={64} wordSize={40} style={{ flexDirection: 'column', gap: Spacing.s3 }} />
          </View>

          <OcheText variant="labelMd" allCaps color={C.fg3} style={styles.tagline}>
            {isRegister ? 'Crée ton compte' : 'Connecte-toi'}
          </OcheText>

          <View style={styles.form}>
            {isRegister && (
              <View style={styles.field}>
                <OcheText variant="labelSm" allCaps color={C.fg3}>Nom</OcheText>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Marc Dumont"
                  placeholderTextColor={C.fg3}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            )}

            <View style={styles.field}>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Pseudo</OcheText>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(v) => setUsername(v.replace(/\s/g, ''))}
                placeholder="@marcd"
                placeholderTextColor={C.fg3}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Mot de passe</OcheText>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor={C.fg3}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            </View>

            {error && (
              <OcheText variant="bodySm" color={C.loss} style={styles.error}>
                {error}
              </OcheText>
            )}

            <OcheButton
              label={isRegister ? 'Créer le compte' : 'Connexion'}
              onPress={submit}
              loading={busy}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: Spacing.s2 }}
            />

            <Pressable
              onPress={() => {
                setError(null);
                setMode(isRegister ? 'login' : 'register');
              }}
              style={styles.switch}
            >
              <OcheText variant="bodySm" color={C.fg3}>
                {isRegister ? 'Déjà un compte ? ' : 'Pas de compte ? '}
                <OcheText variant="bodySm" color={C.amber}>
                  {isRegister ? 'Se connecter' : "S'inscrire"}
                </OcheText>
              </OcheText>
            </Pressable>

            {/* Guest / offline party mode */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <OcheText variant="labelSm" allCaps color={C.fg3}>ou</OcheText>
              <View style={styles.dividerLine} />
            </View>
            <OcheButton
              label="🎯 Jouer en invité (hors-ligne)"
              onPress={() => continueAsGuest()}
              variant="secondary"
              size="md"
              fullWidth
            />
            <OcheText variant="bodyXS" color={C.fg3} style={{ textAlign: 'center' }}>
              Pour une soirée entre potes — parties locales sans compte. Les stats, le classement et le online nécessitent un compte.
            </OcheText>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.s6,
    gap: Spacing.s4,
  },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.s2 },
  tagline: { textAlign: 'center', letterSpacing: 2 },
  form: { gap: Spacing.s4, marginTop: Spacing.s4 },
  field: { gap: Spacing.s1 },
  input: {
    backgroundColor: C.walnutUp,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: C.border1,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    color: C.cream,
    fontFamily: 'Manrope',
    fontSize: 16,
  },
  error: {
    backgroundColor: 'rgba(139,26,26,0.15)',
    borderWidth: 1,
    borderColor: C.loss,
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s2,
  },
  cta: {
    backgroundColor: C.brick,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.s4,
    alignItems: 'center',
    marginTop: Spacing.s2,
  },
  ctaPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  switch: { alignItems: 'center', paddingVertical: Spacing.s2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3, marginTop: Spacing.s1 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border1 },
});
