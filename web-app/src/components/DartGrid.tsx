import { useState } from 'react';

type Mod = 'S' | 'D' | 'T';

// Grille de saisie par fléchette : choix du multiplicateur (S/D/T) puis un
// numéro 1-20, ou 25 / Bull / Raté. Appelle onDart(points, modifier, segment).
export function DartGrid({ onDart, onUndo, disabled }: {
  onDart: (points: number, modifier: Mod, segment: number) => void;
  onUndo?: () => void;
  disabled?: boolean;
}) {
  const [mod, setMod] = useState<Mod>('S');

  const tapNumber = (n: number) => {
    if (disabled) return;
    const mult = mod === 'T' ? 3 : mod === 'D' ? 2 : 1;
    onDart(n * mult, mod, n);
    setMod('S');
  };

  return (
    <div className={'grid-input' + (disabled ? ' disabled' : '')}>
      <div className="mod-row">
        {(['S', 'D', 'T'] as Mod[]).map((m) => (
          <button key={m} className={'mod-btn' + (mod === m ? ' on' : '')} onClick={() => setMod(m)}>
            {m === 'S' ? 'Simple' : m === 'D' ? 'Double' : 'Triple'}
          </button>
        ))}
      </div>
      <div className="seg-grid">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button key={n} className="seg-cell" onClick={() => tapNumber(n)}>{n}</button>
        ))}
      </div>
      <div className="seg-extra">
        <button className="seg-cell wide" onClick={() => { if (!disabled) { onDart(25, 'S', 25); setMod('S'); } }}>25</button>
        <button className="seg-cell wide bull" onClick={() => { if (!disabled) { onDart(50, 'D', 25); setMod('S'); } }}>BULL</button>
        <button className="seg-cell wide" onClick={() => { if (!disabled) { onDart(0, 'S', 0); setMod('S'); } }}>Raté</button>
        {onUndo && <button className="seg-cell wide undo" onClick={() => !disabled && onUndo()}>↶</button>}
      </div>
    </div>
  );
}
