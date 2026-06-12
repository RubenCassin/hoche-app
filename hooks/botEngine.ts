// ─── Bot AI engine ──────────────────────────────────────────────────────────
// Pure, framework-free opponent logic. The scoring screen reads the live game
// state and asks this module what a bot would throw on its turn.
//
//  • X01 bots return a *whole-visit total* (so the store's trusted-checkout path
//    handles double-out without us reasoning about finishing darts).
//  • Every other game returns up to 3 aimed darts; the engine's per-dart
//    handlers commit them and detect wins as usual.

import {
  ATC_SEQUENCE,
  CRICKET_TARGETS,
  HALVE_TARGETS,
  type BotDifficulty,
  type DartEntry,
  type CricketPlayerState,
  type AtcPlayerState,
  type KillerPlayerState,
} from './useGameStore';

// ─── Tunables per difficulty ──────────────────────────────────────────────────
// 8 tiers named after the 3-dart average they shoot for. Every dart (scoring AND
// finishing) goes through the same per-dart model, so checkout/doubles rates
// emerge realistically instead of being a coin flip on the whole remaining.
// `hit`     – chance a dart lands in the number region it aimed at
// `double`  – chance of nailing the double band when going for a double
// `triple`  – chance of nailing the triple band when going for a triple
// `bull`    – chance of an inner (50) when aiming bull; `bullOuter` for the 25 ring
// `miss`    – chance of missing the board entirely (scores 0)
interface Skill {
  hit: number;
  double: number;
  triple: number;
  bull: number;
  bullOuter: number;
  miss: number;
}

type BotTier = 'avg30' | 'avg40' | 'avg50' | 'avg60' | 'avg70' | 'avg80' | 'avg90' | 'avg100';

const TIERS: Record<BotTier, Skill> = {
  avg30: { hit: 0.50, double: 0.10, triple: 0.155, bull: 0.04, bullOuter: 0.15, miss: 0.13 },
  avg40: { hit: 0.60, double: 0.13, triple: 0.20, bull: 0.06, bullOuter: 0.19, miss: 0.09 },
  avg50: { hit: 0.67, double: 0.16, triple: 0.27, bull: 0.08, bullOuter: 0.22, miss: 0.065 },
  avg60: { hit: 0.74, double: 0.20, triple: 0.32, bull: 0.11, bullOuter: 0.25, miss: 0.045 },
  avg70: { hit: 0.81, double: 0.24, triple: 0.38, bull: 0.14, bullOuter: 0.28, miss: 0.03 },
  avg80: { hit: 0.86, double: 0.29, triple: 0.44, bull: 0.18, bullOuter: 0.31, miss: 0.02 },
  avg90: { hit: 0.90, double: 0.35, triple: 0.51, bull: 0.23, bullOuter: 0.33, miss: 0.012 },
  avg100: { hit: 0.94, double: 0.42, triple: 0.57, bull: 0.28, bullOuter: 0.35, miss: 0.006 },
};

// Historic keys map onto the closest new tier (persisted tournaments carry them).
const SKILL: Record<BotDifficulty, Skill> = {
  ...TIERS,
  easy: TIERS.avg30,
  medium: TIERS.avg50,
  hard: TIERS.avg80,
  pro: TIERS.avg100,
};

export const BOT_ORDER: BotDifficulty[] = [
  'avg30', 'avg40', 'avg50', 'avg60', 'avg70', 'avg80', 'avg90', 'avg100',
];

export const BOT_LABELS: Record<BotDifficulty, string> = {
  avg30: 'Touriste · 30',
  avg40: 'Novice · 40',
  avg50: 'Habitué · 50',
  avg60: 'Confirmé · 60',
  avg70: 'Costaud · 70',
  avg80: 'Expert · 80',
  avg90: 'Élite · 90',
  avg100: 'Pro · 100',
  // Legacy labels — only shown by saved rosters from before the 8-tier ladder.
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
  pro: 'Pro',
};

/** Display name for a bot opponent of a given tier (e.g. "Bot · Moyen"). */
export function botName(level: BotDifficulty): string {
  return `Bot · ${BOT_LABELS[level]}`;
}

// Clockwise dartboard order, used to scatter near-misses onto realistic neighbours.
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

function neighbour(segment: number): number {
  const i = BOARD_ORDER.indexOf(segment);
  if (i < 0) return segment;
  const dir = Math.random() < 0.5 ? -1 : 1;
  return BOARD_ORDER[(i + dir + 20) % 20];
}

const miss = (): DartEntry => ({ points: 0, modifier: 'S', segment: 0 });

/**
 * Throw one dart aiming at `segment` with the desired modifier, degraded by the
 * bot's skill. Misses scatter to a neighbouring number or off the board.
 */
function aimDart(segment: number, want: 'S' | 'D' | 'T', level: BotDifficulty): DartEntry {
  const s = SKILL[level];

  if (segment === 25) {
    const r = Math.random();
    if (r < s.bull) return { segment: 25, points: 50, modifier: 'D' }; // inner bull
    if (r < s.bull + s.bullOuter) return { segment: 25, points: 25, modifier: 'S' }; // outer ring
    if (r < s.bull + s.bullOuter + 0.4) return miss();
    // stray into a low single near the centre
    const seg = [1, 5, 20, 7, 19][Math.floor(Math.random() * 5)];
    return { segment: seg, points: seg, modifier: 'S' };
  }

  if (want === 'D') {
    // Doubles live on the board's edge: a missed double mostly drifts just
    // outside the wire (no score), sometimes inside the single, rarely sideways.
    const r = Math.random();
    if (r < s.double) return { segment, modifier: 'D', points: segment * 2 };
    if (r < s.double + 0.42) return miss(); // outside the wire
    if (r < s.double + 0.54) {
      const seg = neighbour(segment);
      return { segment: seg, modifier: 'S', points: seg };
    }
    return { segment, modifier: 'S', points: segment }; // inside single
  }

  if (Math.random() < s.miss) return miss();

  const inRegion = Math.random() < s.hit;
  const seg = inRegion ? segment : neighbour(segment);

  let mod: 'S' | 'D' | 'T' = 'S';
  if (want === 'T') {
    if (inRegion && Math.random() < s.triple) mod = 'T';
    else if (Math.random() < 0.25) mod = 'D';
  }
  const mult = mod === 'T' ? 3 : mod === 'D' ? 2 : 1;
  return { segment: seg, modifier: mod, points: seg * mult };
}

// ─── X01 ──────────────────────────────────────────────────────────────────────

// Numbers that cannot be finished in one visit under double-out (bogey numbers).
const BOGEY = new Set([169, 168, 166, 165, 163, 162, 159]);

// Doubles a real player is happy to sit on, best first (D20, D16, D12…).
const NICE_LEAVES = [40, 32, 24, 20, 16, 8, 36, 12, 4, 2];

/**
 * What the bot aims at for one dart, given what's left. Mirrors how club players
 * actually route finishes: treble to leave a clean double, single to set up
 * D20/D16, bull on 50.
 */
function x01Aim(rem: number, doubleOut: boolean): { segment: number; want: 'S' | 'D' | 'T' } {
  if (!doubleOut) {
    if (rem <= 20) return { segment: rem, want: 'S' };
    if (rem === 25 || rem === 50) return { segment: 25, want: 'D' };
    if (rem <= 40 && rem % 2 === 0) return { segment: rem / 2, want: 'D' };
    if (rem <= 60 && rem % 3 === 0) return { segment: rem / 3, want: 'T' };
    return { segment: 20, want: 'T' };
  }
  if (rem === 50) return { segment: 25, want: 'D' };
  if (rem <= 40 && rem % 2 === 0) return { segment: rem / 2, want: 'D' };
  if (rem > 60 && rem <= 170 && !BOGEY.has(rem)) {
    // Combo dart: the treble that leaves a clean double (or the bull).
    for (const leave of [40, 32, 50]) {
      const need = rem - leave;
      if (need > 0 && need % 3 === 0 && need / 3 >= 1 && need / 3 <= 20) {
        return { segment: need / 3, want: 'T' };
      }
    }
    return { segment: 20, want: 'T' };
  }
  if (rem <= 60) {
    // Odd number / awkward leave: single down to a comfortable double.
    for (const leave of NICE_LEAVES) {
      const s = rem - leave;
      if (s >= 1 && s <= 20) return { segment: s, want: 'S' };
    }
    return { segment: 1, want: 'S' };
  }
  return { segment: 20, want: 'T' }; // 171+ or bogey: keep scoring
}

/**
 * One X01 visit simulated dart by dart through the same accuracy model as every
 * other game. Returns the landed darts (stops after a finishing or busting
 * dart); the scoring screen feeds them through `addDart`, so the store judges
 * bust/checkout exactly as for a human at the grid.
 */
export function x01BotDarts(remaining: number, level: BotDifficulty, doubleOut: boolean): DartEntry[] {
  let rem = remaining;
  const darts: DartEntry[] = [];
  for (let i = 0; i < 3; i++) {
    const aim = x01Aim(rem, doubleOut);
    const d = aimDart(aim.segment, aim.want, level);
    darts.push(d);
    const left = rem - d.points;
    if (left <= 0 || (doubleOut && left === 1)) break; // finish or bust — visit over
    rem = left;
  }
  return darts;
}

/**
 * Whole-visit total for the same simulation (used by scripts/simBots.mjs).
 * Returns exactly `remaining` on a clean finish, 0 on a bust (visit voided).
 */
export function x01BotVisit(remaining: number, level: BotDifficulty, doubleOut: boolean): number {
  let rem = remaining;
  for (const d of x01BotDarts(remaining, level, doubleOut)) {
    const left = rem - d.points;
    if (left === 0) return !doubleOut || d.modifier === 'D' ? remaining : 0;
    if (left < 0 || (doubleOut && left === 1)) return 0;
    rem = left;
  }
  return remaining - rem;
}

// ─── Cricket ────────────────────────────────────────────────────────────────

/** Bot aims its best still-open target (highest value first), going for triples. */
export function cricketBotDarts(
  players: CricketPlayerState[],
  idx: number,
  level: BotDifficulty
): DartEntry[] {
  const me = players[idx];
  if (!me) return [];
  const isDead = (t: number) => players.every((p) => (p.marks[t] ?? 0) >= 3);
  const open = CRICKET_TARGETS.filter((t) => (me.marks[t] ?? 0) < 3 && !isDead(t));
  // Fall back to the highest-value live target (to pile on points) if all closed.
  const live = CRICKET_TARGETS.filter((t) => !isDead(t));
  const target = open[0] ?? live[0] ?? 20;
  return [aimDart(target, 'T', level), aimDart(target, 'T', level), aimDart(target, 'T', level)];
}

// ─── Around the Clock ─────────────────────────────────────────────────────────

/** Bot chases its current target; we predict advances locally to aim the next. */
export function atcBotDarts(
  players: AtcPlayerState[],
  idx: number,
  level: BotDifficulty,
  advanceByMarks: boolean
): DartEntry[] {
  const me = players[idx];
  if (!me) return [];
  let hits = me.hits;
  const darts: DartEntry[] = [];
  for (let i = 0; i < 3; i++) {
    if (hits >= ATC_SEQUENCE.length) break;
    const target = ATC_SEQUENCE[hits];
    const d = aimDart(target, 'S', level);
    darts.push(d);
    if (d.segment === target) {
      const step = advanceByMarks ? (d.modifier === 'T' ? 3 : d.modifier === 'D' ? 2 : 1) : 1;
      hits = Math.min(ATC_SEQUENCE.length, hits + step);
    }
  }
  return darts;
}

// ─── Killer ───────────────────────────────────────────────────────────────────

/**
 * Unarmed → go for the double of your own number. Armed → attack the most
 * vulnerable opponent (fewest lives left). One life is lost per landed dart.
 */
export function killerBotDarts(
  players: KillerPlayerState[],
  idx: number,
  level: BotDifficulty
): DartEntry[] {
  const me = players[idx];
  if (!me || me.lives <= 0) return [];

  if (!me.isKiller) {
    // Three cracks at arming (double of own number).
    return [
      aimDart(me.number, 'D', level),
      aimDart(me.number, 'D', level),
      aimDart(me.number, 'D', level),
    ];
  }

  const victims = players
    .filter((p, i) => i !== idx && p.lives > 0)
    .sort((a, b) => a.lives - b.lives);
  if (victims.length === 0) return [miss(), miss(), miss()];
  const target = victims[0].number;
  return [aimDart(target, 'S', level), aimDart(target, 'S', level), aimDart(target, 'S', level)];
}

// ─── Shanghai ───────────────────────────────────────────────────────────────

/** Bot hammers the round's target with triples (and occasionally lands a Shanghai). */
export function shanghaiBotDarts(round: number, level: BotDifficulty): DartEntry[] {
  return [aimDart(round, 'T', level), aimDart(round, 'T', level), aimDart(round, 'T', level)];
}

// ─── Halve-it ─────────────────────────────────────────────────────────────────

/** Bot goes hard at the round's target (high triple/double/bull) to avoid the halving. */
export function halveBotDarts(round: number, level: BotDifficulty): DartEntry[] {
  const t = HALVE_TARGETS[Math.min(round, HALVE_TARGETS.length - 1)];
  const one = (): DartEntry => {
    switch (t.kind) {
      case 'number':
        return aimDart(t.n, 'T', level);
      case 'double':
        return aimDart(20, 'D', level);
      case 'triple':
        return aimDart(20, 'T', level);
      case 'bull':
        return aimDart(25, 'D', level);
    }
  };
  return [one(), one(), one()];
}
