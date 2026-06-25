// ── Entraînements « calcul » (sans fléchettes) — mobile ───────────────────────
// Générateurs purs (parité avec web-app/src/game/calc.ts). Réutilise le solveur
// de checkout exporté par CheckoutPill.
import { solveCheckout } from '@/components/CheckoutPill';

export type CalcMode = 'checkout' | 'subtract' | 'firstdart' | 'visit' | 'bogey';

export interface CalcQuestion {
  prompt: string;
  big?: string;
  answer: string;
  options?: string[]; // présent → QCM ; absent → saisie numérique
  hint?: string;
}

export const CALC_MODES: { key: CalcMode; name: string; desc: string; icon: string }[] = [
  { key: 'checkout', name: 'Calcul de checkout', desc: 'Trouve la combinaison pour fermer le score affiché.', icon: '🎯' },
  { key: 'subtract', name: 'Soustraction de volée', desc: 'Le reste après une volée (score − volée).', icon: '🧮' },
  { key: 'firstdart', name: '1re fléchette du finish', desc: 'La première fléchette d’un checkout.', icon: '➤' },
  { key: 'visit', name: 'Valeur d’une volée', desc: 'Additionne les 3 fléchettes affichées.', icon: '➕' },
  { key: 'bogey', name: 'Checkout possible ?', desc: 'Le score est-il fermable, ou un nombre piège ?', icon: '🚫' },
];

const rnd = (n: number) => Math.floor(Math.random() * n);
function shuffle<T>(a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }

const route = (n: number) => solveCheckout(n, 3, 'double');
const VALID: number[] = (() => { const a: number[] = []; for (let n = 2; n <= 170; n++) if (route(n)) a.push(n); return a; })();
const VALID_HIGH = VALID.filter((n) => n >= 61);
const routeOf = (n: number) => (route(n) || []).join('  ');
const firstDartOf = (n: number) => (route(n) || [])[0];
const BOGEY = [159, 162, 163, 165, 166, 168, 169, 171, 172, 173, 174, 175, 178, 179];

const SEGMENTS: { label: string; value: number }[] = (() => {
  const s: { label: string; value: number }[] = [{ label: '25', value: 25 }, { label: 'Bull', value: 50 }];
  for (let k = 1; k <= 20; k++) { s.push({ label: `${k}`, value: k }, { label: `D${k}`, value: 2 * k }, { label: `T${k}`, value: 3 * k }); }
  return s;
})();

export function makeCalcQuestion(mode: CalcMode): CalcQuestion {
  if (mode === 'checkout') {
    const t = VALID[rnd(VALID.length)];
    const correct = routeOf(t);
    const set = new Set<string>(); let g = 0;
    while (set.size < 3 && g++ < 80) { const s = routeOf(VALID[rnd(VALID.length)]); if (s && s !== correct && !set.has(s)) set.add(s); }
    return { prompt: 'Comment fermer', big: String(t), answer: correct, options: shuffle([correct, ...set]), hint: `Sortie au double — ferme exactement ${t}.` };
  }
  if (mode === 'subtract') {
    const start = 60 + rnd(442);
    const cap = Math.min(180, start);
    const visit = cap <= 2 ? cap : 2 + rnd(cap - 1);
    return { prompt: `${start} − ${visit}`, answer: String(start - visit), hint: 'Combien te reste-t-il ?' };
  }
  if (mode === 'firstdart') {
    const t = VALID_HIGH[rnd(VALID_HIGH.length)];
    const correct = firstDartOf(t);
    const set = new Set<string>(); let g = 0;
    while (set.size < 3 && g++ < 80) { const f = firstDartOf(VALID_HIGH[rnd(VALID_HIGH.length)]); if (f && f !== correct && !set.has(f)) set.add(f); }
    return { prompt: 'Première fléchette pour', big: String(t), answer: correct, options: shuffle([correct, ...set]), hint: `Route type : ${routeOf(t)}` };
  }
  if (mode === 'visit') {
    const darts = [SEGMENTS[rnd(SEGMENTS.length)], SEGMENTS[rnd(SEGMENTS.length)], SEGMENTS[rnd(SEGMENTS.length)]];
    const sum = darts.reduce((a, d) => a + d.value, 0);
    return { prompt: darts.map((d) => d.label).join('   ·   '), answer: String(sum), hint: 'Total des 3 fléchettes ?' };
  }
  const t = Math.random() < 0.5 ? VALID[rnd(VALID.length)] : BOGEY[rnd(BOGEY.length)];
  return { prompt: 'Fermable en 3 fléchettes ?', big: String(t), answer: route(t) ? 'Oui' : 'Non', options: ['Oui', 'Non'], hint: 'Sortie au double, en une seule volée.' };
}
