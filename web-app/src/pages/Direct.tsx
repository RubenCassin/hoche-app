import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { liveConnect, onLive, liveSend, liveReady } from '../live';
import { sendMessage } from '../api';
import { checkout } from '../game/x01';
import { getFavorites, hasFavorite } from '../favorites';
import { DartGrid } from '../components/DartGrid';
import { Dartboard } from '../components/Dartboard';
import { MomentOverlay } from '../components/MomentOverlay';

type Phase = 'connecting' | 'idle' | 'waiting' | 'lobby' | 'playing';
type Finish = 'simple' | 'double' | 'master';
interface GS {
  you: number; spectator?: boolean; names: string[];
  config: { startScore: number; legsToWin: number; finishMode: Finish };
  remaining: number[]; legs: number[]; turn: number; winner: number | null; started: boolean; event: string | null;
}
interface Lobby { you: number; code: string; isHost: boolean; names: string[]; maxPlayers: number }
interface Dart { points: number; modifier: 'S' | 'D' | 'T'; segment: number; }
const REACTIONS = ['👏', '🔥', '😅', '🎯', '💪', '😱'];
const VARIANTS = [301, 501, 701];
const LEGS = [1, 3, 5];
const FINISHES: { v: Finish; label: string }[] = [
  { v: 'simple', label: 'Simple' }, { v: 'double', label: 'Double' }, { v: 'master', label: 'Master' },
];
const boardClass = (n: number) => (n <= 2 ? 'board-2' : n === 4 ? 'board-4' : 'board-3');

function dlabel(d: Dart) { if (d.segment === 0) return 'M'; if (d.segment === 25) return d.points === 50 ? 'BULL' : '25'; return `${d.modifier !== 'S' ? d.modifier : ''}${d.segment}`; }
function favSeg(d: string): number { return d === 'BULL' ? 25 : d.startsWith('D') ? parseInt(d.slice(1), 10) : -1; }

export function Direct() {
  const [phase, setPhase] = useState<Phase>(liveReady() ? 'idle' : 'connecting');
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [gs, setGs] = useState<GS | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [oppLeft, setOppLeft] = useState(false);
  const [rematchOffer, setRematchOffer] = useState(false);
  const [rematchSent, setRematchSent] = useState(false);
  const [reported, setReported] = useState(false);

  // Format choisi (salon privé / invitation / match de groupe).
  const [startScore, setStartScore] = useState(501);
  const [legsToWin, setLegsToWin] = useState(3);
  const [finishMode, setFinishMode] = useState<Finish>('double');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const cfg = (mp = maxPlayers) => ({ startScore, legsToWin, finishMode, maxPlayers: mp });

  const [mode, setMode] = useState<'numpad' | 'grid' | 'board'>('numpad');
  const [entry, setEntry] = useState('');
  const [visit, setVisit] = useState<Dart[]>([]);
  const [chat, setChat] = useState<{ fromIdx: number; text: string }[]>([]);
  const [chatText, setChatText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string }[]>([]);
  const [seq, setSeq] = useState(0); // nonce des « moments »
  const rid = useRef(0);
  const inRoom = useRef(false);

  // Entrées directes : ?join=CODE, ?tmatch=ID, ?spectate=CODE,
  // ?invite=ID&name=NOM (défi depuis un profil/présence),
  // ?host=1&conv=ID (crée un salon puis poste l'invitation dans la conversation).
  const [params] = useSearchParams();
  const joinParam = params.get('join');
  const tmatchParam = params.get('tmatch');
  const spectateParam = params.get('spectate');
  const inviteId = params.get('invite') ? Number(params.get('invite')) : null;
  const inviteName = params.get('name') || 'ton ami';
  const hostConv = params.get('host') ? params.get('conv') : null;
  const acted = useRef(false);
  const inviteConv = useRef<number | null>(null);

  useEffect(() => {
    liveConnect();
    const runEntry = () => {
      if (acted.current) return;
      if (joinParam) { acted.current = true; liveSend({ type: 'join', code: joinParam.toUpperCase() }); }
      else if (tmatchParam) { acted.current = true; liveSend({ type: 'join_tournament_match', matchId: Number(tmatchParam) }); }
      else if (spectateParam) { acted.current = true; liveSend({ type: 'spectate', code: spectateParam.toUpperCase() }); }
      // invite / hostConv : pas d'auto-envoi — l'hôte choisit le format puis crée/invite.
    };
    if (liveReady()) { setPhase((p) => (p === 'connecting' ? 'idle' : p)); runEntry(); }
    const off = onLive((m: any) => {
      switch (m.type) {
        case 'connected': setPhase((p) => (p === 'connecting' ? 'idle' : p)); runEntry(); break;
        case 'room':
          setCode(m.code); inRoom.current = true; setPhase('waiting');
          if (m.invitedName) setNote(`Invitation envoyée à ${m.invitedName}…`);
          if (inviteConv.current) {
            sendMessage(inviteConv.current, { text: '🎯 Match lancé — tape « Rejoindre » !', kind: 'match_invite', meta: { code: m.code } }).catch(() => {});
            inviteConv.current = null;
            setNote('Invitation postée dans le groupe.');
          }
          break;
        case 'lobby':
          setLobby({ you: m.you, code: m.code, isHost: m.isHost, names: m.names, maxPlayers: m.maxPlayers });
          setCode(m.code); inRoom.current = true; setPhase('lobby');
          break;
        case 'state':
          inRoom.current = true; setGs(m); setPhase('playing'); setVisit([]); setRematchOffer(false); setRematchSent(false); setReported(false); setSeq((x) => x + 1);
          break;
        case 'chat': setChat((c) => [...c, { fromIdx: m.fromIdx, text: m.text }]); break;
        case 'reaction': { const id = ++rid.current; setReactions((r) => [...r, { id, emoji: m.emoji }]); setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2200); break; }
        case 'rematch_offer': setRematchOffer(true); break;
        case 'reported': setReported(true); break;
        case 'opponent_left': setOppLeft(true); break;
        case 'invite_offline': setNote("Ton ami n'est pas en ligne. Partage-lui le code ci-dessous."); break;
        case 'invite_declined': setNote(`${m.byName || 'Ton ami'} a refusé l'invitation.`); inRoom.current = false; setPhase('idle'); break;
        case 'error': setErr(m.error); setTimeout(() => setErr(null), 3000); break;
      }
    });
    return () => { off(); if (inRoom.current) liveSend({ type: 'leave' }); };
  }, []);

  const leave = () => { liveSend({ type: 'leave' }); inRoom.current = false; setGs(null); setLobby(null); setOppLeft(false); setPhase('idle'); setCode(null); setNote(null); };
  const submit = (total: number) => { liveSend({ type: 'visit', total }); setEntry(''); setVisit([]); };
  const onDart = (points: number, modifier: 'S' | 'D' | 'T', segment: number) => {
    if (!gs) return;
    const next = [...visit, { points, modifier, segment }];
    const total = next.reduce((s, d) => s + d.points, 0);
    const proj = gs.remaining[gs.you] - total;
    if (next.length >= 3 || proj <= 0 || (gs.config.finishMode !== 'simple' && proj === 1)) submit(total);
    else setVisit(next);
  };
  const createRoom = () => { if (hostConv) inviteConv.current = Number(hostConv); liveSend({ type: 'create', config: cfg() }); };
  const invite = () => liveSend({ type: 'invite', toUserId: inviteId, toName: inviteName, config: cfg(2) });

  if (phase === 'connecting') return <div className="page"><h1 className="display page-title">En direct</h1><p className="muted">Connexion au serveur…</p></div>;

  if (oppLeft) {
    return <div className="page"><h1 className="display page-title">En direct</h1><div className="card win-card"><div className="display win-name">Adversaire parti 👋</div><button className="btn btn-primary" onClick={leave}>Retour</button></div></div>;
  }

  // ── Salon (idle) ──
  if (phase === 'idle') {
    return (
      <div className="page">
        <h1 className="display page-title">{inviteId ? `Défier ${inviteName}` : hostConv ? 'Match de groupe' : 'Jouer en direct'}</h1>
        <div className="card setup" style={{ maxWidth: 540 }}>
          <Row label="Score">{VARIANTS.map((v) => <button key={v} className={'chip' + (startScore === v ? ' on' : '')} onClick={() => setStartScore(v)}>{v}</button>)}</Row>
          <Row label="Legs (premier à)">{LEGS.map((v) => <button key={v} className={'chip' + (legsToWin === v ? ' on' : '')} onClick={() => setLegsToWin(v)}>{v}</button>)}</Row>
          <Row label="Sortie">{FINISHES.map((f) => <button key={f.v} className={'chip' + (finishMode === f.v ? ' on' : '')} onClick={() => setFinishMode(f.v)}>{f.label}</button>)}</Row>

          {inviteId ? (
            <button className="btn btn-primary" onClick={invite}>⚔️ Inviter {inviteName}</button>
          ) : (
            <>
              <Row label="Joueurs">{[2, 3, 4, 5, 6].map((n) => <button key={n} className={'chip' + (maxPlayers === n ? ' on' : '')} onClick={() => setMaxPlayers(n)}>{n}</button>)}</Row>
              {hostConv ? (
                <>
                  <button className="btn btn-primary" onClick={createRoom}>{maxPlayers > 2 ? `Créer la partie (${maxPlayers} joueurs)` : 'Créer le 1v1'}</button>
                  <div className="muted">{maxPlayers > 2 ? 'Les membres rejoignent depuis le groupe, puis tu lances.' : 'Les 2 premiers qui rejoignent jouent.'}</div>
                </>
              ) : (
                <>
                  {maxPlayers === 2 && <button className="btn btn-primary" onClick={() => liveSend({ type: 'quick' })}>⚡ Partie rapide (1v1)</button>}
                  <button className="btn btn-amber" onClick={createRoom}>{maxPlayers > 2 ? `Créer un salon (${maxPlayers} joueurs)` : 'Créer un salon privé'}</button>
                  <div className="join-row">
                    <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))} placeholder="CODE" />
                    <button className="btn btn-ghost" disabled={joinCode.length < 4} onClick={() => liveSend({ type: 'join', code: joinCode })}>Rejoindre</button>
                  </div>
                </>
              )}
            </>
          )}
          {note && <div className="muted">{note}</div>}
          {err && <div className="err">{err}</div>}
        </div>
      </div>
    );
  }

  // ── En attente (1v1) ──
  if (phase === 'waiting') {
    return (
      <div className="page"><h1 className="display page-title">En direct</h1>
        <div className="card win-card">
          <div className="muted">Code du salon</div>
          <div className="display win-name" style={{ letterSpacing: 8 }}>{code}</div>
          <div className="muted">{note || "En attente d'un adversaire…"}</div>
          <button className="btn btn-ghost" onClick={leave}>Annuler</button>
        </div>
      </div>
    );
  }

  // ── Lobby (salle 3-6, avant le coup d'envoi) ──
  if (phase === 'lobby' && lobby) {
    const full = lobby.names.length >= lobby.maxPlayers;
    return (
      <div className="page"><h1 className="display page-title">Salon de groupe</h1>
        <div className="card" style={{ maxWidth: 520, textAlign: 'center' }}>
          <div className="muted">Code du salon</div>
          <div className="display win-name" style={{ letterSpacing: 8, color: 'var(--amber)' }}>{lobby.code}</div>
          <div className="muted" style={{ marginBottom: 8 }}>{lobby.names.length}/{lobby.maxPlayers} joueurs</div>
          <div className="conv-list" style={{ textAlign: 'left' }}>
            {lobby.names.map((n, i) => (
              <div key={i} className="lobby-row">
                <div className="avatar-sm">{(n || '?').slice(0, 2).toUpperCase()}</div>
                <span>{n}{i === lobby.you ? ' · toi' : ''}{i === 0 ? ' 👑' : ''}</span>
              </div>
            ))}
          </div>
          {lobby.isHost ? (
            <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={lobby.names.length < 2} onClick={() => liveSend({ type: 'start' })}>
              {lobby.names.length < 2 ? "En attente d'un 2e joueur…" : full ? 'Démarrer' : `Démarrer (${lobby.names.length} joueurs)`}
            </button>
          ) : (
            <p className="muted" style={{ marginTop: 14 }}>En attente du lancement par l'hôte…</p>
          )}
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={leave}>Quitter</button>
        </div>
      </div>
    );
  }

  // ── Partie (ou spectateur) ──
  if (!gs) return null;
  const me = gs.you; const isOver = gs.winner !== null; const isSpectator = !!gs.spectator;
  const myTurn = !isSpectator && gs.turn === me && !isOver;
  const multi = gs.names.length > 2;
  const visitTotal = visit.reduce((s, d) => s + d.points, 0);
  const coRem = gs.remaining[me] - (mode === 'numpad' ? 0 : visitTotal);
  const co = myTurn ? checkout(coRem, gs.config.finishMode, getFavorites()) : null;

  return (
    <div className="page play">
      <MomentOverlay event={gs.event} nonce={seq} />
      <div className="play-head">
        <div className="muted mono">{isSpectator ? '👁 Spectateur · ' : ''}{gs.config.startScore} · premier à {gs.config.legsToWin}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isSpectator && <button className="btn btn-ghost btn-sm" onClick={() => setChatOpen((o) => !o)}>💬{chat.length ? ` ${chat.length}` : ''}</button>}
          <button className="btn btn-ghost btn-sm" onClick={leave}>Quitter</button>
        </div>
      </div>

      <div className={'board ' + boardClass(gs.names.length)}>
        {gs.names.map((nm, i) => (
          <div key={i} className={'pscore' + (i === gs.turn && !isOver ? ' active' : '') + (gs.winner === i ? ' winner' : '')}>
            <div className="pscore-name">{nm}{i === me && !isSpectator ? ' · toi' : ''}{gs.winner === i ? ' 🏆' : ''}</div>
            <div className="display pscore-rem">{gs.remaining[i]}</div>
            <div className="pscore-meta mono"><span>{gs.legs[i]} legs</span></div>
          </div>
        ))}
      </div>

      {reactions.length > 0 && <div className="react-float">{reactions.map((r) => <span key={r.id}>{r.emoji}</span>)}</div>}

      {isOver ? (
        <div className="card win-card">
          {isSpectator ? (
            <>
              <div className="eyebrow" style={{ color: 'var(--amber)' }}>🏆 Vainqueur</div>
              <div className="display win-name">{gs.names[gs.winner!]}</div>
            </>
          ) : (
            <>
              <div className="eyebrow" style={{ color: gs.winner === me ? 'var(--win)' : 'var(--brick)' }}>{gs.winner === me ? 'Victoire' : 'Défaite'}</div>
              <div className="display win-name">{multi ? gs.names[gs.winner!] : gs.legs.join(' — ')}</div>
            </>
          )}
          {!isSpectator && !multi && rematchOffer && !rematchSent && <div className="amber-tag">{gs.names[1 - me]} veut rejouer !</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            {!isSpectator && !multi && <button className="btn btn-primary" disabled={rematchSent} onClick={() => { setRematchSent(true); liveSend({ type: 'rematch' }); }}>Revanche</button>}
            <button className="btn btn-ghost" onClick={leave}>Quitter</button>
          </div>
          {!isSpectator && gs.winner !== me && (
            reported
              ? <div className="muted" style={{ fontSize: 12 }}>⚠ Match signalé — merci, l'Elo est annulé.</div>
              : <button className="btn btn-ghost btn-sm" style={{ color: 'var(--brick)' }} onClick={() => liveSend({ type: 'report' })}>⚠ Signaler un score suspect</button>
          )}
        </div>
      ) : (
        <>
          <div className="co-line">
            {gs.event === 'bust' && <span className="bust-tag">BUST</span>}
            {gs.event === '180' && <span className="amber-tag">💥 180 !</span>}
            {co && <><span className="muted">Checkout :</span>{co.map((d, k) => { const fav = hasFavorite(favSeg(d)); return <span key={k} className={'co-pill' + (d.startsWith('D') || d === 'BULL' ? ' dbl' : '') + (fav ? ' fav' : '')}>{fav ? '★ ' : ''}{d}</span>; })}</>}
          </div>
          {myTurn ? (
            <>
              <div className="seg" style={{ maxWidth: 360, marginBottom: 12 }}>
                <button className={'seg-btn' + (mode === 'numpad' ? ' on' : '')} onClick={() => { setMode('numpad'); setVisit([]); }}>Numpad</button>
                <button className={'seg-btn' + (mode === 'grid' ? ' on' : '')} onClick={() => { setMode('grid'); setEntry(''); }}>Grille</button>
                <button className={'seg-btn' + (mode === 'board' ? ' on' : '')} onClick={() => { setMode('board'); setEntry(''); }}>Cible</button>
              </div>
              {mode === 'numpad' ? (
                <div className="numpad-wrap">
                  <div className="entry mono">{entry || '0'}</div>
                  <div className="numpad">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <button key={d} className="num" onClick={() => setEntry((e) => (e + d).replace(/^0+/, '').slice(0, 3))}>{d}</button>)}
                    <button className="num" onClick={() => setEntry((e) => e.slice(0, -1))}>←</button>
                    <button className="num" onClick={() => setEntry((e) => (e + '0').replace(/^0+/, '').slice(0, 3))}>0</button>
                    <button className="num num-ok" onClick={() => { const t = parseInt(entry, 10); if (!isNaN(t)) submit(t); }}>OK</button>
                  </div>
                  <div className="quick-row">{[26, 41, 45, 60, 81, 100, 140, 180, 0].map((q) => <button key={q} className="chip" onClick={() => submit(q)}>{q}</button>)}</div>
                </div>
              ) : (
                <>
                  <div className="visit-strip">{[0, 1, 2].map((i) => <span key={i} className={'visit-slot' + (visit[i] ? ' filled' : '')}>{visit[i] ? dlabel(visit[i]) : '—'}</span>)}<span className="mono visit-total">Σ {visitTotal}</span></div>
                  {mode === 'grid'
                    ? <DartGrid onDart={onDart} onUndo={visit.length ? () => setVisit((v) => v.slice(0, -1)) : undefined} />
                    : <Dartboard onDart={onDart} onUndo={visit.length ? () => setVisit((v) => v.slice(0, -1)) : undefined} />}
                </>
              )}
            </>
          ) : (
            <div className="turn-line muted">{isSpectator ? '👁 ' : ''}Au tour de <b>{gs.names[gs.turn]}</b>…</div>
          )}
          <div className="react-row">{REACTIONS.map((e) => <button key={e} className="react-btn" onClick={() => liveSend({ type: 'reaction', emoji: e })}>{e}</button>)}</div>
        </>
      )}

      {chatOpen && !isSpectator && (
        <div className="card chat-panel">
          <div className="chat-msgs">
            {chat.length === 0 ? <div className="muted">Dis quelque chose 👋</div> : chat.map((c, i) => (
              <div key={i} className={'chat-bubble' + (c.fromIdx === me ? ' mine' : '')}>{c.text}</div>
            ))}
          </div>
          <div className="join-row">
            <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Message…" onKeyDown={(e) => { if (e.key === 'Enter' && chatText.trim()) { liveSend({ type: 'chat', text: chatText.trim() }); setChatText(''); } }} />
            <button className="btn btn-amber btn-sm" onClick={() => { if (chatText.trim()) { liveSend({ type: 'chat', text: chatText.trim() }); setChatText(''); } }}>Envoi</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="setup-row"><div className="field-label">{label}</div><div className="chip-row">{children}</div></div>;
}
