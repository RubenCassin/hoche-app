import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OcheHeader } from '@/components/OcheHeader';
import { OcheText } from '@/components/OcheText';
import { OcheButton } from '@/components/OcheButton';
import { OcheMark } from '@/components/OcheLogo';
import { MonogramPortrait } from '@/components/MonogramPortrait';
import { SectionLabel } from '@/components/SectionLabel';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGameStore } from '@/hooks/useGameStore';
import {
  useTournamentStore,
  isPlayable,
  roundLabel,
  computeStandings,
  type TournamentMatch,
} from '@/hooks/useTournamentStore';

export default function TournamentScreen() {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = makeStyles(C);

  const active = useTournamentStore((s) => s.active);
  const players = useTournamentStore((s) => s.players);
  const bots = useTournamentStore((s) => s.bots);
  const teamMembers = useTournamentStore((s) => s.teamMembers);
  const matches = useTournamentStore((s) => s.matches);
  const config = useTournamentStore((s) => s.config);
  const championIndex = useTournamentStore((s) => s.championIndex);
  const reset = useTournamentStore((s) => s.reset);
  const undoMatch = useTournamentStore((s) => s.undoMatch);

  const initPlayers = useGameStore((s) => s.initPlayers);
  const initCricket = useGameStore((s) => s.initCricket);
  const initAtc = useGameStore((s) => s.initAtc);
  const initKiller = useGameStore((s) => s.initKiller);
  const initShanghai = useGameStore((s) => s.initShanghai);
  const setTournamentMatchId = useGameStore((s) => s.setTournamentMatchId);

  const back = (
    <Pressable onPress={() => router.replace('/tabs')} hitSlop={10}>
      <OcheText variant="labelMd" color={C.fg2}>‹ Accueil</OcheText>
    </Pressable>
  );

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!active) {
    return (
      <View style={styles.container}>
        <OcheHeader title="Tournoi" left={back} bell={false} />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyMark}><OcheMark size={64} /></View>
          <OcheText variant="displaySm" allCaps color={C.cream} style={styles.emptyTitle}>
            Aucun tournoi
          </OcheText>
          <OcheText variant="bodyMd" color={C.fg3} style={styles.emptySub}>
            Crée un arbre à élimination directe pour 3 à 8 joueurs. HOCHE gère les matchs et couronne le champion.
          </OcheText>
          <OcheButton
            label="Créer un tournoi"
            onPress={() => router.push('/new-tournament')}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.emptyBtn}
          />
        </View>
      </View>
    );
  }

  const totalRounds = matches.reduce((m, x) => Math.max(m, x.round), 0) + 1;
  const rounds = Array.from({ length: totalRounds }, (_, r) =>
    matches.filter((m) => m.round === r).sort((a, b) => a.order - b.order)
  );

  const play = (m: TournamentMatch) => {
    if (m.aPlayer == null || m.bPlayer == null) return;
    const roster = [
      { id: 1, name: players[m.aPlayer], bot: bots[m.aPlayer] ?? undefined, members: teamMembers[m.aPlayer] },
      { id: 2, name: players[m.bPlayer], bot: bots[m.bPlayer] ?? undefined, members: teamMembers[m.bPlayer] },
    ];
    const gt = config.gameType;
    if (gt === 'cricket') initCricket(roster, { legsToWin: config.legsToWin });
    else if (gt === 'atc') initAtc(roster, { legsToWin: config.legsToWin });
    else if (gt === 'killer') initKiller(roster, { legsToWin: config.legsToWin });
    else if (gt === 'shanghai') initShanghai(roster, { legsToWin: config.legsToWin });
    else
      initPlayers(roster, {
        legsToWin: config.legsToWin,
        variant: config.variant,
        startScore: config.startScore,
        finishMode: config.finishMode,
      });
    setTournamentMatchId(m.id);
    router.push('/tabs/scoring');
  };

  const slotName = (player: number | null, bye: boolean) =>
    bye ? 'Exempt' : player != null ? players[player] : 'À déterminer';

  const newTournament = () => {
    reset();
    router.replace('/new-tournament');
  };

  const isRR = config.format === 'roundrobin';
  const standings = isRR ? computeStandings(players.length, matches) : [];

  // Final standings (podium) once the champion is decided.
  const finalMatch = matches.find((m) => !m.isThird && m.nextMatchId == null);
  const thirdMatch = matches.find((m) => m.isThird);
  const secondIndex = isRR
    ? standings[1]?.playerIndex ?? null
    : finalMatch && finalMatch.winner != null
      ? finalMatch.winner === finalMatch.aPlayer
        ? finalMatch.bPlayer
        : finalMatch.aPlayer
      : null;
  const thirdIndex = isRR
    ? standings[2]?.playerIndex ?? null
    : thirdMatch && thirdMatch.winner != null
      ? thirdMatch.winner
      : null;

  // The next match to play (highlighted up top during a party).
  const nextMatch =
    championIndex == null ? matches.find((m) => isPlayable(m)) : undefined;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <OcheHeader title="Tournoi" left={back} bell={false} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Podium — final standings */}
        {championIndex != null && (
          <View style={styles.champion}>
            <OcheText variant="labelSm" allCaps color={C.onAmber} style={styles.champEyebrow}>
              🏆 Podium
            </OcheText>
            <View style={styles.podiumRow}>
              <OcheText variant="h2" color={C.onAmber}>🥇</OcheText>
              <OcheText variant="displaySm" allCaps color={C.onAmber} numberOfLines={1} style={styles.podiumName}>
                {players[championIndex]}
              </OcheText>
            </View>
            {secondIndex != null && (
              <View style={styles.podiumRow}>
                <OcheText variant="h3" color={C.onAmber}>🥈</OcheText>
                <OcheText variant="h4" color={C.onAmber} numberOfLines={1} style={styles.podiumName}>
                  {players[secondIndex]}
                </OcheText>
              </View>
            )}
            {(thirdMatch || (isRR && thirdIndex != null)) && (
              <View style={styles.podiumRow}>
                <OcheText variant="h3" color={C.onAmber}>🥉</OcheText>
                <OcheText variant="h4" color={C.onAmber} numberOfLines={1} style={styles.podiumName}>
                  {thirdIndex != null ? players[thirdIndex] : 'à jouer'}
                </OcheText>
              </View>
            )}
          </View>
        )}

        {/* Up next — the match to play */}
        {nextMatch && nextMatch.aPlayer != null && nextMatch.bPlayer != null && (
          <View style={styles.upNext}>
            <OcheText variant="labelSm" allCaps color={C.amber} style={styles.champEyebrow}>À suivre</OcheText>
            <View style={styles.upNextRow}>
              <MonogramPortrait name={players[nextMatch.aPlayer]} size={40} />
              <OcheText variant="h4" color={C.cream} numberOfLines={1} style={styles.upNextName}>
                {players[nextMatch.aPlayer]}
              </OcheText>
              <OcheText variant="labelSm" allCaps color={C.fg3}>vs</OcheText>
              <OcheText variant="h4" color={C.cream} numberOfLines={1} style={[styles.upNextName, { textAlign: 'right' }]}>
                {players[nextMatch.bPlayer]}
              </OcheText>
              <MonogramPortrait name={players[nextMatch.bPlayer]} size={40} />
            </View>
            <OcheButton label="Jouer ce match" onPress={() => play(nextMatch)} variant="primary" size="md" fullWidth />
          </View>
        )}

        {/* Round-robin standings (live) */}
        {isRR && (
          <View style={styles.standings}>
            <SectionLabel icon="layers" variant="h5" iconSize={17}>Classement</SectionLabel>
            {standings.map((row, i) => (
              <View key={row.playerIndex} style={styles.standRow}>
                <OcheText variant="monoSm" color={i === 0 ? C.amber : C.fg3} style={styles.standRank}>{i + 1}</OcheText>
                <MonogramPortrait name={players[row.playerIndex]} size={24} />
                <OcheText variant="bodyMd" color={C.cream} numberOfLines={1} style={styles.standName}>
                  {players[row.playerIndex]}
                </OcheText>
                <OcheText variant="monoSm" color={C.fg3}>{row.wins}V-{row.losses}D</OcheText>
                <OcheText variant="monoSm" color={row.diff >= 0 ? C.win : C.loss} style={styles.standDiff}>
                  {row.diff >= 0 ? '+' : ''}{row.diff}
                </OcheText>
              </View>
            ))}
          </View>
        )}

        {rounds.map((roundMatches, r) => (
          <View key={r} style={styles.roundBlock}>
            <SectionLabel icon={isRR ? 'layers' : 'trophy'} variant="h5" iconSize={17}>
              {isRR ? `Journée ${r + 1}` : roundLabel(r, totalRounds)}
            </SectionLabel>

            {roundMatches.map((m) => {
              const playable = isPlayable(m);
              const aWin = m.winner != null && m.winner === m.aPlayer;
              const bWin = m.winner != null && m.winner === m.bPlayer;
              const undoable = m.winner != null && !m.aBye && !m.bBye;
              const isBye = m.aBye || m.bBye;
              return (
                <View key={m.id}>
                  {m.isThird && (
                    <OcheText variant="labelSm" allCaps color={C.amber} style={styles.thirdCaption}>
                      Petite finale · 3e place
                    </OcheText>
                  )}
                  <View style={styles.match}>
                    <View style={styles.matchRows}>
                      <SlotRow
                        C={C}
                        styles={styles}
                        name={slotName(m.aPlayer, m.aBye)}
                        avatarName={!m.aBye && m.aPlayer != null ? players[m.aPlayer] : undefined}
                        legs={m.winner != null ? m.legsA : null}
                        win={aWin}
                        dim={m.aBye}
                      />
                      <View style={styles.divider} />
                      <SlotRow
                        C={C}
                        styles={styles}
                        name={slotName(m.bPlayer, m.bBye)}
                        avatarName={!m.bBye && m.bPlayer != null ? players[m.bPlayer] : undefined}
                        legs={m.winner != null ? m.legsB : null}
                        win={bWin}
                        dim={m.bBye}
                      />
                    </View>

                    <View style={styles.matchAction}>
                      {playable ? (
                        <OcheButton label="Jouer" onPress={() => play(m)} variant="primary" size="sm" />
                      ) : undoable ? (
                        <View style={styles.doneCol}>
                          <OcheText variant="labelSm" allCaps color={C.win}>✓ Joué</OcheText>
                          <Pressable onPress={() => undoMatch(m.id)} hitSlop={8}>
                            <OcheText variant="bodyXS" color={C.fg3}>↺ Rejouer</OcheText>
                          </Pressable>
                        </View>
                      ) : isBye ? (
                        <OcheText variant="labelSm" allCaps color={C.fg3}>Qualifié</OcheText>
                      ) : (
                        <OcheText variant="labelSm" allCaps color={C.fg3}>En attente</OcheText>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        <OcheButton
          label="Nouveau tournoi"
          onPress={newTournament}
          variant="secondary"
          size="md"
          fullWidth
          style={{ marginTop: Spacing.s4 }}
        />
      </ScrollView>
    </View>
  );
}

function SlotRow({
  C,
  styles,
  name,
  avatarName,
  legs,
  win,
  dim,
}: {
  C: ReturnType<typeof useTheme>;
  styles: ReturnType<typeof makeStyles>;
  name: string;
  avatarName?: string;
  legs: number | null;
  win: boolean;
  dim: boolean;
}) {
  return (
    <View style={styles.slot}>
      {win && <View style={styles.winBar} />}
      {avatarName ? (
        <MonogramPortrait name={avatarName} size={24} />
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <OcheText
        variant="bodyMd"
        color={win ? C.cream : dim ? C.fg3 : C.fg2}
        numberOfLines={1}
        style={win ? [styles.slotName, styles.bold] : styles.slotName}
      >
        {name}
      </OcheText>
      {legs != null && (
        <OcheText variant="h4" color={win ? C.amber : C.fg3}>{legs}</OcheText>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.walnut },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.s5, gap: Spacing.s3 },
    emptyMark: { opacity: 0.5, marginBottom: Spacing.s2 },
    emptyTitle: { letterSpacing: 2, textAlign: 'center' },
    emptySub: { textAlign: 'center', lineHeight: 22 },
    emptyBtn: { alignSelf: 'stretch', marginTop: Spacing.s4 },
    scroll: { paddingHorizontal: Spacing.s4, paddingTop: Spacing.s3, paddingBottom: Spacing.s10, gap: Spacing.s4 },

    champion: {
      backgroundColor: C.amber,
      borderWidth: 1,
      borderColor: C.amber,
      padding: Spacing.s4,
      alignItems: 'center',
      gap: 2,
    },
    champEyebrow: { letterSpacing: 2 },
    podiumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3 },
    podiumName: { flex: 1 },
    thirdCaption: { letterSpacing: 1, marginTop: Spacing.s2 },

    upNext: {
      backgroundColor: C.walnutUp2,
      borderWidth: 1,
      borderColor: C.amber,
      borderRadius: Radii.lg,
      padding: Spacing.s4,
      gap: Spacing.s3,
    },
    upNextRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
    upNextName: { flex: 1 },

    standings: {
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      borderRadius: Radii.lg,
      padding: Spacing.s4,
      gap: Spacing.s2,
    },
    standRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2 },
    standRank: { width: 18, textAlign: 'center' },
    standName: { flex: 1 },
    standDiff: { width: 34, textAlign: 'right' },

    roundBlock: { gap: Spacing.s2 },
    roundTitle: { letterSpacing: 1 },

    match: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.walnutUp,
      borderWidth: 1,
      borderColor: C.border1,
      borderRadius: Radii.lg,
      overflow: 'hidden',
    },
    matchRows: { flex: 1 },
    divider: { height: 1, backgroundColor: C.border2 },
    slot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.s2,
      paddingVertical: Spacing.s3,
      paddingHorizontal: Spacing.s3,
    },
    winBar: { width: 3, alignSelf: 'stretch', backgroundColor: C.amber, marginRight: 2 },
    avatarPlaceholder: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border2,
      backgroundColor: C.walnutUp2,
    },
    slotName: { flex: 1 },
    bold: { fontWeight: '700' },
    matchAction: {
      width: 96,
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: 1,
      borderLeftColor: C.border1,
      alignSelf: 'stretch',
      paddingHorizontal: Spacing.s2,
    },
    doneCol: { alignItems: 'center', gap: 4 },
  });
