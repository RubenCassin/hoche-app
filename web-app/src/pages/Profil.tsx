import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStats, getFollowCounts, updateMe, apiError } from '../api';
import { useAuth } from '../auth';

export function Profil() {
  const { user, setUser, signOut } = useAuth();
  const { data: stats } = useQuery({ queryKey: ['stats', user?.id], queryFn: () => getStats(user!.id), enabled: !!user });
  const { data: counts } = useQuery({ queryKey: ['counts', user?.id], queryFn: () => getFollowCounts(user!.id), enabled: !!user });

  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const initials = (user?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const saveInfo = async () => {
    setBusy(true); setMsg(null);
    try { const u = await updateMe({ name: name.trim(), avatarUrl: avatarUrl.trim() || null }); setUser(u); setMsg({ t: 'Profil mis à jour', ok: true }); }
    catch (e) { setMsg({ t: apiError(e), ok: false }); }
    setBusy(false);
  };
  const savePw = async () => {
    setBusy(true); setMsg(null);
    try { await updateMe({ currentPassword: curPw, newPassword: newPw }); setCurPw(''); setNewPw(''); setMsg({ t: 'Mot de passe changé', ok: true }); }
    catch (e) { setMsg({ t: apiError(e), ok: false }); }
    setBusy(false);
  };

  return (
    <div className="page">
      <h1 className="display page-title">Profil</h1>

      <div className="card profil-head">
        <div className="avatar-lg">{avatarUrl ? <img src={avatarUrl} alt="" /> : initials}</div>
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

      <div className="stat-row" style={{ marginTop: 16 }}>
        <Stat label="Moyenne" value={stats?.three_dart_avg ?? 0} accent />
        <Stat label="180s" value={stats?.total_180s ?? 0} />
        <Stat label="Victoires" value={`${stats?.win_pct ?? 0}%`} />
        <Stat label="High CO" value={stats?.highest_checkout ?? 0} />
      </div>

      <h3 className="display section-title">Modifier le profil</h3>
      <div className="form-grid">
        <div className="card form-col">
          <label className="field-label">Nom affiché</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
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
