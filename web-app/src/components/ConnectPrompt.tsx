import { useAuth } from '../auth';

// Affiché à la place d'un écran « compte » quand on joue en invité.
export function ConnectPrompt({ title, message }: { title: string; message: string }) {
  const { signOut } = useAuth();
  return (
    <div className="page">
      <h1 className="display page-title">{title}</h1>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460, alignItems: 'flex-start' }}>
        <div className="eyebrow">Réservé aux comptes</div>
        <p style={{ margin: 0 }}>{message}</p>
        <button className="btn btn-amber" onClick={signOut}>Se connecter / créer un compte</button>
      </div>
    </div>
  );
}
