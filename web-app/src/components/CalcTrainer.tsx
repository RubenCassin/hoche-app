import { useState } from 'react';
import { checkout } from '../game/x01';
import { addResult, getRecords } from '../game/records';

// Entraînement calcul (sans fléchettes) : on s'entraîne à trouver le bon
// checkout. QCM de 10 questions ; le solveur donne la bonne route, les leurres
// sont des routes valides d'autres nombres (donc fausses pour la cible).
const TOTAL = 10;
const RECORD_KEY = 'calc_checkout';

const VALID: number[] = (() => {
  const a: number[] = [];
  for (let n = 2; n <= 170; n++) if (checkout(n, true)) a.push(n);
  return a;
})();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const routeOf = (n: number): string => (checkout(n, true) || []).join('  ');

interface Q { target: number; options: string[]; correct: string }
function makeQuestion(): Q {
  const target = VALID[Math.floor(Math.random() * VALID.length)];
  const correct = routeOf(target);
  const distract = new Set<string>();
  let guard = 0;
  while (distract.size < 3 && guard++ < 80) {
    const m = VALID[Math.floor(Math.random() * VALID.length)];
    const s = routeOf(m);
    if (s && s !== correct && !distract.has(s)) distract.add(s);
  }
  return { target, options: shuffle([correct, ...distract]), correct };
}

export function CalcTrainer({ account, onExit }: { account: string; onExit: () => void }) {
  const [qs, setQs] = useState<Q[]>(() => Array.from({ length: TOTAL }, makeQuestion));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isRecord, setIsRecord] = useState(false);
  const rec = getRecords(account)[RECORD_KEY];

  const restart = () => { setQs(Array.from({ length: TOTAL }, makeQuestion)); setI(0); setScore(0); setPicked(null); setDone(false); setIsRecord(false); };

  const q = qs[i];
  const pick = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const newScore = score + (opt === q.correct ? 1 : 0);
    setScore(newScore);
    setTimeout(() => {
      if (i + 1 >= TOTAL) { setDone(true); setIsRecord(addResult(account, RECORD_KEY, newScore, true)); }
      else { setI(i + 1); setPicked(null); }
    }, 800);
  };

  if (done) {
    return (
      <div className="page play">
        <div className="play-head"><button className="btn btn-ghost btn-sm" onClick={onExit}>‹ Entraînement</button></div>
        <div className="card win-card">
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>Calcul · terminé</div>
          {isRecord && <div className="ok-msg">★ Nouveau record !</div>}
          <div className="display win-name">{score} <span style={{ fontSize: 20, color: 'var(--fg2)' }}>/ {TOTAL}</span></div>
          <div className="mono muted">{rec ? `Record : ${rec.best} / ${TOTAL}` : ''}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={restart}>Recommencer</button>
            <button className="btn btn-ghost" onClick={onExit}>Quitter</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page play">
      <div className="play-head">
        <button className="btn btn-ghost btn-sm" onClick={onExit}>‹ Entraînement</button>
        <span className="muted mono">Question {i + 1}/{TOTAL} · score {score}</span>
      </div>

      <h2 className="display" style={{ textAlign: 'center', fontSize: 22, marginTop: 8 }}>Comment fermer</h2>
      <div className="display" style={{ textAlign: 'center', fontSize: 72, color: 'var(--amber)', lineHeight: 1, marginBottom: 18 }}>{q.target}</div>

      <div className="calc-options">
        {q.options.map((opt) => {
          let cls = 'calc-option';
          if (picked) { if (opt === q.correct) cls += ' good'; else if (opt === picked) cls += ' bad'; }
          return <button key={opt} className={cls} disabled={!!picked} onClick={() => pick(opt)}>{opt}</button>;
        })}
      </div>
      <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>Sortie au double — trouve la combinaison qui ferme exactement {q.target}.</p>
    </div>
  );
}
