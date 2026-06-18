import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationsRead, acceptChallenge, declineChallenge, type NotificationItem } from '../api';
import { BADGES } from '../badges';

function text(n: NotificationItem): string {
  switch (n.type) {
    case 'follow': return `${n.actorName} a commencé à te suivre`;
    case 'like': return `${n.actorName} a aimé ton post`;
    case 'comment': return `${n.actorName} a commenté ton post`;
    case 'challenge': return `${n.actorName} te défie`;
    case 'challenge_result': return `${n.actorName} a répondu à ton défi`;
    case 'badge': return `Badge débloqué : ${BADGES.find((b) => b.id === n.badge)?.name ?? n.badge}`;
    case 'match': return `${n.actorName} a enregistré un match`;
    default: return n.actorName;
  }
}

export function Notifications() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications, refetchInterval: 30000 });

  useEffect(() => { markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ['notif-unread'] })).catch(() => {}); }, []);

  const respond = async (id: number, accept: boolean) => {
    accept ? await acceptChallenge(id).catch(() => {}) : await declineChallenge(id).catch(() => {});
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const items = data?.items ?? [];
  return (
    <div className="page">
      <h1 className="display page-title">Notifications</h1>
      {isLoading ? <p className="muted">Chargement…</p> : items.length === 0 ? (
        <div className="card"><p className="muted">Rien pour l'instant.</p></div>
      ) : (
        <div className="conv-list">
          {items.map((n) => (
            <div key={n.id} className={'notif-row' + (n.read ? '' : ' unread')}>
              <div className="notif-mid">
                <div className="notif-text">{text(n)}</div>
                {n.postSnippet && <div className="muted notif-snip">« {n.postSnippet} »</div>}
                {n.challenge && <div className="muted notif-snip">{n.challenge.gameType.toUpperCase()} · premier à {n.challenge.legsToWin}</div>}
              </div>
              {n.challenge?.pending && n.challengeId ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => respond(n.challengeId!, true)}>Accepter</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => respond(n.challengeId!, false)}>Refuser</button>
                </div>
              ) : n.postId ? (
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/post/${n.postId}`)}>Voir</button>
              ) : n.actorId ? (
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/user/${n.actorId}`)}>Profil</button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
