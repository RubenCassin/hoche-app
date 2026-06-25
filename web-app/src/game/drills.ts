// ── Drills d'entraînement (porté du mobile, logique identique) ────────────────
// Chaque drill est une machine à états par fléchette. L'écran de run alimente
// les fléchettes une à une et lit prompt/progress/score ; à `done` on enregistre.

export interface DartEntry { points: number; modifier: 'S' | 'D' | 'T'; segment: number; }

export interface DrillState {
  done: boolean;
  round: number;
  dartsThisRound: number;
  [k: string]: any;
}

export type DrillCategory = 'score' | 'doubles' | 'checkout' | 'parcours';

export interface DrillDef {
  key: string;
  name: string;
  desc: string;
  unit: string;
  rounds: number;
  category: DrillCategory;
  higherIsBetter?: boolean;
  init: () => DrillState;
  applyDart: (s: DrillState, d: DartEntry) => DrillState;
  focus?: (s: DrillState) => number | null;
  prompt: (s: DrillState) => string;
  progress: (s: DrillState) => string;
  liveScore: (s: DrillState) => string;
  result: (s: DrillState) => number;
  resultNote?: (s: DrillState) => string;
}

export const CATEGORY_LABEL: Record<DrillCategory, string> = {
  score: 'Scoring',
  doubles: 'Doubles',
  checkout: 'Checkout',
  parcours: 'Parcours',
};

const CLOCK = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];

function doubleLabel(tv: number): string {
  return tv === 25 ? 'le Bull (50)' : `le Double ${tv}`;
}
function isDoubleHit(d: DartEntry, tv: number): boolean {
  if (tv === 25) return d.segment === 25 && d.points === 50;
  return d.segment === tv && d.modifier === 'D';
}
const isValidFinish = (d: DartEntry) => d.modifier === 'D' || (d.segment === 25 && d.points === 50);

function makeScoreDrill(target: number): DrillDef {
  const ROUNDS = 10;
  return {
    key: `score${target}`,
    name: `Score · ${target}`,
    desc: `10 volées sur le ${target}. Le triple vaut ${target * 3}. Maximise ton total.`,
    unit: 'pts', rounds: ROUNDS, category: 'score',
    init: () => ({ done: false, round: 0, dartsThisRound: 0, total: 0, darts: 0 }),
    applyDart: (s, d) => {
      const ns: DrillState = { ...s };
      if (d.segment === target) ns.total += d.points;
      ns.darts += 1; ns.dartsThisRound += 1;
      if (ns.dartsThisRound >= 3) { ns.round += 1; ns.dartsThisRound = 0; if (ns.round >= ROUNDS) ns.done = true; }
      return ns;
    },
    focus: () => target,
    prompt: () => `Vise le ${target} (triple = ${target * 3})`,
    progress: (s) => `Volée ${Math.min(s.round + 1, ROUNDS)}/${ROUNDS}`,
    liveScore: (s) => `${s.total}`,
    result: (s) => s.total,
    resultNote: (s) => { const darts = s.darts || ROUNDS * 3; const avg = Math.round(((s.total / darts) * 3) * 10) / 10; return `Moyenne 3 fléchettes : ${avg}`; },
  };
}

const treble20: DrillDef = {
  key: 'treble20', name: 'Triples · 20', desc: '30 fléchettes sur le 20. Compte tes triples (T20).',
  unit: 'triples', rounds: 10, category: 'score',
  init: () => ({ done: false, round: 0, dartsThisRound: 0, hits: 0 }),
  applyDart: (s, d) => { const ns: DrillState = { ...s }; if (d.segment === 20 && d.modifier === 'T') ns.hits += 1; ns.dartsThisRound += 1; if (ns.dartsThisRound >= 3) { ns.round += 1; ns.dartsThisRound = 0; if (ns.round >= 10) ns.done = true; } return ns; },
  focus: () => 20, prompt: () => 'Vise le Triple 20', progress: (s) => `Volée ${Math.min(s.round + 1, 10)}/10`,
  liveScore: (s) => `${s.hits}`, result: (s) => s.hits, resultNote: (s) => `${s.hits} triples sur 30 fléchettes`,
};

const bullseye: DrillDef = {
  key: 'bull', name: 'Bullseye', desc: '10 volées au centre. Bull simple = 25, bull intérieur = 50.',
  unit: 'pts', rounds: 10, category: 'score',
  init: () => ({ done: false, round: 0, dartsThisRound: 0, total: 0, bulls: 0 }),
  applyDart: (s, d) => { const ns: DrillState = { ...s }; if (d.segment === 25) { ns.total += d.points; ns.bulls += 1; } ns.dartsThisRound += 1; if (ns.dartsThisRound >= 3) { ns.round += 1; ns.dartsThisRound = 0; if (ns.round >= 10) ns.done = true; } return ns; },
  focus: () => 25, prompt: () => 'Vise le Bull (50)', progress: (s) => `Volée ${Math.min(s.round + 1, 10)}/10`,
  liveScore: (s) => `${s.total}`, result: (s) => s.total, resultNote: (s) => `${s.bulls} bulls touchés sur 30`,
};

const bob27: DrillDef = {
  key: 'bob27', name: "Bob's 27", desc: 'Les doubles 1→Bull. +2× à chaque touche, −2× si tu rates les 3. Pars de 27 pts.',
  unit: 'pts', rounds: 21, category: 'doubles',
  init: () => ({ done: false, round: 0, dartsThisRound: 0, hits: 0, score: 27 }),
  applyDart: (s, d) => {
    const ns: DrillState = { ...s }; const tv = CLOCK[ns.round]; if (isDoubleHit(d, tv)) ns.hits += 1; ns.dartsThisRound += 1;
    if (ns.dartsThisRound >= 3) { ns.score += ns.hits > 0 ? ns.hits * 2 * tv : -(2 * tv); ns.round += 1; ns.dartsThisRound = 0; ns.hits = 0; if (ns.round >= CLOCK.length || ns.score < 0) ns.done = true; }
    return ns;
  },
  focus: (s) => (s.done ? null : CLOCK[s.round]), prompt: (s) => (s.done ? '—' : `Vise ${doubleLabel(CLOCK[s.round])}`),
  progress: (s) => `Manche ${Math.min(s.round + 1, 21)}/21`, liveScore: (s) => `${s.score}`, result: (s) => s.score,
};

const doublesTour: DrillDef = {
  key: 'doubles', name: 'Tour des doubles', desc: '3 fléchettes sur chaque double, de D1 au Bull. Compte tes doubles touchés.',
  unit: 'doubles', rounds: 21, category: 'doubles',
  init: () => ({ done: false, round: 0, dartsThisRound: 0, hits: 0 }),
  applyDart: (s, d) => { const ns: DrillState = { ...s }; const tv = CLOCK[ns.round]; if (isDoubleHit(d, tv)) ns.hits += 1; ns.dartsThisRound += 1; if (ns.dartsThisRound >= 3) { ns.round += 1; ns.dartsThisRound = 0; if (ns.round >= CLOCK.length) ns.done = true; } return ns; },
  focus: (s) => (s.done ? null : CLOCK[s.round]), prompt: (s) => (s.done ? '—' : `Vise ${doubleLabel(CLOCK[s.round])}`),
  progress: (s) => `Manche ${Math.min(s.round + 1, 21)}/21`, liveScore: (s) => `${s.hits}`, result: (s) => s.hits,
  resultNote: (s) => `${s.hits} doubles sur 21 cibles`,
};

const CHECKOUTS = [40, 32, 36, 24, 50, 60, 61, 64, 72, 81, 90, 96, 100, 110, 120, 121, 130, 141, 150, 160, 161, 167, 170];
const CHECKOUTS_HIGH = [98, 101, 104, 107, 110, 116, 120, 121, 130, 141, 150, 160, 161, 164, 167, 170];

function makeCheckoutDrill(key: string, name: string, desc: string, list: number[], opts?: { sequential?: boolean }): DrillDef {
  const ROUNDS = opts?.sequential ? list.length : 10;
  const pick = (round: number) => (opts?.sequential ? list[round] : list[Math.floor(Math.random() * list.length)]);
  return {
    key, name, desc, unit: 'checkouts', rounds: ROUNDS, category: 'checkout',
    init: () => { const t = pick(0); return { done: false, round: 0, dartsThisRound: 0, hits: 0, target: t, remaining: t }; },
    applyDart: (s, d) => {
      const ns: DrillState = { ...s }; ns.remaining -= d.points; ns.dartsThisRound += 1; let over = false, ok = false;
      if (ns.remaining === 0) { ok = isValidFinish(d); over = true; } else if (ns.remaining < 0 || ns.remaining === 1) over = true; else if (ns.dartsThisRound >= 3) over = true;
      if (over) { if (ok) ns.hits += 1; ns.round += 1; ns.dartsThisRound = 0; if (ns.round >= ROUNDS) ns.done = true; else { ns.target = pick(ns.round); ns.remaining = ns.target; } }
      return ns;
    },
    prompt: (s) => (s.done ? '—' : s.remaining === s.target ? `Ferme ${s.target}` : `Reste ${s.remaining}`),
    progress: (s) => `Checkout ${Math.min(s.round + 1, ROUNDS)}/${ROUNDS}`, liveScore: (s) => `${s.hits}`,
    result: (s) => s.hits, resultNote: (s) => `${s.hits} / ${ROUNDS} fermetures réussies`,
  };
}

const CATCH40 = Array.from({ length: 40 }, (_, i) => 61 + i);

const drill121: DrillDef = {
  key: 'drill121', name: 'Le 121', desc: 'Ferme 121 en 9 fléchettes max. Réussi → 122, raté → un de moins. 10 manches pour grimper le plus haut.',
  unit: 'niveau', rounds: 10, category: 'checkout',
  init: () => ({ done: false, round: 0, dartsThisRound: 0, target: 121, remaining: 121, dartsUsed: 0, best: 0 }),
  applyDart: (s, d) => {
    const ns: DrillState = { ...s }; ns.dartsUsed += 1; const left = ns.remaining - d.points; let success = false;
    if (left === 0 && isValidFinish(d)) success = true; else if (left <= 1) ns.remaining = ns.target; else ns.remaining = left;
    const over = success || ns.dartsUsed >= 9;
    if (over) { if (success) { ns.best = Math.max(ns.best, ns.target); ns.target += 1; } else ns.target = Math.max(61, ns.target - 1); ns.round += 1; ns.dartsUsed = 0; ns.remaining = ns.target; ns.dartsThisRound = 0; if (ns.round >= 10) ns.done = true; } else ns.dartsThisRound = ns.dartsUsed % 3;
    return ns;
  },
  prompt: (s) => (s.done ? '—' : `Reste ${s.remaining} · fléchette ${s.dartsUsed + 1}/9`),
  progress: (s) => `Manche ${Math.min(s.round + 1, 10)}/10`, liveScore: (s) => `${s.target}`, result: (s) => s.best,
  resultNote: (s) => (s.best > 0 ? `Plus haute fermeture : ${s.best}` : 'Aucune fermeture — le 121 se mérite'),
};

const highscore: DrillDef = {
  key: 'highscore', name: 'Highscore', desc: '10 volées, tout le plateau compte. Empile un maximum de points.',
  unit: 'pts', rounds: 10, category: 'score',
  init: () => ({ done: false, round: 0, dartsThisRound: 0, total: 0, visitTotal: 0, tons: 0 }),
  applyDart: (s, d) => { const ns: DrillState = { ...s }; ns.total += d.points; ns.visitTotal += d.points; ns.dartsThisRound += 1; if (ns.dartsThisRound >= 3) { if (ns.visitTotal >= 100) ns.tons += 1; ns.visitTotal = 0; ns.round += 1; ns.dartsThisRound = 0; if (ns.round >= 10) ns.done = true; } return ns; },
  prompt: () => 'Vise large — total maximum', progress: (s) => `Volée ${Math.min(s.round + 1, 10)}/10`,
  liveScore: (s) => `${s.total}`, result: (s) => s.total, resultNote: (s) => `Moyenne ${Math.round((s.total / 10) * 10) / 10} · ${s.tons} volée${s.tons > 1 ? 's' : ''} à 100+`,
};

function makeClockDrill(key: string, name: string, desc: string, doubles: boolean): DrillDef {
  return {
    key, name, desc, unit: 'fléchettes', rounds: 21, category: 'parcours', higherIsBetter: false,
    init: () => ({ done: false, round: 0, dartsThisRound: 0, cleared: 0, darts: 0 }),
    applyDart: (s, d) => { const ns: DrillState = { ...s }; const tv = CLOCK[ns.cleared]; const hit = doubles ? isDoubleHit(d, tv) : d.segment === tv; if (hit) ns.cleared += 1; ns.darts += 1; ns.dartsThisRound = ns.darts % 3; ns.round = ns.cleared; if (ns.cleared >= CLOCK.length) ns.done = true; return ns; },
    focus: (s) => (s.done ? null : CLOCK[s.cleared]),
    prompt: (s) => { if (s.done) return '—'; const tv = CLOCK[s.cleared]; return doubles ? `Vise ${doubleLabel(tv)}` : `Vise ${tv === 25 ? 'le Bull' : 'le ' + tv}`; },
    progress: (s) => `${s.cleared}/21 cibles`, liveScore: (s) => `${s.darts}`, result: (s) => s.darts, resultNote: (s) => `Parcours bouclé en ${s.darts} fléchettes`,
  };
}

const shanghaiDrill: DrillDef = {
  key: 'shanghai_practice', name: 'Shanghai', desc: 'Manches 1 à 7 : vise le numéro de la manche. Simple/double/triple comptent.',
  unit: 'pts', rounds: 7, category: 'parcours',
  init: () => ({ done: false, round: 0, dartsThisRound: 0, total: 0 }),
  applyDart: (s, d) => { const ns: DrillState = { ...s }; const tv = ns.round + 1; if (d.segment === tv) ns.total += tv * (d.modifier === 'T' ? 3 : d.modifier === 'D' ? 2 : 1); ns.dartsThisRound += 1; if (ns.dartsThisRound >= 3) { ns.round += 1; ns.dartsThisRound = 0; if (ns.round >= 7) ns.done = true; } return ns; },
  focus: (s) => (s.done ? null : s.round + 1), prompt: (s) => (s.done ? '—' : `Vise le ${s.round + 1}`),
  progress: (s) => `Manche ${Math.min(s.round + 1, 7)}/7`, liveScore: (s) => `${s.total}`, result: (s) => s.total,
};

export const DRILLS: DrillDef[] = [
  makeScoreDrill(20), makeScoreDrill(19), treble20, bullseye, highscore, bob27, doublesTour,
  makeCheckoutDrill('checkout', 'Checkout', '10 fermetures tirées au sort (40→170), sortie au double.', CHECKOUTS),
  makeCheckoutDrill('checkout_high', 'Gros checkouts', '10 grosses fermetures (98→170) — finitions de pro.', CHECKOUTS_HIGH),
  makeCheckoutDrill('catch40', 'Catch 40', 'Les 40 fermetures de 61 à 100, dans l’ordre.', CATCH40, { sequential: true }),
  drill121,
  makeClockDrill('clock', 'Tour de l’horloge', 'Touche 1→20 puis le Bull, dans l’ordre. Minimum de fléchettes.', false),
  makeClockDrill('clock_doubles', 'Horloge · doubles', 'Tous les doubles D1→Bull dans l’ordre.', true),
  shanghaiDrill,
];

export function getDrill(key: string): DrillDef | undefined {
  return DRILLS.find((d) => d.key === key);
}

// ── Drill perso : fermeture cible + nb de fléchettes/tentative (porté du mobile) ─
// 10 tentatives, on compte les fermetures réussies. Record propre à chaque combo.
export function customDrillKey(target: number, darts: number): string {
  return `custom_c${target}_d${darts}`;
}

export function makeCustomCheckoutDrill(target: number, dartsPerAttempt: number): DrillDef {
  const ROUNDS = 10;
  const t = Math.max(2, Math.min(501, Math.floor(target)));
  const dpa = Math.max(1, Math.min(9, Math.floor(dartsPerAttempt)));
  return {
    key: customDrillKey(t, dpa),
    name: `Perso · ${t} en ${dpa} fl.`,
    desc: `Ferme ${t} en ${dpa} fléchette${dpa > 1 ? 's' : ''} max (sortie au double). 10 tentatives.`,
    unit: 'checkouts', rounds: ROUNDS, category: 'checkout',
    init: () => ({ done: false, round: 0, dartsThisRound: 0, attemptDarts: 0, hits: 0, target: t, remaining: t }),
    applyDart: (s, d) => {
      const ns: DrillState = { ...s };
      ns.remaining -= d.points;
      ns.attemptDarts += 1;
      ns.dartsThisRound = ns.attemptDarts % 3;
      let over = false, ok = false;
      if (ns.remaining === 0) { ok = isValidFinish(d); over = true; }
      else if (ns.remaining < 0 || ns.remaining === 1) over = true;
      else if (ns.attemptDarts >= dpa) over = true;
      if (over) {
        if (ok) ns.hits += 1;
        ns.round += 1; ns.attemptDarts = 0; ns.dartsThisRound = 0; ns.remaining = t;
        if (ns.round >= ROUNDS) ns.done = true;
      }
      return ns;
    },
    prompt: (s) => (s.done ? '—' : s.remaining === t ? `Ferme ${t}` : `Reste ${s.remaining}`),
    progress: (s) => `Tentative ${Math.min(s.round + 1, ROUNDS)}/${ROUNDS}`,
    liveScore: (s) => `${s.hits}`,
    result: (s) => s.hits,
    resultNote: (s) => `${s.hits} / ${ROUNDS} fermetures (${t} en ${dpa} fl.)`,
  };
}
