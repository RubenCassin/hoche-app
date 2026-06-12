import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameType, X01Variant, FinishMode, BotDifficulty } from './useGameStore';

/** A tournament entrant: a name, optionally a bot, optionally extra team-mates. */
export interface TournamentEntry {
  name: string;
  bot: BotDifficulty | null;
  members?: string[]; // extra team-mates (beyond `name`) → makes this entry a team
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TournamentFormat = 'knockout' | 'roundrobin';

export interface TournamentConfig {
  gameType: GameType;
  legsToWin: number;
  format?: TournamentFormat; // default 'knockout'
  // X01 only
  variant?: X01Variant;
  startScore?: number;
  finishMode?: FinishMode;
}

export interface TournamentMatch {
  id: string; // "r{round}-{order}"
  round: number; // 0 = first round
  order: number; // position within the round (top → bottom)
  aPlayer: number | null; // player index, or null until decided
  bPlayer: number | null;
  aBye: boolean; // round-0 only: this seat is a bye
  bBye: boolean;
  winner: number | null; // player index of the winner
  legsA: number;
  legsB: number;
  nextMatchId: string | null; // match the winner feeds into
  nextSlot: 'a' | 'b' | null;
  loserToMatchId?: string | null; // semifinals only: where the LOSER goes (3rd place)
  loserSlot?: 'a' | 'b' | null;
  isThird?: boolean; // the 3rd-place play-off match
}

interface TournamentState {
  active: boolean;
  name: string;
  players: string[]; // names; array index = player index
  bots: (BotDifficulty | null)[]; // aligned with players (null = human)
  teamMembers: string[][]; // full member list per entry (solo = [name])
  config: TournamentConfig;
  matches: TournamentMatch[];
  championIndex: number | null;

  createTournament: (entries: TournamentEntry[], config: TournamentConfig, shuffle: boolean) => void;
  reportResult: (matchId: string, winnerSlot: 'a' | 'b', legsA: number, legsB: number) => void;
  /** Undo a played match and cascade-reset everything that depended on it. */
  undoMatch: (matchId: string) => void;
  reset: () => void;
}

// ─── Bracket helpers ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: TournamentConfig = { gameType: 'x01', legsToWin: 2, format: 'knockout', variant: '501', startScore: 501, finishMode: 'double' };

/** Smallest power of two ≥ n (min 2). */
function nextPow2(n: number): number {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard single-elimination seeding order for `size` slots. Returns seed ranks
 * (1..size) arranged so that #1 meets the lowest seed, etc. — which spreads byes
 * onto the top seeds and guarantees no bye-vs-bye match.
 */
function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    const next: number[] = [];
    for (const s of order) {
      next.push(s);
      next.push(sum - s);
    }
    order = next;
  }
  return order;
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Number of rounds for `size` slots (log2). */
function roundCount(size: number): number {
  return Math.round(Math.log2(size));
}

/** Human label for a round given the total number of rounds. */
export function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - round;
  if (fromEnd === 0) return 'Finale';
  if (fromEnd === 1) return 'Demi-finales';
  if (fromEnd === 2) return 'Quarts de finale';
  if (fromEnd === 3) return 'Huitièmes';
  return `Tour ${round + 1}`;
}

function buildBracket(numPlayers: number, shuffle: boolean): { matches: TournamentMatch[]; assignment: number[] } {
  const size = nextPow2(Math.max(2, numPlayers));
  const rounds = roundCount(size);
  const order = seedOrder(size);

  // Map seed ranks → player indices (ranks beyond the player count are byes).
  const ids = Array.from({ length: numPlayers }, (_, i) => i);
  const assignment = shuffle ? shuffled(ids) : ids; // assignment[rank-1] = playerIndex
  const seatOf = (rank: number): { player: number | null; bye: boolean } =>
    rank <= numPlayers ? { player: assignment[rank - 1], bye: false } : { player: null, bye: true };

  const matches: TournamentMatch[] = [];
  const mid = (r: number, o: number) => `r${r}-${o}`;

  // Round 0 from the seeding order.
  for (let k = 0; k < size / 2; k++) {
    const a = seatOf(order[2 * k]);
    const b = seatOf(order[2 * k + 1]);
    matches.push({
      id: mid(0, k), round: 0, order: k,
      aPlayer: a.player, bPlayer: b.player, aBye: a.bye, bBye: b.bye,
      winner: null, legsA: 0, legsB: 0, nextMatchId: null, nextSlot: null,
    });
  }
  // Empty matches for later rounds.
  for (let r = 1; r < rounds; r++) {
    const count = size / Math.pow(2, r + 1);
    for (let o = 0; o < count; o++) {
      matches.push({
        id: mid(r, o), round: r, order: o,
        aPlayer: null, bPlayer: null, aBye: false, bBye: false,
        winner: null, legsA: 0, legsB: 0, nextMatchId: null, nextSlot: null,
      });
    }
  }

  const byId: Record<string, TournamentMatch> = {};
  matches.forEach((m) => { byId[m.id] = m; });

  // Link each match to its parent (winner destination).
  for (let r = 0; r < rounds - 1; r++) {
    const count = size / Math.pow(2, r + 1);
    for (let o = 0; o < count; o++) {
      const m = byId[mid(r, o)];
      m.nextMatchId = mid(r + 1, Math.floor(o / 2));
      m.nextSlot = o % 2 === 0 ? 'a' : 'b';
    }
  }

  // 3rd-place play-off: the two semifinal losers meet. Only when both semifinals
  // are real matches (no byes in the semifinal round).
  const semiRound = rounds - 2;
  const hasThird = rounds >= 3 || (rounds === 2 && numPlayers === 4);
  if (hasThird) {
    const third: TournamentMatch = {
      id: 'third', round: rounds - 1, order: 2, isThird: true,
      aPlayer: null, bPlayer: null, aBye: false, bBye: false,
      winner: null, legsA: 0, legsB: 0, nextMatchId: null, nextSlot: null,
    };
    matches.push(third);
    byId['third'] = third;
    [0, 1].forEach((o) => {
      const semi = byId[mid(semiRound, o)];
      if (semi) {
        semi.loserToMatchId = 'third';
        semi.loserSlot = o === 0 ? 'a' : 'b';
      }
    });
  }

  // Resolve first-round byes: the real player advances automatically.
  matches.filter((m) => m.round === 0).forEach((m) => {
    let winner: number | null = null;
    if (m.aBye && !m.bBye) winner = m.bPlayer;
    else if (m.bBye && !m.aBye) winner = m.aPlayer;
    if (winner != null) {
      m.winner = winner;
      if (m.nextMatchId) {
        const parent = byId[m.nextMatchId];
        if (m.nextSlot === 'a') parent.aPlayer = winner;
        else parent.bPlayer = winner;
      }
    }
  });

  return { matches, assignment };
}

/** Is this match ready to be played (both opponents known, not decided)? */
export function isPlayable(m: TournamentMatch): boolean {
  return m.winner === null && m.aPlayer != null && m.bPlayer != null && !m.aBye && !m.bBye;
}

// ─── Round-robin (poules) ──────────────────────────────────────────────────────

/** Circle-method schedule: every player meets every other once, spread over rounds. */
function roundRobinSchedule(ids: number[]): [number, number][][] {
  const list = ids.slice();
  if (list.length % 2 === 1) list.push(-1); // odd → add a "bye" placeholder
  const n = list.length;
  const arr = list.slice();
  const rounds: [number, number][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== -1 && b !== -1) pairs.push([a, b]);
    }
    rounds.push(pairs);
    // rotate everyone but the first element
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as number);
    arr.splice(1, arr.length - 1, ...rest);
  }
  return rounds;
}

function buildRoundRobin(numPlayers: number, shuffle: boolean): TournamentMatch[] {
  const ids = Array.from({ length: numPlayers }, (_, i) => i);
  const schedule = roundRobinSchedule(shuffle ? shuffled(ids) : ids);
  const matches: TournamentMatch[] = [];
  schedule.forEach((pairs, r) => {
    pairs.forEach(([a, b], i) => {
      matches.push({
        id: `rr-${r}-${i}`, round: r, order: i,
        aPlayer: a, bPlayer: b, aBye: false, bBye: false,
        winner: null, legsA: 0, legsB: 0, nextMatchId: null, nextSlot: null,
      });
    });
  });
  return matches;
}

export interface StandingRow {
  playerIndex: number;
  played: number;
  wins: number;
  losses: number;
  legsFor: number;
  legsAgainst: number;
  diff: number;
}

/** Round-robin standings: ranked by wins, then leg difference, then legs won. */
export function computeStandings(numPlayers: number, matches: TournamentMatch[]): StandingRow[] {
  const rows: StandingRow[] = Array.from({ length: numPlayers }, (_, i) => ({
    playerIndex: i, played: 0, wins: 0, losses: 0, legsFor: 0, legsAgainst: 0, diff: 0,
  }));
  for (const m of matches) {
    if (m.winner == null || m.aPlayer == null || m.bPlayer == null) continue;
    const a = rows[m.aPlayer];
    const b = rows[m.bPlayer];
    a.played++; b.played++;
    a.legsFor += m.legsA; a.legsAgainst += m.legsB;
    b.legsFor += m.legsB; b.legsAgainst += m.legsA;
    if (m.winner === m.aPlayer) { a.wins++; b.losses++; } else { b.wins++; a.losses++; }
  }
  rows.forEach((r) => { r.diff = r.legsFor - r.legsAgainst; });
  rows.sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.legsFor - x.legsFor);
  return rows;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTournamentStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      active: false,
      name: '',
      players: [],
      bots: [],
      teamMembers: [],
      config: DEFAULT_CONFIG,
      matches: [],
      championIndex: null,

      createTournament: (entries, config, shuffle) => {
        const cleaned = entries.map((e, i) => {
          const primary = e.name.trim() || `Joueur ${i + 1}`;
          const extras = (e.members ?? []).map((m) => m.trim()).filter(Boolean);
          return {
            name: extras.length ? `${primary} +${extras.length}` : primary,
            bot: e.bot,
            members: extras.length ? [primary, ...extras] : [primary],
          };
        });
        const fullConfig = { ...DEFAULT_CONFIG, ...config };
        const matches =
          fullConfig.format === 'roundrobin'
            ? buildRoundRobin(cleaned.length, shuffle)
            : buildBracket(cleaned.length, shuffle).matches;
        set({
          active: true,
          name: config.gameType.toUpperCase(),
          players: cleaned.map((c) => c.name),
          bots: cleaned.map((c) => c.bot),
          teamMembers: cleaned.map((c) => c.members),
          config: fullConfig,
          matches,
          championIndex: null,
        });
      },

      reportResult: (matchId, winnerSlot, legsA, legsB) => {
        const matches = get().matches.map((m) => ({ ...m }));
        const byId: Record<string, TournamentMatch> = {};
        matches.forEach((m) => { byId[m.id] = m; });

        const m = byId[matchId];
        if (!m || m.winner !== null) return;

        m.legsA = legsA;
        m.legsB = legsB;
        const winner = winnerSlot === 'a' ? m.aPlayer : m.bPlayer;
        const loser = winnerSlot === 'a' ? m.bPlayer : m.aPlayer;
        if (winner == null) return;
        m.winner = winner;

        // Round-robin: no bracket propagation. Champion = top of the standings,
        // but only once every match has been played.
        if (get().config.format === 'roundrobin') {
          const allDone = matches.every((x) => x.winner != null);
          const champ = allDone ? computeStandings(get().players.length, matches)[0]?.playerIndex ?? null : null;
          set({ matches, championIndex: champ });
          return;
        }

        let champion = get().championIndex;
        if (m.nextMatchId) {
          const parent = byId[m.nextMatchId];
          if (m.nextSlot === 'a') parent.aPlayer = winner;
          else parent.bPlayer = winner;
        } else if (!m.isThird) {
          champion = winner; // the real final (not the 3rd-place play-off)
        }
        // Semifinal loser drops into the 3rd-place match.
        if (m.loserToMatchId && loser != null) {
          const lp = byId[m.loserToMatchId];
          if (lp) {
            if (m.loserSlot === 'a') lp.aPlayer = loser;
            else lp.bPlayer = loser;
          }
        }

        set({ matches, championIndex: champion });
      },

      undoMatch: (matchId) => {
        const matches = get().matches.map((m) => ({ ...m }));
        const byId: Record<string, TournamentMatch> = {};
        matches.forEach((m) => { byId[m.id] = m; });
        const target = byId[matchId];
        if (!target || target.winner === null) return;

        // Round-robin: just clear this result; recompute champion if still complete.
        if (get().config.format === 'roundrobin') {
          target.winner = null;
          target.legsA = 0;
          target.legsB = 0;
          const allDone = matches.every((x) => x.winner != null);
          const champ = allDone ? computeStandings(get().players.length, matches)[0]?.playerIndex ?? null : null;
          set({ matches, championIndex: champ });
          return;
        }

        // Clear everything this match's result fed into, recursively.
        const resetDownstream = (m: TournamentMatch) => {
          const targets: [string, 'a' | 'b' | null | undefined][] = [];
          if (m.winner != null && m.nextMatchId) targets.push([m.nextMatchId, m.nextSlot]);
          if (m.winner != null && m.loserToMatchId) targets.push([m.loserToMatchId, m.loserSlot]);
          for (const [pid, slot] of targets) {
            const p = byId[pid];
            if (!p) continue;
            if (slot === 'a') p.aPlayer = null;
            else if (slot === 'b') p.bPlayer = null;
            resetDownstream(p);
            p.winner = null;
            p.legsA = 0;
            p.legsB = 0;
          }
        };
        resetDownstream(target);
        target.winner = null;
        target.legsA = 0;
        target.legsB = 0;

        const finalM = matches.find((x) => !x.isThird && x.nextMatchId == null);
        const champion = finalM && finalM.winner != null ? finalM.winner : null;
        set({ matches, championIndex: champion });
      },

      reset: () =>
        set({ active: false, name: '', players: [], bots: [], teamMembers: [], config: DEFAULT_CONFIG, matches: [], championIndex: null }),
    }),
    {
      name: 'oche.tournament',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the data — not the action functions.
      partialize: (s) => ({
        active: s.active,
        name: s.name,
        players: s.players,
        bots: s.bots,
        teamMembers: s.teamMembers,
        config: s.config,
        matches: s.matches,
        championIndex: s.championIndex,
      }),
    }
  )
);
