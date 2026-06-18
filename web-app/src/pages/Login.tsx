import { useState } from 'react';
import { login, register, apiError } from '../api';
import { useAuth } from '../auth';

export function Login() {
  const { signIn, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const data = mode === 'login'
        ? await login(username, password)
        : await register(name, username, password);
      signIn(data.token, data.user);
    } catch (e2) {
      setErr(apiError(e2, mode === 'login' ? 'Connexion impossible' : 'Inscription impossible'));
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="eyebrow">Fléchettes · bar &amp; soirée</div>
        <h1 className="display login-title">HOCHE</h1>
        <p className="muted login-tag">
          Le tableau de score nouvelle génération. X01, Cricket, tournois, online — sur grand écran comme dans ta poche.
        </p>
      </div>
      <form className="card login-card" onSubmit={submit}>
        <div className="seg">
          <button type="button" className={'seg-btn' + (mode === 'login' ? ' on' : '')} onClick={() => setMode('login')}>Connexion</button>
          <button type="button" className={'seg-btn' + (mode === 'register' ? ' on' : '')} onClick={() => setMode('register')}>Inscription</button>
        </div>
        {mode === 'register' && (
          <input placeholder="Ton nom" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        )}
        <input placeholder="Pseudo (@…)" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
        <input placeholder="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div className="err">{err}</div>}
        <button className="btn btn-primary" disabled={busy || !username || !password}>
          {busy ? '…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={continueAsGuest}>🎯 Jouer en invité</button>
        <div className="muted" style={{ fontSize: 12, textAlign: 'center' }}>En invité : jeux locaux + entraînement, sans compte.</div>
      </form>
    </div>
  );
}
