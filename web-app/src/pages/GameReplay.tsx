import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getGame } from '../api';
import { Sparkline } from '../components/Sparkline';

const TYPE: Record<string, string> = { x01: 'X01', cricket: 'Cricket', atc: 'Around the Clock', killer: 'Killer', shanghai: 'Shanghai', halveit: 'Halve-it' };

export function GameReplay() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const { data: g, isLoading } = useQuery({ queryKey: ['game', id], queryFn: () => getGame(id), enabled: id > 0 });

  if (isLoading || !g) return <div className="page"><h1 className="display page-title">Partie</h1><p className="muted">Chargement…</p></div>;

  const totals = g.visits.filter((v) => !v.bust).map((v) => v.total);
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="play-head" style={{ marginBottom: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/historique')}>‹ Historique</button>
      </div>
      <h1 className="display page-title" style={{ marginBottom: 8 }}>{TYPE[g.gameType] ?? g.gameType}{g.online ? ' 🔴' : ''}</h1>
      <div className="eyebrow" style={{ color: g.matchWon ? 'var(--win)' : 'var(--brick)', marginBottom: 16 }}>
        {g.matchWon ? '🏆 Victoire' : 'Défaite'} {g.legsWon}–{Math.max(0, g.legsPlayed - g.legsWon)}{g.opponents.length ? ` · vs ${g.opponents.join(', ')}` : ''}
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <Stat label="Moyenne" value={g.avg} accent />
        <Stat label="180s" value={g.total180s} />
        <Stat label="High CO" value={g.highestCheckout} />
        <Stat label="Fléchettes" value={g.dartsThrown} />
      </div>

      {totals.length >= 2 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field-label" style={{ marginTop: 0 }}>Volées (points)</div>
          <Sparkline values={totals} width={640} height={70} />
        </div>
      )}

      {g.visits.length > 0 ? (
        <div className="card lb-card">
          <table className="lb">
            <thead><tr><th>#</th><th className="num">Volée</th></tr></thead>
            <tbody>
              {g.visits.map((v, i) => (
                <tr key={i}><td className="rank">{i + 1}</td><td className="num mono">{v.bust ? <span className="bust-tag">BUST</span> : <span className={v.total >= 100 ? 'lb-val' : ''}>{v.total}</span>}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted">Pas de détail de volées pour cette partie.</p>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return <div className="card stat-card"><div className="stat-label">{label}</div><div className="display stat-value" style={{ color: accent ? 'var(--amber)' : 'var(--cream)', fontSize: 32 }}>{value}</div></div>;
}
