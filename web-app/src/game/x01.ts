// ── Moteur X01 (web, local) ───────────────────────────────────────────────────
// Saisie par volée (total 0-180), comme le numpad mobile. Le serveur n'est pas
// impliqué : partie 100 % locale (idéal pour un PC qui sert de tableau au bar).

export type FinishMode = 'simple' | 'double' | 'master';
export interface X01Config {
  startScore: number; // 301 | 501 | 701 | perso
  legsToWin: number;
  finishMode: FinishMode; // simple / double / master out
  setsToWin?: number; // best-of-sets (1 = pas de sets, comportement par legs)
}
export interface X01Player {
  name: string;
  remaining: number;
  legs: number;
  sets: number;
  darts: number;
  points: number; // points marqués (pour la moyenne)
}
export interface X01State {
  config: X01Config;
  players: X01Player[];
  turn: number;
  starter: number;
  winner: number | null;
  event: 'score' | '180' | 'bust' | 'leg' | 'set' | 'win' | null;
}

export function initX01(names: string[], config: X01Config): X01State {
  return {
    config,
    players: names.map((name) => ({ name, remaining: config.startScore, legs: 0, sets: 0, darts: 0, points: 0 })),
    turn: 0,
    starter: 0,
    winner: null,
    event: null,
  };
}

/** Applique une volée (total 0-180) au joueur actif. Retourne un nouvel état. */
export function addVisit(state: X01State, totalRaw: number): X01State {
  if (state.winner !== null) return state;
  const total = Math.max(0, Math.min(180, Math.floor(totalRaw || 0)));
  const n = state.players.length;
  const i = state.turn;
  const p = state.players[i];
  const projected = p.remaining - total;

  const doubleOut = state.config.finishMode !== 'simple';
  let bust = false;
  let checkout = false;
  if (projected < 0) bust = true;
  else if (projected === 1 && doubleOut) bust = true;
  else if (projected === 0) checkout = true;

  const players = state.players.map((pl) => ({ ...pl }));
  const me = players[i];
  me.darts += 3; // saisie par volée → 3 fléchettes comptées
  if (!bust) { me.remaining = projected; me.points += total; }

  let event: X01State['event'] = bust ? 'bust' : total === 180 ? '180' : 'score';
  let winner: number | null = null;
  let turn = (i + 1) % n;
  let starter = state.starter;

  if (checkout) {
    me.legs += 1;
    event = 'leg';
    const setsToWin = state.config.setsToWin ?? 1;
    if (me.legs >= state.config.legsToWin) {
      // Set remporté.
      me.sets += 1;
      if (me.sets >= setsToWin) {
        winner = i;
        event = 'win';
      } else {
        // Nouveau set : legs remis à zéro pour tout le monde, le départ tourne.
        event = 'set';
        players.forEach((pl) => { pl.remaining = state.config.startScore; pl.legs = 0; });
        starter = (state.starter + 1) % n;
        turn = starter;
      }
    } else {
      // Nouveau leg : tout le monde repart, le départ tourne.
      players.forEach((pl) => { pl.remaining = state.config.startScore; });
      starter = (state.starter + 1) % n;
      turn = starter;
    }
  }

  return { ...state, players, turn, starter, winner, event };
}

export function avg3(p: X01Player): number {
  return p.darts > 0 ? Math.round(((p.points / p.darts) * 3) * 10) / 10 : 0;
}

// ── Suggestion de checkout (double-out / simple) ──────────────────────────────
const DBL: Record<number, string> = {};
for (let k = 1; k <= 20; k++) DBL[k * 2] = `D${k}`;
DBL[50] = 'BULL';
const SETUP: Record<number, string> = {};
for (let k = 1; k <= 20; k++) SETUP[k] = `${k}`; // single
SETUP[25] = '25';
for (let k = 1; k <= 20; k++) if (!(k * 3 in SETUP)) SETUP[k * 3] = `T${k}`;
for (let k = 1; k <= 20; k++) if (!(k * 2 in SETUP)) SETUP[k * 2] = `D${k}`;
if (!(50 in SETUP)) SETUP[50] = 'BULL';

// Doubles préférés en tête (pairs hauts → bas, puis bull, puis impairs).
const FINISH_VALUES: number[] = (() => {
  const evens: number[] = [], odds: number[] = [];
  for (let k = 20; k >= 1; k--) ((k % 2 === 0) ? evens : odds).push(k * 2);
  return [...evens, 50, ...odds];
})();
const FIRST_DARTS: number[] = (() => {
  const t: number[] = [];
  for (let k = 20; k >= 1; k--) t.push(k * 3);
  t.push(50, 25);
  for (let k = 20; k >= 1; k--) t.push(k);
  return t;
})();

// Triples (pour le master-out) : valeur → label.
const TRIPLE: Record<number, string> = {};
for (let k = 1; k <= 20; k++) TRIPLE[k * 3] = `T${k}`;

export function checkout(remaining: number, finishMode: FinishMode, favorites?: number[]): string[] | null {
  // Simple-out : n'importe quelle fléchette finit.
  if (finishMode === 'simple') {
    if (remaining < 1 || remaining > 180) return null;
    if (SETUP[remaining]) return [SETUP[remaining]];
    for (const s1 of FIRST_DARTS) {
      const r1 = remaining - s1;
      if (r1 >= 1 && SETUP[r1]) return [SETUP[s1] ?? `${s1}`, SETUP[r1]];
    }
    return null;
  }

  // Double / master : la dernière fléchette doit être un double (ou un triple en master) / bull.
  if (remaining < 2 || remaining > 170) return null;
  const finMap: Record<number, string> = { ...DBL };
  let finVals = [...FINISH_VALUES];
  if (finishMode === 'master') {
    for (let k = 1; k <= 20; k++) { const v = k * 3; if (!(v in finMap)) finMap[v] = TRIPLE[v]; }
    const tripleVals: number[] = [];
    for (let k = 20; k >= 1; k--) { const v = k * 3; if (!FINISH_VALUES.includes(v)) tripleVals.push(v); }
    finVals = [...FINISH_VALUES, ...tripleVals]; // doubles/bull d'abord, puis triples
  }
  // Biais vers les doubles préférés, sans rallonger.
  const favVals = (favorites ?? []).map((s) => (s === 25 ? 50 : s * 2));
  const finishOrder = favVals.length
    ? [...finVals.filter((v) => favVals.includes(v)), ...finVals.filter((v) => !favVals.includes(v))]
    : finVals;
  // 1 fléchette
  if (finMap[remaining]) return [finMap[remaining]];
  // 2 fléchettes
  for (const f of finishOrder) {
    const r1 = remaining - f;
    if (r1 >= 1 && SETUP[r1]) return [SETUP[r1], finMap[f]];
  }
  // 3 fléchettes
  for (const f of finishOrder) {
    for (const s1 of FIRST_DARTS) {
      const r2 = remaining - f - s1;
      if (r2 >= 1 && SETUP[r2]) return [SETUP[s1] ?? `${s1}`, SETUP[r2], finMap[f]];
    }
  }
  return null;
}
