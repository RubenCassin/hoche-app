import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type X01Variant = '101' | '301' | '501' | '701' | 'custom';
export type FinishMode = 'simple' | 'double' | 'master';
export type Moment = '180' | 'checkout' | 'bust' | 'matchWon' | 'shanghai' | null;
/** How darts are entered: segment grid, tap-able board, or total numpad. */
export type ScoringMode = 'grid' | 'board' | 'numpad';
/** Which game is being played. Each type has its own engine + scoreboard. */
export type GameType = 'x01' | 'cricket' | 'atc' | 'killer' | 'shanghai' | 'halveit';
/**
 * AI opponent skill tiers, named after the 3-dart average they shoot for.
 * The 4 historic keys stay accepted: persisted tournaments may still carry them.
 * `null` slot = human/guest.
 */
export type BotDifficulty =
  | 'avg30' | 'avg40' | 'avg50' | 'avg60' | 'avg70' | 'avg80' | 'avg90' | 'avg100'
  | 'easy' | 'medium' | 'hard' | 'pro';

export const DEFAULT_KILLER_LIVES = 3;
export const DEFAULT_SHANGHAI_ROUNDS = 7;

/** Cricket targets, in board order: 20…15 then bull (25). */
export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 25] as const;
export type CricketTarget = (typeof CRICKET_TARGETS)[number];

/** Around the Clock order: 1→20 then Bull (25). */
export const ATC_SEQUENCE = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25,
] as const;

/** Halve-it: one target per round. Miss the target with all 3 darts → score halved. */
export type HalveTarget =
  | { kind: 'number'; n: number; label: string }
  | { kind: 'double'; label: string }
  | { kind: 'triple'; label: string }
  | { kind: 'bull'; label: string };
export const HALVE_TARGETS: HalveTarget[] = [
  { kind: 'number', n: 20, label: '20' },
  { kind: 'number', n: 19, label: '19' },
  { kind: 'number', n: 18, label: '18' },
  { kind: 'double', label: 'Double' },
  { kind: 'number', n: 17, label: '17' },
  { kind: 'triple', label: 'Triple' },
  { kind: 'bull', label: 'Bull' },
];

export interface GameConfig {
  gameType: GameType;
  variant: X01Variant;
  startScore: number;
  finishMode: FinishMode;
  legsToWin: number; // first to N legs wins a set (or the match if setsToWin = 1)
  setsToWin: number; // X01 only: first to N sets wins the match (1 = legs-only)
  startLives: number; // Killer: lives per player
  shanghaiRounds: number; // Shanghai: number of rounds (target = round number)
  // ── Advanced rule toggles ──
  cricketCutThroat: boolean; // Cricket: points go to opponents; lowest score wins
  atcAdvanceByMarks: boolean; // ATC: a double/triple of the target advances ×2/×3
  killerSelfHit: boolean; // Killer: hitting your own number (armed) costs a life
}

export interface DartEntry {
  points: number;
  modifier: 'S' | 'D' | 'T';
  segment: number; // 0 = miss, 1-20, 25 = bull
}

export interface Visit {
  darts: DartEntry[];
  total: number; // counted points (0 if bust)
  bust: boolean;
  /** Numpad visits only: darts actually thrown when the visit ended early
   *  (checkout/bust prompt). Per-dart visits carry the real list in `darts`. */
  dartCount?: number;
}

export interface PlayerState {
  id: number;
  name: string;
  remaining: number;
  legs: number;
  sets: number;
  dartsThrown: number;
  visits: Visit[];
  avg: number;
}

/** A player in a Cricket game. `marks` holds 0–3 per target (3 = closed). */
export interface CricketPlayerState {
  id: number;
  name: string;
  marks: Record<number, number>; // target → 0..3
  score: number;
  legs: number;
  dartsThrown: number;
}

/** A player in Around the Clock. `hits` = how many targets completed (0..21). */
export interface AtcPlayerState {
  id: number;
  name: string;
  hits: number;
  legs: number;
  dartsThrown: number;
}

/** A player in Killer. Armed by hitting the double of their own number. */
export interface KillerPlayerState {
  id: number;
  name: string;
  number: number; // assigned target 1-20 (unique)
  lives: number; // 0 = eliminated
  isKiller: boolean; // armed
  legs: number;
  dartsThrown: number;
}

/** A player in Shanghai. The round/target is global (`shanghaiRound`). */
export interface ShanghaiPlayerState {
  id: number;
  name: string;
  score: number;
  legs: number;
  dartsThrown: number;
}

/** A player in Halve-it. The round/target is global (`halveRound`, index into HALVE_TARGETS). */
export interface HalvePlayerState {
  id: number;
  name: string;
  score: number;
  legs: number;
  dartsThrown: number;
}

/** Snapshot of the live game state taken before each committed visit, for undo. */
export interface UndoSnapshot {
  players: PlayerState[];
  cricketPlayers: CricketPlayerState[];
  atcPlayers: AtcPlayerState[];
  killerPlayers: KillerPlayerState[];
  shanghaiPlayers: ShanghaiPlayerState[];
  halvePlayers: HalvePlayerState[];
  shanghaiRound: number;
  halveRound: number;
  activePlayerIndex: number;
  teamTurn: number[];
  matchWinnerIndex: number | null;
}

interface GameStore {
  gameId: number | null;
  config: GameConfig;
  players: PlayerState[];
  cricketPlayers: CricketPlayerState[];
  atcPlayers: AtcPlayerState[];
  killerPlayers: KillerPlayerState[];
  shanghaiPlayers: ShanghaiPlayerState[];
  shanghaiRound: number;
  halvePlayers: HalvePlayerState[];
  halveRound: number; // index into HALVE_TARGETS
  /** Account id per roster slot (null = guest/bot). Aligned with the player arrays. */
  rosterAccountIds: (number | null)[];
  /** Bot difficulty per roster slot (null = human/guest). Aligned with players. */
  botLevels: (BotDifficulty | null)[];
  /** When set, the current game is a tournament match; result is reported there. */
  tournamentMatchId: string | null;
  /** Member names per slot (team). Solo = [name]. Aligned with the player arrays. */
  teamMembers: string[][];
  /** Current thrower index within each team. Aligned with the player arrays. */
  teamTurn: number[];
  activePlayerIndex: number;
  /** False just after init until the starter is picked (bull-up / tirage). */
  starterChosen: boolean;
  currentVisitDarts: DartEntry[];
  moment: Moment;
  matchWinnerIndex: number | null;
  /** Snapshots of past visits (this game) so a committed visit can be reverted. */
  undoStack: UndoSnapshot[];
  appMode: 'home' | 'bar';
  scoringMode: ScoringMode;

  // Actions
  setGameId: (id: number) => void;
  setScoringMode: (m: ScoringMode) => void;
  setTournamentMatchId: (id: string | null) => void;
  initPlayers: (
    players: { id: number; name: string; accountId?: number; bot?: BotDifficulty; members?: string[] }[],
    config?: Partial<GameConfig>
  ) => void;
  addDart: (dart: DartEntry) => void;
  /** Commit a whole-visit total in one shot (numpad mode — no per-dart detail). */
  addVisitTotal: (total: number, dartCount?: number) => void;
  commitVisit: () => { moment: Moment; matchWon: boolean };
  undoDart: () => void;
  /** Revert the last committed visit (works across leg boundaries, mid-game). */
  undoLastVisit: () => void;
  resetGame: () => void;
  /** Restart the current game with the same players + config (rematch). */
  rematch: () => void;
  setAppMode: (m: 'home' | 'bar') => void;
  clearMoment: () => void;
  /** Set who throws first (index in the active roster) — closes the start picker. */
  chooseStarter: (index: number) => void;

  // ── Cricket ──────────────────────────────────────────────────────────────
  initCricket: (
    players: { id: number; name: string; accountId?: number; bot?: BotDifficulty; members?: string[] }[],
    config?: Partial<GameConfig>
  ) => void;
  addCricketDart: (dart: DartEntry) => void;
  commitCricketVisit: () => void;

  // ── Around the Clock ───────────────────────────────────────────────────────
  initAtc: (
    players: { id: number; name: string; accountId?: number; bot?: BotDifficulty; members?: string[] }[],
    config?: Partial<GameConfig>
  ) => void;
  addAtcDart: (dart: DartEntry) => void;
  commitAtcVisit: () => void;

  // ── Killer ───────────────────────────────────────────────────────────────
  initKiller: (
    players: { id: number; name: string; number?: number; accountId?: number; bot?: BotDifficulty; members?: string[] }[],
    config?: Partial<GameConfig>
  ) => void;
  addKillerDart: (dart: DartEntry) => void;
  commitKillerVisit: () => void;

  // ── Shanghai ───────────────────────────────────────────────────────────────
  initShanghai: (
    players: { id: number; name: string; accountId?: number; bot?: BotDifficulty; members?: string[] }[],
    config?: Partial<GameConfig>
  ) => void;
  addShanghaiDart: (dart: DartEntry) => void;
  commitShanghaiVisit: () => void;

  // ── Halve-it ───────────────────────────────────────────────────────────────
  initHalve: (
    players: { id: number; name: string; accountId?: number; bot?: BotDifficulty; members?: string[] }[],
    config?: Partial<GameConfig>
  ) => void;
  addHalveDart: (dart: DartEntry) => void;
  commitHalveVisit: () => void;
}

// ─── Defaults & helpers ───────────────────────────────────────────────────────

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gameType: 'x01',
  variant: '501',
  startScore: 501,
  finishMode: 'double',
  legsToWin: 1,
  setsToWin: 1,
  startLives: DEFAULT_KILLER_LIVES,
  shanghaiRounds: DEFAULT_SHANGHAI_ROUNDS,
  cricketCutThroat: false,
  atcAdvanceByMarks: false,
  killerSelfHit: true,
};

export const X01_VARIANT_SCORES: Record<Exclude<X01Variant, 'custom'>, number> = {
  '101': 101,
  '301': 301,
  '501': 501,
  '701': 701,
};

export const FINISH_MODE_LABELS: Record<FinishMode, string> = {
  simple: 'Simple out',
  double: 'Double out',
  master: 'Master out',
};

/** Build a complete GameConfig from a partial override + defaults. */
export function resolveConfig(partial?: Partial<GameConfig>): GameConfig {
  const merged = { ...DEFAULT_GAME_CONFIG, ...partial };
  // If a known variant is set without an explicit startScore, derive it.
  if (merged.variant !== 'custom' && !partial?.startScore) {
    merged.startScore = X01_VARIANT_SCORES[merged.variant];
  }
  return merged;
}

/** Is the given dart a valid finish for the requested finish mode? */
function isValidFinish(dart: DartEntry, mode: FinishMode): boolean {
  const isBullseye = dart.segment === 25 && dart.points === 50; // D-Bull
  switch (mode) {
    case 'simple':
      return true;
    case 'double':
      return dart.modifier === 'D' || isBullseye;
    case 'master':
      return dart.modifier === 'D' || dart.modifier === 'T' || isBullseye;
  }
}

/** Standard 3-dart average: (total counted points / darts thrown) × 3, 2 decimals. */
function calc3DartAvg(visits: Visit[], dartsThrown: number): number {
  if (dartsThrown === 0) return 0;
  const total = visits.reduce((s, v) => s + v.total, 0);
  return Math.round(((total / dartsThrown) * 3) * 100) / 100;
}

// ─── Cricket helpers ───────────────────────────────────────────────────────
// Standard scoring: hitting a target adds marks (S=1, D=2, T=3; bull single=1,
// bullseye=2). Once you have 3 marks a target is "closed". Extra marks on a
// target you've closed score its point value — but only while at least one
// opponent hasn't closed it too (once everyone closes it, the target is dead).

const CRICKET_TARGET_SET = new Set<number>(CRICKET_TARGETS);

/**
 * Apply a sequence of darts to `players[idx]`, returning a fresh array.
 * Pure — used both to commit a visit and to preview the in-progress visit.
 */
export function applyCricketDarts(
  players: CricketPlayerState[],
  idx: number,
  darts: DartEntry[],
  cutThroat = false
): CricketPlayerState[] {
  const next = players.map((p) => ({ ...p, marks: { ...p.marks } }));
  const p = next[idx];
  if (!p) return next;

  for (const dart of darts) {
    const target = dart.segment;
    if (!CRICKET_TARGET_SET.has(target)) continue; // non-target / miss → no effect
    const marks = dart.modifier === 'T' ? 3 : dart.modifier === 'D' ? 2 : 1;

    const current = p.marks[target] ?? 0;
    const closing = Math.min(marks, 3 - current);
    p.marks[target] = current + closing;

    const extra = marks - closing;
    if (extra > 0) {
      const points = extra * target; // bull target is 25
      if (cutThroat) {
        // Cut-throat: the points are dumped on every opponent that hasn't closed.
        next.forEach((o, i) => {
          if (i !== idx && (o.marks[target] ?? 0) < 3) o.score += points;
        });
      } else {
        const allOppClosed = next.every(
          (o, i) => i === idx || (o.marks[target] ?? 0) >= 3
        );
        if (!allOppClosed) p.score += points;
      }
    }
  }
  return next;
}

/**
 * Has `players[idx]` won? All targets closed AND (standard) the highest score,
 * or (cut-throat) the lowest score.
 */
export function cricketHasWon(
  players: CricketPlayerState[],
  idx: number,
  cutThroat = false
): boolean {
  const p = players[idx];
  if (!p) return false;
  const closedAll = CRICKET_TARGETS.every((t) => (p.marks[t] ?? 0) >= 3);
  if (!closedAll) return false;
  return players.every((o, i) =>
    i === idx ? true : cutThroat ? p.score <= o.score : p.score >= o.score
  );
}

/** A target is dead (un-scoreable) once every player has closed it. */
export function isCricketTargetDead(players: CricketPlayerState[], target: number): boolean {
  return players.length > 0 && players.every((p) => (p.marks[target] ?? 0) >= 3);
}

// ─── Around the Clock helpers ──────────────────────────────────────────────
// Hit the targets 1→20→Bull in order; any hit (single/double/triple) on your
// current target advances you by one. First to clear Bull wins.

/** The target a player must hit next, or null once they've finished. */
export function atcCurrentTarget(p: AtcPlayerState): number | null {
  return p.hits >= ATC_SEQUENCE.length ? null : ATC_SEQUENCE[p.hits];
}

/**
 * Apply a sequence of darts to `players[idx]`, returning a fresh array (pure).
 * With `advanceByMarks`, a double/triple of the current target advances ×2/×3.
 */
export function applyAtcDarts(
  players: AtcPlayerState[],
  idx: number,
  darts: DartEntry[],
  advanceByMarks = false
): AtcPlayerState[] {
  const next = players.map((p) => ({ ...p }));
  const p = next[idx];
  if (!p) return next;

  for (const dart of darts) {
    if (p.hits >= ATC_SEQUENCE.length) break; // already finished
    if (dart.segment === ATC_SEQUENCE[p.hits]) {
      const step = advanceByMarks
        ? dart.modifier === 'T'
          ? 3
          : dart.modifier === 'D'
            ? 2
            : 1
        : 1;
      p.hits = Math.min(ATC_SEQUENCE.length, p.hits + step);
    }
  }
  return next;
}

/** Has `players[idx]` cleared the whole sequence? */
export function atcHasWon(players: AtcPlayerState[], idx: number): boolean {
  const p = players[idx];
  return !!p && p.hits >= ATC_SEQUENCE.length;
}

// ─── Killer helpers ─────────────────────────────────────────────────────────
// Arm by hitting the DOUBLE of your own number. Once armed, every dart on an
// opponent's number costs them a life; hitting your OWN number costs you one.

/** Assign distinct random numbers (1–20) to `n` players. */
export function assignKillerNumbers(n: number): number[] {
  const pool = Array.from({ length: 20 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/** Apply a sequence of darts thrown by `players[idx]`, returning a fresh array. */
export function applyKillerDarts(
  players: KillerPlayerState[],
  idx: number,
  darts: DartEntry[],
  selfHit = true
): KillerPlayerState[] {
  const next = players.map((p) => ({ ...p }));
  const me = next[idx];
  if (!me || me.lives <= 0) return next;

  for (const dart of darts) {
    if (dart.segment === 0) continue; // miss

    if (!me.isKiller) {
      // Arm only by hitting the double of your own number.
      if (dart.segment === me.number && dart.modifier === 'D') me.isKiller = true;
      continue;
    }

    // Armed: a hit on a number damages that number's owner (1 life per dart).
    if (dart.segment === me.number) {
      if (selfHit) me.lives = Math.max(0, me.lives - 1); // self-hit penalty (optional)
    } else {
      const owner = next.find((p) => p.number === dart.segment);
      if (owner && owner.lives > 0) owner.lives = Math.max(0, owner.lives - 1);
    }
  }
  return next;
}

/** The sole survivor's index, or null if 0 or 2+ players are still alive. */
export function killerWinnerIndex(players: KillerPlayerState[]): number | null {
  const alive = players.map((p, i) => (p.lives > 0 ? i : -1)).filter((i) => i >= 0);
  return alive.length === 1 ? alive[0] : null;
}

// ─── Shanghai helpers ─────────────────────────────────────────────────────────
// Round N targets number N. Score singles/doubles/triples of the target. Hit a
// single AND double AND triple of the target in one visit → instant "Shanghai".

/** Points scored by a visit's darts on the round's target. */
export function shanghaiVisitScore(darts: DartEntry[], target: number): number {
  let s = 0;
  for (const d of darts) {
    if (d.segment !== target) continue;
    s += target * (d.modifier === 'T' ? 3 : d.modifier === 'D' ? 2 : 1);
  }
  return s;
}

/** Did the visit hit a single, double AND triple of the target (instant win)? */
export function isShanghai(darts: DartEntry[], target: number): boolean {
  const mods = new Set(darts.filter((d) => d.segment === target).map((d) => d.modifier));
  return mods.has('S') && mods.has('D') && mods.has('T');
}

/** Index of the highest scorer (ties broken by lowest index). */
export function shanghaiLeaderIndex(players: ShanghaiPlayerState[]): number {
  let best = 0;
  for (let i = 1; i < players.length; i++) {
    if (players[i].score > players[best].score) best = i;
  }
  return best;
}

/** Does a dart satisfy a Halve-it round target? */
export function halveDartMatch(d: DartEntry, t: HalveTarget): boolean {
  switch (t.kind) {
    case 'number':
      return d.segment === t.n;
    case 'double':
      return d.modifier === 'D' || (d.segment === 25 && d.points === 50);
    case 'triple':
      return d.modifier === 'T';
    case 'bull':
      return d.segment === 25;
  }
}
/** Points scored toward the Halve-it target this visit (0 = total miss → score halved). */
export function halveVisitScore(darts: DartEntry[], t: HalveTarget): number {
  let s = 0;
  for (const d of darts) if (halveDartMatch(d, t)) s += d.points;
  return s;
}
/** Index of the highest scorer (ties broken by lowest index). */
export function halveLeaderIndex(players: HalvePlayerState[]): number {
  let best = 0;
  for (let i = 1; i < players.length; i++) {
    if (players[i].score > players[best].score) best = i;
  }
  return best;
}

// ─── Store ────────────────────────────────────────────────────────────────────

/** Capture the undo-relevant slice of state before a visit commits. */
function snapshotOf(s: GameStore): UndoSnapshot {
  return {
    players: s.players,
    cricketPlayers: s.cricketPlayers,
    atcPlayers: s.atcPlayers,
    killerPlayers: s.killerPlayers,
    shanghaiPlayers: s.shanghaiPlayers,
    halvePlayers: s.halvePlayers,
    shanghaiRound: s.shanghaiRound,
    halveRound: s.halveRound,
    activePlayerIndex: s.activePlayerIndex,
    teamTurn: s.teamTurn,
    matchWinnerIndex: s.matchWinnerIndex,
  };
}
/** Push a snapshot, keeping the stack bounded. */
function pushSnap(stack: UndoSnapshot[], snap: UndoSnapshot): UndoSnapshot[] {
  const next = stack.length >= 40 ? stack.slice(1) : stack.slice();
  next.push(snap);
  return next;
}

/** Advance the thrower within the team that just played (no-op for solo slots). */
function advancedTurn(teamMembers: string[][], teamTurn: number[], idx: number): number[] {
  const tt = teamTurn.slice();
  const members = teamMembers[idx];
  if (members && members.length > 1 && typeof tt[idx] === 'number') {
    tt[idx] = (tt[idx] + 1) % members.length;
  }
  return tt;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameId: null,
  config: DEFAULT_GAME_CONFIG,
  players: [],
  cricketPlayers: [],
  atcPlayers: [],
  killerPlayers: [],
  shanghaiPlayers: [],
  shanghaiRound: 1,
  halvePlayers: [],
  halveRound: 0,
  rosterAccountIds: [],
  botLevels: [],
  tournamentMatchId: null,
  teamMembers: [],
  teamTurn: [],
  activePlayerIndex: 0,
  starterChosen: true,
  currentVisitDarts: [],
  moment: null,
  matchWinnerIndex: null,
  undoStack: [],
  appMode: 'home',
  scoringMode: 'grid',

  setGameId: (id) => set({ gameId: id }),

  setScoringMode: (scoringMode) => set({ scoringMode }),

  setTournamentMatchId: (tournamentMatchId) => set({ tournamentMatchId }),

  initPlayers: (players, partial) => {
    const config = resolveConfig({ ...partial, gameType: 'x01' });
    set({
      config,
      rosterAccountIds: players.map((p) => p.accountId ?? null),
      botLevels: players.map((p) => p.bot ?? null),
      tournamentMatchId: null,
      teamMembers: players.map((p) => (p.members && p.members.length ? p.members : [p.name])),
      teamTurn: players.map(() => 0),
      players: players.map((p) => ({
        ...p,
        remaining: config.startScore,
        legs: 0,
        sets: 0,
        dartsThrown: 0,
        visits: [],
        avg: 0,
      })),
      cricketPlayers: [],
      atcPlayers: [],
      killerPlayers: [],
      shanghaiPlayers: [],
      activePlayerIndex: 0,
      starterChosen: false,
      currentVisitDarts: [],
      moment: null,
      matchWinnerIndex: null,
      undoStack: [],
    });
  },

  addDart: (dart) => {
    const { currentVisitDarts, players, activePlayerIndex, matchWinnerIndex } = get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length >= 3) return;
    const player = players[activePlayerIndex];
    if (!player || player.remaining === 0) return;

    const newDarts = [...currentVisitDarts, dart];
    set({ currentVisitDarts: newDarts });

    const visitTotal = newDarts.reduce((s, d) => s + d.points, 0);
    const projected = player.remaining - visitTotal;

    // Decide whether the visit must end immediately:
    //  – went under zero               → bust, end visit
    //  – hit 1 in non-simple finish    → bust, end visit
    //  – hit zero                      → checkout (or bust if last dart invalid), end visit
    //  – three darts thrown            → end visit normally
    const { config } = get();
    const mustEnd =
      projected < 0 ||
      (projected === 1 && config.finishMode !== 'simple') ||
      projected === 0 ||
      newDarts.length === 3;

    if (mustEnd) {
      // Small delay so the UI shows the third dart before the visit closes.
      setTimeout(() => get().commitVisit(), 120);
    }
  },

  addVisitTotal: (total, dartCount) => {
    const { players, activePlayerIndex, config, matchWinnerIndex } = get();
    if (matchWinnerIndex !== null) return;
    const base = players[activePlayerIndex];
    if (!base || base.remaining === 0) return;
    set({ undoStack: pushSnap(get().undoStack, snapshotOf(get())) });

    // A single visit can never exceed 180 points.
    const clamped = Math.max(0, Math.min(180, Math.floor(total)));

    const player = { ...base };
    const projected = player.remaining - clamped;

    // ── classify the visit. We have no per-dart detail, so a checkout (reaching
    //    exactly 0) is trusted — the player wouldn't enter it otherwise. Double-out
    //    is still enforced where it can be: leaving 1 busts in non-simple modes.
    let bust = false;
    let checkout = false;
    if (projected < 0) {
      bust = true;
    } else if (projected === 1 && config.finishMode !== 'simple') {
      bust = true;
    } else if (projected === 0) {
      checkout = true;
    }

    // Scoring visits are always 3 darts; on checkout/bust the screen asks how
    // many were actually thrown and passes it along.
    const dartsUsed = dartCount != null ? Math.max(1, Math.min(3, Math.floor(dartCount))) : 3;
    const visit: Visit = { darts: [], total: bust ? 0 : clamped, bust, dartCount: dartsUsed };
    player.visits = [...player.visits, visit];
    player.dartsThrown += dartsUsed;
    if (!bust) player.remaining = projected;
    player.avg = calc3DartAvg(player.visits, player.dartsThrown);

    // ── moment & match progression (mirrors commitVisit)
    let moment: Moment = null;
    let nextMatchWinnerIndex: number | null = null;

    if (bust) {
      moment = 'bust';
    } else if (clamped === 180) {
      moment = '180';
    }

    let newPlayers = [...players];
    newPlayers[activePlayerIndex] = player;

    if (checkout) {
      player.legs += 1;
      newPlayers[activePlayerIndex] = player;

      if (player.legs >= config.legsToWin) {
        player.sets += 1;
        newPlayers[activePlayerIndex] = player;
        if (player.sets >= config.setsToWin) {
          nextMatchWinnerIndex = activePlayerIndex;
          moment = 'matchWon';
        } else {
          moment = 'checkout';
          newPlayers = newPlayers.map((p) => ({ ...p, remaining: config.startScore, legs: 0 }));
        }
      } else {
        moment = 'checkout';
        newPlayers = newPlayers.map((p) => ({ ...p, remaining: config.startScore }));
      }
    }

    const nextIndex =
      nextMatchWinnerIndex !== null
        ? activePlayerIndex
        : (activePlayerIndex + 1) % players.length;

    set({
      players: newPlayers,
      activePlayerIndex: nextIndex,
      teamTurn: advancedTurn(get().teamMembers, get().teamTurn, activePlayerIndex),
      currentVisitDarts: [],
      moment,
      matchWinnerIndex: nextMatchWinnerIndex,
    });
  },

  commitVisit: () => {
    const { currentVisitDarts, players, activePlayerIndex, config, matchWinnerIndex } = get();
    if (currentVisitDarts.length === 0) return { moment: null, matchWon: false };
    if (matchWinnerIndex !== null) return { moment: null, matchWon: false };
    set({ undoStack: pushSnap(get().undoStack, snapshotOf(get())) });

    const player = { ...players[activePlayerIndex] };
    const visitTotal = currentVisitDarts.reduce((s, d) => s + d.points, 0);
    const projected = player.remaining - visitTotal;

    // ── classify the visit
    let bust = false;
    let checkout = false;

    if (projected < 0) {
      bust = true;
    } else if (projected === 1 && config.finishMode !== 'simple') {
      bust = true;
    } else if (projected === 0) {
      const lastDart = currentVisitDarts[currentVisitDarts.length - 1];
      checkout = isValidFinish(lastDart, config.finishMode);
      bust = !checkout;
    }

    const visit: Visit = {
      darts: currentVisitDarts,
      total: bust ? 0 : visitTotal,
      bust,
    };

    player.visits = [...player.visits, visit];
    player.dartsThrown += currentVisitDarts.length;
    if (!bust) player.remaining = projected;
    player.avg = calc3DartAvg(player.visits, player.dartsThrown);

    // ── moment & match progression
    let moment: Moment = null;
    let nextMatchWinnerIndex: number | null = null;

    if (bust) {
      moment = 'bust';
    } else if (visitTotal === 180) {
      moment = '180';
    }

    let newPlayers = [...players];
    newPlayers[activePlayerIndex] = player;

    if (checkout) {
      player.legs += 1;
      newPlayers[activePlayerIndex] = player;

      if (player.legs >= config.legsToWin) {
        // Leg count reached → set won.
        player.sets += 1;
        newPlayers[activePlayerIndex] = player;
        if (player.sets >= config.setsToWin) {
          nextMatchWinnerIndex = activePlayerIndex;
          moment = 'matchWon';
        } else {
          // New set: everyone back to startScore, legs reset to 0.
          moment = 'checkout';
          newPlayers = newPlayers.map((p) => ({ ...p, remaining: config.startScore, legs: 0 }));
        }
      } else {
        // New leg in the same set.
        moment = 'checkout';
        newPlayers = newPlayers.map((p) => ({ ...p, remaining: config.startScore }));
      }
    }

    // ── next active player
    let nextIndex: number;
    if (nextMatchWinnerIndex !== null) {
      nextIndex = activePlayerIndex; // freeze on winner
    } else if (checkout) {
      // Loser of the previous leg throws first in the new leg.
      nextIndex = (activePlayerIndex + 1) % players.length;
    } else {
      nextIndex = (activePlayerIndex + 1) % players.length;
    }

    set({
      players: newPlayers,
      activePlayerIndex: nextIndex,
      teamTurn: advancedTurn(get().teamMembers, get().teamTurn, activePlayerIndex),
      currentVisitDarts: [],
      moment,
      matchWinnerIndex: nextMatchWinnerIndex,
    });

    return { moment, matchWon: nextMatchWinnerIndex !== null };
  },

  undoDart: () => {
    const { currentVisitDarts } = get();
    if (currentVisitDarts.length > 0) {
      set({ currentVisitDarts: currentVisitDarts.slice(0, -1) });
    }
  },

  undoLastVisit: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const snap = undoStack[undoStack.length - 1];
    set({
      players: snap.players,
      cricketPlayers: snap.cricketPlayers,
      atcPlayers: snap.atcPlayers,
      killerPlayers: snap.killerPlayers,
      shanghaiPlayers: snap.shanghaiPlayers,
      halvePlayers: snap.halvePlayers,
      shanghaiRound: snap.shanghaiRound,
      halveRound: snap.halveRound,
      activePlayerIndex: snap.activePlayerIndex,
      teamTurn: snap.teamTurn,
      matchWinnerIndex: snap.matchWinnerIndex,
      currentVisitDarts: [],
      moment: null,
      undoStack: undoStack.slice(0, -1),
    });
  },

  resetGame: () =>
    set({
      gameId: null,
      players: [],
      cricketPlayers: [],
      atcPlayers: [],
      killerPlayers: [],
      shanghaiPlayers: [],
      shanghaiRound: 1,
      halvePlayers: [],
      halveRound: 0,
      rosterAccountIds: [],
      botLevels: [],
      tournamentMatchId: null,
      teamMembers: [],
      teamTurn: [],
      activePlayerIndex: 0,
      currentVisitDarts: [],
      moment: null,
      matchWinnerIndex: null,
      undoStack: [],
    }),

  rematch: () => {
    const { config, players, cricketPlayers, atcPlayers, killerPlayers, shanghaiPlayers, halvePlayers, rosterAccountIds, botLevels, teamMembers } = get();
    // Re-attach the account link + bot tier + team members each slot started with.
    const tag = (arr: { id: number; name: string }[]) =>
      arr.map((p, i) => ({
        id: p.id,
        name: p.name,
        accountId: rosterAccountIds[i] ?? undefined,
        bot: botLevels[i] ?? undefined,
        members: teamMembers[i],
      }));
    switch (config.gameType) {
      case 'cricket':
        get().initCricket(tag(cricketPlayers), config);
        break;
      case 'atc':
        get().initAtc(tag(atcPlayers), config);
        break;
      case 'killer':
        get().initKiller(
          killerPlayers.map((p, i) => ({
            id: p.id,
            name: p.name,
            number: p.number,
            accountId: rosterAccountIds[i] ?? undefined,
            bot: botLevels[i] ?? undefined,
            members: teamMembers[i],
          })),
          config
        );
        break;
      case 'shanghai':
        get().initShanghai(tag(shanghaiPlayers), config);
        break;
      case 'halveit':
        get().initHalve(tag(halvePlayers), config);
        break;
      default:
        get().initPlayers(tag(players), config);
    }
  },

  setAppMode: (appMode) => set({ appMode }),
  clearMoment: () => set({ moment: null }),

  chooseStarter: (index) => {
    const n = get().players.length || get().cricketPlayers.length || get().atcPlayers.length
      || get().killerPlayers.length || get().shanghaiPlayers.length || get().halvePlayers.length;
    const i = n > 0 ? ((index % n) + n) % n : 0;
    set({ activePlayerIndex: i, starterChosen: true });
  },

  // ── Cricket ──────────────────────────────────────────────────────────────

  initCricket: (players, partial) => {
    const config = resolveConfig({ ...partial, gameType: 'cricket' });
    set({
      config,
      rosterAccountIds: players.map((p) => p.accountId ?? null),
      botLevels: players.map((p) => p.bot ?? null),
      tournamentMatchId: null,
      teamMembers: players.map((p) => (p.members && p.members.length ? p.members : [p.name])),
      teamTurn: players.map(() => 0),
      players: [],
      cricketPlayers: players.map((p) => ({
        id: p.id,
        name: p.name,
        marks: {},
        score: 0,
        legs: 0,
        dartsThrown: 0,
      })),
      atcPlayers: [],
      killerPlayers: [],
      shanghaiPlayers: [],
      activePlayerIndex: 0,
      starterChosen: false,
      currentVisitDarts: [],
      moment: null,
      matchWinnerIndex: null,
      undoStack: [],
    });
  },

  addCricketDart: (dart) => {
    const { currentVisitDarts, cricketPlayers, activePlayerIndex, config, matchWinnerIndex } = get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length >= 3) return;
    if (!cricketPlayers[activePlayerIndex]) return;

    const newDarts = [...currentVisitDarts, dart];
    set({ currentVisitDarts: newDarts });

    // End the visit early if this dart wins the game; otherwise after 3 darts.
    const preview = applyCricketDarts(cricketPlayers, activePlayerIndex, newDarts, config.cricketCutThroat);
    const willWin = cricketHasWon(preview, activePlayerIndex, config.cricketCutThroat);
    if (willWin || newDarts.length === 3) {
      // Small delay so the UI shows the last dart before the visit closes.
      setTimeout(() => get().commitCricketVisit(), 120);
    }
  },

  commitCricketVisit: () => {
    const { currentVisitDarts, cricketPlayers, activePlayerIndex, config, matchWinnerIndex } = get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length === 0) return;
    set({ undoStack: pushSnap(get().undoStack, snapshotOf(get())) });

    const idx = activePlayerIndex;
    let next = applyCricketDarts(cricketPlayers, idx, currentVisitDarts, config.cricketCutThroat);
    next[idx] = {
      ...next[idx],
      dartsThrown: next[idx].dartsThrown + currentVisitDarts.length,
    };

    let moment: Moment = null;
    let nextMatchWinnerIndex: number | null = null;

    if (cricketHasWon(next, idx, config.cricketCutThroat)) {
      next[idx] = { ...next[idx], legs: next[idx].legs + 1 };
      if (next[idx].legs >= config.legsToWin) {
        nextMatchWinnerIndex = idx;
        moment = 'matchWon';
      } else {
        // New leg: clear all marks + scores, loser throws first.
        moment = 'checkout';
        next = next.map((p) => ({ ...p, marks: {}, score: 0 }));
      }
    }

    const nextIndex =
      nextMatchWinnerIndex !== null ? idx : (idx + 1) % cricketPlayers.length;

    set({
      cricketPlayers: next,
      activePlayerIndex: nextIndex,
      teamTurn: advancedTurn(get().teamMembers, get().teamTurn, idx),
      currentVisitDarts: [],
      moment,
      matchWinnerIndex: nextMatchWinnerIndex,
    });
  },

  // ── Around the Clock ───────────────────────────────────────────────────────

  initAtc: (players, partial) => {
    const config = resolveConfig({ ...partial, gameType: 'atc' });
    set({
      config,
      rosterAccountIds: players.map((p) => p.accountId ?? null),
      botLevels: players.map((p) => p.bot ?? null),
      tournamentMatchId: null,
      teamMembers: players.map((p) => (p.members && p.members.length ? p.members : [p.name])),
      teamTurn: players.map(() => 0),
      players: [],
      cricketPlayers: [],
      atcPlayers: players.map((p) => ({
        id: p.id,
        name: p.name,
        hits: 0,
        legs: 0,
        dartsThrown: 0,
      })),
      killerPlayers: [],
      shanghaiPlayers: [],
      activePlayerIndex: 0,
      starterChosen: false,
      currentVisitDarts: [],
      moment: null,
      matchWinnerIndex: null,
      undoStack: [],
    });
  },

  addAtcDart: (dart) => {
    const { currentVisitDarts, atcPlayers, activePlayerIndex, config, matchWinnerIndex } = get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length >= 3) return;
    if (!atcPlayers[activePlayerIndex]) return;

    const newDarts = [...currentVisitDarts, dart];
    set({ currentVisitDarts: newDarts });

    // End early if this dart finishes the sequence; otherwise after 3 darts.
    const preview = applyAtcDarts(atcPlayers, activePlayerIndex, newDarts, config.atcAdvanceByMarks);
    const willWin = atcHasWon(preview, activePlayerIndex);
    if (willWin || newDarts.length === 3) {
      setTimeout(() => get().commitAtcVisit(), 120);
    }
  },

  commitAtcVisit: () => {
    const { currentVisitDarts, atcPlayers, activePlayerIndex, config, matchWinnerIndex } = get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length === 0) return;
    set({ undoStack: pushSnap(get().undoStack, snapshotOf(get())) });

    const idx = activePlayerIndex;
    let next = applyAtcDarts(atcPlayers, idx, currentVisitDarts, config.atcAdvanceByMarks);
    next[idx] = {
      ...next[idx],
      dartsThrown: next[idx].dartsThrown + currentVisitDarts.length,
    };

    let moment: Moment = null;
    let nextMatchWinnerIndex: number | null = null;

    if (atcHasWon(next, idx)) {
      next[idx] = { ...next[idx], legs: next[idx].legs + 1 };
      if (next[idx].legs >= config.legsToWin) {
        nextMatchWinnerIndex = idx;
        moment = 'matchWon';
      } else {
        // New leg: everyone restarts from target 1, loser throws first.
        moment = 'checkout';
        next = next.map((p) => ({ ...p, hits: 0 }));
      }
    }

    const nextIndex =
      nextMatchWinnerIndex !== null ? idx : (idx + 1) % atcPlayers.length;

    set({
      atcPlayers: next,
      activePlayerIndex: nextIndex,
      teamTurn: advancedTurn(get().teamMembers, get().teamTurn, idx),
      currentVisitDarts: [],
      moment,
      matchWinnerIndex: nextMatchWinnerIndex,
    });
  },

  // ── Killer ───────────────────────────────────────────────────────────────

  initKiller: (players, partial) => {
    const config = resolveConfig({ ...partial, gameType: 'killer' });
    // Manual numbers may be supplied per player; otherwise assign at random.
    const provided = players.map((p) => (p as { number?: number }).number);
    const allProvided = provided.every((n) => typeof n === 'number' && n >= 1 && n <= 20);
    const numbers = allProvided
      ? (provided as number[])
      : assignKillerNumbers(players.length);
    set({
      config,
      rosterAccountIds: players.map((p) => p.accountId ?? null),
      botLevels: players.map((p) => p.bot ?? null),
      tournamentMatchId: null,
      teamMembers: players.map((p) => (p.members && p.members.length ? p.members : [p.name])),
      teamTurn: players.map(() => 0),
      players: [],
      cricketPlayers: [],
      atcPlayers: [],
      killerPlayers: players.map((p, i) => ({
        id: p.id,
        name: p.name,
        number: numbers[i],
        lives: config.startLives,
        isKiller: false,
        legs: 0,
        dartsThrown: 0,
      })),
      shanghaiPlayers: [],
      activePlayerIndex: 0,
      starterChosen: false,
      currentVisitDarts: [],
      moment: null,
      matchWinnerIndex: null,
      undoStack: [],
    });
  },

  addKillerDart: (dart) => {
    const { currentVisitDarts, killerPlayers, activePlayerIndex, config, matchWinnerIndex } = get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length >= 3) return;
    if (!killerPlayers[activePlayerIndex]) return;

    const newDarts = [...currentVisitDarts, dart];
    set({ currentVisitDarts: newDarts });

    // End early if this visit leaves a single survivor; otherwise after 3 darts.
    const preview = applyKillerDarts(killerPlayers, activePlayerIndex, newDarts, config.killerSelfHit);
    const willEnd = killerWinnerIndex(preview) !== null;
    if (willEnd || newDarts.length === 3) {
      setTimeout(() => get().commitKillerVisit(), 120);
    }
  },

  commitKillerVisit: () => {
    const { currentVisitDarts, killerPlayers, activePlayerIndex, config, matchWinnerIndex } = get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length === 0) return;
    set({ undoStack: pushSnap(get().undoStack, snapshotOf(get())) });

    const idx = activePlayerIndex;
    let next = applyKillerDarts(killerPlayers, idx, currentVisitDarts, config.killerSelfHit);
    next[idx] = {
      ...next[idx],
      dartsThrown: next[idx].dartsThrown + currentVisitDarts.length,
    };

    let moment: Moment = null;
    let nextMatchWinnerIndex: number | null = null;

    const winner = killerWinnerIndex(next);
    if (winner !== null) {
      next[winner] = { ...next[winner], legs: next[winner].legs + 1 };
      if (next[winner].legs >= config.legsToWin) {
        nextMatchWinnerIndex = winner;
        moment = 'matchWon';
      } else {
        // New leg: fresh lives, new numbers, disarm everyone.
        moment = 'checkout';
        const numbers = assignKillerNumbers(next.length);
        next = next.map((p, i) => ({
          ...p,
          number: numbers[i],
          lives: config.startLives,
          isKiller: false,
        }));
      }
    }

    // Advance to the next still-alive player (skip eliminated).
    let nextIndex = idx;
    if (nextMatchWinnerIndex === null) {
      for (let step = 1; step <= next.length; step++) {
        const cand = (idx + step) % next.length;
        if (next[cand].lives > 0) {
          nextIndex = cand;
          break;
        }
      }
    }

    set({
      killerPlayers: next,
      activePlayerIndex: nextIndex,
      teamTurn: advancedTurn(get().teamMembers, get().teamTurn, idx),
      currentVisitDarts: [],
      moment,
      matchWinnerIndex: nextMatchWinnerIndex,
    });
  },

  // ── Shanghai ───────────────────────────────────────────────────────────────

  initShanghai: (players, partial) => {
    const config = resolveConfig({ ...partial, gameType: 'shanghai' });
    set({
      config,
      rosterAccountIds: players.map((p) => p.accountId ?? null),
      botLevels: players.map((p) => p.bot ?? null),
      tournamentMatchId: null,
      teamMembers: players.map((p) => (p.members && p.members.length ? p.members : [p.name])),
      teamTurn: players.map(() => 0),
      players: [],
      cricketPlayers: [],
      atcPlayers: [],
      killerPlayers: [],
      shanghaiPlayers: players.map((p) => ({
        id: p.id,
        name: p.name,
        score: 0,
        legs: 0,
        dartsThrown: 0,
      })),
      shanghaiRound: 1,
      activePlayerIndex: 0,
      starterChosen: false,
      currentVisitDarts: [],
      moment: null,
      matchWinnerIndex: null,
      undoStack: [],
    });
  },

  addShanghaiDart: (dart) => {
    const { currentVisitDarts, shanghaiPlayers, activePlayerIndex, shanghaiRound, matchWinnerIndex } =
      get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length >= 3) return;
    if (!shanghaiPlayers[activePlayerIndex]) return;

    const newDarts = [...currentVisitDarts, dart];
    set({ currentVisitDarts: newDarts });

    // End early on an instant Shanghai; otherwise after 3 darts.
    if (isShanghai(newDarts, shanghaiRound) || newDarts.length === 3) {
      setTimeout(() => get().commitShanghaiVisit(), 120);
    }
  },

  commitShanghaiVisit: () => {
    const { currentVisitDarts, shanghaiPlayers, activePlayerIndex, shanghaiRound, config, matchWinnerIndex } =
      get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length === 0) return;
    set({ undoStack: pushSnap(get().undoStack, snapshotOf(get())) });

    const idx = activePlayerIndex;
    const target = shanghaiRound;
    const maxRounds = config.shanghaiRounds;

    const gained = shanghaiVisitScore(currentVisitDarts, target);
    const shanghai = isShanghai(currentVisitDarts, target);

    let next = shanghaiPlayers.map((p) => ({ ...p }));
    next[idx] = {
      ...next[idx],
      score: next[idx].score + gained,
      dartsThrown: next[idx].dartsThrown + currentVisitDarts.length,
    };

    let moment: Moment = null;
    let nextMatchWinnerIndex: number | null = null;
    let round = shanghaiRound;
    let nextIndex = (idx + 1) % next.length;
    let gameEnded = shanghai;

    if (!shanghai && nextIndex === 0) {
      // A full rotation completed → advance the round (or end the game).
      if (round >= maxRounds) gameEnded = true;
      else round = round + 1;
    }

    if (gameEnded) {
      const winner = shanghai ? idx : shanghaiLeaderIndex(next);
      next[winner] = { ...next[winner], legs: next[winner].legs + 1 };
      if (next[winner].legs >= config.legsToWin) {
        nextMatchWinnerIndex = winner;
        moment = 'matchWon';
      } else {
        // New leg: reset scores + round.
        moment = 'checkout';
        next = next.map((p) => ({ ...p, score: 0 }));
        round = 1;
        nextIndex = 0;
      }
      // An instant Shanghai always gets its own celebration.
      if (shanghai) moment = 'shanghai';
    }

    set({
      shanghaiPlayers: next,
      shanghaiRound: round,
      activePlayerIndex: nextMatchWinnerIndex !== null ? idx : nextIndex,
      teamTurn: advancedTurn(get().teamMembers, get().teamTurn, idx),
      currentVisitDarts: [],
      moment,
      matchWinnerIndex: nextMatchWinnerIndex,
    });
  },

  // ── Halve-it ───────────────────────────────────────────────────────────────

  initHalve: (players, partial) => {
    const config = resolveConfig({ ...partial, gameType: 'halveit' });
    set({
      config,
      rosterAccountIds: players.map((p) => p.accountId ?? null),
      botLevels: players.map((p) => p.bot ?? null),
      tournamentMatchId: null,
      teamMembers: players.map((p) => (p.members && p.members.length ? p.members : [p.name])),
      teamTurn: players.map(() => 0),
      players: [],
      cricketPlayers: [],
      atcPlayers: [],
      killerPlayers: [],
      shanghaiPlayers: [],
      halvePlayers: players.map((p) => ({
        id: p.id,
        name: p.name,
        score: 0,
        legs: 0,
        dartsThrown: 0,
      })),
      halveRound: 0,
      activePlayerIndex: 0,
      starterChosen: false,
      currentVisitDarts: [],
      moment: null,
      matchWinnerIndex: null,
      undoStack: [],
    });
  },

  addHalveDart: (dart) => {
    const { currentVisitDarts, halvePlayers, activePlayerIndex, matchWinnerIndex } = get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length >= 3) return;
    if (!halvePlayers[activePlayerIndex]) return;

    const newDarts = [...currentVisitDarts, dart];
    set({ currentVisitDarts: newDarts });

    if (newDarts.length === 3) {
      setTimeout(() => get().commitHalveVisit(), 120);
    }
  },

  commitHalveVisit: () => {
    const { currentVisitDarts, halvePlayers, activePlayerIndex, halveRound, config, matchWinnerIndex } =
      get();
    if (matchWinnerIndex !== null) return;
    if (currentVisitDarts.length === 0) return;
    set({ undoStack: pushSnap(get().undoStack, snapshotOf(get())) });

    const idx = activePlayerIndex;
    const target = HALVE_TARGETS[halveRound];
    const gained = halveVisitScore(currentVisitDarts, target);

    let next = halvePlayers.map((p) => ({ ...p }));
    next[idx] = {
      ...next[idx],
      // Hit something → add it; total miss → score is halved (rounded down).
      score: gained > 0 ? next[idx].score + gained : Math.floor(next[idx].score / 2),
      dartsThrown: next[idx].dartsThrown + currentVisitDarts.length,
    };

    let moment: Moment = null;
    let nextMatchWinnerIndex: number | null = null;
    let round = halveRound;
    let nextIndex = (idx + 1) % next.length;
    let gameEnded = false;

    if (nextIndex === 0) {
      // A full rotation completed → advance the round (or end the game).
      if (round >= HALVE_TARGETS.length - 1) gameEnded = true;
      else round = round + 1;
    }

    if (gameEnded) {
      const winner = halveLeaderIndex(next);
      next[winner] = { ...next[winner], legs: next[winner].legs + 1 };
      if (next[winner].legs >= config.legsToWin) {
        nextMatchWinnerIndex = winner;
        moment = 'matchWon';
      } else {
        // New leg: reset scores + round.
        moment = 'checkout';
        next = next.map((p) => ({ ...p, score: 0 }));
        round = 0;
        nextIndex = 0;
      }
    }

    set({
      halvePlayers: next,
      halveRound: round,
      activePlayerIndex: nextMatchWinnerIndex !== null ? idx : nextIndex,
      teamTurn: advancedTurn(get().teamMembers, get().teamTurn, idx),
      currentVisitDarts: [],
      moment,
      matchWinnerIndex: nextMatchWinnerIndex,
    });
  },
}));
