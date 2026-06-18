// ─── Moteur de bots web ───────────────────────────────────────────────────────
// Portage de hooks/botEngine.ts : 8 niveaux nommés d'après la moyenne 3-fléchettes
// visée. Chaque fléchette passe par le même modèle de précision (scoring ET
// finition), donc les taux de double/checkout émergent réalistiquement.
import { ATC_SEQUENCE, CRICKET_TARGETS, HALVE_TARGETS, type Dart, type Mod, type ModePlayer } from './modes';

interface Skill { hit: number; double: number; triple: number; bull: number; bullOuter: number; miss: number }
export type BotLevel = 'avg30' | 'avg40' | 'avg50' | 'avg60' | 'avg70' | 'avg80' | 'avg90' | 'avg100';

const TIERS: Record<BotLevel, Skill> = {
  avg30: { hit: 0.50, double: 0.10, triple: 0.155, bull: 0.04, bullOuter: 0.15, miss: 0.13 },
  avg40: { hit: 0.60, double: 0.13, triple: 0.20, bull: 0.06, bullOuter: 0.19, miss: 0.09 },
  avg50: { hit: 0.67, double: 0.16, triple: 0.27, bull: 0.08, bullOuter: 0.22, miss: 0.065 },
  avg60: { hit: 0.74, double: 0.20, triple: 0.32, bull: 0.11, bullOuter: 0.25, miss: 0.045 },
  avg70: { hit: 0.81, double: 0.24, triple: 0.38, bull: 0.14, bullOuter: 0.28, miss: 0.03 },
  avg80: { hit: 0.86, double: 0.29, triple: 0.44, bull: 0.18, bullOuter: 0.31, miss: 0.02 },
  avg90: { hit: 0.90, double: 0.35, triple: 0.51, bull: 0.23, bullOuter: 0.33, miss: 0.012 },
  avg100: { hit: 0.94, double: 0.42, triple: 0.57, bull: 0.28, bullOuter: 0.35, miss: 0.006 },
};
export const BOT_ORDER: BotLevel[] = ['avg30', 'avg40', 'avg50', 'avg60', 'avg70', 'avg80', 'avg90', 'avg100'];
export const BOT_LABELS: Record<BotLevel, string> = {
  avg30: 'Touriste · 30', avg40: 'Novice · 40', avg50: 'Habitué · 50', avg60: 'Confirmé · 60',
  avg70: 'Costaud · 70', avg80: 'Expert · 80', avg90: 'Élite · 90', avg100: 'Pro · 100',
};
export function botName(level: string): string { return `Bot · ${BOT_LABELS[(level as BotLevel)] ?? level}`; }
function skill(level: string): Skill { return TIERS[(level as BotLevel)] ?? TIERS.avg50; }

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
function neighbour(segment: number): number {
  const i = BOARD_ORDER.indexOf(segment);
  if (i < 0) return segment;
  const dir = Math.random() < 0.5 ? -1 : 1;
  return BOARD_ORDER[(i + dir + 20) % 20];
}
const miss = (): Dart => ({ points: 0, modifier: 'S', segment: 0 });

function aimDart(segment: number, want: Mod, level: string): Dart {
  const s = skill(level);
  if (segment === 25) {
    const r = Math.random();
    if (r < s.bull) return { segment: 25, points: 50, modifier: 'D' };
    if (r < s.bull + s.bullOuter) return { segment: 25, points: 25, modifier: 'S' };
    if (r < s.bull + s.bullOuter + 0.4) return miss();
    const seg = [1, 5, 20, 7, 19][Math.floor(Math.random() * 5)];
    return { segment: seg, points: seg, modifier: 'S' };
  }
  if (want === 'D') {
    const r = Math.random();
    if (r < s.double) return { segment, modifier: 'D', points: segment * 2 };
    if (r < s.double + 0.42) return miss();
    if (r < s.double + 0.54) { const seg = neighbour(segment); return { segment: seg, modifier: 'S', points: seg }; }
    return { segment, modifier: 'S', points: segment };
  }
  if (Math.random() < s.miss) return miss();
  const inRegion = Math.random() < s.hit;
  const seg = inRegion ? segment : neighbour(segment);
  let mod: Mod = 'S';
  if (want === 'T') { if (inRegion && Math.random() < s.triple) mod = 'T'; else if (Math.random() < 0.25) mod = 'D'; }
  const mult = mod === 'T' ? 3 : mod === 'D' ? 2 : 1;
  return { segment: seg, modifier: mod, points: seg * mult };
}

// ── X01 ──
const BOGEY = new Set([169, 168, 166, 165, 163, 162, 159]);
const NICE_LEAVES = [40, 32, 24, 20, 16, 8, 36, 12, 4, 2];
function x01Aim(rem: number, doubleOut: boolean): { segment: number; want: Mod } {
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
    for (const leave of [40, 32, 50]) { const need = rem - leave; if (need > 0 && need % 3 === 0 && need / 3 >= 1 && need / 3 <= 20) return { segment: need / 3, want: 'T' }; }
    return { segment: 20, want: 'T' };
  }
  if (rem <= 60) { for (const leave of NICE_LEAVES) { const s = rem - leave; if (s >= 1 && s <= 20) return { segment: s, want: 'S' }; } return { segment: 1, want: 'S' }; }
  return { segment: 20, want: 'T' };
}
export function x01BotDarts(remaining: number, level: string, doubleOut: boolean): Dart[] {
  let rem = remaining; const darts: Dart[] = [];
  for (let i = 0; i < 3; i++) {
    const aim = x01Aim(rem, doubleOut);
    const d = aimDart(aim.segment, aim.want, level);
    darts.push(d);
    const left = rem - d.points;
    if (left <= 0 || (doubleOut && left === 1)) break;
    rem = left;
  }
  return darts;
}
/** Total de la volée X01 : exactement `remaining` sur finition propre, 0 sur bust. */
export function x01BotVisit(remaining: number, level: string, doubleOut: boolean): number {
  let rem = remaining;
  for (const d of x01BotDarts(remaining, level, doubleOut)) {
    const left = rem - d.points;
    if (left === 0) return !doubleOut || d.modifier === 'D' ? remaining : 0;
    if (left < 0 || (doubleOut && left === 1)) return 0;
    rem = left;
  }
  return remaining - rem;
}

// ── Modes ──
export function cricketBotDarts(players: ModePlayer[], idx: number, level: string): Dart[] {
  const me = players[idx];
  if (!me) return [];
  const isDead = (t: number) => players.every((p) => (p.marks[t] ?? 0) >= 3);
  const open = CRICKET_TARGETS.filter((t) => (me.marks[t] ?? 0) < 3 && !isDead(t));
  const live = CRICKET_TARGETS.filter((t) => !isDead(t));
  const target = open[0] ?? live[0] ?? 20;
  return [aimDart(target, 'T', level), aimDart(target, 'T', level), aimDart(target, 'T', level)];
}
export function atcBotDarts(players: ModePlayer[], idx: number, level: string, advanceByMarks: boolean): Dart[] {
  const me = players[idx];
  if (!me) return [];
  let hits = me.hits; const darts: Dart[] = [];
  for (let i = 0; i < 3; i++) {
    if (hits >= ATC_SEQUENCE.length) break;
    const target = ATC_SEQUENCE[hits];
    const d = aimDart(target, 'S', level);
    darts.push(d);
    if (d.segment === target) { const step = advanceByMarks ? (d.modifier === 'T' ? 3 : d.modifier === 'D' ? 2 : 1) : 1; hits = Math.min(ATC_SEQUENCE.length, hits + step); }
  }
  return darts;
}
export function killerBotDarts(players: ModePlayer[], idx: number, level: string): Dart[] {
  const me = players[idx];
  if (!me || me.lives <= 0) return [];
  if (!me.isKiller) return [aimDart(me.number, 'D', level), aimDart(me.number, 'D', level), aimDart(me.number, 'D', level)];
  const victims = players.filter((p, i) => i !== idx && p.lives > 0).sort((a, b) => a.lives - b.lives);
  if (victims.length === 0) return [miss(), miss(), miss()];
  const target = victims[0].number;
  return [aimDart(target, 'S', level), aimDart(target, 'S', level), aimDart(target, 'S', level)];
}
export function shanghaiBotDarts(round: number, level: string): Dart[] {
  return [aimDart(round, 'T', level), aimDart(round, 'T', level), aimDart(round, 'T', level)];
}
export function halveBotDarts(round: number, level: string): Dart[] {
  const t = HALVE_TARGETS[Math.min(round, HALVE_TARGETS.length - 1)];
  const one = (): Dart => {
    switch (t.kind) {
      case 'number': return aimDart(t.n, 'T', level);
      case 'double': return aimDart(20, 'D', level);
      case 'triple': return aimDart(20, 'T', level);
      case 'bull': return aimDart(25, 'D', level);
    }
  };
  return [one(), one(), one()];
}
