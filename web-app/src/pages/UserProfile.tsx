import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProfile, getH2H, getEloHistory, followUser, unfollowUser, blockUser, unblockUser,
  createDirect, createChallenge,
} from '../api';
import { Sparkline } from '../components/Sparkline';
import { BADGES } from '../badges';

const GAME_TYPES = [
  { key: 'x01', label: 'X01' }, { key: 'cricket', label: 'Cricket' },
  { key: 'atc', label: 'Around the Clock' }, { key: 'killer', label: 'Killer' }, { key: 'shanghai', label: 'Shanghai' },
];

export function UserProfile() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: p, isLoading } = useQuery({ queryKey: ['profile', id], queryFn: () => getProfile(id), enabled: id > 0 });
  const { data: h2h } = useQuery({ queryKey: ['h2h', id], queryFn: () => getH2H(id), enabled: id > 0 });
  const { data: elo = [] } = useQuery({ queryKey: ['elo', id], queryFn: () => getEloHistory(id), enabled: id > 0 });
  const [challenging, setChallenging] = useState(false);

  if (isLoading || !p) return <div className="page"><h1 className="display page-title">Profil</h1><p className="muted">Chargement…</p></div>;

  const refresh = () => qc.invalidateQueries({ queryKey: ['profile', id] });
  const toggleFollow = async () => { p.relation.following ? await unfollowUser(id).catch(() => {}) : await followUser(id).catch(() => {}); refresh(); };
  const toggleBlock = async () => { p.relation.blocked ? await unblockUser(id).catch(() => {}) : await blockUser(id).catch(() => {}); refresh(); };
  const message = async () => { const c = await createDirect(id).catch(() => null); if (c) navigate(`/messages/${c.id}`); };

  const s = p.stats;
  const earned = BADGES.filter((b) => b.test(s));

  return (
    <div className="page">
      <div className="play-head" style={{ marginBottom: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>‹ Retour</button>
      </div>

      <div className="profil-head">
        <div className="avatar-lg">{p.user.avatarUrl ? <img src={p.user.avatarUrl} alt="" /> : (p.user.name || '?').slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="display profil-name">{p.user.name}</div>
          <div className="muted">{p.user.username}</div>
          <div className="profil-counts">
            <span className="elo-pill">Elo {p.user.elo ?? 1000}</span>
            <span><b>{p.counts.followers}</b> abonnés</span>
            <span><b>{p.counts.following}</b> abonnements</span>
          </div>
        </div>
      </div>

      {!p.relation.isSelf && (
        <div className="chip-row" style={{ margin: '16px 0' }}>
          <button className="btn btn-primary btn-sm" onClick={toggleFollow}>{p.relation.following ? 'Suivi ✓' : 'Suivre'}</button>
          <button className="btn btn-ghost btn-sm" onClick={message}>💬 Message</button>
          <button className="btn btn-amber btn-sm" onClick={() => setChallenging((v) => !v)}>🎯 Défier</button>
          <button className="btn btn-ghost btn-sm" onClick={toggleBlock}>{p.relation.blocked ? 'Débloquer' : '🚫 Bloquer'}</button>
        </div>
      )}
      {p.relation.blocked && <div className="card" style={{ marginBottom: 12 }}><span className="muted">Tu as bloqué ce joueur.</span></div>}

      {challenging && <ChallengeForm toId={id} onDone={() => setChallenging(false)} />}

      {elo.length >= 2 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field-label" style={{ marginTop: 0 }}>Courbe Elo</div>
          <Sparkline values={elo.map((e) => e.elo)} />
        </div>
      )}

      {h2h && h2h.played > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field-label" style={{ marginTop: 0 }}>Face à face</div>
          <div className="mono" style={{ fontSize: 18 }}><b style={{ color: 'var(--win)' }}>{h2h.won}V</b> — <b style={{ color: 'var(--brick)' }}>{h2h.lost}D</b> <span className="muted">({h2h.played} matchs)</span></div>
        </div>
      )}

      <h3 className="display section-title">Stats</h3>
      <div className="stats-grid">
        <Stat label="Moyenne" value={s.three_dart_avg} accent />
        <Stat label="Parties" value={s.matches_played} />
        <Stat label="Victoires" value={`${s.win_pct}%`} />
        <Stat label="180s" value={s.total_180s} />
        <Stat label="Checkout %" value={`${s.checkout_pct}%`} />
        <Stat label="High checkout" value={s.highest_checkout} />
        <Stat label="Meilleure moy." value={s.best_game_avg} />
        <Stat label="Série victoires" value={s.best_win_streak} />
      </div>

      {earned.length > 0 && (
        <>
          <h3 className="display section-title">Badges ({earned.length})</h3>
          <div className="chip-row">{earned.map((b) => <span key={b.id} className="chip on" title={b.how}>🏅 {b.name}</span>)}</div>
        </>
      )}
    </div>
  );
}

function ChallengeForm({ toId, onDone }: { toId: number; onDone: () => void }) {
  const [gameType, setGameType] = useState('x01');
  const [legsToWin, setLegsToWin] = useState(3);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const send = async () => { await createChallenge({ toUserId: toId, gameType, legsToWin, message }).catch(() => {}); setSent(true); setTimeout(onDone, 900); };
  return (
    <div className="card" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="field-label" style={{ marginTop: 0 }}>Lancer un défi</div>
      <div className="chip-row">{GAME_TYPES.map((g) => <button key={g.key} className={'chip' + (gameType === g.key ? ' on' : '')} onClick={() => setGameType(g.key)}>{g.label}</button>)}</div>
      <div className="chip-row">{[1, 3, 5].map((v) => <button key={v} className={'chip' + (legsToWin === v ? ' on' : '')} onClick={() => setLegsToWin(v)}>premier à {v}</button>)}</div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Petit mot (optionnel)" maxLength={140} />
      <button className="btn btn-amber" disabled={sent} onClick={send}>{sent ? 'Défi envoyé ✓' : 'Envoyer le défi'}</button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="display stat-value" style={{ color: accent ? 'var(--amber)' : 'var(--cream)', fontSize: 34 }}>{value}</div>
    </div>
  );
}
