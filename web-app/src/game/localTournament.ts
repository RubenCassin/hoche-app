// Tournoi local hors-ligne : bracket à élimination directe avec byes (même
// logique de seed que le tournoi online de backend/tournament.js). Les joueurs
// sont des index dans un tableau de noms. Pur, sans React.
export interface LMatch { id: number; round: number; slot: number; p1: number | null; p2: number | null; winner: number | null }

function nextPow2(n: number) { let p = 1; while (p < n) p *= 2; return Math.max(2, p); }

function propagate(matches: LMatch[], m: LMatch, winnerIdx: number) {
  m.winner = winnerIdx;
  const parentSlot = Math.floor(m.slot / 2);
  const parent = matches.find((x) => x.round === m.round + 1 && x.slot === parentSlot);
  if (!parent) return;
  if (m.slot % 2 === 0) parent.p1 = winnerIdx; else parent.p2 = winnerIdx;
  // Si le parent devient un bye (l'autre demi ne viendra jamais), on propage.
}

export function createBracket(n: number): LMatch[] {
  const size = nextPow2(n);
  const rounds = Math.log2(size);
  const matches: LMatch[] = [];
  let id = 0;
  for (let r = 0; r < rounds; r++) {
    const count = size / Math.pow(2, r + 1);
    for (let s = 0; s < count; s++) matches.push({ id: id++, round: r, slot: s, p1: null, p2: null, winner: null });
  }
  const round0 = matches.filter((m) => m.round === 0).sort((a, b) => a.slot - b.slot);
  const matches0 = size / 2;
  for (let i = 0; i < n; i++) {
    if (i < matches0) round0[i].p1 = i;
    else round0[i - matches0].p2 = i;
  }
  // Byes : un seul joueur dans le match → il passe au tour suivant.
  for (const m of round0) if (m.p1 != null && m.p2 == null) propagate(matches, m, m.p1);
  return matches;
}

export function advance(matches: LMatch[], matchId: number, winnerIdx: number): LMatch[] {
  const next = matches.map((m) => ({ ...m }));
  const m = next.find((x) => x.id === matchId);
  if (!m || m.winner != null) return next;
  propagate(next, m, winnerIdx);
  return next;
}

export function bracketChampion(matches: LMatch[]): number | null {
  const last = Math.max(...matches.map((m) => m.round));
  const final = matches.find((m) => m.round === last && m.slot === 0);
  return final ? final.winner : null;
}
export const roundCount = (matches: LMatch[]) => (matches.length ? Math.max(...matches.map((m) => m.round)) + 1 : 0);
export function roundLabel(round: number, total: number) {
  const fromEnd = total - 1 - round;
  if (fromEnd === 0) return 'Finale';
  if (fromEnd === 1) return 'Demi-finales';
  if (fromEnd === 2) return 'Quarts';
  return `Tour ${round + 1}`;
}
