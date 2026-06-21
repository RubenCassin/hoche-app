import { useEffect, useRef, useState } from 'react';

// Overlay « Qui commence ? » (parité mobile) : tirage au sort animé ou bull
// manuel. « Passer » garde le joueur 1. onChoose(index) lance la partie.
export function StartDecider({ names, onChoose }: { names: string[]; onChoose: (i: number) => void }) {
  const [mode, setMode] = useState<'draw' | 'bull'>('draw');
  const [chosen, setChosen] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const runDraw = () => {
    if (spinning) return;
    setSpinning(true); setChosen(null);
    const target = Math.floor(Math.random() * names.length);
    const totalTicks = names.length * 3 + target + 4;
    let tick = 0;
    const step = () => {
      setChosen(tick % names.length);
      tick += 1;
      if (tick <= totalTicks) { timer.current = setTimeout(step, 55 + Math.pow(tick / totalTicks, 3) * 260); }
      else { setChosen(target); setSpinning(false); }
    };
    step();
  };

  return (
    <div className="decider-overlay">
      <div className="eyebrow" style={{ color: 'var(--amber)' }}>Avant de lancer</div>
      <h2 className="display" style={{ fontSize: 36, margin: 0 }}>Qui commence ?</h2>

      <div className="seg" style={{ maxWidth: 420, width: '100%' }}>
        <button className={'seg-btn' + (mode === 'draw' ? ' on' : '')} onClick={() => { if (!spinning) { setMode('draw'); setChosen(null); } }}>🎲 Tirage</button>
        <button className={'seg-btn' + (mode === 'bull' ? ' on' : '')} onClick={() => { if (!spinning) { setMode('bull'); setChosen(null); } }}>🎯 Bull</button>
      </div>
      {mode === 'bull' && <div className="muted">Chacun vise le Bull une fléchette. Touche le joueur le plus proche du centre.</div>}

      <div className="decider-list">
        {names.map((n, i) => (
          <div key={i} className={'decider-row' + (chosen === i ? ' on' : '') + (mode === 'bull' ? ' tappable' : '')} onClick={() => { if (mode === 'bull' && !spinning) setChosen(i); }}>
            <span>{n}</span>{chosen === i && <span>★</span>}
          </div>
        ))}
      </div>

      {mode === 'draw' && chosen === null && <button className="btn btn-amber" onClick={runDraw}>Lancer le tirage</button>}
      {mode === 'draw' && chosen !== null && (
        <>
          {!spinning && <div className="decider-winner">{names[chosen]} commence !</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" disabled={spinning} onClick={runDraw}>Rejouer</button>
            <button className="btn btn-primary" disabled={spinning} onClick={() => onChoose(chosen)}>C'est parti</button>
          </div>
        </>
      )}
      {mode === 'bull' && (
        <button className="btn btn-amber" disabled={chosen === null} onClick={() => chosen !== null && onChoose(chosen)}>
          {chosen !== null ? `${names[chosen]} commence →` : 'Touche le gagnant'}
        </button>
      )}

      <button className="decider-skip" onClick={() => onChoose(0)}>Passer · {names[0]} commence</button>
    </div>
  );
}
