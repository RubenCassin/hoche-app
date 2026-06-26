import { useState } from 'react';
import { login, register, forgotPassword, forgotUsername, apiError } from '../api';
import { useAuth } from '../auth';
import { OcheMark } from '../components/Logo';

type View = 'login' | 'register' | 'forgot-pw' | 'forgot-user';

export function Login() {
  const { signIn, continueAsGuest } = useAuth();
  const [view, setView] = useState<View>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = (v: View) => { setView(v); setErr(null); setNotice(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null); setNotice(null);
    try {
      if (view === 'login') {
        const data = await login(username, password);
        signIn(data.token, data.user);
      } else if (view === 'register') {
        const data = await register(name, username, password, email.trim() || undefined);
        signIn(data.token, data.user);
      } else if (view === 'forgot-pw') {
        await forgotPassword(email.trim());
        setNotice('Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.');
        setBusy(false);
      } else {
        await forgotUsername(email.trim());
        setNotice('Si un compte existe pour cet email, ton identifiant vient d’être envoyé.');
        setBusy(false);
      }
    } catch (e2) {
      setErr(apiError(e2, view === 'login' ? 'Connexion impossible' : view === 'register' ? 'Inscription impossible' : 'Envoi impossible'));
      setBusy(false);
    }
  };

  const isAuth = view === 'login' || view === 'register';
  const isRecover = view === 'forgot-pw' || view === 'forgot-user';

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <OcheMark size={72} />
        <div className="eyebrow" style={{ marginTop: 14 }}>Fléchettes · bar &amp; soirée</div>
        <h1 className="display login-title">HOCHE</h1>
        <p className="muted login-tag">
          Le tableau de score nouvelle génération. X01, Cricket, tournois, online — sur grand écran comme dans ta poche.
        </p>
      </div>
      <form className="card login-card" onSubmit={submit}>
        {isAuth && (
          <div className="seg">
            <button type="button" className={'seg-btn' + (view === 'login' ? ' on' : '')} onClick={() => reset('login')}>Connexion</button>
            <button type="button" className={'seg-btn' + (view === 'register' ? ' on' : '')} onClick={() => reset('register')}>Inscription</button>
          </div>
        )}
        {isRecover && (
          <div className="play-head" style={{ marginBottom: 0 }}>
            <strong>{view === 'forgot-pw' ? 'Mot de passe oublié' : 'Identifiant oublié'}</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => reset('login')}>‹ Retour</button>
          </div>
        )}

        {view === 'register' && (
          <input placeholder="Ton nom" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        )}
        {(view === 'register' || isRecover) && (
          <input placeholder={view === 'register' ? 'Email (pour récupérer ton compte)' : 'Ton email'} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
        {isAuth && (
          <>
            <input placeholder="Pseudo (@…)" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
            <input placeholder="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        )}

        {err && <div className="err">{err}</div>}
        {notice && <div className="ok-msg">{notice}</div>}

        <button className="btn btn-primary" disabled={busy || (isAuth ? !username || !password : !email.trim())}>
          {busy ? '…' : view === 'login' ? 'Se connecter' : view === 'register' ? "S'inscrire" : 'Envoyer'}
        </button>

        {view === 'login' && (
          <div className="login-links">
            <button type="button" className="link-btn" onClick={() => reset('forgot-pw')}>Mot de passe oublié ?</button>
            <button type="button" className="link-btn" onClick={() => reset('forgot-user')}>Identifiant oublié ?</button>
          </div>
        )}
        {isAuth && (
          <>
            <button type="button" className="btn btn-ghost" onClick={continueAsGuest}>🎯 Jouer en invité</button>
            <div className="muted" style={{ fontSize: 12, textAlign: 'center' }}>En invité : jeux locaux + entraînement, sans compte.</div>
          </>
        )}
      </form>
    </div>
  );
}
