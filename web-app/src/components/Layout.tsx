import { useEffect, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { getChatUnread, getNotifications } from '../api';
import { onLive } from '../live';
import { InviteListener } from './InviteListener';
import { OcheMark, BellIcon } from './Logo';

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

  const { data: unread = 0 } = useQuery({ queryKey: ['chat-unread'], queryFn: getChatUnread, refetchInterval: 30000, enabled: !!user });
  const { data: notifUnread = 0 } = useQuery({ queryKey: ['notif-unread'], queryFn: () => getNotifications().then((d) => d.unread), refetchInterval: 30000, enabled: !!user });

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
          <OcheMark size={30} />
          <span className="display brand-word">HOCHE</span>
          {user && (
            <NavLink to="/notifications" className="bell" title="Notifications">
              <BellIcon size={18} />
              {notifUnread > 0 && <span className="bell-badge">{notifUnread > 9 ? '9+' : notifUnread}</span>}
            </NavLink>
          )}
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
          {user ? (
            <>
              <div className="who">
                <div className="who-name">{user.name}</div>
                <div className="who-sub muted">{user.username}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={signOut}>Déconnexion</button>
            </>
          ) : (
            <>
              <div className="who"><div className="who-name">Invité</div><div className="who-sub muted">Partie locale</div></div>
              <button className="btn btn-amber btn-sm" onClick={signOut}>Se connecter</button>
            </>
          )}
        </div>
      </aside>
      <main className="content">{children}</main>
      {user && <InviteListener />}
    </div>
  );
}
