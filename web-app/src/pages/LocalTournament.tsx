import { useState } from 'react';
import { createBracket, advance, bracketChampion, roundCount, roundLabel, type LMatch } from '../game/localTournament';

export function LocalTournament() {
  const [names, setNames] = useState<string[]>(['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4']);
  const [matches, setMatches] = useState<LMatch[] | null>(null);

  const nm = (i: number | null) => (i == null ? '—' : names[i] ?? `#${i}`);

  if (!matches) {
    const setName = (i: number, v: string) => setNames(names.map((x, j) => (j === i ? v : x)));
    return (
      <div className="page">
        <h1 className="display page-title">Tournoi local</h1>
        <div className="card setup" style={{ maxWidth: 520 }}>
          <div className="muted">Élimination directe, 2 à 16 joueurs. Byes automatiques si le nombre n'est pas une puissance de 2.</div>
          <div className="setup-players">
            <div className="field-label">Joueurs ({names.length})</div>
            {names.map((n, i) => (
              <div key={i} className="player-row">
                <input value={n} onChange={(e) => setName(i, e.target.value)} maxLength={20} />
                {names.length > 2 && <button className="chip" onClick={() => setNames(names.filter((_, j) => j !== i))}>✕</button>}
              </div>
            ))}
            {names.length < 16 && <button className="chip" onClick={() => setNames([...names, `Joueur ${names.length + 1}`])}>+ Ajouter un joueur</button>}
          </div>
          <button className="btn btn-primary" onClick={() => setMatches(createBracket(names.length))}>Lancer le tournoi</button>
        </div>
      </div>
    );
  }

  const total = roundCount(matches);
  const champion = bracketChampion(matches);
  const pick = (m: LMatch, winner: number) => setMatches((ms) => advance(ms!, m.id, winner));

  return (
    <div className="page">
      <div className="play-head" style={{ marginBottom: 8 }}>
        <h1 className="display" style={{ fontSize: 30, margin: 0 }}>Tournoi local</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => setMatches(null)}>Nouveau</button>
      </div>

      {champion != null && (
        <div className="card champion-card"><div className="eyebrow" style={{ color: 'var(--amber)' }}>🏆 Champion</div><div className="display win-name">{nm(champion)}</div></div>
      )}

      <div className="bracket">
        {Array.from({ length: total }).map((_, r) => {
          const ms = matches.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot);
          return (
            <div key={r} className="round-col">
              <div className="eyebrow round-label">{roundLabel(r, total)}</div>
              {ms.map((m) => {
                const ready = m.p1 != null && m.p2 != null && m.winner == null;
                const Player = ({ pid }: { pid: number | null }) => (
                  <div
                    className={'bm-player' + (m.winner === pid && pid != null ? ' win' : '') + (pid == null ? ' empty' : '') + (ready && pid != null ? ' clickable' : '')}
                    onClick={() => { if (ready && pid != null) pick(m, pid); }}
                  >
                    <span>{nm(pid)}</span>
                    {m.winner === pid && pid != null && <span>✓</span>}
                    {ready && pid != null && <span className="muted" style={{ fontSize: 11 }}>gagnant ?</span>}
                  </div>
                );
                return <div key={m.id} className="bm"><Player pid={m.p1} /><div className="bm-div" /><Player pid={m.p2} /></div>;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
