import { type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { ConnectPrompt } from './components/ConnectPrompt';
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
import { UserProfile } from './pages/UserProfile';
import { Notifications } from './pages/Notifications';
import { Challenges } from './pages/Challenges';
import { PostDetail } from './pages/PostDetail';
import { History } from './pages/History';
import { GameReplay } from './pages/GameReplay';
import { LocalTournament } from './pages/LocalTournament';
import { Blocked } from './pages/Blocked';
import { HocheLogo } from './components/Logo';

export function App() {
  const { user, guest, loading } = useAuth();

  if (loading) {
    return <div className="center-screen"><HocheLogo vertical markSize={72} wordSize={44} /></div>;
  }
  if (!user && !guest) return <Login />;

  // En invité : jeu local + entraînement OK ; les écrans « compte » invitent à se connecter.
  const gated = (node: ReactNode, title: string, message: string) =>
    user ? node : <ConnectPrompt title={title} message={message} />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jouer" element={<Play />} />
        <Route path="/entrainement" element={<Practice />} />
        <Route path="/online" element={gated(<Online />, 'Classement', 'Le classement Elo et les parties en ligne sont réservés aux comptes.')} />
        <Route path="/direct" element={gated(<Direct />, 'Jouer en direct', 'Les parties en ligne en temps réel sont réservées aux comptes.')} />
        <Route path="/messages" element={gated(<Messages />, 'Messages', 'La messagerie est réservée aux comptes.')} />
        <Route path="/messages/:id" element={gated(<Conversation />, 'Messages', 'La messagerie est réservée aux comptes.')} />
        <Route path="/tournament/:id" element={gated(<Tournament />, 'Tournoi', 'Les tournois en ligne sont réservés aux comptes.')} />
        <Route path="/feed" element={gated(<Feed />, 'Feed', 'Le fil social est réservé aux comptes.')} />
        <Route path="/post/:id" element={gated(<PostDetail />, 'Post', 'Le fil social est réservé aux comptes.')} />
        <Route path="/user/:id" element={gated(<UserProfile />, 'Profil', 'Les profils joueurs sont réservés aux comptes.')} />
        <Route path="/notifications" element={gated(<Notifications />, 'Notifications', 'Réservé aux comptes.')} />
        <Route path="/challenges" element={gated(<Challenges />, 'Défis', 'Les défis sont réservés aux comptes.')} />
        <Route path="/historique" element={gated(<History />, 'Historique', "L'historique de tes parties est réservé aux comptes.")} />
        <Route path="/game/:id" element={gated(<GameReplay />, 'Partie', 'Réservé aux comptes.')} />
        <Route path="/tournoi-local" element={<LocalTournament />} />
        <Route path="/stats" element={gated(<StatsPage />, 'Stats', 'Crée un compte pour suivre tes statistiques au fil des parties.')} />
        <Route path="/profil" element={gated(<Profil />, 'Profil', 'Crée un compte pour personnaliser ton profil.')} />
        <Route path="/bloques" element={gated(<Blocked />, 'Bloqués', 'Réservé aux comptes.')} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
