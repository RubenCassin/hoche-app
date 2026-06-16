import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';

const NAV = [
  { to: '/', label: 'Jouer', icon: '🎯', end: true },
  { to: '/entrainement', label: 'Entraînement', icon: '🎓' },
  { to: '/online', label: 'Online', icon: '🌐' },
  { to: '/tournois', label: 'Tournois', icon: '🏆' },
  { to: '/feed', label: 'Feed', icon: '📰' },
  { to: '/stats', label: 'Stats', icon: '📊' },
  { to: '/profil', label: 'Profil', icon: '👤' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
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
