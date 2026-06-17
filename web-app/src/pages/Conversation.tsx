import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import {
  getMessages, getConversations, sendMessage, markRead, addMembers, createTournament,
  searchUsers, type ChatMessage, type Conversation as Conv, type SearchUser, type Finish,
} from '../api';

const VARIANTS = [301, 501, 701];
const LEGS = [1, 3, 5];

export function Conversation() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const me = user?.id;

  const { data: convs = [] } = useQuery({ queryKey: ['chat-conversations'], queryFn: getConversations });
  const conv: Conv | undefined = convs.find((c) => c.id === id);
  const { data: msgs = [] } = useQuery({ queryKey: ['chat-messages', id], queryFn: () => getMessages(id), enabled: id > 0, refetchInterval: 15000 });

  const [text, setText] = useState('');
  const [panel, setPanel] = useState<null | 'tournament' | 'members'>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Marque lu à l'ouverture et à chaque nouveau message.
  useEffect(() => {
    if (id > 0) markRead(id).then(() => { qc.invalidateQueries({ queryKey: ['chat-unread'] }); qc.invalidateQueries({ queryKey: ['chat-conversations'] }); }).catch(() => {});
  }, [id, msgs.length]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await sendMessage(id, { text: t }).catch(() => {});
    qc.invalidateQueries({ queryKey: ['chat-messages', id] });
    qc.invalidateQueries({ queryKey: ['chat-conversations'] });
  };

  return (
    <div className="page chat-page">
      <div className="play-head" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/messages')}>‹</button>
          <h1 className="display" style={{ fontSize: 26, margin: 0 }}>{conv?.name ?? 'Conversation'}</h1>
        </div>
        {conv?.isGroup && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/direct?host=1&conv=${id}`)}>🎯 1v1</button>
            <button className="btn btn-amber btn-sm" onClick={() => setPanel(panel === 'tournament' ? null : 'tournament')}>🏆 Tournoi</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPanel(panel === 'members' ? null : 'members')}>＋</button>
          </div>
        )}
      </div>

      {panel === 'tournament' && conv && <TournamentForm convId={id} defaultName={conv.name} onCreated={(tid) => navigate(`/tournament/${tid}`)} onClose={() => setPanel(null)} />}
      {panel === 'members' && <AddMembers convId={id} onDone={() => { setPanel(null); qc.invalidateQueries({ queryKey: ['chat-conversations'] }); }} />}

      <div className="thread">
        {msgs.length === 0 ? <div className="muted">Dis quelque chose 👋</div> : msgs.map((m) => (
          <MessageRow key={m.id} m={m} mine={m.senderId === me} isGroup={!!conv?.isGroup} navigate={navigate} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="composer-bar">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
        <button className="btn btn-amber" onClick={send} disabled={!text.trim()}>Envoyer</button>
      </div>
    </div>
  );
}

function MessageRow({ m, mine, isGroup, navigate }: { m: ChatMessage; mine: boolean; isGroup: boolean; navigate: (to: string) => void }) {
  if (m.kind === 'match_invite') {
    const code = m.meta?.code;
    return (
      <div className={'msg-card' + (mine ? ' mine' : '')}>
        {isGroup && !mine && <div className="msg-sender">{m.senderName}</div>}
        <div className="match-badge">🎯 MATCH</div>
        <div>{m.text}</div>
        {code && <button className="btn btn-primary btn-sm" onClick={() => navigate(`/direct?join=${code}`)}>Rejoindre</button>}
      </div>
    );
  }
  if (m.kind === 'tournament') {
    const tid = m.meta?.tournamentId;
    return (
      <div className={'msg-card' + (mine ? ' mine' : '')}>
        {isGroup && !mine && <div className="msg-sender">{m.senderName}</div>}
        <div className="match-badge" style={{ background: 'var(--amber)', color: 'var(--on-accent)' }}>🏆 TOURNOI</div>
        <div>{m.text}</div>
        {tid && <button className="btn btn-amber btn-sm" onClick={() => navigate(`/tournament/${tid}`)}>Voir le tournoi</button>}
      </div>
    );
  }
  return (
    <div className={'chat-bubble' + (mine ? ' mine' : '')}>
      {isGroup && !mine && <div className="msg-sender">{m.senderName}</div>}
      {m.text}
    </div>
  );
}

function TournamentForm({ convId, defaultName, onCreated, onClose }: { convId: number; defaultName: string; onCreated: (id: number) => void; onClose: () => void }) {
  const [name, setName] = useState(`Tournoi ${defaultName}`);
  const [startScore, setStartScore] = useState(501);
  const [legsToWin, setLegsToWin] = useState(1);
  const [finishMode, setFinishMode] = useState<Finish>('double');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try { const t = await createTournament({ conversationId: convId, name: name.trim() || 'Tournoi', startScore, legsToWin, finishMode }); onCreated(t.id); }
    catch { setBusy(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="play-head" style={{ marginBottom: 0 }}><strong>Nouveau tournoi</strong><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      <div className="chip-row">{VARIANTS.map((v) => <button key={v} className={'chip' + (startScore === v ? ' on' : '')} onClick={() => setStartScore(v)}>{v}</button>)}</div>
      <div className="chip-row">{LEGS.map((v) => <button key={v} className={'chip' + (legsToWin === v ? ' on' : '')} onClick={() => setLegsToWin(v)}>premier à {v}</button>)}</div>
      <div className="chip-row">{(['double', 'simple', 'master'] as Finish[]).map((f) => <button key={f} className={'chip' + (finishMode === f ? ' on' : '')} onClick={() => setFinishMode(f)}>{f === 'double' ? 'Double out' : f === 'simple' ? 'Simple out' : 'Master out'}</button>)}</div>
      <button className="btn btn-amber" disabled={busy} onClick={create}>Créer & annoncer dans le groupe</button>
    </div>
  );
}

function AddMembers({ convId, onDone }: { convId: number; onDone: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const t = setTimeout(() => { searchUsers(q).then((r) => { if (active) setResults(r); }).catch(() => {}); }, 200);
    return () => { active = false; clearTimeout(t); };
  }, [q]);
  const add = async (u: SearchUser) => { setBusy(true); await addMembers(convId, [u.id]).catch(() => {}); setBusy(false); onDone(); };
  return (
    <div className="card" style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="play-head" style={{ marginBottom: 0 }}><strong>Ajouter au groupe</strong></div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un joueur…" />
      <div className="search-results">
        {results.map((u) => (
          <button key={u.id} className="search-row" disabled={busy} onClick={() => add(u)}>
            <div className="avatar-sm">{u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : (u.name || '?').slice(0, 2).toUpperCase()}</div>
            <div className="conv-mid"><div className="conv-name">{u.name}</div><div className="muted lb-user">{u.username}</div></div>
            <span className="muted">＋</span>
          </button>
        ))}
      </div>
    </div>
  );
}
