import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { liveConnect, onLive, liveSend, liveReady } from '../live';
import { sendMessage } from '../api';
import { checkout } from '../game/x01';
import { DartGrid } from '../components/DartGrid';

type Phase = 'connecting' | 'idle' | 'waiting' | 'playing';
interface GS {
  you: number; names: string[]; config: { startScore: number; legsToWin: number; finishMode: 'simple' | 'double' | 'master' };
  remaining: number[]; legs: number[]; turn: number; winner: number | null; started: boolean; event: string | null;
}
interface Dart { points: number; modifier: 'S' | 'D' | 'T'; segment: number; }
const REACTIONS = ['👏', '🔥', '😅', '🎯', '💪', '😱'];
const VARIANTS = [301, 501, 701];
const LEGS = [1, 3, 5];

function dlabel(d: Dart) { if (d.segment === 0) return 'M'; if (d.segment === 25) return d.points === 50 ? 'BULL' : '25'; return `${d.modifier !== 'S' ? d.modifier : ''}${d.segment}`; }

export function Direct() {
  const [phase, setPhase] = useState<Phase>(liveReady() ? 'idle' : 'connecting');
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [gs, setGs] = useState<GS | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [oppLeft, setOppLeft] = useState(false);
  const [rematchOffer, setRematchOffer] = useState(false);
  const [rematchSent, setRematchSent] = useState(false);
  const [startScore, setStartScore] = useState(501);
  const [legsToWin, setLegsToWin] = useState(3);
  const [finishMode] = useState<'double'>('double');

  const [mode, setMode] = useState<'numpad' | 'grid'>('numpad');
  const [entry, setEntry] = useState('');
  const [visit, setVisit] = useState<Dart[]>([]);
  const [chat, setChat] = useState<{ fromIdx: number; text: string }[]>([]);
  const [chatText, setChatText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string }[]>([]);
  const rid = useRef(0);
  const inRoom = useRef(false);

  // Entrée directe depuis le chat / tournoi : ?join=CODE, ?tmatch=ID,
  // ?host=1&conv=ID (crée un salon puis poste l'invitation dans la conversation).
  const [params] = useSearchParams();
  const joinParam = params.get('join');
  const tmatchParam = params.get('tmatch');
  const hostConv = params.get('host') ? params.get('conv') : null;
  const acted = useRef(false);
  const inviteConv = useRef<number | null>(null);

  useEffect(() => {
    liveConnect();
    const runEntry = () => {
      if (acted.current) return;
      if (joinParam) { acted.current = true; liveSend({ type: 'join', code: joinParam.toUpperCase() }); }
      else if (tmatchParam) { acted.current = true; liveSend({ type: 'join_tournament_match', matchId: Number(tmatchParam) }); }
      else if (hostConv) { acted.current = true; inviteConv.current = Number(hostConv); liveSend({ type: 'create', config: { startScore, legsToWin, finishMode } }); }
    };
    if (liveReady()) { setPhase((p) => (p === 'connecting' ? 'idle' : p)); runEntry(); }
    const off = onLive((m: any) => {
      switch (m.type) {
        case 'connected': setPhase((p) => (p === 'connecting' ? 'idle' : p)); runEntry(); break;
        case 'room':
          setCode(m.code); inRoom.current = true; setPhase('waiting');
          if (inviteConv.current) {
            sendMessage(inviteConv.current, { text: '🎯 Match lancé — tape « Rejoindre » !', kind: 'match_invite', meta: { code: m.code } }).catch(() => {});
            inviteConv.current = null;
          }
          break;
        case 'state':
          inRoom.current = true; setGs(m); setPhase('playing'); setVisit([]); setRematchOffer(false); setRematchSent(false);
          break;
        case 'chat': setChat((c) => [...c, { fromIdx: m.fromIdx, text: m.text }]); break;
        case 'reaction': { const id = ++rid.current; setReactions((r) => [...r, { id, emoji: m.emoji }]); setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2200); break; }
        case 'rematch_offer': setRematchOffer(true); break;
        case 'opponent_left': setOppLeft(true); break;
        case 'invite_offline': setNote("Personne en ligne pour l'instant. Partage le code ci-dessous."); break;
        case 'error': setErr(m.error); setTimeout(() => setErr(null), 3000); break;
      }
    });
    return () => { off(); if (inRoom.current) liveSend({ type: 'leave' }); };
  }, []);

  const leave = () => { liveSend({ type: 'leave' }); inRoom.current = false; setGs(null); setOppLeft(false); setPhase('idle'); setCode(null); };
  const submit = (total: number) => { liveSend({ type: 'visit', total }); setEntry(''); setVisit([]); };
  const onDart = (points: number, modifier: 'S' | 'D' | 'T', segment: number) => {
    if (!gs) return;
    const next = [...visit, { points, modifier, segment }];
    const total = next.reduce((s, d) => s + d.points, 0);
    const proj = gs.remaining[gs.you] - total;
    if (next.length >= 3 || proj <= 0 || (gs.config.finishMode !== 'simple' && proj === 1)) submit(total);
    else setVisit(next);
  };

  if (phase === 'connecting') return <div className="page"><h1 className="display page-title">En direct</h1><p className="muted">Connexion au serveur…</p></div>;

  if (oppLeft) {
    return <div className="page"><h1 className="display page-title">En direct</h1><div className="card win-card"><div className="display win-name">Adversaire parti 👋</div><button className="btn btn-primary" onClick={leave}>Retour</button></div></div>;
  }

  // ── Salon (idle) ──
  if (phase === 'idle') {
    return (
      <div className="page">
        <h1 className="display page-title">Jouer en direct</h1>
        <div className="card setup" style={{ maxWidth: 520 }}>
          <Row label="Score">{VARIANTS.map((v) => <button key={v} className={'chip' + (startScore === v ? ' on' : '')} onClick={() => setStartScore(v)}>{v}</button>)}</Row>
          <Row label="Legs (premier à)">{LEGS.map((v) => <button key={v} className={'chip' + (legsToWin === v ? ' on' : '')} onClick={() => setLegsToWin(v)}>{v}</button>)}</Row>
          <button className="btn btn-primary" onClick={() => liveSend({ type: 'quick' })}>⚡ Partie rapide (1v1)</button>
          <button className="btn btn-amber" onClick={() => liveSend({ type: 'create', config: { startScore, legsToWin, finishMode } })}>Créer un salon privé</button>
          <div className="join-row">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))} placeholder="CODE" />
            <button className="btn btn-ghost" disabled={joinCode.length < 4} onClick={() => liveSend({ type: 'join', code: joinCode })}>Rejoindre</button>
          </div>
          {note && <div className="muted">{note}</div>}
          {err && <div className="err">{err}</div>}
        </div>
      </div>
    );
  }

  // ── En attente ──
  if (phase === 'waiting') {
    return (
      <div className="page"><h1 className="display page-title">En direct</h1>
        <div className="card win-card">
          <div className="muted">Code du salon</div>
          <div className="display win-name" style={{ letterSpacing: 8 }}>{code}</div>
          <div className="muted">En attente d'un adversaire…</div>
          <button className="btn btn-ghost" onClick={leave}>Annuler</button>
        </div>
      </div>
    );
  }

  // ── Partie ──
  if (!gs) return null;
  const me = gs.you; const isOver = gs.winner !== null; const myTurn = gs.turn === me && !isOver;
  const visitTotal = visit.reduce((s, d) => s + d.points, 0);
  const coRem = gs.remaining[me] - (mode === 'grid' ? visitTotal : 0);
  const co = myTurn ? checkout(coRem, gs.config.finishMode !== 'simple') : null;

  return (
    <div className="page play">
      <div className="play-head">
        <div className="muted mono">{gs.config.startScore} · premier à {gs.config.legsToWin}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setChatOpen((o) => !o)}>💬{chat.length ? ` ${chat.length}` : ''}</button>
          <button className="btn btn-ghost btn-sm" onClick={leave}>Quitter</button>
        </div>
      </div>

      <div className="board board-2">
        {gs.names.map((nm, i) => (
          <div key={i} className={'pscore' + (i === gs.turn && !isOver ? ' active' : '') + (gs.winner === i ? ' winner' : '')}>
            <div className="pscore-name">{nm}{i === me ? ' · toi' : ''}{gs.winner === i ? ' 🏆' : ''}</div>
            <div className="display pscore-rem">{gs.remaining[i]}</div>
            <div className="pscore-meta mono"><span>{gs.legs[i]} legs</span></div>
          </div>
        ))}
      </div>

      {reactions.length > 0 && <div className="react-float">{reactions.map((r) => <span key={r.id}>{r.emoji}</span>)}</div>}

      {isOver ? (
        <div className="card win-card">
          <div className="eyebrow" style={{ color: gs.winner === me ? 'var(--win)' : 'var(--brick)' }}>{gs.winner === me ? 'Victoire' : 'Défaite'}</div>
          <div className="display win-name">{gs.legs.join(' — ')}</div>
          {rematchOffer && !rematchSent && <div className="amber-tag">{gs.names[1 - me]} veut rejouer !</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" disabled={rematchSent} onClick={() => { setRematchSent(true); liveSend({ type: 'rematch' }); }}>Revanche</button>
            <button className="btn btn-ghost" onClick={leave}>Quitter</button>
          </div>
        </div>
      ) : (
        <>
          <div className="co-line">
            {gs.event === 'bust' && <span className="bust-tag">BUST</span>}
            {gs.event === '180' && <span className="amber-tag">💥 180 !</span>}
            {co && <><span className="muted">Checkout :</span>{co.map((d, k) => <span key={k} className={'co-pill' + (d.startsWith('D') || d === 'BULL' ? ' dbl' : '')}>{d}</span>)}</>}
          </div>
          {myTurn ? (
            <>
              <div className="seg" style={{ maxWidth: 280, marginBottom: 12 }}>
                <button className={'seg-btn' + (mode === 'numpad' ? ' on' : '')} onClick={() => { setMode('numpad'); setVisit([]); }}>Numpad</button>
                <button className={'seg-btn' + (mode === 'grid' ? ' on' : '')} onClick={() => { setMode('grid'); setEntry(''); }}>Grille</button>
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
                  <DartGrid onDart={onDart} onUndo={visit.length ? () => setVisit((v) => v.slice(0, -1)) : undefined} />
                </>
              )}
            </>
          ) : (
            <div className="turn-line muted">Au tour de <b>{gs.names[gs.turn]}</b>…</div>
          )}
          <div className="react-row">{REACTIONS.map((e) => <button key={e} className="react-btn" onClick={() => liveSend({ type: 'reaction', emoji: e })}>{e}</button>)}</div>
        </>
      )}

      {chatOpen && (
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
