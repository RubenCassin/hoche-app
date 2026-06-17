import { useEffect, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { getChatUnread } from '../api';
import { onLive } from '../live';

const NAV = [
  { to: '/', label: 'Jouer', icon: '🎯', end: true },
  { to: '/entrainement', label: 'Entraînement', icon: '🎓' },
  { to: '/online', label: 'Online', icon: '🌐' },
  { to: '/messages', label: 'Messages', icon: '💬', badge: true },
  { to: '/feed', label: 'Feed', icon: '📰' },
  { to: '/stats', label: 'Stats', icon: '📊' },
  { to: '/profil', label: 'Profil', icon: '👤' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();

  const { data: unread = 0 } = useQuery({ queryKey: ['chat-unread'], queryFn: getChatUnread, refetchInterval: 30000 });

  // Temps réel global : un message/lecture/ajout met à jour les caches chat,
  // un tournament_update rafraîchit le bracket concerné.
  useEffect(() => {
    return onLive((m: any) => {
      switch (m.type) {
        case 'chat_message':
          qc.invalidateQueries({ queryKey: ['chat-conversations'] });
          qc.invalidateQueries({ queryKey: ['chat-unread'] });
          qc.invalidateQueries({ queryKey: ['chat-messages', m.conversationId] });
          break;
        case 'chat_read':
          qc.invalidateQueries({ queryKey: ['chat-conversations'] });
          qc.invalidateQueries({ queryKey: ['chat-unread'] });
          break;
        case 'chat_member_added':
          qc.invalidateQueries({ queryKey: ['chat-conversations'] });
          qc.invalidateQueries({ queryKey: ['chat-messages', m.conversationId] });
          break;
        case 'tournament_update':
          qc.invalidateQueries({ queryKey: ['tournament', m.tournamentId] });
          break;
      }
    });
  }, [qc]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◎</span>
          <span className="display brand-word">HOCHE</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.badge && unread > 0 && <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <div className="who-name">{user?.name}</div>
            <div className="who-sub muted">{user?.username}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Déconnexion</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
