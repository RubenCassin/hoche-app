// ─── Moteur web des modes hors-X01 ───────────────────────────────────────────
// Portage fidèle des règles mobiles (hooks/useGameStore.ts) : Cricket, Around
// the Clock, Killer, Shanghai, Halve-it. Saisie fléchette par fléchette (la
// grille), volée = 3 fléchettes (validée à 3 ou manuellement). Pur, sans React.

export type Mod = 'S' | 'D' | 'T';
export interface Dart { points: number; modifier: Mod; segment: number } // segment 0 = raté, 1-20, 25 = bull
export type ModeType = 'cricket' | 'atc' | 'killer' | 'shanghai' | 'halveit';

export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 25] as const;
export const ATC_SEQUENCE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25] as const;
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
export const DEFAULT_KILLER_LIVES = 3;
export const DEFAULT_SHANGHAI_ROUNDS = 7;

export interface ModePlayer {
  id: number; name: string; bot: string | null;
  dartsThrown: number;
  // Cricket
  marks: Record<number, number>; score: number;
  // ATC
  hits: number;
  // Killer
  number: number; lives: number; isKiller: boolean;
}
export interface ModeConfig {
  gameType: ModeType;
  cutThroat: boolean;        // cricket
  advanceByMarks: boolean;   // atc
  startLives: number;        // killer
  shanghaiRounds: number;    // shanghai
}
export interface ModeState {
  config: ModeConfig;
  players: ModePlayer[];
  turn: number;
  round: number;             // shanghai/halve : index du tour (0-based pour halve, 1-based pour shanghai)
  visit: Dart[];
  winner: number | null;
  event: string | null;      // 'shanghai' | 'halved' | ...
}

const CRICKET_SET = new Set<number>(CRICKET_TARGETS);

// ── Cricket ───────────────────────────────────────────────────────────────────
export function applyCricketDarts(players: ModePlayer[], idx: number, darts: Dart[], cutThroat: boolean): ModePlayer[] {
  const next = players.map((p) => ({ ...p, marks: { ...p.marks } }));
  const p = next[idx];
  for (const dart of darts) {
    const target = dart.segment;
    if (!CRICKET_SET.has(target)) continue;
    const marks = dart.modifier === 'T' ? 3 : dart.modifier === 'D' ? 2 : 1;
    const current = p.marks[target] ?? 0;
    const closing = Math.min(marks, 3 - current);
    p.marks[target] = current + closing;
    const extra = marks - closing;
    if (extra > 0) {
      const points = extra * target;
      if (cutThroat) {
        next.forEach((o, i) => { if (i !== idx && (o.marks[target] ?? 0) < 3) o.score += points; });
      } else {
        const allOppClosed = next.every((o, i) => i === idx || (o.marks[target] ?? 0) >= 3);
        if (!allOppClosed) p.score += points;
      }
    }
  }
  return next;
}
export function cricketHasWon(players: ModePlayer[], idx: number, cutThroat: boolean): boolean {
  const p = players[idx];
  if (!p) return false;
  const closedAll = CRICKET_TARGETS.every((t) => (p.marks[t] ?? 0) >= 3);
  if (!closedAll) return false;
  return players.every((o, i) => (i === idx ? true : cutThroat ? p.score <= o.score : p.score >= o.score));
}
export function isCricketTargetDead(players: ModePlayer[], target: number): boolean {
  return players.length > 0 && players.every((p) => (p.marks[target] ?? 0) >= 3);
}

// ── Around the Clock ────────────────────────────────────────────────────────
export function atcCurrentTarget(p: ModePlayer): number | null {
  return p.hits >= ATC_SEQUENCE.length ? null : ATC_SEQUENCE[p.hits];
}
export function applyAtcDarts(players: ModePlayer[], idx: number, darts: Dart[], advanceByMarks: boolean): ModePlayer[] {
  const next = players.map((p) => ({ ...p }));
  const p = next[idx];
  for (const dart of darts) {
    if (p.hits >= ATC_SEQUENCE.length) break;
    if (dart.segment === ATC_SEQUENCE[p.hits]) {
      const step = advanceByMarks ? (dart.modifier === 'T' ? 3 : dart.modifier === 'D' ? 2 : 1) : 1;
      p.hits = Math.min(ATC_SEQUENCE.length, p.hits + step);
    }
  }
  return next;
}
export function atcHasWon(players: ModePlayer[], idx: number): boolean {
  const p = players[idx];
  return !!p && p.hits >= ATC_SEQUENCE.length;
}

// ── Killer ──────────────────────────────────────────────────────────────────
export function assignKillerNumbers(n: number): number[] {
  const pool = Array.from({ length: 20 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}
export function applyKillerDarts(players: ModePlayer[], idx: number, darts: Dart[], selfHit: boolean): ModePlayer[] {
  const next = players.map((p) => ({ ...p }));
  const me = next[idx];
  if (!me || me.lives <= 0) return next;
  for (const dart of darts) {
    if (dart.segment === 0) continue;
    if (!me.isKiller) { if (dart.segment === me.number && dart.modifier === 'D') me.isKiller = true; continue; }
    if (dart.segment === me.number) { if (selfHit) me.lives = Math.max(0, me.lives - 1); }
    else { const owner = next.find((p) => p.number === dart.segment); if (owner && owner.lives > 0) owner.lives = Math.max(0, owner.lives - 1); }
  }
  return next;
}
export function killerWinnerIndex(players: ModePlayer[]): number | null {
  const alive = players.map((p, i) => (p.lives > 0 ? i : -1)).filter((i) => i >= 0);
  return alive.length === 1 ? alive[0] : null;
}

// ── Shanghai ──────────────────────────────────────────────────────────────────
export function shanghaiVisitScore(darts: Dart[], target: number): number {
  let s = 0;
  for (const d of darts) if (d.segment === target) s += target * (d.modifier === 'T' ? 3 : d.modifier === 'D' ? 2 : 1);
  return s;
}
export function isShanghai(darts: Dart[], target: number): boolean {
  const mods = new Set(darts.filter((d) => d.segment === target).map((d) => d.modifier));
  return mods.has('S') && mods.has('D') && mods.has('T');
}
export function leaderIndex(players: ModePlayer[]): number {
  let best = 0;
  for (let i = 1; i < players.length; i++) if (players[i].score > players[best].score) best = i;
  return best;
}

// ── Halve-it ──────────────────────────────────────────────────────────────────
export function halveDartMatch(d: Dart, t: HalveTarget): boolean {
  switch (t.kind) {
    case 'number': return d.segment === t.n;
    case 'double': return d.modifier === 'D' || (d.segment === 25 && d.points === 50);
    case 'triple': return d.modifier === 'T';
    case 'bull': return d.segment === 25;
  }
}
export function halveVisitScore(darts: Dart[], t: HalveTarget): number {
  let s = 0; for (const d of darts) if (halveDartMatch(d, t)) s += d.points; return s;
}

// ── Machine d'état ──────────────────────────────────────────────────────────
export function createGame(
  gameType: ModeType,
  roster: { name: string; bot: string | null }[],
  cfg: Partial<ModeConfig> = {}
): ModeState {
  const config: ModeConfig = {
    gameType,
    cutThroat: cfg.cutThroat ?? false,
    advanceByMarks: cfg.advanceByMarks ?? false,
    startLives: cfg.startLives ?? DEFAULT_KILLER_LIVES,
    shanghaiRounds: cfg.shanghaiRounds ?? DEFAULT_SHANGHAI_ROUNDS,
  };
  const nums = gameType === 'killer' ? assignKillerNumbers(roster.length) : [];
  const players: ModePlayer[] = roster.map((r, i) => ({
    id: i, name: r.name, bot: r.bot, dartsThrown: 0,
    marks: {}, score: 0, hits: 0,
    number: nums[i] ?? 0, lives: config.startLives, isKiller: false,
  }));
  return { config, players, turn: 0, round: gameType === 'shanghai' ? 1 : 0, visit: [], winner: null, event: null };
}

/** Empile une fléchette dans la volée courante (max 3). */
export function pushDart(s: ModeState, d: Dart): ModeState {
  if (s.winner !== null || s.visit.length >= 3) return s;
  return { ...s, visit: [...s.visit, d] };
}
export function popDart(s: ModeState): ModeState {
  return s.winner !== null ? s : { ...s, visit: s.visit.slice(0, -1) };
}

function nextAlive(players: ModePlayer[], from: number, gameType: ModeType): number {
  const n = players.length;
  if (gameType !== 'killer') return (from + 1) % n;
  for (let k = 1; k <= n; k++) { const i = (from + k) % n; if (players[i].lives > 0) return i; }
  return from;
}

/** Valide la volée courante : applique les fléchettes, calcule la victoire, change de tour. */
export function commitVisit(s: ModeState): ModeState {
  if (s.winner !== null || s.visit.length === 0) return s;
  const { gameType } = s.config;
  const idx = s.turn;
  const darts = s.visit;
  let players = s.players.map((p) => ({ ...p, marks: { ...p.marks } }));
  players[idx].dartsThrown += darts.length;
  let winner: number | null = null;
  let event: string | null = null;
  let round = s.round;

  if (gameType === 'cricket') {
    players = applyCricketDarts(players, idx, darts, s.config.cutThroat);
    if (cricketHasWon(players, idx, s.config.cutThroat)) winner = idx;
  } else if (gameType === 'atc') {
    players = applyAtcDarts(players, idx, darts, s.config.advanceByMarks);
    if (atcHasWon(players, idx)) winner = idx;
  } else if (gameType === 'killer') {
    players = applyKillerDarts(players, idx, darts, true);
    winner = killerWinnerIndex(players);
  } else if (gameType === 'shanghai') {
    const target = s.round;
    if (isShanghai(darts, target)) { event = 'shanghai'; winner = idx; }
    else players[idx].score += shanghaiVisitScore(darts, target);
  } else if (gameType === 'halveit') {
    const t = HALVE_TARGETS[Math.min(s.round, HALVE_TARGETS.length - 1)];
    const sc = halveVisitScore(darts, t);
    if (sc > 0) players[idx].score += sc;
    else { players[idx].score = Math.floor(players[idx].score / 2); event = 'halved'; }
  }

  let turn = idx;
  if (winner === null) {
    turn = nextAlive(players, idx, gameType);
    // Shanghai / Halve : fin de tour quand on revient au 1er joueur encore en lice.
    if ((gameType === 'shanghai' || gameType === 'halveit') && turn <= idx) {
      round = s.round + 1;
      const last = gameType === 'shanghai' ? s.config.shanghaiRounds : HALVE_TARGETS.length;
      const roundsDone = gameType === 'shanghai' ? round > last : round >= last;
      if (roundsDone) winner = leaderIndex(players);
    }
  }
  return { config: s.config, players, turn, round, visit: [], winner, event };
}

/** Cible affichée pour le tour courant (shanghai/halve). */
export function currentRoundLabel(s: ModeState): string {
  if (s.config.gameType === 'shanghai') return `Tour ${s.round} · cible ${s.round}`;
  if (s.config.gameType === 'halveit') return `Tour ${s.round + 1} · ${HALVE_TARGETS[Math.min(s.round, HALVE_TARGETS.length - 1)].label}`;
  return '';
}
