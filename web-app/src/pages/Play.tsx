import { useState } from 'react';
import { initX01, addVisit, avg3, checkout, type X01State, type X01Config } from '../game/x01';

const VARIANTS = [301, 501, 701];
const LEGS = [1, 3, 5];

export function Play() {
  const [state, setState] = useState<X01State | null>(null);
  const [history, setHistory] = useState<X01State[]>([]);
  const [entry, setEntry] = useState('');

  // ── Setup ──
  const [startScore, setStartScore] = useState(501);
  const [legsToWin, setLegsToWin] = useState(3);
  const [doubleOut, setDoubleOut] = useState(true);
  const [names, setNames] = useState<string[]>(['Joueur 1', 'Joueur 2']);

  const start = () => {
    const cfg: X01Config = { startScore, legsToWin, doubleOut };
    setState(initX01(names.map((n, i) => n.trim() || `Joueur ${i + 1}`), cfg));
    setHistory([]);
    setEntry('');
  };

  const submit = (total: number) => {
    if (!state || state.winner !== null) return;
    setHistory((h) => [...h, state]);
    setState(addVisit(state, total));
    setEntry('');
  };
  const undo = () => {
    if (history.length === 0) return;
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setEntry('');
  };

  // ── Écran de setup ──
  if (!state) {
    return (
      <div className="page">
        <h1 className="display page-title">Nouvelle partie</h1>
        <div className="card setup">
          <Row label="Score">
            {VARIANTS.map((v) => (
              <button key={v} className={'chip' + (startScore === v ? ' on' : '')} onClick={() => setStartScore(v)}>{v}</button>
            ))}
          </Row>
          <Row label="Legs (premier à)">
            {LEGS.map((v) => (
              <button key={v} className={'chip' + (legsToWin === v ? ' on' : '')} onClick={() => setLegsToWin(v)}>{v}</button>
            ))}
          </Row>
          <Row label="Sortie">
            <button className={'chip' + (doubleOut ? ' on' : '')} onClick={() => setDoubleOut(true)}>Double</button>
            <button className={'chip' + (!doubleOut ? ' on' : '')} onClick={() => setDoubleOut(false)}>Simple</button>
          </Row>
          <div className="setup-players">
            <div className="field-label">Joueurs</div>
            {names.map((n, i) => (
              <div key={i} className="player-row">
                <input value={n} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} maxLength={20} />
                {names.length > 1 && <button className="chip" onClick={() => setNames(names.filter((_, j) => j !== i))}>✕</button>}
              </div>
            ))}
            {names.length < 4 && (
              <button className="chip" onClick={() => setNames([...names, `Joueur ${names.length + 1}`])}>+ Ajouter un joueur</button>
            )}
          </div>
          <button className="btn btn-primary" onClick={start}>Démarrer</button>
        </div>
      </div>
    );
  }

  // ── Scoreboard ──
  const me = state.players[state.turn];
  const co = state.winner === null ? checkout(me.remaining, state.config.doubleOut) : null;
  const isOver = state.winner !== null;
  const submitEntry = () => { const t = parseInt(entry, 10); if (!isNaN(t)) submit(t); };

  return (
    <div className="page play">
      <div className="play-head">
        <div className="muted mono">{state.config.startScore} · premier à {state.config.legsToWin} · {state.config.doubleOut ? 'double out' : 'simple out'}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setState(null)}>Quitter</button>
      </div>

      <div className={'board board-' + Math.min(state.players.length, 4)}>
        {state.players.map((p, i) => (
          <div key={i} className={'pscore' + (i === state.turn && !isOver ? ' active' : '') + (state.winner === i ? ' winner' : '')}>
            <div className="pscore-name">{p.name}{state.winner === i ? ' 🏆' : ''}</div>
            <div className="display pscore-rem">{p.remaining}</div>
            <div className="pscore-meta mono">
              <span>{'●'.repeat(p.legs)}<span className="muted">{'○'.repeat(Math.max(0, state.config.legsToWin - p.legs))}</span></span>
              <span className="muted">moy {avg3(p)}</span>
            </div>
          </div>
        ))}
      </div>

      {isOver ? (
        <div className="card win-card">
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>🏆 Vainqueur</div>
          <div className="display win-name">{state.players[state.winner!].name}</div>
          <button className="btn btn-primary" onClick={start}>Rejouer</button>
        </div>
      ) : (
        <>
          <div className="co-line">
            {state.event === 'bust' && <span className="bust-tag">BUST</span>}
            {state.event === '180' && <span className="amber-tag">💥 180 !</span>}
            {co ? <><span className="muted">Checkout :</span> {co.map((d, k) => <span key={k} className={'co-pill' + (d.startsWith('D') || d === 'BULL' ? ' dbl' : '')}>{d}</span>)}</> : null}
          </div>
          <div className="turn-line"><b>{me.name}</b> — à toi de jouer</div>

          <div className="numpad-wrap">
            <div className="entry mono">{entry || '0'}</div>
            <div className="numpad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button key={d} className="num" onClick={() => setEntry((e) => (e + d).replace(/^0+/, '').slice(0, 3))}>{d}</button>
              ))}
              <button className="num" onClick={() => setEntry((e) => e.slice(0, -1))}>←</button>
              <button className="num" onClick={() => setEntry((e) => (e + '0').replace(/^0+/, '').slice(0, 3))}>0</button>
              <button className="num num-ok" onClick={submitEntry}>OK</button>
            </div>
            <div className="quick-row">
              {[26, 41, 45, 60, 81, 100, 140, 180].map((q) => (
                <button key={q} className="chip" onClick={() => submit(q)}>{q}</button>
              ))}
              <button className="chip" onClick={() => submit(0)}>0</button>
              <button className="chip" onClick={undo} disabled={history.length === 0}>↶ Annuler</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="setup-row">
      <div className="field-label">{label}</div>
      <div className="chip-row">{children}</div>
    </div>
  );
}
