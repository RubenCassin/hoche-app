import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getChallenges, acceptChallenge, declineChallenge, type Challenge } from '../api';

const STATUS: Record<string, string> = { pending: 'En attente', accepted: 'Accepté', declined: 'Refusé' };

export function Challenges() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['challenges'], queryFn: getChallenges, refetchInterval: 30000 });

  const respond = async (id: number, accept: boolean) => {
    accept ? await acceptChallenge(id).catch(() => {}) : await declineChallenge(id).catch(() => {});
    qc.invalidateQueries({ queryKey: ['challenges'] });
  };

  const incoming = data.filter((c) => c.incoming);
  const outgoing = data.filter((c) => !c.incoming);

  const Card = ({ c }: { c: Challenge }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div><b onClick={() => navigate(`/user/${c.opponentId}`)} style={{ cursor: 'pointer' }}>{c.opponentName}</b> · {c.gameType.toUpperCase()} · premier à {c.legsToWin}</div>
        {c.message && <div className="muted">« {c.message} »</div>}
        <div className="muted" style={{ fontSize: 12 }}>{STATUS[c.status] ?? c.status}</div>
      </div>
      {c.incoming && c.status === 'pending' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary btn-sm" onClick={() => respond(c.id, true)}>Accepter</button>
          <button className="btn btn-ghost btn-sm" onClick={() => respond(c.id, false)}>Refuser</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="page">
      <h1 className="display page-title">Défis</h1>
      {isLoading ? <p className="muted">Chargement…</p> : data.length === 0 ? (
        <div className="card"><p className="muted">Aucun défi. Lance-en un depuis le profil d'un joueur.</p></div>
      ) : (
        <>
          {incoming.length > 0 && <><h3 className="display section-title">Reçus</h3><div className="feed-list">{incoming.map((c) => <Card key={c.id} c={c} />)}</div></>}
          {outgoing.length > 0 && <><h3 className="display section-title">Envoyés</h3><div className="feed-list">{outgoing.map((c) => <Card key={c.id} c={c} />)}</div></>}
        </>
      )}
    </div>
  );
}
