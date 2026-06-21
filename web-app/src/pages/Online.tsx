import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard, getLiveMatches, getOnlineFriends, type LbScope, type LbRow } from '../api';
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
  const { data: friends = [] } = useQuery({ queryKey: ['friends-online'], queryFn: getOnlineFriends, refetchInterval: 15000, enabled: !!user });
  const { data: live = [] } = useQuery({ queryKey: ['live-matches'], queryFn: getLiveMatches, refetchInterval: 15000, enabled: !!user });

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

      {friends.length > 0 && (
        <div className="presence-strip">
          <div className="eyebrow" style={{ color: 'var(--win)' }}>● {friends.length} ami{friends.length > 1 ? 's' : ''} en ligne</div>
          <div className="presence-row">
            {friends.map((f) => (
              <button key={f.id} className="presence-chip" title={`Défier ${f.name}`}
                onClick={() => navigate(`/direct?invite=${f.id}&name=${encodeURIComponent(f.name)}`)}>
                <span className="avatar-sm">{(f.name || '?').slice(0, 2).toUpperCase()}</span>
                <span className="presence-name">{f.name}</span>
                <span className="presence-go">⚔️</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {live.length > 0 && (
        <div className="live-strip">
          <div className="eyebrow" style={{ color: 'var(--brick)' }}>🔴 En direct maintenant</div>
          <div className="live-list">
            {live.map((m) => (
              <button key={m.code} className="live-row" onClick={() => navigate(`/direct?spectate=${m.code}`)}>
                <div className="live-mid">
                  <div className="live-names">{m.names.join(' vs ')}</div>
                  <div className="muted mono live-meta">{m.config.startScore} · {m.legs.join('–')}{m.spectators > 0 ? ` · ${m.spectators}👁` : ''}</div>
                </div>
                <span className="live-watch">👁 Regarder</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
                <tr key={r.id} className={r.id === user?.id ? 'me' : ''} style={{ cursor: 'pointer' }} onClick={() => navigate(`/user/${r.id}`)}>
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
