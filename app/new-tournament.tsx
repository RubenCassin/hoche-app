import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { OcheMark } from '@/components/OcheLogo';
import { SectionLabel } from '@/components/SectionLabel';
import { Spacing, Radii, glowSoft } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import {
  X01_VARIANT_SCORES,
  FINISH_MODE_LABELS,
  type X01Variant,
  type FinishMode,
  type GameType,
  type BotDifficulty,
} from '@/hooks/useGameStore';
import { BOT_ORDER, BOT_LABELS, botName } from '@/hooks/botEngine';
import { useTournamentStore } from '@/hooks/useTournamentStore';

const GAME_TYPES: { key: GameType; label: string }[] = [
  { key: 'x01', label: 'X01' },
  { key: 'cricket', label: 'Cricket' },
  { key: 'atc', label: 'Clock' },
  { key: 'killer', label: 'Killer' },
  { key: 'shanghai', label: 'Shanghai' },
];
const VARIANTS: X01Variant[] = ['301', '501', '701'];
const FINISH_MODES: FinishMode[] = ['simple', 'double', 'master'];
const LEGS_PRESETS = [1, 2, 3];
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;

export default function NewTournamentScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const createTournament = useTournamentStore((s) => s.createTournament);
  const meName = useAuthStore((s) => s.user?.name) || 'Joueur 1';

  const [gameType, setGameType] = useState<GameType>('x01');
  const [variant, setVariant] = useState<X01Variant>('501');
  const [finishMode, setFinishMode] = useState<FinishMode>('double');
  const [legsToWin, setLegsToWin] = useState<number>(1);
  const [format, setFormat] = useState<'knockout' | 'roundrobin'>('knockout');
  const [shuffle, setShuffle] = useState(true);
  const [entries, setEntries] = useState<{ name: string; bot: BotDifficulty | null; members?: string[] }[]>([
    { name: meName, bot: null },
    { name: 'Joueur 2', bot: null },
    { name: 'Joueur 3', bot: null },
    { name: 'Joueur 4', bot: null },
  ]);
  const [botSlot, setBotSlot] = useState<number | null>(null);

  const isX01 = gameType === 'x01';

  const addPlayer = () => {
    if (entries.length >= MAX_PLAYERS) return;
    setEntries([...entries, { name: `Joueur ${entries.length + 1}`, bot: null }]);
  };
  const removePlayer = (i: number) => {
    if (entries.length <= MIN_PLAYERS) return;
    setEntries(entries.filter((_, j) => j !== i));
    if (botSlot === i) setBotSlot(null);
  };
  const setName = (i: number, v: string) =>
    setEntries(entries.map((e, j) => (j === i ? { ...e, name: v, bot: null } : e)));
  const pickBot = (i: number, level: BotDifficulty) => {
    setEntries(entries.map((e, j) => (j === i ? { name: botName(level), bot: level } : e)));
    setBotSlot(null);
  };
  const clearBot = (i: number) =>
    setEntries(entries.map((e, j) => (j === i ? { name: `Joueur ${i + 1}`, bot: null } : e)));
  const addTeammate = (i: number) =>
    setEntries(entries.map((e, j) => (j === i ? { ...e, members: [...(e.members ?? []), ''] } : e)));
  const setTeammate = (i: number, k: number, v: string) =>
    setEntries(entries.map((e, j) => (j === i ? { ...e, members: (e.members ?? []).map((m, n) => (n === k ? v : m)) } : e)));
  const removeTeammate = (i: number, k: number) =>
    setEntries(entries.map((e, j) => (j === i ? { ...e, members: (e.members ?? []).filter((_, n) => n !== k) } : e)));

  const create = () => {
    const base = isX01
      ? { gameType, legsToWin, variant, startScore: X01_VARIANT_SCORES[variant as Exclude<X01Variant, 'custom'>], finishMode }
      : { gameType, legsToWin };
    createTournament(entries, { ...base, format }, shuffle);
    router.replace('/tournament');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <OcheText variant="labelMd" color={C.fg2}>Annuler</OcheText>
          </Pressable>
          <OcheText variant="displaySm" allCaps color={C.amber}>Tournoi</OcheText>
          <View style={{ width: 60, alignItems: 'flex-end' }}>
            <OcheMark size={30} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Game type */}
          <View style={styles.section}>
            <SectionLabel icon="grid">Jeu</SectionLabel>
            <View style={styles.row}>
              {GAME_TYPES.map((g) => (
                <Pressable
                  key={g.key}
                  onPress={() => setGameType(g.key)}
                  style={[styles.cell, gameType === g.key && styles.cellActive]}
                >
                  <OcheText variant="displaySm" color={gameType === g.key ? C.amber : C.fg2}>{g.label}</OcheText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Format */}
          <View style={styles.section}>
            <SectionLabel icon="layers">Format</SectionLabel>
            <View style={styles.row}>
              {([
                { v: 'knockout', label: 'Élimination', tag: 'Arbre, 1 défaite = out' },
                { v: 'roundrobin', label: 'Poules', tag: 'Chacun contre chacun' },
              ] as const).map((o) => (
                <Pressable
                  key={o.v}
                  onPress={() => setFormat(o.v)}
                  style={[styles.cell, format === o.v && styles.cellActive]}
                >
                  <OcheText variant="labelMd" allCaps color={format === o.v ? C.amber : C.fg2}>{o.label}</OcheText>
                  <OcheText variant="bodyXS" color={format === o.v ? C.amber : C.fg3}>{o.tag}</OcheText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* X01 variant + finish */}
          {isX01 && (
            <>
              <View style={styles.section}>
                <SectionLabel icon="target">Mode</SectionLabel>
                <View style={styles.row}>
                  {VARIANTS.map((v) => (
                    <Pressable key={v} onPress={() => setVariant(v)} style={[styles.pill, variant === v && styles.pillActive]}>
                      <OcheText variant="labelMd" allCaps color={variant === v ? C.amber : C.fg2}>{v}</OcheText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.section}>
                <SectionLabel icon="flag">Finition</SectionLabel>
                <View style={styles.row}>
                  {FINISH_MODES.map((m) => (
                    <Pressable key={m} onPress={() => setFinishMode(m)} style={[styles.pill, finishMode === m && styles.pillActive]}>
                      <OcheText variant="labelMd" allCaps color={finishMode === m ? C.amber : C.fg2}>{FINISH_MODE_LABELS[m]}</OcheText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Legs per match */}
          <View style={styles.section}>
            <SectionLabel icon="trophy">Manche : premier à</SectionLabel>
            <View style={styles.row}>
              {LEGS_PRESETS.map((n) => (
                <Pressable key={n} onPress={() => setLegsToWin(n)} style={[styles.pill, legsToWin === n && styles.pillActive]}>
                  <OcheText variant="labelMd" allCaps color={legsToWin === n ? C.amber : C.fg2}>{n} leg{n > 1 ? 's' : ''}</OcheText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Seeding */}
          <View style={styles.section}>
            <SectionLabel icon="sliders">Tirage</SectionLabel>
            <View style={styles.row}>
              {[
                { v: true, label: 'Aléatoire' },
                { v: false, label: 'Ordre saisi' },
              ].map((o) => (
                <Pressable key={String(o.v)} onPress={() => setShuffle(o.v)} style={[styles.pill, shuffle === o.v && styles.pillActive]}>
                  <OcheText variant="labelMd" allCaps color={shuffle === o.v ? C.amber : C.fg2}>{o.label}</OcheText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Players */}
          <View style={styles.section}>
            <View style={styles.playersHeader}>
              <SectionLabel icon="users">Joueurs · {entries.length}</SectionLabel>
              {entries.length < MAX_PLAYERS && (
                <Pressable onPress={addPlayer} style={styles.addBtn}>
                  <OcheText variant="labelMd" allCaps color={C.amber}>+ Ajouter</OcheText>
                </Pressable>
              )}
            </View>
            {entries.map((e, i) => (
              <View key={i} style={styles.playerGroup}>
                <View style={styles.playerRow}>
                  <OcheText variant="monoSm" color={C.fg3} style={styles.seedNum}>{i + 1}</OcheText>
                  <TextInput
                    style={[styles.input, e.bot != null && styles.inputBot]}
                    value={e.name}
                    onChangeText={(v) => setName(i, v)}
                    placeholder={`Joueur ${i + 1}`}
                    placeholderTextColor={C.fg3}
                    autoCapitalize="words"
                    editable={e.bot == null}
                  />
                  <Pressable
                    onPress={() => { setBotSlot(botSlot === i ? null : i); }}
                    style={[styles.tagBtn, (botSlot === i || e.bot != null) && styles.tagBtnActive]}
                  >
                    <OcheText variant="labelSm" allCaps color={botSlot === i || e.bot != null ? C.onAmber : C.fg2}>Bot</OcheText>
                  </Pressable>
                  {entries.length > MIN_PLAYERS && (
                    <Pressable onPress={() => removePlayer(i)} style={styles.removeBtn}>
                      <OcheText variant="h3" color={C.fg3}>×</OcheText>
                    </Pressable>
                  )}
                </View>

                {/* Inline bot-difficulty picker */}
                {botSlot === i && (
                  <View style={styles.botPicker}>
                    {BOT_ORDER.map((level) => (
                      <Pressable
                        key={level}
                        onPress={() => pickBot(i, level)}
                        style={[styles.botOption, e.bot === level && styles.botOptionActive]}
                      >
                        <OcheText variant="labelSm" allCaps color={e.bot === level ? C.onAmber : C.cream}>
                          {BOT_LABELS[level]}
                        </OcheText>
                      </Pressable>
                    ))}
                    {e.bot != null && (
                      <Pressable onPress={() => clearBot(i)} style={styles.botOption}>
                        <OcheText variant="labelSm" allCaps color={C.fg2}>Humain</OcheText>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Team-mates — this entry becomes a team (shared score, alternating) */}
                {e.bot == null && (
                  <View style={styles.teamWrap}>
                    {(e.members ?? []).map((mName, k) => (
                      <View key={k} style={styles.playerRow}>
                        <OcheText variant="labelSm" color={C.fg3} style={styles.seedNum}>+</OcheText>
                        <TextInput
                          style={styles.input}
                          value={mName}
                          onChangeText={(v) => setTeammate(i, k, v)}
                          placeholder={`Coéquipier ${k + 1}`}
                          placeholderTextColor={C.fg3}
                          autoCapitalize="words"
                        />
                        <Pressable onPress={() => removeTeammate(i, k)} style={styles.removeBtn}>
                          <OcheText variant="h3" color={C.fg3}>×</OcheText>
                        </Pressable>
                      </View>
                    ))}
                    {(e.members?.length ?? 0) < 3 && (
                      <Pressable onPress={() => addTeammate(i)} style={styles.addTeammate}>
                        <OcheText variant="labelSm" allCaps color={C.amber}>+ Coéquipier</OcheText>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            ))}
            <OcheText variant="bodyXS" color={C.fg3}>
              « Bot » = adversaire géré par l'app. « + Coéquipier » crée une équipe (score partagé, chacun son tour).
            </OcheText>
          </View>

          <View style={styles.summary}>
            <OcheText variant="bodySm" color={C.fg2}>
              {entries.length} joueurs · {format === 'roundrobin' ? 'poules' : 'élimination directe'} · {isX01 ? `${X01_VARIANT_SCORES[variant as Exclude<X01Variant,'custom'>]} ${FINISH_MODE_LABELS[finishMode]}` : GAME_TYPES.find((g) => g.key === gameType)?.label} · premier à {legsToWin}
            </OcheText>
          </View>

          <OcheButton label="Créer le tournoi" onPress={create} variant="primary" size="lg" fullWidth style={{ marginTop: Spacing.s2 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
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
  scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s5, paddingBottom: Spacing.s10, gap: Spacing.s5 },
  section: { gap: Spacing.s3 },
  label: { letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s2 },
  cell: {
    flexGrow: 1,
    minWidth: 84,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    paddingVertical: Spacing.s3,
    alignItems: 'center',
  },
  cellActive: { backgroundColor: C.walnutUp2, borderColor: C.amber, ...glowSoft(C.amber) },
  pill: {
    flexGrow: 1,
    minWidth: 80,
    backgroundColor: C.walnutUp,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: C.border1,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    alignItems: 'center',
  },
  pillActive: { backgroundColor: C.walnutUp2, borderColor: C.amber, ...glowSoft(C.amber) },
  playersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { paddingVertical: 4, paddingHorizontal: Spacing.s2 },
  playerGroup: { gap: Spacing.s1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
  seedNum: { width: 20, textAlign: 'center' },
  input: {
    flex: 1,
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    color: C.cream,
    fontFamily: 'Manrope',
    fontSize: 16,
  },
  inputBot: { color: C.fg3 },
  tagBtn: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: Spacing.s2,
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagBtnActive: { backgroundColor: C.amber, borderColor: C.amber },
  removeBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s2, marginLeft: 28 },
  botOption: {
    flexGrow: 1,
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
  },
  botOptionActive: { backgroundColor: C.amber, borderColor: C.amber },
  teamWrap: { gap: Spacing.s1, marginTop: Spacing.s1, marginLeft: Spacing.s4 },
  addTeammate: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: Spacing.s2 },
  summary: { paddingVertical: Spacing.s2, alignItems: 'center' },
});
