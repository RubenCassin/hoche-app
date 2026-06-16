import { useState } from 'react';
import { DRILLS, CATEGORY_LABEL, getDrill, type DrillCategory, type DrillDef, type DrillState } from '../game/drills';
import { getRecords, addResult } from '../game/records';
import { DartGrid } from '../components/DartGrid';
import { useAuth } from '../auth';

const ORDER: DrillCategory[] = ['score', 'doubles', 'checkout', 'parcours'];

export function Practice() {
  const { user } = useAuth();
  const account = user ? `u${user.id}` : 'guest';
  const [running, setRunning] = useState<DrillDef | null>(null);

  if (running) return <RunDrill drill={running} account={account} onExit={() => setRunning(null)} />;

  const records = getRecords(account);
  return (
    <div className="page">
      <h1 className="display page-title">Entraînement</h1>
      <p className="muted" style={{ marginTop: -12, marginBottom: 20 }}>Des drills solo pour bosser doubles, checkouts et scoring. Ton record est gardé.</p>
      {ORDER.map((cat) => {
        const drills = DRILLS.filter((d) => d.category === cat);
        return (
          <div key={cat} className="drill-section">
            <h3 className="display section-title" style={{ marginTop: 20 }}>{CATEGORY_LABEL[cat]}</h3>
            <div className="drill-grid">
              {drills.map((d) => {
                const rec = records[d.key];
                return (
                  <button key={d.key} className="card drill-card" onClick={() => setRunning(getDrill(d.key) || d)}>
                    <div className="drill-top"><span className="drill-name">{d.name}</span><span className="tile-go">Jouer →</span></div>
                    <p className="muted drill-desc">{d.desc}</p>
                    <div className="mono drill-rec">{rec ? `★ Record : ${rec.best} ${d.unit}` : 'Aucun essai'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RunDrill({ drill, account, onExit }: { drill: DrillDef; account: string; onExit: () => void }) {
  const [state, setState] = useState<DrillState>(() => drill.init());
  const [history, setHistory] = useState<DrillState[]>([]);
  const [isRecord, setIsRecord] = useState(false);
  const [saved, setSaved] = useState(false);
  const rec = getRecords(account)[drill.key];

  // Sauvegarde à la fin (une fois).
  if (state.done && !saved) {
    setSaved(true);
    setIsRecord(addResult(account, drill.key, drill.result(state), drill.higherIsBetter ?? true));
  }

  const onDart = (points: number, modifier: 'S' | 'D' | 'T', segment: number) => {
    if (state.done) return;
    setHistory((h) => [...h, state]);
    setState(drill.applyDart(state, { points, modifier, segment }));
  };
  const undo = () => { if (history.length === 0) return; setState(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); };
  const restart = () => { setState(drill.init()); setHistory([]); setIsRecord(false); setSaved(false); };

  const pct = Math.round(Math.min(1, drill.rounds > 0 ? state.round / drill.rounds : 0) * 100);

  return (
    <div className="page play">
      <div className="play-head">
        <button className="btn btn-ghost btn-sm" onClick={onExit}>‹ Drills</button>
        <span className="muted mono">{drill.progress(state)}</span>
      </div>

      <h2 className="display drill-prompt">{drill.prompt(state)}</h2>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>

      <div className="drill-score-row">
        <div className="card stat-card"><div className="stat-label">Score</div><div className="display stat-value">{drill.liveScore(state)}</div></div>
        <div className="card stat-card"><div className="stat-label">★ Record</div><div className="display stat-value" style={{ color: rec ? 'var(--amber)' : 'var(--fg3)' }}>{rec ? rec.best : '—'}</div></div>
      </div>

      {!state.done ? (
        <DartGrid onDart={onDart} onUndo={undo} />
      ) : (
        <div className="card win-card">
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>Terminé · {drill.name}</div>
          {isRecord && <div className="ok-msg">★ Nouveau record !</div>}
          <div className="display win-name">{drill.result(state)} <span style={{ fontSize: 20, color: 'var(--fg2)' }}>{drill.unit}</span></div>
          {drill.resultNote && <div className="mono muted">{drill.resultNote(state)}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={restart}>Recommencer</button>
            <button className="btn btn-ghost" onClick={onExit}>Autres drills</button>
          </div>
        </div>
      )}
    </div>
  );
}
