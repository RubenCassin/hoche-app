import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard, type LbScope, type LbRow } from '../api';
import { useAuth } from '../auth';

const SCOPES: { key: LbScope; label: string }[] = [
  { key: 'world', label: 'Monde' },
  { key: 'europe', label: 'Europe' },
  { key: 'country', label: 'Pays' },
  { key: 'friends', label: 'Amis' },
];
type Metric = 'elo' | 'avg' | 's180' | 'wins';
const METRICS: { key: Metric; label: string }[] = [
  { key: 'elo', label: 'Elo' },
  { key: 'avg', label: 'Moyenne' },
  { key: 's180', label: '180s' },
  { key: 'wins', label: 'Victoires' },
];
const valueOf = (r: LbRow, m: Metric) =>
  m === 'elo' ? r.elo : m === 'avg' ? r.three_dart_avg : m === 's180' ? r.total_180s : r.matches_won;
const fmt = (r: LbRow, m: Metric) => (m === 'avg' ? r.three_dart_avg.toFixed(1) : String(valueOf(r, m)));

export function Online() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scope, setScope] = useState<LbScope>('world');
  const [metric, setMetric] = useState<Metric>('elo');
  const { data, isLoading } = useQuery({ queryKey: ['lb', scope], queryFn: () => getLeaderboard(scope) });

  const rows = (data ?? [])
    .filter((r) => metric !== 'elo' || r.elo_games > 0)
    .slice()
    .sort((a, b) => valueOf(b, metric) - valueOf(a, metric));

  return (
    <div className="page">
      <div className="play-head" style={{ marginBottom: 8 }}>
        <h1 className="display page-title" style={{ margin: 0 }}>Classement</h1>
        <button className="btn btn-primary" onClick={() => navigate('/direct')}>🔴 Jouer en direct</button>
      </div>

      <div className="toolbar">
        <div className="seg">
          {SCOPES.map((s) => (
            <button key={s.key} className={'seg-btn' + (scope === s.key ? ' on' : '')} onClick={() => setScope(s.key)}>{s.label}</button>
          ))}
        </div>
        <div className="seg">
          {METRICS.map((m) => (
            <button key={m.key} className={'seg-btn' + (metric === m.key ? ' on' : '')} onClick={() => setMetric(m.key)}>{m.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="muted">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="card"><p className="muted">Pas encore de joueurs classés ici.</p></div>
      ) : (
        <div className="card lb-card">
          <table className="lb">
            <thead>
              <tr><th>#</th><th>Joueur</th><th className="num">{METRICS.find((m) => m.key === metric)!.label}</th><th className="num hide-sm">Parties</th><th className="num hide-sm">Win%</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={r.id === user?.id ? 'me' : ''}>
                  <td className="rank">{i + 1}</td>
                  <td><div className="lb-name">{r.name}{r.flags >= 3 ? ' ⚠' : ''}</div><div className="muted lb-user">{r.username}</div></td>
                  <td className="num mono lb-val">{fmt(r, metric)}</td>
                  <td className="num mono hide-sm">{r.matches_played}</td>
                  <td className="num mono hide-sm">{r.win_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
