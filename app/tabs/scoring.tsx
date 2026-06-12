import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { playSound } from '@/services/soundService';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { ScoreTile } from '@/components/ScoreTile';
import { OcheLogo } from '@/components/OcheLogo';
import { CricketBoard } from '@/components/CricketBoard';
import { AtcBoard } from '@/components/AtcBoard';
import { KillerBoard } from '@/components/KillerBoard';
import { ShanghaiBoard } from '@/components/ShanghaiBoard';
import { HalveBoard } from '@/components/HalveBoard';
import { DartPad, DartModifier } from '@/components/DartPad';
import { DartboardInput } from '@/components/DartboardInput';
import { NumpadInput } from '@/components/NumpadInput';
import { ScoreModeToggle } from '@/components/ScoreModeToggle';
import { CheckoutPill } from '@/components/CheckoutPill';
import { MomentOverlay } from '@/components/MomentOverlay';
import { EndGameOverlay } from '@/components/EndGameOverlay';
import { submitGameResult } from '@/services/api';
import { queryClient } from '@/services/queryClient';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  useGameStore,
  FINISH_MODE_LABELS,
  ATC_SEQUENCE,
  applyAtcDarts,
  type ScoringMode,
  type PlayerState,
  type DartEntry,
} from '@/hooks/useGameStore';
import { QuickPad } from '@/components/QuickPad';
import {
  x01BotDarts,
  cricketBotDarts,
  atcBotDarts,
  killerBotDarts,
  shanghaiBotDarts,
  halveBotDarts,
} from '@/hooks/botEngine';
import { useTournamentStore } from '@/hooks/useTournamentStore';

// Per-dart games (Cricket, Around the Clock) enter darts one by one, so the
// whole-visit numpad mode doesn't apply.
const PER_DART_MODES: ScoringMode[] = ['grid', 'board'];

/** Canonical dart label, shared by every recap: T20 · D8 · 25 · BULL · M. */
function dartLabel(d?: DartEntry): string {
  if (!d) return '—';
  if (d.segment === 0) return 'M';
  if (d.segment === 25) return d.points === 50 ? 'BULL' : '25';
  return `${d.modifier !== 'S' ? d.modifier : ''}${d.segment}`;
}

export default function ScoringScreen() {
  const insets = useSafeAreaInsets();
  const {
    config,
    players,
    cricketPlayers,
    atcPlayers,
    killerPlayers,
    shanghaiPlayers,
    shanghaiRound,
    halvePlayers,
    halveRound,
    rosterAccountIds,
    botLevels,
    tournamentMatchId,
    teamMembers,
    teamTurn,
    activePlayerIndex,
    currentVisitDarts,
    moment,
    matchWinnerIndex,
    scoringMode,
    setScoringMode,
    addDart,
    addCricketDart,
    addAtcDart,
    addKillerDart,
    addShanghaiDart,
    addHalveDart,
    addVisitTotal,
    undoDart,
    undoLastVisit,
    clearMoment,
    initPlayers,
    initCricket,
    initAtc,
    initKiller,
    initShanghai,
    initHalve,
    rematch,
    resetGame,
  } = useGameStore();

  const gameType = config.gameType;
  const isX01 = gameType === 'x01';
  const isCricket = gameType === 'cricket';
  const isAtc = gameType === 'atc';
  const isKiller = gameType === 'killer';
  const isShanghai = gameType === 'shanghai';
  const isHalve = gameType === 'halveit';
  const perDartGame = !isX01; // non-X01 games use per-dart entry, no numpad/checkout

  const meName = useAuthStore((s) => s.user?.name) || 'Joueur 1';
  const C = useTheme();
  const styles = makeStyles(C);
  const bustAnim = useRef(new Animated.Value(0)).current;
  // ATC / Shanghai aim at one number at a time → default to the quick-pad.
  const [quickInput, setQuickInput] = useState(true);

  // Initialize a demo game if none is set up yet.
  useEffect(() => {
    const demo = [
      { id: 1, name: meName },
      { id: 2, name: 'Joueur 2' },
    ];
    if (isCricket) {
      if (cricketPlayers.length === 0) initCricket(demo);
    } else if (isAtc) {
      if (atcPlayers.length === 0) initAtc(demo);
    } else if (isKiller) {
      if (killerPlayers.length === 0) initKiller(demo);
    } else if (isShanghai) {
      if (shanghaiPlayers.length === 0) initShanghai(demo);
    } else if (isHalve) {
      if (halvePlayers.length === 0) initHalve(demo);
    } else if (players.length === 0) {
      initPlayers(demo);
    }
  }, []);

  // Every celebration/bust gets its ambiance sting.
  useEffect(() => {
    playSound(moment);
  }, [moment]);

  // Bust is a quick in-place red flash (no overlay). Celebrations are handled
  // by <MomentOverlay/> below, driven directly off the `moment` state.
  useEffect(() => {
    if (moment !== 'bust') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(bustAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(bustAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => clearMoment());
  }, [moment]);

  // Persist the account's result once, when a match ends. Convention: the
  // logged-in user is player index 0; opponents are guests (names only).
  const postedRef = useRef(false);
  useEffect(() => {
    if (matchWinnerIndex === null) {
      postedRef.current = false;
      return;
    }
    if (postedRef.current) return;
    postedRef.current = true;

    const gt = config.gameType;
    const arr: any[] = isCricket
      ? cricketPlayers
      : isAtc
        ? atcPlayers
        : isKiller
          ? killerPlayers
          : isShanghai
            ? shanghaiPlayers
            : isHalve
              ? halvePlayers
              : players;
    if (arr.length === 0) return;

    const me = arr[0];

    // Tournament match → report the winner to the bracket, skip the backend
    // submit (party-local games don't touch your online stats).
    if (tournamentMatchId) {
      const a = arr[0];
      const b = arr[1];
      useTournamentStore.getState().reportResult(
        tournamentMatchId,
        matchWinnerIndex === 0 ? 'a' : 'b',
        a?.legs ?? 0,
        b?.legs ?? 0
      );
      return;
    }

    // Team / party play isn't tied to a single account → don't post to the backend.
    if (teamMembers.some((m) => m.length > 1)) return;

    // Guest (offline) mode → local play only, nothing to sync.
    if (useAuthStore.getState().guestMode) return;

    const legsPlayed = arr.reduce((s, p) => s + (p.legs ?? 0), 0);
    const opponents = arr.slice(1).map((p) => p.name);
    // Real-account opponents only (guests/bots have a null slot) → drives PvP feed.
    const opponentIds = rosterAccountIds
      .slice(1)
      .filter((id): id is number => typeof id === 'number');

    let total180s = 0;
    let highestCheckout = 0;
    let avg = 0;
    let score = 0;
    let checkoutAttempts = 0;
    let checkoutHits = 0;
    let doublesHit = 0;
    let first9Points = 0;
    let first9Darts = 0;
    const heatmap: Record<string, number> = {};

    if (gt === 'x01') {
      avg = me.avg ?? 0;
      const doubleOut = config.finishMode !== 'simple';
      // 3-dart-total finishes that are impossible under double-out (bogeys).
      const BOGEY = new Set([169, 168, 166, 165, 163, 162, 159]);
      const onFinish = (r: number) => r >= 2 && r <= 170 && !(doubleOut && BOGEY.has(r));
      let rem = config.startScore;
      let legVisits = 0; // visits into the current leg (first 3 → first 9 darts)
      for (const v of me.visits ?? []) {
        // First-9 average: points + darts of the first 3 visits of each leg.
        if (legVisits < 3) {
          first9Points += v.bust ? 0 : v.total;
          first9Darts += v.darts.length || v.dartCount || 3; // numpad scoring visits = 3
          legVisits += 1;
        }
        // "On a finish" at the start of this visit → a checkout opportunity.
        if (onFinish(rem)) checkoutAttempts += 1;
        // Every dart actually landed counts — busted visits included — for the
        // doubles tally and the heatmap alike (per-dart modes only).
        for (const d of v.darts) {
          if (d.modifier === 'D' || (d.segment === 25 && d.points === 50)) doublesHit += 1;
          if ((d.segment >= 1 && d.segment <= 20) || d.segment === 25) {
            const k = String(d.segment);
            heatmap[k] = (heatmap[k] ?? 0) + 1;
          }
        }
        if (v.bust) continue;
        if (v.total === 180) total180s += 1;
        const wasOnFinish = onFinish(rem);
        rem -= v.total;
        if (rem === 0) {
          if (wasOnFinish) checkoutHits += 1;
          if (v.total > highestCheckout) highestCheckout = v.total;
          rem = config.startScore; // next leg
          legVisits = 0; // reset first-9 window for the new leg
        }
      }
    } else if (gt === 'cricket' || gt === 'shanghai' || gt === 'halveit') {
      score = me.score ?? 0;
    }

    submitGameResult({
      gameType: gt,
      matchWon: matchWinnerIndex === 0,
      legsWon: me.legs ?? 0,
      legsPlayed,
      opponents,
      opponentIds,
      dartsThrown: me.dartsThrown ?? 0,
      avg,
      total180s,
      highestCheckout,
      score,
      heatmap,
      checkoutAttempts,
      checkoutHits,
      doublesHit,
      first9Points,
      first9Darts,
      startScore: gt === 'x01' ? config.startScore : 0,
      // Per-visit log powers the replay screen (X01 only — others have no visit list).
      visits:
        gt === 'x01'
          ? (me.visits ?? []).map((v: any) => ({
              total: v.total,
              bust: !!v.bust,
              darts: (v.darts ?? []).map((d: DartEntry) => dartLabel(d)),
            }))
          : [],
    })
      .then(() => {
        // Refresh profile/stats/history/feed so the new match shows immediately.
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['history'] });
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      })
      .catch(() => {
        // Offline / backend down — silently skip; stats just won't include this match.
      });
  }, [matchWinnerIndex]);

  // ── Bot auto-play ──────────────────────────────────────────────────────────
  // When the active slot is a bot (and no celebration is on screen), it throws
  // automatically after a short "thinking" beat. Every game (X01 included) is
  // fed dart by dart so the bot's visit is visible like a human's. Each
  // scheduled dart re-checks the live state so a leg-end / early commit can
  // never bleed into the next turn.
  const BOT_THINK_MS = 900;
  const BOT_DART_MS = 850;
  useEffect(() => {
    if (matchWinnerIndex !== null) return;
    if (moment !== null) return; // let the current celebration clear first
    const level = botLevels[activePlayerIndex];
    if (!level) return; // human / guest turn
    if (currentVisitDarts.length > 0) return; // turn already in progress

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const turnIdx = activePlayerIndex;

    if (isX01) {
      const st0 = useGameStore.getState();
      const p0 = st0.players[turnIdx];
      const botDarts = p0
        ? x01BotDarts(p0.remaining, level, st0.config.finishMode !== 'simple')
        : [];
      botDarts.forEach((d, i) => {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            const st = useGameStore.getState();
            if (st.matchWinnerIndex !== null || st.moment !== null) return;
            if (st.activePlayerIndex !== turnIdx || st.currentVisitDarts.length !== i) return;
            st.addDart(d);
          }, BOT_THINK_MS + i * BOT_DART_MS)
        );
      });
    } else {
      const st0 = useGameStore.getState();
      let darts: DartEntry[] = [];
      if (isCricket) darts = cricketBotDarts(st0.cricketPlayers, turnIdx, level);
      else if (isAtc) darts = atcBotDarts(st0.atcPlayers, turnIdx, level, st0.config.atcAdvanceByMarks);
      else if (isKiller) darts = killerBotDarts(st0.killerPlayers, turnIdx, level);
      else if (isShanghai) darts = shanghaiBotDarts(st0.shanghaiRound, level);
      else if (isHalve) darts = halveBotDarts(st0.halveRound, level);

      darts.forEach((d, i) => {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            const st = useGameStore.getState();
            // Same uninterrupted turn? (guards against early commits / leg resets)
            if (st.matchWinnerIndex !== null) return;
            if (st.activePlayerIndex !== turnIdx || st.currentVisitDarts.length !== i) return;
            if (isCricket) st.addCricketDart(d);
            else if (isAtc) st.addAtcDart(d);
            else if (isKiller) st.addKillerDart(d);
            else if (isShanghai) st.addShanghaiDart(d);
            else if (isHalve) st.addHalveDart(d);
          }, BOT_THINK_MS + i * BOT_DART_MS)
        );
      });
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayerIndex, moment, matchWinnerIndex]);

  const dartsInVisit = currentVisitDarts.length;
  const visitTotal = currentVisitDarts.reduce((s, d) => s + d.points, 0);

  // Numpad: a checkout/bust usually ends the visit before the 3rd dart — ask
  // how many darts were thrown so averages stay honest (per-dart modes know).
  // Declared up here: hooks must run before the loading early-return below.
  const [pendingVisit, setPendingVisit] = useState<{ total: number; kind: 'checkout' | 'bust' } | null>(null);
  useEffect(() => {
    setPendingVisit(null); // stale prompt must never commit on the wrong turn
  }, [activePlayerIndex, matchWinnerIndex]);

  const headerTitle = useMemo(() => {
    if (isCricket) return 'Cricket';
    if (isAtc) return 'Around the Clock';
    if (isKiller) return 'Killer';
    if (isShanghai) return 'Shanghai';
    if (isHalve) return 'Halve-it';
    if (config.variant === 'custom') return String(config.startScore);
    return config.variant;
  }, [isCricket, isAtc, isKiller, isShanghai, isHalve, config.variant, config.startScore]);

  const headerSubtitle = useMemo(() => {
    if (perDartGame) return `Premier à ${config.legsToWin}`;
    const finish = FINISH_MODE_LABELS[config.finishMode];
    const format =
      config.setsToWin > 1
        ? `${config.setsToWin} sets · ${config.legsToWin} legs`
        : `Premier à ${config.legsToWin}`;
    return `${finish} · ${format}`;
  }, [perDartGame, config.finishMode, config.legsToWin, config.setsToWin]);

  const handleScore = (points: number, modifier: DartModifier, segment: number) => {
    if (isCricket) addCricketDart({ points, modifier, segment });
    else if (isAtc) addAtcDart({ points, modifier, segment });
    else if (isKiller) addKillerDart({ points, modifier, segment });
    else if (isShanghai) addShanghaiDart({ points, modifier, segment });
    else if (isHalve) addHalveDart({ points, modifier, segment });
    else addDart({ points, modifier, segment });
  };

  // Undo: drop the last dart of the in-progress visit, else revert the previous
  // committed visit (works across a leg checkout — fixes a mis-entered score).
  const handleUndo = () => {
    if (currentVisitDarts.length > 0) undoDart();
    else undoLastVisit();
  };

  // Leave the game. Mid-match it asks for confirmation (progress is lost and the
  // result is NOT recorded); a finished match leaves straight away. Tournament
  // matches go back to the bracket and stay replayable (nothing is reported).
  const leave = () => {
    if (tournamentMatchId) {
      resetGame();
      router.replace('/tournament');
    } else {
      resetGame();
      router.replace('/tabs');
    }
  };
  const handleQuit = () => {
    if (matchWinnerIndex !== null) {
      leave();
      return;
    }
    Alert.alert(
      'Quitter la partie ?',
      'La partie en cours sera abandonnée et ne sera pas enregistrée.',
      [
        { text: 'Continuer à jouer', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: leave },
      ]
    );
  };

  // Per-dart games have no numpad; coerce a stale 'numpad' selection to board.
  const effectiveMode: ScoringMode =
    perDartGame && scoringMode === 'numpad' ? 'board' : scoringMode;

  // Per-dart modes (grid/board) track individual darts in the visit; numpad
  // commits a whole-visit total in one shot, so its visit/checkout display differs.
  const perDart = effectiveMode !== 'numpad';

  const roster: { length: number } = isCricket
    ? cricketPlayers
    : isAtc
      ? atcPlayers
      : isKiller
        ? killerPlayers
        : isShanghai
          ? shanghaiPlayers
          : isHalve
            ? halvePlayers
            : players;
  if (roster.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <OcheLogo markSize={56} wordSize={34} style={{ flexDirection: 'column', gap: Spacing.s3 }} />
        <OcheText variant="bodyMd" color={C.fg3} style={{ marginTop: Spacing.s4 }}>
          Chargement…
        </OcheText>
      </View>
    );
  }

  const isGameOver = matchWinnerIndex !== null;
  const activePlayer = players[activePlayerIndex];
  const activeIsBot = !!botLevels[activePlayerIndex] && !isGameOver;
  const inputDisabled =
    activeIsBot ||
    (perDartGame
      ? isGameOver
      : !activePlayer || activePlayer.remaining === 0 || isGameOver);

  // Name of whoever is on the oche right now (for the "bot is aiming" banner).
  const activePlayerName = (isCricket
    ? cricketPlayers
    : isAtc
      ? atcPlayers
      : isKiller
        ? killerPlayers
        : isShanghai
          ? shanghaiPlayers
          : isHalve
            ? halvePlayers
            : players)[activePlayerIndex]?.name ?? '';

  // Team play: who's on the oche for the active team right now (rotates each visit).
  const activeMembers = teamMembers[activePlayerIndex] ?? [];
  const activeThrower =
    activeMembers.length > 1 && !isGameOver && !activeIsBot
      ? activeMembers[teamTurn[activePlayerIndex] ?? 0]
      : null;

  // Single-target games (ATC / Shanghai) can use the quick-pad on the current number.
  const singleTarget = isAtc || isShanghai;
  const atcActive = isAtc ? atcPlayers[activePlayerIndex] : undefined;
  // ATC applies darts only at commit, so project the darts thrown SO FAR this visit
  // to advance the quick-pad number live (hit 1 → button jumps to 2, etc.).
  const atcLiveHits =
    isAtc && atcActive
      ? applyAtcDarts(atcPlayers, activePlayerIndex, currentVisitDarts, config.atcAdvanceByMarks)[activePlayerIndex]?.hits ??
        atcActive.hits
      : 0;
  const quickTarget: number | null = isShanghai
    ? shanghaiRound
    : isAtc && atcActive && atcLiveHits < ATC_SEQUENCE.length
      ? ATC_SEQUENCE[atcLiveHits]
      : null;
  const showQuick = singleTarget && quickInput && quickTarget != null;

  // Helpers for the numpad checkout/bust prompt (state lives above the
  // loading early-return — hook rules).
  const canFinishIn1 = (t: number) => {
    if (config.finishMode === 'simple')
      return (t >= 1 && t <= 20) || (t % 2 === 0 && t <= 40) || (t % 3 === 0 && t <= 60) || t === 25 || t === 50;
    if (config.finishMode === 'master') return t === 50 || (t % 2 === 0 && t <= 40) || (t % 3 === 0 && t <= 60);
    return t === 50 || (t % 2 === 0 && t <= 40);
  };
  const canFinishIn2 = (t: number) => t <= (config.finishMode === 'double' ? 110 : 120);
  const submitNumpadTotal = (t: number) => {
    const p = players[activePlayerIndex];
    if (isX01 && p) {
      const clamped = Math.max(0, Math.min(180, Math.floor(t)));
      const projected = p.remaining - clamped;
      const bust = projected < 0 || (projected === 1 && config.finishMode !== 'simple');
      if (projected === 0 || bust) {
        setPendingVisit({ total: clamped, kind: projected === 0 ? 'checkout' : 'bust' });
        return;
      }
    }
    addVisitTotal(t);
  };

  // Spotlight (3+ players) trims vertical chrome so the pad never gets pushed
  // off screen: the checkout row only appears once a finish is actually on.
  const spotlight = isX01 && players.length > 2;
  const checkoutRem = activePlayer
    ? (perDart ? activePlayer.remaining - visitTotal : activePlayer.remaining)
    : 0;
  const showCheckoutRow = isX01 && (!spotlight || (checkoutRem >= 2 && checkoutRem <= 170));

  // Player who triggered the current celebration: the match winner, otherwise
  // the player who just threw (we already advanced).
  const triggerIndex =
    matchWinnerIndex !== null
      ? matchWinnerIndex
      : (activePlayerIndex - 1 + roster.length) % roster.length;

  // MomentOverlay is typed for X01 PlayerState; adapt per-dart players to it.
  const adapt = (src: { id: number; name: string; legs: number; dartsThrown: number }): PlayerState => ({
    id: src.id,
    name: src.name,
    remaining: 0,
    legs: src.legs,
    sets: 0,
    dartsThrown: src.dartsThrown,
    visits: [],
    avg: 0,
  });
  const momentPlayer: PlayerState | undefined = isCricket
    ? cricketPlayers[triggerIndex] && adapt(cricketPlayers[triggerIndex])
    : isAtc
      ? atcPlayers[triggerIndex] && adapt(atcPlayers[triggerIndex])
      : isKiller
        ? killerPlayers[triggerIndex] && adapt(killerPlayers[triggerIndex])
        : isShanghai
          ? shanghaiPlayers[triggerIndex] && adapt(shanghaiPlayers[triggerIndex])
          : isHalve
            ? halvePlayers[triggerIndex] && adapt(halvePlayers[triggerIndex])
            : players[triggerIndex];

  // Generic {name, legs, sets} list for the end-of-match recap.
  const scoreRoster: { name: string; legs: number; sets: number }[] = (isCricket
    ? cricketPlayers
    : isAtc
      ? atcPlayers
      : isKiller
        ? killerPlayers
        : isShanghai
          ? shanghaiPlayers
          : isHalve
            ? halvePlayers
            : players
  ).map((p) => ({ name: p.name, legs: p.legs, sets: (p as { sets?: number }).sets ?? 0 }));

  // Per-game stat line for the win overlay (replaces the X01 "avg" default).
  const legsOf = (n: number) => `${n} leg${n > 1 ? 's' : ''}`;
  const momentStat: string | undefined = isCricket
    ? cricketPlayers[triggerIndex] &&
      `${cricketPlayers[triggerIndex].score} pts · ${legsOf(cricketPlayers[triggerIndex].legs)}`
    : isAtc
      ? atcPlayers[triggerIndex] &&
        `Parcours bouclé · ${legsOf(atcPlayers[triggerIndex].legs)}`
      : isKiller
        ? killerPlayers[triggerIndex] &&
          `Dernier en vie · ${legsOf(killerPlayers[triggerIndex].legs)}`
        : isShanghai
          ? shanghaiPlayers[triggerIndex] &&
            `${shanghaiPlayers[triggerIndex].score} pts · ${legsOf(shanghaiPlayers[triggerIndex].legs)}`
          : isHalve
            ? halvePlayers[triggerIndex] &&
              `${halvePlayers[triggerIndex].score} pts · ${legsOf(halvePlayers[triggerIndex].legs)}`
            : undefined;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Brick flash + BUST banner */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: C.brick,
            opacity: bustAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }),
            zIndex: 99,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bustBanner,
          {
            opacity: bustAnim,
            transform: [
              {
                scale: bustAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
              },
            ],
          },
        ]}
      >
        <OcheText variant="displayLg" allCaps color={C.cream} style={styles.bustText}>
          Bust
        </OcheText>
      </Animated.View>

      <OcheHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        bell={false}
        left={
          <Pressable onPress={handleQuit} hitSlop={10}>
            <OcheText variant="labelSm" color={C.fg2} allCaps>
              ‹ Quitter
            </OcheText>
          </Pressable>
        }
        right={
          <Pressable onPress={() => router.push('/new-game')}>
            <OcheText variant="labelSm" color={C.fg2} allCaps>
              Nouvelle
            </OcheText>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Scoreboard — per game type */}
        {isCricket ? (
          <CricketBoard
            players={cricketPlayers}
            activeIndex={activePlayerIndex}
            visitDarts={currentVisitDarts}
            cutThroat={config.cricketCutThroat}
            isGameOver={isGameOver}
          />
        ) : isAtc ? (
          <AtcBoard
            players={atcPlayers}
            activeIndex={activePlayerIndex}
            visitDarts={currentVisitDarts}
            advanceByMarks={config.atcAdvanceByMarks}
            isGameOver={isGameOver}
          />
        ) : isKiller ? (
          <KillerBoard
            players={killerPlayers}
            activeIndex={activePlayerIndex}
            maxLives={config.startLives}
            visitDarts={currentVisitDarts}
            selfHit={config.killerSelfHit}
            isGameOver={isGameOver}
          />
        ) : isShanghai ? (
          <ShanghaiBoard
            players={shanghaiPlayers}
            activeIndex={activePlayerIndex}
            round={shanghaiRound}
            totalRounds={config.shanghaiRounds}
            visitDarts={currentVisitDarts}
            isGameOver={isGameOver}
          />
        ) : isHalve ? (
          <HalveBoard
            players={halvePlayers}
            activeIndex={activePlayerIndex}
            round={halveRound}
            visitDarts={currentVisitDarts}
            isGameOver={isGameOver}
          />
        ) : players.length > 2 ? (
          // Spotlight: active player big, others compact — keeps the input on screen.
          <View style={styles.spotlight}>
            {activePlayer && (
              <View style={styles.tilesRow}>
                <ScoreTile
                  dense
                  playerName={activePlayer.name}
                  remaining={activePlayer.remaining}
                  average={activePlayer.avg}
                  dartsThrown={activePlayer.dartsThrown}
                  isActive={!isGameOver}
                  legs={activePlayer.legs}
                  sets={activePlayer.sets}
                />
              </View>
            )}
            {/* One slim swipeable strip whatever the player count — keeps the
                scoreboard height constant so the input never gets pushed off. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniRow}>
              {players.map((p, i) =>
                i === activePlayerIndex ? null : (
                  <ScoreTile
                    key={p.id}
                    compact
                    playerName={p.name}
                    remaining={p.remaining}
                    average={p.avg}
                    dartsThrown={p.dartsThrown}
                    isActive={false}
                    legs={p.legs}
                    sets={p.sets}
                  />
                )
              )}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.tilesRow}>
            {players.map((p, i) => (
              <View key={p.id} style={styles.tileCell}>
                <ScoreTile
                  playerName={p.name}
                  remaining={p.remaining}
                  average={p.avg}
                  dartsThrown={p.dartsThrown}
                  isActive={i === activePlayerIndex && !isGameOver}
                  legs={p.legs}
                  sets={p.sets}
                />
              </View>
            ))}
          </View>
        )}

        {/* Scoring mode switcher — replaced by the bot banner while it throws
            (the input is locked anyway), so the layout height stays constant. */}
        {activeIsBot ? (
          <View style={styles.botTurn}>
            <OcheText variant="labelMd" allCaps color={C.onAmber} style={styles.botTurnText}>
              🎯 {activePlayerName} vise…
            </OcheText>
          </View>
        ) : singleTarget ? (
          <View style={styles.seg}>
            {([
              ['quick', 'Rapide'],
              ['grid', 'Grille'],
              ['board', 'Cible'],
            ] as const).map(([v, label]) => {
              const active = v === 'quick' ? quickInput : !quickInput && effectiveMode === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => {
                    if (v === 'quick') setQuickInput(true);
                    else {
                      setQuickInput(false);
                      setScoringMode(v);
                    }
                  }}
                  style={[styles.segBtn, active && styles.segBtnActive]}
                >
                  <OcheText variant="labelMd" allCaps color={active ? C.onAmber : C.fg2} style={styles.segText}>
                    {label}
                  </OcheText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ScoreModeToggle
            value={effectiveMode}
            onChange={setScoringMode}
            available={perDartGame ? PER_DART_MODES : undefined}
          />
        )}

        {/* Team play — whose turn it is within the active team. */}
        {activeThrower && (
          <View style={styles.teamTurn}>
            <OcheText variant="labelMd" allCaps color={C.onBrick} style={styles.botTurnText}>
              🎯 Au lancer : {activeThrower}
            </OcheText>
          </View>
        )}

        {/* Per-dart games: slim one-line recap of the darts thrown this visit. */}
        {perDartGame && (
          <View style={styles.cricketRecap}>
            {[0, 1, 2].map((i) => {
              const d = currentVisitDarts[i];
              return (
                <View
                  key={i}
                  style={[
                    styles.recapChip,
                    d ? styles.recapChipFilled : styles.recapChipEmpty,
                    i === dartsInVisit && styles.recapChipActive,
                  ]}
                >
                  <OcheText variant="monoSm" color={d ? C.cream : C.fg3}>
                    {dartLabel(d)}
                  </OcheText>
                </View>
              );
            })}
          </View>
        )}

        {/* Current visit display — X01 per-dart modes, and always while a bot
            throws (its visit lands dart by dart even if the human uses numpad). */}
        {(perDart || activeIsBot) && isX01 && (
          <View style={styles.visitRow}>
            <View style={styles.visitDarts}>
              {[0, 1, 2].map((i) => {
                const dart = currentVisitDarts[i];
                return (
                  <View
                    key={i}
                    style={[
                      styles.dartSlot,
                      dart ? styles.dartSlotFilled : styles.dartSlotEmpty,
                      i === dartsInVisit && styles.dartSlotActive,
                    ]}
                  >
                    <OcheText
                      variant="monoMd"
                      color={dart ? C.cream : C.fg3}
                    >
                      {dartLabel(dart)}
                    </OcheText>
                  </View>
                );
              })}
            </View>

            <View style={styles.visitTotal}>
              <OcheText variant="monoSm" color={C.fg3} allCaps>Volée</OcheText>
              <OcheText variant="h2" color={visitTotal > 0 ? C.amber : C.fg3}>
                {visitTotal}
              </OcheText>
            </View>
          </View>
        )}

        {/* Checkout suggestion (X01 only) — per-dart modes recalc live; numpad
            shows the full-remaining checkout. In spotlight (3+ players) the row
            only appears once a finish is on, to keep the pad fully visible. */}
        {showCheckoutRow && (
          <View style={styles.checkoutRow}>
            {activePlayer && (
              <CheckoutPill
                remaining={checkoutRem}
                dartsLeft={perDart ? 3 - dartsInVisit : 3}
                finishMode={config.finishMode}
              />
            )}
          </View>
        )}

        {/* Input — quick-pad for single-target games, else the normal pad/board/numpad */}
        {showQuick && quickTarget != null ? (
          <QuickPad
            target={quickTarget}
            onScore={handleScore}
            onUndo={handleUndo}
            disabled={inputDisabled}
            style={styles.dartPad}
          />
        ) : (
          <>
            {effectiveMode === 'grid' && (
              <DartPad onScore={handleScore} onUndo={handleUndo} style={styles.dartPad} disabled={inputDisabled} />
            )}
            {effectiveMode === 'board' && (
              <DartboardInput onScore={handleScore} onUndo={handleUndo} style={styles.dartPad} disabled={inputDisabled} />
            )}
            {effectiveMode === 'numpad' && !pendingVisit && (
              <NumpadInput onSubmit={submitNumpadTotal} style={styles.dartPad} disabled={inputDisabled} />
            )}
            {effectiveMode === 'numpad' && pendingVisit && (
              <View style={[styles.dartPad, styles.dartsAsk]}>
                <OcheText variant="h3" color={C.cream} style={styles.dartsAskTitle}>
                  {pendingVisit.kind === 'checkout'
                    ? `Fermé ${pendingVisit.total} en combien de fléchettes ?`
                    : 'Bust après combien de fléchettes ?'}
                </OcheText>
                <View style={styles.dartsAskRow}>
                  {([1, 2, 3] as const).map((n) => {
                    const ok =
                      pendingVisit.kind === 'bust' ||
                      n === 3 ||
                      (n === 1 ? canFinishIn1(pendingVisit.total) : canFinishIn2(pendingVisit.total));
                    return (
                      <Pressable
                        key={n}
                        disabled={!ok}
                        onPress={() => {
                          addVisitTotal(pendingVisit.total, n);
                          setPendingVisit(null);
                        }}
                        style={[styles.dartsAskBtn, !ok && styles.dartsAskBtnOff]}
                      >
                        <OcheText variant="displaySm" color={ok ? C.onAmber : C.fg3}>{n}</OcheText>
                        <OcheText variant="labelSm" allCaps color={ok ? C.onAmber : C.fg3}>
                          fléchette{n > 1 ? 's' : ''}
                        </OcheText>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={() => setPendingVisit(null)} style={styles.dartsAskCancel}>
                  <OcheText variant="labelMd" allCaps color={C.fg2}>Annuler</OcheText>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Celebration overlay — single instance, tap to dismiss */}
      <MomentOverlay
        type={moment}
        player={momentPlayer}
        statLine={momentStat || undefined}
        onDismiss={clearMoment}
      />

      {/* End-of-match recap — once the celebration has been dismissed */}
      <EndGameOverlay
        visible={isGameOver && moment === null}
        title={headerTitle}
        winnerName={matchWinnerIndex !== null ? scoreRoster[matchWinnerIndex]?.name ?? '' : ''}
        players={scoreRoster}
        winnerIndex={matchWinnerIndex ?? -1}
        statLine={momentStat || undefined}
        useSets={isX01 && config.setsToWin > 1}
        tournament={!!tournamentMatchId}
        onRematch={rematch}
        onNew={() => router.replace('/new-game')}
        onHome={() => (tournamentMatchId ? router.replace('/tournament') : router.replace('/tabs'))}
      />
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.walnut,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.s3,
    paddingTop: Spacing.s3,
    gap: Spacing.s3,
    flexGrow: 1,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  tileCell: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
  },
  spotlight: {
    gap: Spacing.s2,
  },
  miniRow: {
    flexDirection: 'row',
    flexGrow: 1,
    gap: Spacing.s2,
  },
  seg: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border1,
    overflow: 'hidden',
  },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: C.walnutUp },
  segBtnActive: { backgroundColor: C.amber },
  segText: { letterSpacing: 1, fontWeight: '700' },
  botTurn: {
    backgroundColor: C.amber,
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    alignItems: 'center',
    borderRadius: Radii.none,
  },
  teamTurn: {
    backgroundColor: C.brick,
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    alignItems: 'center',
    borderRadius: Radii.none,
  },
  botTurnText: {
    letterSpacing: 1,
    fontWeight: '700',
  },
  cricketRecap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  recapChip: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.none,
    borderWidth: 1,
    alignItems: 'center',
  },
  recapChipEmpty: {
    borderColor: C.border2,
    borderStyle: 'dashed',
  },
  recapChipFilled: {
    backgroundColor: C.walnutUp2,
    borderColor: C.border1,
  },
  recapChipActive: {
    borderColor: C.amber,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s2,
    paddingVertical: Spacing.s2,
    backgroundColor: C.walnutUp,
    borderRadius: Radii.none,
    borderWidth: 1,
    borderColor: C.border1,
  },
  visitDarts: {
    flexDirection: 'row',
    gap: 6,
  },
  dartSlot: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.none,
    alignItems: 'center',
    borderWidth: 1,
  },
  dartSlotEmpty: {
    borderColor: C.border2,
    borderStyle: 'dashed',
  },
  dartSlotFilled: {
    backgroundColor: C.walnutUp2,
    borderColor: C.border1,
  },
  dartSlotActive: {
    borderColor: C.amber,
  },
  visitTotal: {
    alignItems: 'flex-end',
    gap: 2,
  },
  checkoutRow: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.s2,
  },
  dartPad: {
    flex: 1,
  },
  dartsAsk: {
    justifyContent: 'center',
    gap: Spacing.s4,
    paddingVertical: Spacing.s4,
  },
  dartsAskTitle: {
    textAlign: 'center',
  },
  dartsAskRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  dartsAskBtn: {
    flex: 1,
    backgroundColor: C.amber,
    alignItems: 'center',
    paddingVertical: Spacing.s4,
    gap: 2,
    borderRadius: Radii.none,
  },
  dartsAskBtnOff: {
    backgroundColor: C.walnutUp,
    borderWidth: 1,
    borderColor: C.border1,
  },
  dartsAskCancel: {
    alignSelf: 'center',
    paddingVertical: Spacing.s2,
    paddingHorizontal: Spacing.s4,
  },
  bustBanner: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  bustText: {
    letterSpacing: 4,
    textShadowColor: C.brick,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
});
