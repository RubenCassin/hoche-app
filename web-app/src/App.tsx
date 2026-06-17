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
import { Direct } from './pages/Direct';
import { Messages } from './pages/Messages';
import { Conversation } from './pages/Conversation';
import { Tournament } from './pages/Tournament';

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
        <Route path="/direct" element={<Direct />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Conversation />} />
        <Route path="/tournament/:id" element={<Tournament />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
