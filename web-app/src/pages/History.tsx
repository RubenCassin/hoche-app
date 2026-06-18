import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getGames, type Game } from '../api';

const TYPE: Record<string, string> = { x01: 'X01', cricket: 'Cricket', atc: 'A. the Clock', killer: 'Killer', shanghai: 'Shanghai', halveit: 'Halve-it' };
function when(iso: string) { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

export function History() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({ queryKey: ['games'], queryFn: getGames });

  return (
    <div className="page">
      <h1 className="display page-title">Historique</h1>
      {isLoading ? <p className="muted">Chargement…</p> : data.length === 0 ? (
        <div className="card"><p className="muted">Aucune partie enregistrée. Joue une partie connecté pour la retrouver ici.</p></div>
      ) : (
        <div className="conv-list">
          {data.map((g: Game) => (
            <button key={g.id} className="conv-row" onClick={() => navigate(`/game/${g.id}`)}>
              <div className={'hist-badge' + (g.matchWon ? ' win' : ' loss')}>{g.matchWon ? 'V' : 'D'}</div>
              <div className="conv-mid">
                <div className="conv-top">
                  <span className="conv-name">{TYPE[g.gameType] ?? g.gameType}{g.online ? ' 🔴' : ''}{g.opponents.length ? ` vs ${g.opponents.join(', ')}` : ''}</span>
                  <span className="conv-time muted">{when(g.finished_at)}</span>
                </div>
                <div className="conv-prev">
                  {g.gameType === 'x01' ? `${g.legsWon}–${Math.max(0, g.legsPlayed - g.legsWon)} · moy ${g.avg}` : `legs ${g.legsWon}`}
                  {g.total180s > 0 ? ` · ${g.total180s}×180` : ''}{g.highestCheckout >= 100 ? ` · CO ${g.highestCheckout}` : ''}
                </div>
              </div>
              {g.visits.length > 0 && <span className="muted">↗</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
