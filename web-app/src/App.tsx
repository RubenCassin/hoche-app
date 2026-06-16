import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Online } from './pages/Online';
import { StatsPage } from './pages/StatsPage';
import { Profil } from './pages/Profil';
import { Feed } from './pages/Feed';
import { Play } from './pages/Play';
import { Practice } from './pages/Practice';
import { Placeholder } from './pages/Placeholder';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="center-screen"><span className="display" style={{ fontSize: 40, color: 'var(--amber)' }}>HOCHE</span></div>;
  }
  if (!user) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jouer" element={<Play />} />
        <Route path="/entrainement" element={<Practice />} />
        <Route path="/online" element={<Online />} />
        <Route path="/tournois" element={<Placeholder title="Tournois" />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
