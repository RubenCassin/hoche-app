import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createChallenge, apiErrorMessage, type GameTypeId } from '@/services/api';
import { queryClient } from '@/services/queryClient';

const GAME_TYPES: { key: GameTypeId; label: string }[] = [
  { key: 'x01', label: 'X01' },
  { key: 'cricket', label: 'Cricket' },
  { key: 'atc', label: 'Clock' },
  { key: 'killer', label: 'Killer' },
  { key: 'shanghai', label: 'Shanghai' },
];
const LEGS = [1, 3, 5, 7];

export default function ChallengeScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const params = useLocalSearchParams<{ to?: string; name?: string }>();
  const toId = parseInt(params.to ?? '0', 10);
  const name = params.name ?? 'Joueur';

  const [gameType, setGameType] = useState<GameTypeId>('x01');
  const [legsToWin, setLegsToWin] = useState(3);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (sending || !toId) return;
    setSending(true);
    setErr(null);
    try {
      await createChallenge(toId, gameType, legsToWin, message);
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      router.back();
    } catch (e) {
      setErr(apiErrorMessage(e, 'Envoi impossible'));
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <OcheText variant="labelMd" color={C.fg2}>Annuler</OcheText>
          </Pressable>
          <OcheText variant="displaySm" allCaps color={C.amber}>Défi</OcheText>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.body}>
          <View style={styles.who}>
            <MonogramPortrait name={name} size={48} />
            <View>
              <OcheText variant="labelSm" allCaps color={C.fg3}>Tu défies</OcheText>
              <OcheText variant="h3" color={C.cream} numberOfLines={1}>{name}</OcheText>
            </View>
          </View>

          <OcheText variant="labelMd" allCaps color={C.fg3} style={styles.label}>Jeu</OcheText>
          <View style={styles.row}>
            {GAME_TYPES.map((g) => (
              <Pressable key={g.key} onPress={() => setGameType(g.key)} style={[styles.cell, gameType === g.key && styles.active]}>
                <OcheText variant="labelMd" allCaps color={gameType === g.key ? C.onAmber : C.fg2}>{g.label}</OcheText>
              </Pressable>
            ))}
          </View>

          <OcheText variant="labelMd" allCaps color={C.fg3} style={styles.label}>Premier à</OcheText>
          <View style={styles.row}>
            {LEGS.map((n) => (
              <Pressable key={n} onPress={() => setLegsToWin(n)} style={[styles.cell, legsToWin === n && styles.active]}>
                <OcheText variant="labelMd" allCaps color={legsToWin === n ? C.onAmber : C.fg2}>{n} leg{n > 1 ? 's' : ''}</OcheText>
              </Pressable>
            ))}
          </View>

          <OcheText variant="labelMd" allCaps color={C.fg3} style={styles.label}>Message (optionnel)</OcheText>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Petit mot pour le motiver…"
            placeholderTextColor={C.fg3}
            maxLength={140}
            multiline
          />

          {!!err && <OcheText variant="bodyXS" color={C.loss}>{err}</OcheText>}

          <OcheButton label="Envoyer le défi" onPress={send} loading={sending} variant="primary" size="lg" fullWidth style={{ marginTop: Spacing.s3 }} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.s4,
      borderBottomWidth: 1,
      borderBottomColor: C.border1,
    },
    body: { padding: Spacing.s4, gap: Spacing.s3 },
    who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3, marginBottom: Spacing.s2 },
    label: { letterSpacing: 1, marginTop: Spacing.s2 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s2 },
    cell: {
      flexGrow: 1,
      minWidth: 80,
      alignItems: 'center',
      paddingVertical: Spacing.s3,
      borderWidth: 1,
      borderColor: C.border1,
      backgroundColor: C.walnutUp,
    },
    active: { backgroundColor: C.amber, borderColor: C.amber },
    input: {
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      paddingHorizontal: Spacing.s4,
      paddingVertical: Spacing.s3,
      color: C.cream,
      fontFamily: 'Manrope',
      fontSize: 15,
      minHeight: 64,
      textAlignVertical: 'top',
    },
  });
