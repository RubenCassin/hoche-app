import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { updateMe, deleteMe, apiErrorMessage } from '@/services/api';
import { queryClient } from '@/services/queryClient';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const logout = useAuthStore((s) => s.logout);

  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; error: boolean } | null>(null);

  const [deletePw, setDeletePw] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delMsg, setDelMsg] = useState<string | null>(null);

  const saveIdentity = async () => {
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateMe({ name: name.trim(), avatarUrl: avatarUrl.trim() || null });
      await refreshUser();
      setMsg({ text: 'Profil mis à jour ✓', error: false });
    } catch (e) {
      setMsg({ text: apiErrorMessage(e), error: true });
    }
    setSaving(false);
  };

  const savePassword = async () => {
    if (pwSaving) return;
    setPwSaving(true);
    setPwMsg(null);
    try {
      await updateMe({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw('');
      setNewPw('');
      setPwMsg({ text: 'Mot de passe changé ✓', error: false });
    } catch (e) {
      setPwMsg({ text: apiErrorMessage(e), error: true });
    }
    setPwSaving(false);
  };

  const doDelete = async () => {
    if (deleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setDelMsg(null);
    try {
      await deleteMe(deletePw);
      queryClient.clear();
      logout();
      router.replace('/auth');
    } catch (e) {
      setDelMsg(apiErrorMessage(e));
      setDeleting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader
        title="Modifier le profil"
        bell={false}
        left={
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* ── Identité ── */}
        <View style={styles.card}>
          <OcheText variant="h5" allCaps color={C.fg2} style={styles.cardTitle}>Identité</OcheText>

          <View style={styles.avatarRow}>
            <MonogramPortrait name={name || '?'} avatarUrl={avatarUrl.trim() || null} size={72} shape="square" />
            <View style={{ flex: 1, gap: Spacing.s1 }}>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Avatar (URL d’image)</OcheText>
              <TextInput
                style={styles.input}
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                placeholder="https://… (vide = monogramme)"
                placeholderTextColor={C.fg3}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={{ gap: Spacing.s1 }}>
            <OcheText variant="labelSm" allCaps color={C.fg3}>Nom affiché</OcheText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ton nom"
              placeholderTextColor={C.fg3}
              maxLength={40}
              autoCapitalize="words"
            />
          </View>

          {msg && (
            <OcheText variant="bodySm" color={msg.error ? C.brick : C.win}>{msg.text}</OcheText>
          )}
          <OcheButton label="Enregistrer" onPress={saveIdentity} variant="amber" size="md" fullWidth loading={saving} />
        </View>

        {/* ── Mot de passe ── */}
        <View style={styles.card}>
          <OcheText variant="h5" allCaps color={C.fg2} style={styles.cardTitle}>Mot de passe</OcheText>
          <TextInput
            style={styles.input}
            value={currentPw}
            onChangeText={setCurrentPw}
            placeholder="Mot de passe actuel"
            placeholderTextColor={C.fg3}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={newPw}
            onChangeText={setNewPw}
            placeholder="Nouveau (8 car. min., lettre + chiffre)"
            placeholderTextColor={C.fg3}
            secureTextEntry
          />
          {pwMsg && (
            <OcheText variant="bodySm" color={pwMsg.error ? C.brick : C.win}>{pwMsg.text}</OcheText>
          )}
          <OcheButton
            label="Changer le mot de passe"
            onPress={savePassword}
            variant="secondary"
            size="md"
            fullWidth
            loading={pwSaving}
            disabled={!currentPw || !newPw}
          />
        </View>

        {/* ── Zone danger ── */}
        <View style={[styles.card, styles.dangerCard]}>
          <OcheText variant="h5" allCaps color={C.brick} style={styles.cardTitle}>Zone danger</OcheText>
          <OcheText variant="bodySm" color={C.fg3}>
            Supprimer ton compte efface définitivement tes parties, stats, badges, posts et abonnements. Aucun retour en arrière.
          </OcheText>
          <TextInput
            style={styles.input}
            value={deletePw}
            onChangeText={(v) => { setDeletePw(v); setConfirmDelete(false); }}
            placeholder="Mot de passe pour confirmer"
            placeholderTextColor={C.fg3}
            secureTextEntry
          />
          {delMsg && <OcheText variant="bodySm" color={C.brick}>{delMsg}</OcheText>}
          <OcheButton
            label={confirmDelete ? 'Confirmer la suppression définitive' : 'Supprimer mon compte'}
            onPress={doDelete}
            variant="primary"
            size="md"
            fullWidth
            loading={deleting}
            disabled={!deletePw}
          />
          {confirmDelete && (
            <OcheText variant="bodyXS" color={C.fg3} style={{ textAlign: 'center' }}>
              Appuie une seconde fois pour supprimer — dernière chance d’annuler.
            </OcheText>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  scroll: { padding: Spacing.s4, gap: Spacing.s3, paddingBottom: Spacing.s10 },
  card: {
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.none,
    padding: Spacing.s4,
    gap: Spacing.s3,
  },
  cardTitle: { letterSpacing: 1 },
  dangerCard: { borderColor: C.brick },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
  input: {
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp2,
    color: C.cream,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 10,
    fontSize: 15,
    borderRadius: Radii.none,
  },
});
