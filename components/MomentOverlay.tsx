import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { OcheText } from './OcheText';
import { Colors, Spacing, Durations } from '@/constants/theme';
import type { Moment, PlayerState, DartEntry } from '@/hooks/useGameStore';

interface MomentOverlayProps {
  /** Which celebration to show. `null`, `bust` → overlay renders nothing. */
  type: Moment;
  /** The player who triggered the moment. */
  player?: PlayerState;
  /** Stat line shown on match/Shanghai wins (overrides the default X01 avg). */
  statLine?: string;
  onDismiss: () => void;
}

const TRASH_180 = [
  "Tu sais qu'il y a des gens qui n'en font jamais, c'est ça ?",
  "C'est pas normal d'être aussi précis.",
  "Quelqu'un a vu ça ? Non ? Dommage.",
];
const TRASH_CHECKOUT = [
  'Checkout. Propre.',
  'Voilà comment on ferme une leg.',
  'Bien joué.',
];
const TRASH_MATCH = [
  'Match plié. Tu peux rentrer.',
  "On range les fléchettes, c'est fini.",
  'Belle perf. La prochaine se gagne pas toute seule.',
];
const TRASH_SHANGHAI = [
  'Simple, double, triple. Le grand chelem.',
  "Shanghai. Y'a plus rien à ajouter.",
  'Trois fléchettes, une légende.',
];

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Format a dart as the DA does: T20, D8, 25, BULL, M. */
function fmtDart(d: DartEntry): string {
  const mod = d.modifier !== 'S' ? d.modifier : '';
  if (d.segment === 0) return 'M';
  if (d.segment === 25) return d.points === 50 ? 'BULL' : '25';
  return `${mod}${d.segment}`;
}

/** The breakdown line ("T20 · T20 · T20") from the player's last committed visit. */
function lastVisitBreakdown(player?: PlayerState): string | null {
  if (!player || player.visits.length === 0) return null;
  const last = player.visits[player.visits.length - 1];
  if (!last || last.darts.length === 0) return null;
  return last.darts.map(fmtDart).join(' · ');
}

export function MomentOverlay({ type, player, statLine, onDismiss }: MomentOverlayProps) {
  const { width, height } = useWindowDimensions();
  const isCelebration =
    type === '180' || type === 'checkout' || type === 'matchWon' || type === 'shanghai';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  // Keep a stable trash-talk line for the lifetime of this overlay instance.
  const msgRef = useRef<string>('');

  useEffect(() => {
    if (!isCelebration) return;

    msgRef.current =
      type === 'matchWon'
        ? pick(TRASH_MATCH)
        : type === 'shanghai'
          ? pick(TRASH_SHANGHAI)
          : type === '180'
            ? pick(TRASH_180)
            : pick(TRASH_CHECKOUT);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    glowAnim.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ]),
    );

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: Durations.std, useNativeDriver: true }),
      loop,
    ]).start();

    return () => loop.stop();
    // Re-run when the moment type changes (new celebration).
  }, [type]);

  if (!isCelebration) return null;

  const is180 = type === '180';
  const isCheckout = type === 'checkout';
  const isMatchWon = type === 'matchWon';
  const isShanghai = type === 'shanghai';

  const breakdown = lastVisitBreakdown(player);

  // DA-defined content per moment.
  const label = is180
    ? 'Maximum'
    : isCheckout
      ? 'Checkout'
      : isShanghai
        ? 'Shanghai'
        : 'Match';

  return (
    <Pressable style={[StyleSheet.absoluteFill, styles.container]} onPress={onDismiss}>
      {/* Centered radial amber glow — DA: radial-gradient(circle, rgba(232,197,71,.22), transparent 62%) */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowAnim }]} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="ocheGlow" cx="50%" cy="46%" r="62%">
              <Stop offset="0%" stopColor={Colors.amber} stopOpacity={0.22} />
              <Stop offset="62%" stopColor={Colors.amber} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#ocheGlow)" />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
      >
        {/* Small tracked label, amber */}
        <OcheText variant="labelSm" allCaps color={Colors.amber} style={styles.label}>
          {label}
        </OcheText>

        {/* 180 — the broadcast number */}
        {is180 && (
          <OcheText style={styles.bigNumber} allCaps>
            180
          </OcheText>
        )}

        {/* Shanghai — the broadcast word */}
        {isShanghai && (
          <OcheText style={styles.bigWord} allCaps>
            Shanghai
          </OcheText>
        )}

        {/* Checkout / Match — the player's name carries the headline */}
        {(isCheckout || isMatchWon) && player && (
          <OcheText style={styles.bigName}>{player.name}</OcheText>
        )}

        {/* Dart breakdown (mono, cream) — DA: "T20 · T20 · T20" */}
        {breakdown && (
          <OcheText variant="monoMd" color={Colors.cream} allCaps style={styles.breakdown}>
            {breakdown}
          </OcheText>
        )}

        {/* Stat line for match / Shanghai wins (per-game, via statLine) */}
        {(isMatchWon || isShanghai) && player && (
          <OcheText variant="labelMd" allCaps color={Colors.fg2} style={styles.stat}>
            {statLine ??
              `${player.legs} leg${player.legs > 1 ? 's' : ''} · ${Math.round(player.avg * 10) / 10} avg`}
          </OcheText>
        )}

        {/* Sub: player name (180 + Shanghai headline numbers) */}
        {(is180 || isShanghai) && player && (
          <OcheText variant="bodyMd" color={Colors.fg2} style={styles.sub}>
            {player.name}
          </OcheText>
        )}

        {/* Trash-talk message */}
        <View style={styles.messageWrap}>
          <View style={styles.messageBar} />
          <OcheText variant="bodyLg" color={Colors.fg2} style={styles.message}>
            « {msgRef.current} »
          </OcheText>
        </View>

        <OcheText variant="labelSm" color={Colors.fg3} allCaps style={styles.tapHint}>
          Appuie pour continuer
        </OcheText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.walnut,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.s6,
  },
  label: {
    letterSpacing: 4,
    marginBottom: Spacing.s2,
  },
  bigNumber: {
    fontFamily: 'BigShouldersDisplay',
    fontSize: 132,
    lineHeight: 124,
    fontWeight: '900',
    letterSpacing: -2,
    color: Colors.amber,
    textAlign: 'center',
    textShadowColor: 'rgba(232,197,71,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
  },
  bigName: {
    fontFamily: 'BigShouldersDisplay',
    fontSize: 64,
    lineHeight: 64,
    fontWeight: '800',
    letterSpacing: -1.5,
    color: Colors.amber,
    textAlign: 'center',
    textShadowColor: 'rgba(232,197,71,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 32,
  },
  bigWord: {
    fontFamily: 'BigShouldersDisplay',
    fontSize: 72,
    lineHeight: 72,
    fontWeight: '900',
    letterSpacing: 1,
    color: Colors.amber,
    textAlign: 'center',
    textShadowColor: 'rgba(232,197,71,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
  },
  breakdown: {
    marginTop: Spacing.s3,
    letterSpacing: 2,
  },
  stat: {
    marginTop: Spacing.s2,
    letterSpacing: 1.5,
  },
  sub: {
    marginTop: Spacing.s2,
  },
  messageWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: Spacing.s6,
    maxWidth: 300,
  },
  messageBar: {
    width: 2,
    backgroundColor: Colors.amber,
    marginRight: Spacing.s3,
    opacity: 0.7,
  },
  message: {
    flexShrink: 1,
    fontStyle: 'italic',
    color: Colors.fg2,
  },
  tapHint: {
    marginTop: Spacing.s8,
    letterSpacing: 2,
    color: Colors.fg3,
  },
});
