import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword, apiError } from '../api';
import { OcheMark } from '../components/Logo';

// Page de réinitialisation ouverte depuis le lien email (accessible déconnecté).
export function Reset() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try { const r = await resetPassword(token, pw); setDone(r.username); }
    catch (e2) { setErr(apiError(e2, 'Lien invalide ou expiré')); setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <OcheMark size={64} />
        <h1 className="display login-title" style={{ marginTop: 12 }}>HOCHE</h1>
      </div>
      <form className="card login-card" onSubmit={submit}>
        <strong>Nouveau mot de passe</strong>
        {!token && <div className="err">Lien invalide ou incomplet.</div>}
        {done ? (
          <>
            <div className="ok-msg">Mot de passe changé pour {done} ✓</div>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>Aller à la connexion</button>
          </>
        ) : (
          <>
            <input type="password" placeholder="Nouveau (8 car., lettre + chiffre)" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            {err && <div className="err">{err}</div>}
            <button className="btn btn-primary" disabled={busy || !token || pw.length < 8}>{busy ? '…' : 'Valider'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/', { replace: true })}>Annuler</button>
          </>
        )}
      </form>
    </div>
  );
}
