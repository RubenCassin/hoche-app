// ── Entraînements « calcul » (sans fléchettes) ────────────────────────────────
// Générateurs de questions purs. Chaque question est soit un QCM (options), soit
// une saisie numérique (pas d'options). Réutilisé par CalcTrainer (web).
import { checkout } from './x01';

export type CalcMode = 'checkout' | 'subtract' | 'firstdart' | 'visit' | 'bogey';

export interface CalcQuestion {
  prompt: string;       // texte principal
  big?: string;         // gros nombre mis en avant
  answer: string;       // réponse canonique (numérique en string pour la saisie)
  options?: string[];   // présent → QCM ; absent → saisie numérique
  hint?: string;
}

export const CALC_MODES: { key: CalcMode; name: string; desc: string; icon: string }[] = [
  { key: 'checkout', name: 'Calcul de checkout', desc: 'Trouve la combinaison pour fermer le score affiché.', icon: '🎯' },
  { key: 'subtract', name: 'Soustraction de volée', desc: 'Le reste après une volée (score − volée). Saisie.', icon: '🧮' },
  { key: 'firstdart', name: '1re fléchette du finish', desc: 'La première fléchette d’un checkout.', icon: '➤' },
  { key: 'visit', name: 'Valeur d’une volée', desc: 'Additionne les 3 fléchettes affichées. Saisie.', icon: '➕' },
  { key: 'bogey', name: 'Checkout possible ?', desc: 'Le score est-il fermable, ou un nombre piège ?', icon: '🚫' },
];

const rnd = (n: number) => Math.floor(Math.random() * n);
function shuffle<T>(a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }

const VALID: number[] = (() => { const a: number[] = []; for (let n = 2; n <= 170; n++) if (checkout(n, 'double')) a.push(n); return a; })();
const VALID_HIGH = VALID.filter((n) => n >= 61); // pour la 1re fléchette (vrai dart de scoring)
const routeOf = (n: number) => (checkout(n, 'double') || []).join('  ');
const BOGEY = [159, 162, 163, 165, 166, 168, 169, 171, 172, 173, 174, 175, 178, 179];
const firstDartOf = (n: number) => (checkout(n, 'double') || [])[0];

const SEGMENTS: { label: string; value: number }[] = (() => {
  const s: { label: string; value: number }[] = [{ label: '25', value: 25 }, { label: 'BULL', value: 50 }];
  for (let k = 1; k <= 20; k++) { s.push({ label: `${k}`, value: k }, { label: `D${k}`, value: 2 * k }, { label: `T${k}`, value: 3 * k }); }
  return s;
})();

export function makeCalcQuestion(mode: CalcMode): CalcQuestion {
  if (mode === 'checkout') {
    const t = VALID[rnd(VALID.length)];
    const correct = routeOf(t);
    const set = new Set<string>(); let g = 0;
    while (set.size < 3 && g++ < 80) { const m = VALID[rnd(VALID.length)]; const s = routeOf(m); if (s && s !== correct && !set.has(s)) set.add(s); }
    return { prompt: 'Comment fermer', big: String(t), answer: correct, options: shuffle([correct, ...set]), hint: `Sortie au double — ferme exactement ${t}.` };
  }
  if (mode === 'subtract') {
    const start = 60 + rnd(442);                       // 60..501
    const cap = Math.min(180, start);
    const visit = cap <= 2 ? cap : 2 + rnd(cap - 1);   // volée 2..min(180, score)
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
  // bogey — 50 % fermable / 50 % piège
  const t = Math.random() < 0.5 ? VALID[rnd(VALID.length)] : BOGEY[rnd(BOGEY.length)];
  return { prompt: 'Fermable en 3 fléchettes ?', big: String(t), answer: checkout(t, 'double') ? 'Oui' : 'Non', options: ['Oui', 'Non'], hint: 'Sortie au double, en une seule volée.' };
}
