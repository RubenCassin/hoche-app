import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { getFollowing, createGroup, apiErrorMessage } from '@/services/api';

export default function NewGroupScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const myId = useAuthStore((s) => s.user?.id);

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: friends, isLoading } = useQuery({
    queryKey: ['following', myId],
    queryFn: () => getFollowing(myId!),
    enabled: !!myId,
  });

  const toggle = (uid: number) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const create = async () => {
    if (busy || !name.trim() || selected.size === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const conv = await createGroup(name.trim(), [...selected]);
      router.replace(`/chat/${conv.id}`);
    } catch (e) {
      setErr(apiErrorMessage(e));
      setBusy(false);
    }
  };

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Retour</OcheText>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Nouveau groupe" left={back} bell={false} />

      <View style={styles.nameBox}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nom du groupe (ex. Les Vendredis Fléchettes)"
          placeholderTextColor={C.fg3}
          maxLength={60}
        />
      </View>

      <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.sectionLabel}>
        Membres {selected.size > 0 ? `· ${selected.size}` : ''}
      </OcheText>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={C.amber} /></View>
        ) : !friends || friends.length === 0 ? (
          <OcheText variant="bodyMd" color={C.fg3} style={styles.empty}>
            Tu ne suis encore personne. Abonne-toi à des joueurs pour les ajouter à un groupe.
          </OcheText>
        ) : (
          friends.map((f) => {
            const on = selected.has(f.id);
            return (
              <Pressable key={f.id} onPress={() => toggle(f.id)} style={[styles.row, on && styles.rowOn]}>
                <MonogramPortrait name={f.name} avatarUrl={f.avatarUrl} size={40} />
                <View style={styles.info}>
                  <OcheText variant="h5" color={C.cream} numberOfLines={1}>{f.name}</OcheText>
                  <OcheText variant="bodyXS" color={C.fg3}>{f.username}</OcheText>
                </View>
                <View style={[styles.check, on && styles.checkOn]}>
                  {on && <OcheText variant="labelMd" color={C.onAmber}>✓</OcheText>}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.s3) }]}>
        {err && <OcheText variant="bodySm" color={C.brick} style={{ marginBottom: Spacing.s2 }}>{err}</OcheText>}
        <OcheButton
          label={`Créer le groupe${selected.size > 0 ? ` (${selected.size})` : ''}`}
          onPress={create}
          variant="amber"
          size="lg"
          fullWidth
          loading={busy}
          disabled={!name.trim() || selected.size === 0}
        />
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.walnut },
  nameBox: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s3 },
  input: {
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
    color: C.cream,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 10,
    fontSize: 15,
  },
  sectionLabel: { letterSpacing: 1, paddingHorizontal: Spacing.s4, paddingTop: Spacing.s3 },
  scroll: { padding: Spacing.s4, gap: Spacing.s2 },
  center: { paddingTop: Spacing.s8, alignItems: 'center' },
  empty: { textAlign: 'center', paddingTop: Spacing.s6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    padding: Spacing.s3,
  },
  rowOn: { borderColor: C.amber },
  info: { flex: 1, gap: 1 },
  check: {
    width: 26, height: 26, borderWidth: 1, borderColor: C.border1,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.walnutUp2,
  },
  checkOn: { backgroundColor: C.amber, borderColor: C.amber },
  footer: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s2, borderTopWidth: 1, borderTopColor: C.border1 },
});
