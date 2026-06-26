import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStats, getFollowCounts, updateMe, uploadAvatar, apiError } from '../api';
import { useAuth } from '../auth';
import { BADGES } from '../badges';
import { getFavorites, toggleFavorite } from '../favorites';

export function Profil() {
  const { user, setUser, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: stats } = useQuery({ queryKey: ['stats', user?.id], queryFn: () => getStats(user!.id), enabled: !!user });
  const { data: counts } = useQuery({ queryKey: ['counts', user?.id], queryFn: () => getFollowCounts(user!.id), enabled: !!user });

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [favs, setFavs] = useState<number[]>(getFavorites());

  const initials = (user?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const saveInfo = async () => {
    setBusy(true); setMsg(null);
    try { const u = await updateMe({ name: name.trim(), avatarUrl: avatarUrl.trim() || null, email: email.trim() || null }); setUser(u); setMsg({ t: 'Profil mis à jour', ok: true }); }
    catch (e) { setMsg({ t: apiError(e), ok: false }); }
    setBusy(false);
  };
  const savePw = async () => {
    setBusy(true); setMsg(null);
    try { await updateMe({ currentPassword: curPw, newPassword: newPw }); setCurPw(''); setNewPw(''); setMsg({ t: 'Mot de passe changé', ok: true }); }
    catch (e) { setMsg({ t: apiError(e), ok: false }); }
    setBusy(false);
  };

  // Toggle d'un double préféré → maj locale (solveur) + persistance sur le compte.
  const onToggleFav = (seg: number) => {
    const next = toggleFavorite(seg);
    setFavs(next);
    if (user) updateMe({ favoriteDoubles: next }).then(setUser).catch(() => {});
  };

  // Upload d'avatar : on redimensionne en 256px (carré centré) → JPEG léger → backend.
  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setBusy(true); setMsg(null);
        try { const u = await uploadAvatar(dataUrl); setUser(u); setAvatarUrl(u.avatarUrl ?? ''); setMsg({ t: 'Photo mise à jour', ok: true }); }
        catch (err) { setMsg({ t: apiError(err), ok: false }); }
        setBusy(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page">
      <h1 className="display page-title">Profil</h1>

      <div className="card profil-head">
        <label className="avatar-lg avatar-edit" title="Changer la photo">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
          <span className="avatar-cam">📷</span>
          <input type="file" accept="image/*" onChange={onPickAvatar} disabled={busy} hidden />
        </label>
        <div className="profil-id">
          <div className="display profil-name">{user?.name}</div>
          <div className="muted">{user?.username}</div>
          <div className="profil-counts">
            <span><b>{counts?.followers ?? 0}</b> abonnés</span>
            <span><b>{counts?.following ?? 0}</b> abonnements</span>
            <span className="elo-pill">Elo {user?.elo ?? 1000}</span>
          </div>
        </div>
      </div>

      <div className="chip-row" style={{ marginTop: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/notifications')}>🔔 Notifications</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/challenges')}>🎯 Défis</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/historique')}>📜 Historique</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/stats')}>📊 Stats</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/bloques')}>🚫 Bloqués</button>
      </div>

      <div className="stat-row" style={{ marginTop: 16 }}>
        <Stat label="Moyenne" value={stats?.three_dart_avg ?? 0} accent />
        <Stat label="180s" value={stats?.total_180s ?? 0} />
        <Stat label="Victoires" value={`${stats?.win_pct ?? 0}%`} />
        <Stat label="High CO" value={stats?.highest_checkout ?? 0} />
      </div>

      {stats && (
        <>
          <h3 className="display section-title">Badges ({BADGES.filter((b) => b.test(stats)).length}/{BADGES.length})</h3>
          <div className="drill-grid">
            {BADGES.map((b) => {
              const got = b.test(stats);
              const { value, goal } = b.progress(stats);
              return (
                <div key={b.id} className="card drill-card" style={{ borderLeftColor: got ? 'var(--amber)' : 'var(--edge)', opacity: got ? 1 : 0.7 }}>
                  <div className="drill-top"><span className="drill-name">{got ? '🏅' : '🔒'} {b.name}</span></div>
                  <div className="drill-desc">{b.how}</div>
                  {!got && (
                    <>
                      <div className="progress-track" style={{ marginTop: 6, marginBottom: 4 }}><div className="progress-fill" style={{ width: `${Math.min(100, (value / goal) * 100)}%` }} /></div>
                      <div className="muted" style={{ fontSize: 12 }}>{Math.min(value, goal)} / {goal}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <h3 className="display section-title">Doubles préférés</h3>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>La suggestion de checkout privilégie ces doubles quand c'est possible sans rallonger la finition.</p>
        <div className="fav-grid">
          {[...Array(20)].map((_, i) => {
            const seg = i + 1; const on = favs.includes(seg);
            return <button key={seg} className={'fav-cell' + (on ? ' on' : '')} onClick={() => onToggleFav(seg)}>D{seg}</button>;
          })}
          <button className={'fav-cell' + (favs.includes(25) ? ' on' : '')} onClick={() => onToggleFav(25)}>Bull</button>
        </div>
      </div>

      <h3 className="display section-title">Modifier le profil</h3>
      <div className="form-grid">
        <div className="card form-col">
          <label className="field-label">Nom affiché</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <label className="field-label">Email <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>(récupération de compte)</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" />
          <label className="field-label">Avatar (URL)</label>
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
          <button className="btn btn-amber" onClick={saveInfo} disabled={busy}>Enregistrer</button>
        </div>
        <div className="card form-col">
          <label className="field-label">Mot de passe actuel</label>
          <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
          <label className="field-label">Nouveau (8 car., lettre + chiffre)</label>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <button className="btn btn-ghost" onClick={savePw} disabled={busy || !curPw || !newPw}>Changer le mot de passe</button>
        </div>
      </div>
      {msg && <div className={msg.ok ? 'ok-msg' : 'err'} style={{ marginTop: 12 }}>{msg.t}</div>}

      <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={signOut}>Se déconnecter</button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="display stat-value" style={{ color: accent ? 'var(--amber)' : 'var(--cream)' }}>{value}</div>
    </div>
  );
}
