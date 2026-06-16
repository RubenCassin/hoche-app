import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Online } from './pages/Online';
import { StatsPage } from './pages/StatsPage';
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
        <Route path="/online" element={<Online />} />
        <Route path="/tournois" element={<Placeholder title="Tournois" />} />
        <Route path="/feed" element={<Placeholder title="Feed" />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/profil" element={<Placeholder title="Profil" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
