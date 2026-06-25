import { useState } from 'react';
import { makeCalcQuestion, CALC_MODES, type CalcMode, type CalcQuestion } from '../game/calc';
import { addResult, getRecords } from '../game/records';

// Entraînement calcul (sans fléchettes) — multi-modes. QCM (options) ou saisie
// numérique selon la question. 10 questions, score + record par mode/compte.
const TOTAL = 10;

export function CalcTrainer({ mode, account, onExit }: { mode: CalcMode; account: string; onExit: () => void }) {
  const cfg = CALC_MODES.find((m) => m.key === mode)!;
  const recKey = `calc_${mode}`;
  const [qs, setQs] = useState<CalcQuestion[]>(() => Array.from({ length: TOTAL }, () => makeCalcQuestion(mode)));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [entry, setEntry] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [isRecord, setIsRecord] = useState(false);
  const rec = getRecords(account)[recKey];

  const q = qs[i];
  const next = (correct: boolean) => {
    const ns = score + (correct ? 1 : 0);
    setScore(ns);
    setTimeout(() => {
      if (i + 1 >= TOTAL) { setDone(true); setIsRecord(addResult(account, recKey, ns, true)); }
      else { setI(i + 1); setPicked(null); setEntry(''); setRevealed(false); }
    }, 850);
  };
  const pickOpt = (opt: string) => { if (picked) return; setPicked(opt); next(opt === q.answer); };
  const submitNum = () => { if (revealed || entry === '') return; setRevealed(true); next(entry === q.answer); };
  const restart = () => { setQs(Array.from({ length: TOTAL }, () => makeCalcQuestion(mode))); setI(0); setScore(0); setPicked(null); setEntry(''); setRevealed(false); setDone(false); setIsRecord(false); };

  if (done) {
    return (
      <div className="page play">
        <div className="play-head"><button className="btn btn-ghost btn-sm" onClick={onExit}>‹ Entraînement</button></div>
        <div className="card win-card">
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>{cfg.name} · terminé</div>
          {isRecord && <div className="ok-msg">★ Nouveau record !</div>}
          <div className="display win-name">{score} <span style={{ fontSize: 20, color: 'var(--fg2)' }}>/ {TOTAL}</span></div>
          {rec && <div className="mono muted">Record : {rec.best} / {TOTAL}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={restart}>Recommencer</button>
            <button className="btn btn-ghost" onClick={onExit}>Quitter</button>
          </div>
        </div>
      </div>
    );
  }

  const numClass = 'calc-entry mono' + (revealed ? (entry === q.answer ? ' good' : ' bad') : '');
  return (
    <div className="page play">
      <div className="play-head">
        <button className="btn btn-ghost btn-sm" onClick={onExit}>‹ Entraînement</button>
        <span className="muted mono">{cfg.name} · {i + 1}/{TOTAL} · score {score}</span>
      </div>

      <h2 className="display" style={{ textAlign: 'center', fontSize: q.big ? 22 : 44, marginTop: 8 }}>{q.prompt}</h2>
      {q.big && <div className="display" style={{ textAlign: 'center', fontSize: 72, color: 'var(--amber)', lineHeight: 1, marginBottom: 18 }}>{q.big}</div>}

      {q.options ? (
        <div className="calc-options">
          {q.options.map((opt) => {
            let cls = 'calc-option';
            if (picked) { if (opt === q.answer) cls += ' good'; else if (opt === picked) cls += ' bad'; }
            return <button key={opt} className={cls} disabled={!!picked} onClick={() => pickOpt(opt)}>{opt}</button>;
          })}
        </div>
      ) : (
        <div className="calc-num">
          <div className={numClass}>{entry || '?'}</div>
          {revealed && entry !== q.answer && <div className="muted" style={{ textAlign: 'center', marginTop: 6 }}>Réponse : <b style={{ color: 'var(--win)' }}>{q.answer}</b></div>}
          <div className="numpad calc-pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <button key={d} className="num" disabled={revealed} onClick={() => setEntry((e) => (e + d).replace(/^0+/, '').slice(0, 3))}>{d}</button>)}
            <button className="num" disabled={revealed} onClick={() => setEntry((e) => e.slice(0, -1))}>←</button>
            <button className="num" disabled={revealed} onClick={() => setEntry((e) => (e + '0').replace(/^0+/, '').slice(0, 3))}>0</button>
            <button className="num num-ok" disabled={revealed || entry === ''} onClick={submitNum}>OK</button>
          </div>
        </div>
      )}
      {q.hint && <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>{q.hint}</p>}
    </div>
  );
}
