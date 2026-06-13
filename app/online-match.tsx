import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { playSound } from '@/services/soundService';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { NumpadInput } from '@/components/NumpadInput';
import { CheckoutPill } from '@/components/CheckoutPill';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { connectLive, onLive, liveSend, isLiveReady } from '@/services/liveSocket';
import { sendMessage } from '@/services/api';
import { queryClient } from '@/services/queryClient';

type Phase = 'connecting' | 'idle' | 'waiting' | 'playing';
interface GameState {
  you: number;
  spectator?: boolean;
  names: string[];
  config: { startScore: number; legsToWin: number; finishMode: 'simple' | 'double' | 'master' };
  remaining: number[];
  legs: number[];
  turn: number;
  winner: number | null;
  started: boolean;
  event: string | null;
}
interface ChatMsg { fromIdx: number; text: string }

const EVENT_LABEL: Record<string, string> = {
  '180': '💥 180 !', bust: 'Bust', leg: '✓ Leg remporté', win: '🏆 Match terminé',
};
const REACTIONS = ['👏', '🔥', '😅', '🎯', '💪', '😱'];
const VARIANTS = [301, 501, 701];
const LEGS = [1, 3, 5];
const FINISHES: { v: 'simple' | 'double' | 'master'; label: string }[] = [
  { v: 'simple', label: 'Simple' }, { v: 'double', label: 'Double' }, { v: 'master', label: 'Master' },
];

export default function OnlineMatchScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);
  const token = useAuthStore((s) => s.token);
  const params = useLocalSearchParams<{ join?: string; invite?: string; name?: string; spectate?: string; host?: string; conv?: string }>();
  const inviteId = params.invite ? Number(params.invite) : null;
  const inviteName = params.name || 'ton ami';
  // Lancé depuis un chat : on crée un salon et on poste le code dans la conversation.
  const hostConvId = params.host && params.conv ? Number(params.conv) : null;
  const hostStartedRef = useRef(false);
  const postedConvRef = useRef(false);

  const [phase, setPhase] = useState<Phase>(isLiveReady() ? 'idle' : 'connecting');
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [gs, setGs] = useState<GameState | null>(null);
  const [oppLeft, setOppLeft] = useState(false);
  const [rematchOffer, setRematchOffer] = useState(false);
  const [rematchSent, setRematchSent] = useState(false);

  // Format pickers (private rooms / invites).
  const [startScore, setStartScore] = useState(501);
  const [legsToWin, setLegsToWin] = useState(3);
  const [finishMode, setFinishMode] = useState<'simple' | 'double' | 'master'>('double');
  const cfg = () => ({ startScore, legsToWin, finishMode });

  // Chat
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [unread, setUnread] = useState(0);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; fromIdx: number }[]>([]);
  const reactionId = useRef(0);
  const [reported, setReported] = useState(false);

  const sentJoinRef = useRef(false);
  const inRoomRef = useRef(false);

  useEffect(() => {
    connectLive(token);
    if (isLiveReady()) setPhase('idle');
    const off = onLive((m: any) => {
      switch (m.type) {
        case 'connected':
          setPhase((p) => (p === 'connecting' ? 'idle' : p));
          break;
        case 'room':
          setCode(m.code);
          inRoomRef.current = true;
          setPhase('waiting');
          if (m.invitedName) setNote(`Invitation envoyée à ${m.invitedName}…`);
          // Salon créé depuis un chat → poste l'invitation (avec le code) une fois.
          if (hostConvId && !postedConvRef.current) {
            postedConvRef.current = true;
            sendMessage(hostConvId, '', 'match_invite', { code: m.code })
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ['chat-messages', hostConvId] });
                queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
                setNote('Invitation postée dans le groupe — les 2 premiers qui rejoignent jouent.');
              })
              .catch(() => {});
          }
          break;
        case 'invite_offline':
          setNote('Ton ami n’est pas en ligne. Partage-lui le code ci-dessous.');
          break;
        case 'invite_declined':
          setNote(`${m.byName || 'Ton ami'} a refusé l’invitation.`);
          setPhase('idle');
          inRoomRef.current = false;
          break;
        case 'state':
          inRoomRef.current = true;
          setGs(m);
          setRematchOffer(false);
          setRematchSent(false);
          setPhase('playing');
          if (m.event === '180' || m.event === 'win') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          else if (m.event === 'bust') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          if (m.event === '180') playSound('180');
          else if (m.event === 'win') playSound('matchWon');
          else if (m.event === 'bust') playSound('bust');
          if (m.event === 'win') {
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['league'] });
          }
          break;
        case 'chat':
          setChat((c) => [...c, { fromIdx: m.fromIdx, text: m.text }]);
          setChatOpen((open) => { if (!open) setUnread((u) => u + 1); return open; });
          break;
        case 'reaction': {
          const id = ++reactionId.current;
          setReactions((r) => [...r, { id, emoji: m.emoji, fromIdx: m.fromIdx }]);
          setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2500);
          break;
        }
        case 'rematch_offer':
          setRematchOffer(true);
          break;
        case 'reported':
          setReported(true);
          break;
        case 'opponent_left':
          setOppLeft(true);
          break;
        case 'error':
          setErr(m.error);
          break;
      }
    });
    return () => {
      off();
      if (inRoomRef.current) liveSend({ type: 'leave' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-join when arriving from an invite link (?join=CODE).
  useEffect(() => {
    if (phase === 'idle' && params.join && !sentJoinRef.current) {
      sentJoinRef.current = true;
      liveSend({ type: 'join', code: String(params.join).toUpperCase() });
    }
  }, [phase, params.join]);

  // Auto-create a private room when hosting from a chat (?host=1&conv=ID).
  useEffect(() => {
    if (phase === 'idle' && hostConvId && !hostStartedRef.current) {
      hostStartedRef.current = true;
      liveSend({ type: 'create', config: cfg() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hostConvId]);

  // Auto-spectate when arriving from a "live now" link (?spectate=CODE).
  useEffect(() => {
    if (phase === 'idle' && params.spectate && !sentJoinRef.current) {
      sentJoinRef.current = true;
      liveSend({ type: 'spectate', code: String(params.spectate).toUpperCase() });
    }
  }, [phase, params.spectate]);

  const leave = () => { liveSend({ type: 'leave' }); router.back(); };
  const submitVisit = (total: number) => liveSend({ type: 'visit', total });
  const doRematch = () => { setRematchSent(true); liveSend({ type: 'rematch' }); };
  const sendChat = () => {
    const t = chatText.trim();
    if (!t) return;
    liveSend({ type: 'chat', text: t });
    setChatText('');
  };
  const sendReaction = (emoji: string) => liveSend({ type: 'reaction', emoji });

  const back = (
    <Pressable onPress={leave} hitSlop={10}>
      <OcheText variant="labelSm" color={C.fg2} allCaps>‹ Quitter</OcheText>
    </Pressable>
  );
  const chatBtn = phase === 'playing' && !gs?.spectator ? (
    <Pressable onPress={() => { setChatOpen(true); setUnread(0); }} hitSlop={8}>
      <OcheText variant="labelMd" color={C.amber}>💬{unread > 0 ? ` ${unread}` : ''}</OcheText>
    </Pressable>
  ) : undefined;

  // ── Opponent left ──────────────────────────────────────────────────────────
  if (oppLeft) {
    return (
      <View style={styles.container}>
        <OcheHeader title="En direct" left={back} bell={false} />
        <View style={styles.center}>
          <OcheText variant="h2" color={C.cream}>Adversaire parti 👋</OcheText>
          <OcheText variant="bodyMd" color={C.fg3} style={styles.centerSub}>La partie est terminée.</OcheText>
          <OcheButton label="Retour" onPress={() => router.back()} variant="primary" size="lg" />
        </View>
      </View>
    );
  }

  if (phase === 'connecting') {
    return (
      <View style={styles.container}>
        <OcheHeader title="En direct" left={back} bell={false} />
        <View style={styles.center}>
          <ActivityIndicator color={C.amber} />
          <OcheText variant="bodySm" color={C.fg3}>Connexion au serveur…</OcheText>
        </View>
      </View>
    );
  }

  // ── Format pickers (shared by lobby + invite) ──────────────────────────────
  const FormatPickers = () => (
    <View style={styles.format}>
      <OcheText variant="labelSm" allCaps color={C.fg3}>Format</OcheText>
      <View style={styles.pillRow}>
        {VARIANTS.map((v) => (
          <Pressable key={v} onPress={() => setStartScore(v)} style={[styles.pill, startScore === v && styles.pillOn]}>
            <OcheText variant="labelMd" allCaps color={startScore === v ? C.amber : C.fg2}>{v}</OcheText>
          </Pressable>
        ))}
      </View>
      <View style={styles.pillRow}>
        {LEGS.map((n) => (
          <Pressable key={n} onPress={() => setLegsToWin(n)} style={[styles.pill, legsToWin === n && styles.pillOn]}>
            <OcheText variant="labelMd" allCaps color={legsToWin === n ? C.amber : C.fg2}>{n} leg{n > 1 ? 's' : ''}</OcheText>
          </Pressable>
        ))}
      </View>
      <View style={styles.pillRow}>
        {FINISHES.map((f) => (
          <Pressable key={f.v} onPress={() => setFinishMode(f.v)} style={[styles.pill, finishMode === f.v && styles.pillOn]}>
            <OcheText variant="labelMd" allCaps color={finishMode === f.v ? C.amber : C.fg2}>{f.label}</OcheText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <OcheHeader title="En direct" left={back} bell={false} />
        <ScrollView contentContainerStyle={styles.lobby} keyboardShouldPersistTaps="handled">
          <OcheText variant="displaySm" allCaps color={C.cream} style={styles.lobbyTitle}>
            {inviteId ? `Défier\n${inviteName}` : 'X01 en\ntemps réel'}
          </OcheText>

          <FormatPickers />

          {inviteId ? (
            <OcheButton label={`⚔️ Inviter ${inviteName}`} onPress={() => liveSend({ type: 'invite', toUserId: inviteId, toName: inviteName, config: cfg() })} variant="primary" size="lg" fullWidth />
          ) : (
            <>
              <OcheButton label="⚡ Partie rapide" onPress={() => liveSend({ type: 'quick' })} variant="primary" size="lg" fullWidth />
              <OcheButton label="Créer un salon privé" onPress={() => liveSend({ type: 'create', config: cfg() })} variant="amber" size="md" fullWidth />
              <View style={styles.joinRow}>
                <TextInput
                  style={styles.joinInput}
                  value={joinCode}
                  onChangeText={(v) => setJoinCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                  placeholder="CODE"
                  placeholderTextColor={C.fg3}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={4}
                />
                <OcheButton label="Rejoindre" onPress={() => liveSend({ type: 'join', code: joinCode })} variant="secondary" size="md" disabled={joinCode.length < 4} />
              </View>
            </>
          )}
          {!!note && <OcheText variant="bodySm" color={C.amber} style={styles.err}>{note}</OcheText>}
          {!!err && <OcheText variant="bodySm" color={C.loss} style={styles.err}>{err}</OcheText>}
        </ScrollView>
      </View>
    );
  }

  // ── Waiting ────────────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <View style={styles.container}>
        <OcheHeader title="En direct" left={back} bell={false} />
        <View style={styles.center}>
          <OcheText variant="labelMd" allCaps color={C.fg3}>Code du salon</OcheText>
          <OcheText variant="displayLg" color={C.amber} style={styles.codeBig}>{code}</OcheText>
          <ActivityIndicator color={C.amber} style={{ marginVertical: Spacing.s4 }} />
          <OcheText variant="bodyMd" color={C.fg3}>{note || "En attente d'un adversaire…"}</OcheText>
          <OcheButton label="Annuler" onPress={leave} variant="secondary" size="md" style={{ marginTop: Spacing.s4 }} />
        </View>
      </View>
    );
  }

  // ── Playing (or spectating) ───────────────────────────────────────────────
  if (!gs) return null;
  const isSpectator = !!gs.spectator;
  const me = gs.you;
  const topIdx = isSpectator ? 0 : me;
  const botIdx = isSpectator ? 1 : 1 - me;
  const myTurn = !isSpectator && gs.turn === me && gs.winner === null;
  const isOver = gs.winner !== null;
  const iWon = gs.winner === me;

  const Tile = ({ i }: { i: number }) => {
    const active = gs.turn === i && !isOver;
    return (
      <View style={[styles.tile, active && styles.tileActive]}>
        {active && <View style={styles.activeBar} />}
        <View style={styles.tileTop}>
          <MonogramPortrait name={gs.names[i]} size={28} />
          <OcheText variant="h5" color={active ? C.cream : C.fg2} numberOfLines={1} style={{ flex: 1 }}>
            {gs.names[i]}{i === me ? ' · toi' : ''}
          </OcheText>
          <OcheText variant="labelSm" allCaps color={C.amber}>{gs.legs[i]} legs</OcheText>
        </View>
        <OcheText variant="displayLg" color={active ? C.amber : C.cream} style={styles.remaining}>{gs.remaining[i]}</OcheText>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader
        title="En direct"
        subtitle={isSpectator ? '👁 Spectateur' : `${gs.config.startScore} · premier à ${gs.config.legsToWin}`}
        left={back}
        right={chatBtn}
        bell={false}
      />

      <View style={styles.match}>
        <Tile i={topIdx} />
        <Tile i={botIdx} />

        {gs.event && EVENT_LABEL[gs.event] && !isOver && (
          <View style={styles.eventBanner}>
            <OcheText variant="labelMd" allCaps color={C.onAmber} style={{ fontWeight: '700', letterSpacing: 1 }}>
              {EVENT_LABEL[gs.event]}
            </OcheText>
          </View>
        )}

        {!isOver && (
          myTurn ? (
            <>
              <View style={styles.checkoutRow}>
                <CheckoutPill remaining={gs.remaining[me]} dartsLeft={3} finishMode={gs.config.finishMode} />
              </View>
              <NumpadInput onSubmit={submitVisit} style={styles.pad} />
            </>
          ) : (
            <View style={styles.waitTurn}>
              <ActivityIndicator color={C.fg3} />
              <OcheText variant="labelMd" allCaps color={C.fg3}>
                {isSpectator ? '👁 ' : ''}Au tour de {gs.names[gs.turn]}…
              </OcheText>
            </View>
          )
        )}

        {isOver && (
          <View style={styles.endCard}>
            {isSpectator ? (
              <OcheText variant="labelSm" allCaps color={C.amber}>🏆 {gs.names[gs.winner ?? 0]} l'emporte</OcheText>
            ) : (
              <OcheText variant="labelSm" allCaps color={iWon ? C.win : C.loss}>{iWon ? 'Victoire' : 'Défaite'}</OcheText>
            )}
            <OcheText variant="displayMd" color={C.amber}>{gs.legs[topIdx]} — {gs.legs[botIdx]}</OcheText>
            {!isSpectator && rematchOffer && !rematchSent && <OcheText variant="bodySm" color={C.amber}>{gs.names[botIdx]} veut rejouer !</OcheText>}
            {!isSpectator && rematchSent && <OcheText variant="bodySm" color={C.fg3}>En attente de l'adversaire…</OcheText>}
            <View style={styles.endActions}>
              {!isSpectator && <OcheButton label="Revanche" onPress={doRematch} variant="primary" size="md" disabled={rematchSent} />}
              <OcheButton label="Quitter" onPress={leave} variant="secondary" size="md" />
            </View>
            {!isSpectator && !iWon && (
              reported ? (
                <OcheText variant="bodyXS" color={C.fg3}>⚠ Match signalé — merci, l'Elo est annulé.</OcheText>
              ) : (
                <Pressable onPress={() => liveSend({ type: 'report' })} hitSlop={6}>
                  <OcheText variant="bodyXS" color={C.loss}>⚠ Signaler un score suspect</OcheText>
                </Pressable>
              )
            )}
          </View>
        )}

        {/* Quick reactions */}
        <View style={styles.reactionRow}>
          {REACTIONS.map((e) => (
            <Pressable key={e} onPress={() => sendReaction(e)} style={styles.reactionBtn} hitSlop={4}>
              <OcheText variant="h3">{e}</OcheText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Floating reactions */}
      {reactions.length > 0 && (
        <View style={styles.reactionsFloat} pointerEvents="none">
          {reactions.map((r) => (
            <OcheText key={r.id} variant="displayMd" style={styles.floatEmoji}>{r.emoji}</OcheText>
          ))}
        </View>
      )}

      {/* Chat overlay */}
      {chatOpen && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[StyleSheet.absoluteFill, styles.chatWrap]}
        >
          <View style={[styles.chatPanel, { paddingBottom: insets.bottom + Spacing.s2 }]}>
            <View style={styles.chatHead}>
              <OcheText variant="h5" color={C.cream}>Chat</OcheText>
              <Pressable onPress={() => setChatOpen(false)} hitSlop={8}>
                <OcheText variant="labelMd" color={C.fg3}>Fermer ✕</OcheText>
              </Pressable>
            </View>
            <ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent}>
              {chat.length === 0 ? (
                <OcheText variant="bodySm" color={C.fg3} style={{ textAlign: 'center', marginTop: Spacing.s4 }}>
                  Dis quelque chose 👋
                </OcheText>
              ) : (
                chat.map((c, i) => {
                  const mine = c.fromIdx === gs.you;
                  return (
                    <View key={i} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleThem]}>
                      <OcheText variant="bodySm" color={mine ? C.onAmber : C.cream}>{c.text}</OcheText>
                    </View>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatText}
                onChangeText={setChatText}
                placeholder="Message…"
                placeholderTextColor={C.fg3}
                maxLength={200}
                onSubmitEditing={sendChat}
                returnKeyType="send"
              />
              <OcheButton label="Envoyer" onPress={sendChat} variant="primary" size="sm" disabled={!chatText.trim()} />
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.s2, paddingHorizontal: Spacing.s6 },
    centerSub: { textAlign: 'center', marginBottom: Spacing.s4 },

    lobby: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s5, paddingBottom: Spacing.s10, gap: Spacing.s3 },
    lobbyTitle: { letterSpacing: 1, marginBottom: Spacing.s2 },
    format: { gap: Spacing.s2, marginBottom: Spacing.s2 },
    pillRow: { flexDirection: 'row', gap: Spacing.s2 },
    pill: {
      flex: 1,
      paddingVertical: Spacing.s2,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border1,
      backgroundColor: C.walnutUp,
    },
    pillOn: { borderColor: C.amber, backgroundColor: C.walnutUp2 },
    joinRow: { flexDirection: 'row', gap: Spacing.s2, alignItems: 'center', marginTop: Spacing.s2 },
    joinInput: {
      flex: 1, backgroundColor: C.walnutUp, borderWidth: 1, borderColor: C.border1,
      paddingHorizontal: Spacing.s4, paddingVertical: Spacing.s3, color: C.cream,
      fontFamily: 'JetBrainsMono', fontSize: 22, letterSpacing: 6, textAlign: 'center',
    },
    err: { marginTop: Spacing.s2 },
    codeBig: { letterSpacing: 8, marginVertical: Spacing.s2 },

    match: { flex: 1, paddingHorizontal: Spacing.s3, paddingTop: Spacing.s3, gap: Spacing.s2 },
    tile: {
      backgroundColor: C.walnutUp, borderWidth: 1, borderColor: C.border1, borderRadius: Radii.none,
      padding: Spacing.s3, gap: 2, overflow: 'hidden',
    },
    tileActive: { borderColor: C.amber, backgroundColor: C.walnutUp2 },
    activeBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: C.amber },
    tileTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
    remaining: { textAlign: 'right', letterSpacing: -1 },
    eventBanner: { alignSelf: 'center', backgroundColor: C.amber, paddingHorizontal: Spacing.s3, paddingVertical: 4 },
    checkoutRow: { height: 40, justifyContent: 'center', paddingHorizontal: Spacing.s2 },
    pad: { flex: 1 },
    waitTurn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.s3 },
    endCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.s2 },
    endActions: { flexDirection: 'row', gap: Spacing.s2, marginTop: Spacing.s4 },
    reactionRow: {
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
      paddingVertical: Spacing.s2, borderTopWidth: 1, borderTopColor: C.border1,
    },
    reactionBtn: { paddingHorizontal: Spacing.s2, paddingVertical: 2 },
    reactionsFloat: {
      position: 'absolute', top: '38%', left: 0, right: 0,
      flexDirection: 'row', justifyContent: 'center', gap: Spacing.s3, zIndex: 90,
    },
    floatEmoji: { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },

    chatWrap: { backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', zIndex: 120 },
    chatPanel: {
      backgroundColor: C.walnutUp, borderTopWidth: 1, borderTopColor: C.amber,
      paddingHorizontal: Spacing.s4, paddingTop: Spacing.s3, gap: Spacing.s2, maxHeight: '70%',
    },
    chatHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    chatList: { maxHeight: 280 },
    chatListContent: { gap: Spacing.s2, paddingVertical: Spacing.s2 },
    bubble: { maxWidth: '80%', paddingHorizontal: Spacing.s3, paddingVertical: Spacing.s2, borderRadius: Radii.md },
    bubbleMine: { alignSelf: 'flex-end', backgroundColor: C.amber },
    bubbleThem: { alignSelf: 'flex-start', backgroundColor: C.walnutUp2, borderWidth: 1, borderColor: C.border1 },
    chatInputRow: { flexDirection: 'row', gap: Spacing.s2, alignItems: 'center' },
    chatInput: {
      flex: 1, backgroundColor: C.walnutUp2, borderWidth: 1, borderColor: C.border1,
      paddingHorizontal: Spacing.s3, paddingVertical: Spacing.s2, color: C.cream, fontFamily: 'Manrope', fontSize: 15,
    },
  });
