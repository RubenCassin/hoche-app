import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConversations, searchUsers, createDirect, createGroup, markRead,
  type Conversation, type SearchUser,
} from '../api';

function initials(name: string) { return (name || '?').trim().slice(0, 2).toUpperCase(); }
function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return 'à l’instant';
  if (d < 3600) return `${Math.floor(d / 60)} min`;
  if (d < 86400) return `${Math.floor(d / 3600)} h`;
  return `${Math.floor(d / 86400)} j`;
}
function preview(c: Conversation) {
  if (!c.lastMessage) return 'Nouvelle conversation';
  if (c.lastMessage.kind === 'match_invite') return '🎯 Match lancé';
  if (c.lastMessage.kind === 'tournament') return '🏆 Tournoi';
  return c.lastMessage.text;
}

export function Messages() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: convs = [], isLoading } = useQuery({ queryKey: ['chat-conversations'], queryFn: getConversations, refetchInterval: 20000 });

  const [composing, setComposing] = useState<null | 'dm' | 'group'>(null);

  const open = async (c: Conversation) => {
    if (c.unread > 0) { await markRead(c.id).catch(() => {}); qc.invalidateQueries({ queryKey: ['chat-unread'] }); }
    navigate(`/messages/${c.id}`);
  };

  return (
    <div className="page">
      <div className="play-head" style={{ marginBottom: 8 }}>
        <h1 className="display page-title" style={{ margin: 0 }}>Messages</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setComposing(composing === 'dm' ? null : 'dm')}>＋ Message</button>
          <button className="btn btn-amber btn-sm" onClick={() => setComposing(composing === 'group' ? null : 'group')}>＋ Groupe</button>
        </div>
      </div>

      {composing && <Composer mode={composing} onDone={() => setComposing(null)} onCreated={(id) => { setComposing(null); navigate(`/messages/${id}`); }} />}

      {isLoading ? (
        <p className="muted">Chargement…</p>
      ) : convs.length === 0 ? (
        <div className="card"><p className="muted">Aucune conversation. Lance un message ou crée un groupe pour jouer entre amis.</p></div>
      ) : (
        <div className="conv-list">
          {convs.map((c) => (
            <button key={c.id} className="conv-row" onClick={() => open(c)}>
              <div className="avatar-sm">{c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : c.isGroup ? '👥' : initials(c.name)}</div>
              <div className="conv-mid">
                <div className="conv-top"><span className="conv-name">{c.name}</span><span className="conv-time muted">{c.lastMessage ? ago(c.lastMessage.created_at) : ''}</span></div>
                <div className={'conv-prev' + (c.unread > 0 ? ' bold' : '')}>{preview(c)}</div>
              </div>
              {c.unread > 0 && <span className="conv-badge">{c.unread}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({ mode, onDone, onCreated }: { mode: 'dm' | 'group'; onDone: () => void; onCreated: (id: number) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<SearchUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const t = setTimeout(() => { searchUsers(q).then((r) => { if (active) setResults(r); }).catch(() => {}); }, 200);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  const toggle = (u: SearchUser) => setPicked((p) => p.some((x) => x.id === u.id) ? p.filter((x) => x.id !== u.id) : [...p, u]);

  const startDm = async (u: SearchUser) => {
    setBusy(true);
    try { const c = await createDirect(u.id); onCreated(c.id); } catch { setErr('Impossible de créer la conversation'); setBusy(false); }
  };
  const makeGroup = async () => {
    if (!name.trim() || picked.length < 1) return;
    setBusy(true);
    try { const c = await createGroup(name.trim(), picked.map((p) => p.id)); onCreated(c.id); } catch { setErr('Impossible de créer le groupe'); setBusy(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="play-head" style={{ marginBottom: 0 }}>
        <strong>{mode === 'dm' ? 'Nouveau message' : 'Nouveau groupe'}</strong>
        <button className="btn btn-ghost btn-sm" onClick={onDone}>✕</button>
      </div>
      {mode === 'group' && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du groupe" maxLength={60} />}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un joueur…" />
      {mode === 'group' && picked.length > 0 && (
        <div className="chip-row">{picked.map((p) => <button key={p.id} className="chip on" onClick={() => toggle(p)}>{p.name} ✕</button>)}</div>
      )}
      <div className="search-results">
        {results.map((u) => {
          const sel = picked.some((x) => x.id === u.id);
          return (
            <button key={u.id} className={'search-row' + (sel ? ' sel' : '')} disabled={busy}
              onClick={() => (mode === 'dm' ? startDm(u) : toggle(u))}>
              <div className="avatar-sm">{u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : initials(u.name)}</div>
              <div className="conv-mid"><div className="conv-name">{u.name}</div><div className="muted lb-user">{u.username}</div></div>
              {mode === 'group' && <span className="muted">{sel ? '✓' : '＋'}</span>}
            </button>
          );
        })}
        {results.length === 0 && <div className="muted" style={{ padding: 8 }}>Aucun joueur.</div>}
      </div>
      {mode === 'group' && <button className="btn btn-amber" disabled={busy || !name.trim() || picked.length < 1} onClick={makeGroup}>Créer le groupe ({picked.length})</button>}
      {err && <div className="err">{err}</div>}
    </div>
  );
}
