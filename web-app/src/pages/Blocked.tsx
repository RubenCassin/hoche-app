import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBlocked, unblockUser } from '../api';

export function Blocked() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: blocked = [], isLoading } = useQuery({ queryKey: ['blocked'], queryFn: getBlocked });

  const unblock = async (id: number) => {
    await unblockUser(id).catch(() => {});
    qc.invalidateQueries({ queryKey: ['blocked'] });
  };

  return (
    <div className="page">
      <div className="play-head" style={{ marginBottom: 8 }}>
        <h1 className="display page-title" style={{ margin: 0 }}>Joueurs bloqués</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profil')}>‹ Profil</button>
      </div>
      <p className="muted">Les joueurs bloqués sont exclus de la recherche, du feed, des défis et des messages.</p>

      {isLoading ? (
        <p className="muted">Chargement…</p>
      ) : blocked.length === 0 ? (
        <div className="card"><p className="muted">Tu n'as bloqué personne.</p></div>
      ) : (
        <div className="conv-list">
          {blocked.map((u) => (
            <div key={u.id} className="conv-row" style={{ cursor: 'default' }}>
              <div className="avatar-sm">{u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : (u.name || '?').slice(0, 2).toUpperCase()}</div>
              <div className="conv-mid">
                <div className="conv-name">{u.name}</div>
                <div className="muted lb-user">{u.username}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => unblock(u.id)}>Débloquer</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
