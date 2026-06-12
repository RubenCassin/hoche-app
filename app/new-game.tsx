import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { OcheMark } from '@/components/OcheLogo';
import { SectionLabel } from '@/components/SectionLabel';
import { Spacing, Radii, glow, glowSoft } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  useGameStore,
  X01_VARIANT_SCORES,
  FINISH_MODE_LABELS,
  type X01Variant,
  type FinishMode,
  type GameType,
  type BotDifficulty,
} from '@/hooks/useGameStore';
import { BOT_ORDER, BOT_LABELS, botName } from '@/hooks/botEngine';
import { useAuthStore } from '@/hooks/useAuthStore';
import { getFollowing, type PersonResult } from '@/services/api';

// ─── Per-game line icons ──────────────────────────────────────────────────────
function GameIcon({ type, color, size = 26 }: { type: GameType; color: string; size?: number }) {
  const sw = 1.8;
  switch (type) {
    case 'x01': // bullseye
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={sw} />
          <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={sw} />
          <Circle cx="12" cy="12" r="1.9" fill={color} />
        </Svg>
      );
    case 'cricket': // scoreboard hash
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="9.5" y1="4" x2="7.5" y2="20" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="16.5" y1="4" x2="14.5" y2="20" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="4" y1="9.5" x2="20" y2="9.5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="4" y1="15" x2="20" y2="15" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'atc': // clock
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={sw} />
          <Path d="M12 7v5l3.2 2" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'killer': // heart (lives)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 20s-6.6-4.3-6.6-9.1A3.6 3.6 0 0 1 12 8.1a3.6 3.6 0 0 1 6.6 2.8C18.6 15.7 12 20 12 20z"
            stroke={color}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'shanghai': // star
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3.5l2.6 5.2 5.8.9-4.2 4 1 5.7L12 16.6 6.8 19.3l1-5.7-4.2-4 5.8-.9z"
            stroke={color}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'halveit': // division sign (score gets halved on a miss)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="6.5" r="1.6" fill={color} />
          <Path d="M5 12h14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="12" cy="17.5" r="1.6" fill={color} />
        </Svg>
      );
  }
}

const VARIANTS: X01Variant[] = ['101', '301', '501', '701', 'custom'];
const FINISH_MODES: FinishMode[] = ['simple', 'double', 'master'];
const LEGS_PRESETS = [1, 3, 5, 7];
const SETS_PRESETS = [1, 3, 5];
const LIVES_PRESETS = [3, 5];
const ROUNDS_PRESETS = [7, 20];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

export default function NewGameScreen() {
  const insets = useSafeAreaInsets();
  const initPlayers = useGameStore((s) => s.initPlayers);
  const initCricket = useGameStore((s) => s.initCricket);
  const initAtc = useGameStore((s) => s.initAtc);
  const initKiller = useGameStore((s) => s.initKiller);
  const initShanghai = useGameStore((s) => s.initShanghai);
  const initHalve = useGameStore((s) => s.initHalve);

  const params = useLocalSearchParams<{ game?: string }>();
  const initialGameType: GameType = (['x01', 'cricket', 'atc', 'killer', 'shanghai', 'halveit'] as const).includes(
    params.game as GameType
  )
    ? (params.game as GameType)
    : 'x01';

  const meName = useAuthStore((s) => s.user?.name) || 'Joueur 1';
  const meId = useAuthStore((s) => s.user?.id);
  const { data: friends } = useQuery({
    queryKey: ['following', meId],
    queryFn: () => getFollowing(meId!),
    enabled: !!meId,
  });
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [botSlot, setBotSlot] = useState<number | null>(null);

  const [paramMode, setParamMode] = useState<'standard' | 'advanced'>('standard');
  const [gameType, setGameType] = useState<GameType>(initialGameType);
  const [roster, setRoster] = useState<{ id: number; name: string; accountId?: number; bot?: BotDifficulty; members?: string[] }[]>([
    { id: 1, name: meName }, // player 1 = the logged-in account (stats tracked)
    { id: 2, name: 'Joueur 2' },
  ]);
  const [killerNumbers, setKillerNumbers] = useState<number[]>([20, 19]);
  const [variant, setVariant] = useState<X01Variant>('501');
  const [customScore, setCustomScore] = useState('1001');
  const [finishMode, setFinishMode] = useState<FinishMode>('double');
  const [legsToWin, setLegsToWin] = useState<number>(1);
  const [setsToWin, setSetsToWin] = useState<number>(1);
  const [startLives, setStartLives] = useState<number>(3);
  const [shanghaiRounds, setShanghaiRounds] = useState<number>(7);
  // Advanced rule toggles
  const [cutThroat, setCutThroat] = useState(false);
  const [atcAdvance, setAtcAdvance] = useState(false);
  const [killerSelfHit, setKillerSelfHit] = useState(true);

  const isX01 = gameType === 'x01';
  // Only these games expose advanced rules — others hide the Standard/Avancé
  // toggle entirely so there's no empty "Avancé" view.
  const hasAdvanced = isX01 || gameType === 'cricket' || gameType === 'atc' || gameType === 'killer';
  const advanced = paramMode === 'advanced' && hasAdvanced;
  const C = useTheme();
  const styles = makeStyles(C);

  // Variants offered: the custom (perso) score lives in advanced mode only.
  const variantOptions = advanced ? VARIANTS : VARIANTS.filter((v) => v !== 'custom');

  // Each game gets its own accent + line icon so the choice doesn't feel uniform.
  const GAMES: { key: GameType; label: string; tag: string; accent: string }[] = [
    { key: 'x01', label: 'X01', tag: '501 / 301 — premier à zéro', accent: C.amber },
    { key: 'cricket', label: 'Cricket', tag: 'Ferme 15 → Bull', accent: C.win },
    { key: 'atc', label: 'Clock', tag: '1 → 20 dans l’ordre', accent: C.info },
    { key: 'killer', label: 'Killer', tag: 'Vies + numéros', accent: C.brick },
    { key: 'shanghai', label: 'Shanghai', tag: 'Manches 1 → 7', accent: C.orange },
    { key: 'halveit', label: 'Halve-it', tag: 'Rate → score ÷2', accent: C.warn },
  ];
  const featuredGame = GAMES[0];
  const otherGames = GAMES.slice(1);

  // ── Roster management ──
  const firstUnusedNumber = (used: number[]) => {
    for (let n = 20; n >= 1; n--) if (!used.includes(n)) return n;
    return 1;
  };
  const addPlayer = () => {
    if (roster.length >= MAX_PLAYERS) return;
    const id = Math.max(0, ...roster.map((r) => r.id)) + 1;
    setRoster([...roster, { id, name: `Joueur ${roster.length + 1}` }]);
    setKillerNumbers([...killerNumbers, firstUnusedNumber(killerNumbers)]);
  };
  const removePlayer = (i: number) => {
    if (roster.length <= MIN_PLAYERS) return;
    setRoster(roster.filter((_, j) => j !== i));
    setKillerNumbers(killerNumbers.filter((_, j) => j !== i));
  };
  const setName = (i: number, name: string) =>
    // Typing a name turns the slot back into a guest (drops any account / bot).
    setRoster(roster.map((r, j) => (j === i ? { ...r, name, accountId: undefined, bot: undefined } : r)));
  const pickFriend = (i: number, friend: PersonResult) => {
    setRoster(roster.map((r, j) => (j === i ? { ...r, name: friend.name, accountId: friend.id, bot: undefined } : r)));
    setPickingSlot(null);
  };
  const clearAccount = (i: number) =>
    setRoster(roster.map((r, j) => (j === i ? { ...r, accountId: undefined } : r)));
  const pickBot = (i: number, level: BotDifficulty) => {
    // A bot opponent: linked to no account, named after its tier.
    setRoster(roster.map((r, j) => (j === i ? { ...r, name: botName(level), accountId: undefined, bot: level } : r)));
    setBotSlot(null);
    setPickingSlot(null);
  };
  const clearBot = (i: number) =>
    setRoster(roster.map((r, j) => (j === i ? { ...r, bot: undefined, name: `Joueur ${i + 1}` } : r)));
  // ── Team-mates (shared score, alternating throws) ──
  const addTeammate = (i: number) =>
    setRoster(roster.map((r, j) => (j === i ? { ...r, members: [...(r.members ?? []), ''] } : r)));
  const setTeammate = (i: number, k: number, v: string) =>
    setRoster(roster.map((r, j) => (j === i ? { ...r, members: (r.members ?? []).map((m, n) => (n === k ? v : m)) } : r)));
  const removeTeammate = (i: number, k: number) =>
    setRoster(roster.map((r, j) => (j === i ? { ...r, members: (r.members ?? []).filter((_, n) => n !== k) } : r)));
  // Step a Killer number within 1–20, skipping numbers used by other players.
  const stepKillerNumber = (i: number, dir: 1 | -1) => {
    const others = killerNumbers.filter((_, j) => j !== i);
    let n = killerNumbers[i];
    for (let k = 0; k < 20; k++) {
      n = ((n - 1 + dir + 20) % 20) + 1;
      if (!others.includes(n)) break;
    }
    setKillerNumbers(killerNumbers.map((v, j) => (j === i ? n : v)));
  };

  const startScore = useMemo(() => {
    if (variant === 'custom') {
      const n = parseInt(customScore, 10);
      return Number.isFinite(n) && n > 1 ? n : 501;
    }
    return X01_VARIANT_SCORES[variant];
  }, [variant, customScore]);

  const handleStart = () => {
    const cleaned = roster.map((r, i) => {
      const primary = r.name.trim() || `Joueur ${i + 1}`;
      const extras = (r.members ?? []).map((m) => m.trim()).filter(Boolean);
      return {
        id: r.id,
        name: extras.length ? `${primary} +${extras.length}` : primary,
        accountId: r.accountId,
        bot: r.bot,
        members: extras.length ? [primary, ...extras] : undefined,
      };
    });
    if (gameType === 'cricket') {
      initCricket(cleaned, { legsToWin, cricketCutThroat: advanced && cutThroat });
    } else if (gameType === 'atc') {
      initAtc(cleaned, { legsToWin, atcAdvanceByMarks: advanced && atcAdvance });
    } else if (gameType === 'killer') {
      // In advanced mode players pick their numbers; otherwise random.
      const killerRoster = advanced
        ? cleaned.map((r, i) => ({ ...r, number: killerNumbers[i] }))
        : cleaned;
      initKiller(killerRoster, {
        legsToWin,
        startLives,
        killerSelfHit: advanced ? killerSelfHit : true,
      });
    } else if (gameType === 'shanghai') {
      initShanghai(cleaned, { legsToWin, shanghaiRounds });
    } else if (gameType === 'halveit') {
      initHalve(cleaned, { legsToWin });
    } else {
      initPlayers(cleaned, { variant, startScore, finishMode, legsToWin, setsToWin });
    }
    router.replace('/tabs/scoring');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <OcheText variant="labelMd" color={C.fg2}>Annuler</OcheText>
          </Pressable>
          <OcheText variant="displaySm" allCaps color={C.amber}>Nouvelle Partie</OcheText>
          <View style={{ width: 60, alignItems: 'flex-end' }}>
            <OcheMark size={30} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Game type — featured card + accent grid */}
          <View style={styles.section}>
            <SectionLabel icon="grid">Choisis ton jeu</SectionLabel>

            {/* Featured — X01 */}
            <Pressable
              onPress={() => setGameType(featuredGame.key)}
              style={({ pressed }) => [
                styles.featuredCard,
                gameType === featuredGame.key && {
                  borderColor: featuredGame.accent,
                  borderWidth: 2,
                  backgroundColor: C.walnutUp2,
                  ...glow(featuredGame.accent),
                },
                pressed && styles.cardPressed,
              ]}
            >
              <View style={[styles.featuredIcon, gameType === featuredGame.key && { borderColor: featuredGame.accent }]}>
                <GameIcon type={featuredGame.key} color={featuredGame.accent} size={34} />
              </View>
              <View style={{ flex: 1 }}>
                <OcheText variant="h2" color={gameType === featuredGame.key ? featuredGame.accent : C.cream}>
                  {featuredGame.label}
                </OcheText>
                <OcheText variant="bodyXS" color={C.fg3}>{featuredGame.tag}</OcheText>
              </View>
              {gameType === featuredGame.key && (
                <OcheText variant="labelSm" allCaps color={featuredGame.accent}>● Choisi</OcheText>
              )}
            </Pressable>

            {/* Other games */}
            <View style={styles.gameGrid}>
              {otherGames.map((g) => {
                const active = gameType === g.key;
                return (
                  <Pressable
                    key={g.key}
                    onPress={() => setGameType(g.key)}
                    style={({ pressed }) => [
                      styles.gameCard,
                      active && {
                        borderColor: g.accent,
                        borderWidth: 2,
                        backgroundColor: C.walnutUp2,
                        ...glow(g.accent),
                      },
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.gameIconWrap}>
                      <GameIcon type={g.key} color={g.accent} size={26} />
                    </View>
                    <OcheText variant="h3" color={active ? g.accent : C.cream}>{g.label}</OcheText>
                    <OcheText variant="bodyXS" color={C.fg3}>{g.tag}</OcheText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Standard vs Avancé — only shown for games that actually have advanced rules */}
          {hasAdvanced && (
            <View style={styles.paramToggle}>
              {(['standard', 'advanced'] as const).map((m) => {
                const active = paramMode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setParamMode(m)}
                    style={[styles.paramSeg, active && styles.paramSegActive]}
                  >
                    <OcheText
                      variant="labelMd"
                      allCaps
                      color={active ? C.onAmber : C.fg2}
                      style={styles.paramSegText}
                    >
                      {m === 'standard' ? 'Standard' : 'Avancé'}
                    </OcheText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Mode (X01 variant) — X01 only */}
          {isX01 && (
          <View style={styles.section}>
            <SectionLabel icon="target">Mode</SectionLabel>
            <View style={styles.modeRow}>
              {variantOptions.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setVariant(m)}
                  style={[styles.modeBtn, variant === m && styles.modeBtnActive]}
                >
                  <OcheText
                    variant="displaySm"
                    color={variant === m ? C.amber : C.fg2}
                  >
                    {m === 'custom' ? 'X' : m}
                  </OcheText>
                  <OcheText
                    variant="bodyXS"
                    color={variant === m ? C.amber : C.fg3}
                    allCaps
                  >
                    {m === 'custom' ? 'Perso' : 'X01'}
                  </OcheText>
                </Pressable>
              ))}
            </View>

            {variant === 'custom' && (
              <View style={styles.inputGroup}>
                <OcheText variant="labelSm" color={C.fg3}>Score de départ</OcheText>
                <TextInput
                  style={styles.input}
                  value={customScore}
                  onChangeText={(v) => setCustomScore(v.replace(/[^0-9]/g, ''))}
                  placeholder="1001"
                  placeholderTextColor={C.fg3}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            )}
          </View>
          )}

          {/* Finish mode — X01 only */}
          {isX01 && (
          <View style={styles.section}>
            <SectionLabel icon="flag">Finition</SectionLabel>
            <View style={styles.pillRow}>
              {FINISH_MODES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setFinishMode(m)}
                  style={[styles.pill, finishMode === m && styles.pillActive]}
                >
                  <OcheText
                    variant="labelMd"
                    allCaps
                    color={finishMode === m ? C.amber : C.fg2}
                  >
                    {FINISH_MODE_LABELS[m]}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>
          )}

          {/* Killer: lives per player */}
          {gameType === 'killer' && (
          <View style={styles.section}>
            <SectionLabel icon="heart">Vies</SectionLabel>
            <View style={styles.pillRow}>
              {LIVES_PRESETS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setStartLives(n)}
                  style={[styles.pill, startLives === n && styles.pillActive]}
                >
                  <OcheText
                    variant="labelMd"
                    allCaps
                    color={startLives === n ? C.amber : C.fg2}
                  >
                    {n} vies
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>
          )}

          {/* Shanghai: number of rounds */}
          {gameType === 'shanghai' && (
          <View style={styles.section}>
            <SectionLabel icon="clock">Manches</SectionLabel>
            <View style={styles.pillRow}>
              {ROUNDS_PRESETS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setShanghaiRounds(n)}
                  style={[styles.pill, shanghaiRounds === n && styles.pillActive]}
                >
                  <OcheText
                    variant="labelMd"
                    allCaps
                    color={shanghaiRounds === n ? C.amber : C.fg2}
                  >
                    1→{n}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>
          )}

          {/* ── Advanced rule tweaks ─────────────────────────────────── */}

          {/* Cricket: cut-throat */}
          {advanced && gameType === 'cricket' && (
          <View style={styles.section}>
            <SectionLabel icon="sliders">Cut-throat</SectionLabel>
            <View style={styles.pillRow}>
              {[
                { v: false, label: 'Standard' },
                { v: true, label: 'Cut-throat' },
              ].map((o) => (
                <Pressable
                  key={String(o.v)}
                  onPress={() => setCutThroat(o.v)}
                  style={[styles.pill, cutThroat === o.v && styles.pillActive]}
                >
                  <OcheText variant="labelMd" allCaps color={cutThroat === o.v ? C.amber : C.fg2}>
                    {o.label}
                  </OcheText>
                </Pressable>
              ))}
            </View>
            <OcheText variant="bodyXS" color={C.fg3}>
              Cut-throat : les points vont aux adversaires, le plus bas score gagne.
            </OcheText>
          </View>
          )}

          {/* ATC: double/triple advance */}
          {advanced && gameType === 'atc' && (
          <View style={styles.section}>
            <SectionLabel icon="sliders">Progression</SectionLabel>
            <View style={styles.pillRow}>
              {[
                { v: false, label: '+1 par cible' },
                { v: true, label: 'Double ×2 · Triple ×3' },
              ].map((o) => (
                <Pressable
                  key={String(o.v)}
                  onPress={() => setAtcAdvance(o.v)}
                  style={[styles.pill, atcAdvance === o.v && styles.pillActive]}
                >
                  <OcheText variant="labelMd" allCaps color={atcAdvance === o.v ? C.amber : C.fg2}>
                    {o.label}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>
          )}

          {/* Killer: self-hit penalty + number picking */}
          {advanced && gameType === 'killer' && (
          <>
          <View style={styles.section}>
            <SectionLabel icon="sliders">Malus auto-touche</SectionLabel>
            <View style={styles.pillRow}>
              {[
                { v: true, label: 'Activé' },
                { v: false, label: 'Désactivé' },
              ].map((o) => (
                <Pressable
                  key={String(o.v)}
                  onPress={() => setKillerSelfHit(o.v)}
                  style={[styles.pill, killerSelfHit === o.v && styles.pillActive]}
                >
                  <OcheText variant="labelMd" allCaps color={killerSelfHit === o.v ? C.amber : C.fg2}>
                    {o.label}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel icon="hash">Numéros</SectionLabel>
            {roster.map((p, i) => (
              <View key={p.id} style={styles.numberRow}>
                <OcheText variant="bodyMd" color={C.fg2} numberOfLines={1} style={{ flex: 1 }}>
                  {p.name.trim() || `Joueur ${i + 1}`}
                </OcheText>
                <View style={styles.stepper}>
                  <Pressable onPress={() => stepKillerNumber(i, -1)} style={styles.stepBtn}>
                    <OcheText variant="h3" color={C.fg2}>−</OcheText>
                  </Pressable>
                  <OcheText variant="displaySm" color={C.amber} style={styles.stepValue}>
                    {killerNumbers[i]}
                  </OcheText>
                  <Pressable onPress={() => stepKillerNumber(i, 1)} style={styles.stepBtn}>
                    <OcheText variant="h3" color={C.fg2}>+</OcheText>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          </>
          )}

          {/* Sets — X01 only */}
          {isX01 && (
          <View style={styles.section}>
            <SectionLabel icon="layers">Sets · premier à</SectionLabel>
            <View style={styles.pillRow}>
              {SETS_PRESETS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setSetsToWin(n)}
                  style={[styles.pill, setsToWin === n && styles.pillActive]}
                >
                  <OcheText variant="labelMd" allCaps color={setsToWin === n ? C.amber : C.fg2}>
                    {n} set{n > 1 ? 's' : ''}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>
          )}

          {/* Legs to win (per set when sets > 1) */}
          <View style={styles.section}>
            <SectionLabel icon="trophy">
              {isX01 && setsToWin > 1 ? 'Legs par set · premier à' : 'Premier à'}
            </SectionLabel>
            <View style={styles.pillRow}>
              {LEGS_PRESETS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setLegsToWin(n)}
                  style={[styles.pill, legsToWin === n && styles.pillActive]}
                >
                  <OcheText
                    variant="labelMd"
                    allCaps
                    color={legsToWin === n ? C.amber : C.fg2}
                  >
                    {n} leg{n > 1 ? 's' : ''}
                  </OcheText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Players */}
          <View style={styles.section}>
            <View style={styles.playersHeader}>
              <SectionLabel icon="users">Joueurs · {roster.length}</SectionLabel>
              {roster.length < MAX_PLAYERS && (
                <Pressable onPress={addPlayer} style={styles.addBtn}>
                  <OcheText variant="labelMd" allCaps color={C.amber}>+ Ajouter</OcheText>
                </Pressable>
              )}
            </View>

            {roster.map((p, i) => (
              <View key={p.id} style={styles.inputGroup}>
                <View style={styles.playerLabelRow}>
                  <OcheText variant="labelSm" color={C.fg3}>
                    {i === 0 ? 'Toi' : `Joueur ${i + 1}`}
                  </OcheText>
                  {p.accountId != null && (
                    <Pressable onPress={() => clearAccount(i)} style={styles.accountBadge}>
                      <OcheText variant="labelSm" allCaps color={C.onAmber}>Compte ✕</OcheText>
                    </Pressable>
                  )}
                  {p.bot != null && (
                    <Pressable onPress={() => clearBot(i)} style={styles.accountBadge}>
                      <OcheText variant="labelSm" allCaps color={C.onAmber}>Bot · {BOT_LABELS[p.bot]} ✕</OcheText>
                    </Pressable>
                  )}
                </View>
                <View style={styles.playerInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={p.name}
                    onChangeText={(v) => setName(i, v)}
                    placeholder="Nom"
                    placeholderTextColor={C.fg3}
                    editable={i !== 0 && p.bot == null}
                    returnKeyType={i === roster.length - 1 ? 'done' : 'next'}
                    autoCapitalize="words"
                  />
                  {i > 0 && (
                    <Pressable
                      onPress={() => { setBotSlot(botSlot === i ? null : i); setPickingSlot(null); }}
                      style={[styles.removeBtn, (botSlot === i || p.bot != null) && styles.removeBtnActive]}
                    >
                      <OcheText variant="labelSm" allCaps color={botSlot === i || p.bot != null ? C.onAmber : C.fg2}>Bot</OcheText>
                    </Pressable>
                  )}
                  {i > 0 && (friends?.length ?? 0) > 0 && (
                    <Pressable
                      onPress={() => { setPickingSlot(pickingSlot === i ? null : i); setBotSlot(null); }}
                      style={[styles.removeBtn, pickingSlot === i && styles.removeBtnActive]}
                    >
                      <OcheText variant="labelSm" allCaps color={pickingSlot === i ? C.onAmber : C.fg2}>Ami</OcheText>
                    </Pressable>
                  )}
                  {roster.length > MIN_PLAYERS && (
                    <Pressable onPress={() => removePlayer(i)} style={styles.removeBtn}>
                      <OcheText variant="h3" color={C.fg3}>×</OcheText>
                    </Pressable>
                  )}
                </View>

                {/* Inline friend picker for this slot */}
                {pickingSlot === i && (
                  <View style={styles.friendPicker}>
                    {(friends ?? []).map((f) => (
                      <Pressable key={f.id} onPress={() => pickFriend(i, f)} style={styles.friendOption}>
                        <OcheText variant="bodyMd" color={C.cream} numberOfLines={1}>{f.name}</OcheText>
                        <OcheText variant="bodyXS" color={C.fg3}>{f.username}</OcheText>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Inline bot-difficulty picker for this slot */}
                {botSlot === i && (
                  <View style={styles.botPicker}>
                    {BOT_ORDER.map((level) => (
                      <Pressable
                        key={level}
                        onPress={() => pickBot(i, level)}
                        style={[styles.botOption, p.bot === level && styles.botOptionActive]}
                      >
                        <OcheText variant="labelMd" allCaps color={p.bot === level ? C.onAmber : C.cream}>
                          {BOT_LABELS[level]}
                        </OcheText>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Team-mates — only for human slots (a slot with mates = a team) */}
                {p.bot == null && (
                  <View style={styles.teamWrap}>
                    {(p.members ?? []).map((mName, k) => (
                      <View key={k} style={styles.teamMemberRow}>
                        <OcheText variant="labelSm" color={C.fg3} style={styles.teamPlus}>+</OcheText>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
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
                    {(p.members?.length ?? 0) < 3 && (
                      <Pressable onPress={() => addTeammate(i)} style={styles.addTeammate}>
                        <OcheText variant="labelSm" allCaps color={C.amber}>+ Coéquipier</OcheText>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            ))}
            <OcheText variant="bodyXS" color={C.fg3}>
              « Ami » lie un adversaire à son compte (vrai duel, visible dans le feed). « Bot » ajoute un adversaire géré par l'app. « + Coéquipier » crée une équipe (score partagé, chacun son tour).
            </OcheText>
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <OcheText variant="bodySm" color={C.fg2}>
              {gameType === 'cricket'
                ? `Cricket · Premier à ${legsToWin} leg${legsToWin > 1 ? 's' : ''}`
                : gameType === 'atc'
                  ? `Around the Clock · Premier à ${legsToWin} leg${legsToWin > 1 ? 's' : ''}`
                  : gameType === 'killer'
                    ? `Killer · ${startLives} vies · Premier à ${legsToWin} leg${legsToWin > 1 ? 's' : ''}`
                    : gameType === 'shanghai'
                      ? `Shanghai · 1→${shanghaiRounds} · Premier à ${legsToWin} leg${legsToWin > 1 ? 's' : ''}`
                      : gameType === 'halveit'
                        ? `Halve-it · 7 manches · Premier à ${legsToWin} leg${legsToWin > 1 ? 's' : ''}`
                        : `${startScore} · ${FINISH_MODE_LABELS[finishMode]} · ${setsToWin > 1 ? `${setsToWin} sets de ${legsToWin} leg${legsToWin > 1 ? 's' : ''}` : `premier à ${legsToWin} leg${legsToWin > 1 ? 's' : ''}`}`}
            </OcheText>
          </View>

          {/* CTA */}
          <OcheButton label="Lancer" onPress={handleStart} variant="primary" size="lg" fullWidth style={{ marginTop: Spacing.s2 }} />

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.walnut,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s4,
    borderBottomWidth: 1,
    borderBottomColor: C.border1,
  },
  scroll: {
    paddingHorizontal: Spacing.s4,
    paddingTop: Spacing.s6,
    paddingBottom: Spacing.s10,
    gap: Spacing.s6,
  },
  section: {
    gap: Spacing.s3,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
  },
  modeBtn: {
    flex: 1,
    backgroundColor: C.walnutUp,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: C.border1,
    paddingVertical: Spacing.s3,
    paddingHorizontal: Spacing.s2,
    alignItems: 'center',
    gap: 2,
  },
  modeBtnActive: {
    backgroundColor: C.walnutUp2,
    borderColor: C.amber,
    ...glowSoft(C.amber),
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s4,
    backgroundColor: C.walnutUp,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: C.border1,
    padding: Spacing.s4,
  },
  featuredIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp2,
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  gameCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 140,
    backgroundColor: C.walnutUp,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: C.border1,
    paddingVertical: Spacing.s4,
    paddingHorizontal: Spacing.s3,
    gap: 3,
    alignItems: 'flex-start',
  },
  gameIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  paramToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border1,
    borderRadius: Radii.none,
    overflow: 'hidden',
  },
  paramSeg: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.walnutUp,
  },
  paramSegActive: {
    backgroundColor: C.amber,
  },
  paramSegText: {
    letterSpacing: 1,
    fontWeight: '700',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.s3,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.none,
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 36,
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
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
  pillActive: {
    backgroundColor: C.walnutUp2,
    borderColor: C.amber,
    ...glowSoft(C.amber),
  },
  playersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.s2,
  },
  playerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  removeBtn: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: Spacing.s2,
    borderRadius: Radii.none,
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnActive: { backgroundColor: C.amber, borderColor: C.amber },
  playerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountBadge: {
    backgroundColor: C.amber,
    paddingHorizontal: Spacing.s2,
    paddingVertical: 2,
  },
  friendPicker: {
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
    marginTop: Spacing.s1,
  },
  friendOption: {
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s2,
    borderBottomWidth: 1,
    borderBottomColor: C.border2,
  },
  botPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
    marginTop: Spacing.s1,
  },
  botOption: {
    flexGrow: 1,
    flexBasis: '22%',
    paddingVertical: Spacing.s3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border1,
    backgroundColor: C.walnutUp,
  },
  botOptionActive: {
    backgroundColor: C.amber,
    borderColor: C.amber,
  },
  teamWrap: { gap: Spacing.s1, marginTop: Spacing.s1, marginLeft: Spacing.s3 },
  teamMemberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
  teamPlus: { width: 12, textAlign: 'center' },
  addTeammate: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: Spacing.s2 },
  inputGroup: {
    gap: Spacing.s1,
  },
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
  summary: {
    paddingHorizontal: Spacing.s2,
    paddingVertical: Spacing.s2,
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: C.brick,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.s4,
    alignItems: 'center',
    marginTop: Spacing.s2,
  },
  startBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
