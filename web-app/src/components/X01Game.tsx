import { useEffect, useRef, useState } from 'react';
import { initX01, addVisit, avg3, checkout, type X01State, type X01Config } from '../game/x01';
import { x01BotVisit } from '../game/bots';
import { DartGrid } from './DartGrid';
import { Dartboard } from './Dartboard';
import { MomentOverlay } from './MomentOverlay';
import { StartDecider } from './StartDecider';
import type { Dart } from '../game/modes';
import type { GameResult } from '../api';
import { play } from '../sound';
import { getFavorites, hasFavorite } from '../favorites';

function favSeg(d: string): number { return d === 'BULL' ? 25 : d.startsWith('D') ? parseInt(d.slice(1), 10) : -1; }

function dlabel(d: Dart): string {
  if (d.segment === 0) return 'M';
  if (d.segment === 25) return d.points === 50 ? 'BULL' : '25';
  return `${d.modifier !== 'S' ? d.modifier : ''}${d.segment}`;
}

export function X01Game({ roster, config, onExit, onFinish }: {
  roster: { name: string; bot: string | null }[];
  config: X01Config;
  onExit: () => void;
  onFinish?: (r: GameResult) => void;
}) {
  const [state, setState] = useState<X01State>(() => initX01(roster.map((r) => r.name), config));
  const [history, setHistory] = useState<X01State[]>([]);
  const [entry, setEntry] = useState('');
  const [inputMode, setInputMode] = useState<'numpad' | 'grid' | 'board'>('numpad');
  const [liveVisit, setLiveVisit] = useState<Dart[]>([]);
  const [deciding, setDeciding] = useState(roster.length >= 2);
  const [plays, setPlays] = useState(0); // nonce des « moments »
  const finishedRef = useRef(false);
  const s180 = useRef(0);
  const visitsLog = useRef<{ total: number; bust: boolean; darts: string[] }[]>([]);

  // En grille/cible on connaît chaque fléchette → on enrichit le replay (`darts`).
  const submit = (total: number, darts?: string[]) => {
    if (total === 180) s180.current += 1;
    setState((s) => {
      if (s.winner !== null) return s;
      const p = s.players[s.turn];
      const projected = p.remaining - total;
      const bust = projected < 0 || (s.config.finishMode !== 'simple' && projected === 1);
      visitsLog.current.push({ total: bust ? 0 : total, bust, darts: darts ?? [] });
      setHistory((h) => [...h, s]);
      return addVisit(s, total);
    });
    setPlays((p) => p + 1);
    setEntry(''); setLiveVisit([]);
  };

  // Tour d'un bot : joue automatiquement après un court délai.
  useEffect(() => {
    if (state.winner !== null) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        const p0 = state.players[0];
        onFinish?.({
          gameType: 'x01', matchWon: state.winner === 0,
          legsWon: p0.legs, legsPlayed: state.players.reduce((a, p) => a + p.legs, 0),
          opponents: state.players.filter((_, i) => i !== 0).map((p) => p.name),
          dartsThrown: p0.darts, avg: avg3(p0), total180s: s180.current,
          score: state.config.startScore, startScore: state.config.startScore,
          visits: visitsLog.current,
        });
      }
      return;
    }
    if (deciding) return;
    const bot = roster[state.turn]?.bot;
    if (!bot) return;
    const t = setTimeout(() => {
      const total = x01BotVisit(state.players[state.turn].remaining, bot, state.config.finishMode !== 'simple');
      submit(total);
    }, 800);
    return () => clearTimeout(t);
  }, [state.turn, state.winner, state.players, deciding]);

  // Sons d'ambiance sur les événements de volée.
  useEffect(() => {
    if (state.event === '180') play('180');
    else if (state.event === 'win' || state.event === 'set') play('win');
    else if (state.event === 'leg') play('checkout');
    else if (state.event === 'bust') play('bust');
  }, [state.players]);

  const undo = () => {
    if (history.length === 0) return;
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setEntry(''); setLiveVisit([]);
  };

  const liveTotal = liveVisit.reduce((s, d) => s + d.points, 0);
  const onDart = (points: number, modifier: 'S' | 'D' | 'T', segment: number) => {
    if (state.winner !== null) return;
    const next = [...liveVisit, { points, modifier, segment }];
    const total = next.reduce((s, d) => s + d.points, 0);
    const projected = state.players[state.turn].remaining - total;
    if (next.length >= 3 || projected <= 0 || (state.config.finishMode !== 'simple' && projected === 1)) submit(total, next.map(dlabel));
    else setLiveVisit(next);
  };

  const me = state.players[state.turn];
  const isBotTurn = !!roster[state.turn]?.bot;
  const coRemaining = me.remaining - (inputMode === 'grid' ? liveTotal : 0);
  const co = state.winner === null ? checkout(coRemaining, state.config.finishMode, getFavorites()) : null;
  const isOver = state.winner !== null;
  const submitEntry = () => { const t = parseInt(entry, 10); if (!isNaN(t)) submit(t); };

  return (
    <div className="page play">
      <MomentOverlay event={state.event} nonce={plays} />
      {deciding && <StartDecider names={roster.map((r) => r.name)} onChoose={(i) => { setState((s) => ({ ...s, turn: i, starter: i })); setDeciding(false); }} />}
      <div className="play-head">
        <div className="muted mono">X01 {state.config.startScore} · {(state.config.setsToWin ?? 1) > 1 ? `${state.config.setsToWin} sets de ${state.config.legsToWin} legs` : `premier à ${state.config.legsToWin}`} · {state.config.finishMode} out</div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}>Quitter</button>
      </div>

      <div className={'board board-' + Math.min(state.players.length, 4)}>
        {state.players.map((p, i) => (
          <div key={i} className={'pscore' + (i === state.turn && !isOver ? ' active' : '') + (state.winner === i ? ' winner' : '')}>
            <div className="pscore-name">{p.name}{roster[i]?.bot ? ' 🤖' : ''}{state.winner === i ? ' 🏆' : ''}</div>
            <div className="display pscore-rem">{p.remaining}</div>
            <div className="pscore-meta mono">
              <span>{(state.config.setsToWin ?? 1) > 1 ? `${p.sets}s · ` : ''}{'●'.repeat(p.legs)}<span className="muted">{'○'.repeat(Math.max(0, state.config.legsToWin - p.legs))}</span></span>
              <span className="muted">moy {avg3(p)}</span>
            </div>
          </div>
        ))}
      </div>

      {isOver ? (
        <div className="card win-card">
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>🏆 Vainqueur</div>
          <div className="display win-name">{state.players[state.winner!].name}</div>
          <button className="btn btn-primary" onClick={onExit}>Terminer</button>
        </div>
      ) : (
        <>
          <div className="co-line">
            {state.event === 'bust' && <span className="bust-tag">BUST</span>}
            {state.event === '180' && <span className="amber-tag">💥 180 !</span>}
            {state.event === 'set' && <span className="amber-tag">🏆 SET</span>}
            {co ? <><span className="muted">Checkout :</span> {co.map((d, k) => { const fav = hasFavorite(favSeg(d)); return <span key={k} className={'co-pill' + (d.startsWith('D') || d === 'BULL' ? ' dbl' : '') + (fav ? ' fav' : '')}>{fav ? '★ ' : ''}{d}</span>; })}</> : null}
          </div>
          {isBotTurn ? (
            <div className="turn-line muted"><b>{me.name}</b> réfléchit… 🤖</div>
          ) : (
            <>
              <div className="turn-line"><b>{me.name}</b> — à toi de jouer</div>
              <div className="seg" style={{ maxWidth: 360, marginBottom: 12 }}>
                <button className={'seg-btn' + (inputMode === 'numpad' ? ' on' : '')} onClick={() => { setInputMode('numpad'); setLiveVisit([]); }}>Numpad</button>
                <button className={'seg-btn' + (inputMode === 'grid' ? ' on' : '')} onClick={() => { setInputMode('grid'); setEntry(''); }}>Grille</button>
                <button className={'seg-btn' + (inputMode === 'board' ? ' on' : '')} onClick={() => { setInputMode('board'); setEntry(''); }}>Cible</button>
              </div>
              {inputMode === 'numpad' ? (
                <div className="numpad-wrap">
                  <div className="entry mono">{entry || '0'}</div>
                  <div className="numpad">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <button key={d} className="num" onClick={() => setEntry((e) => (e + d).replace(/^0+/, '').slice(0, 3))}>{d}</button>)}
                    <button className="num" onClick={() => setEntry((e) => e.slice(0, -1))}>←</button>
                    <button className="num" onClick={() => setEntry((e) => (e + '0').replace(/^0+/, '').slice(0, 3))}>0</button>
                    <button className="num num-ok" onClick={submitEntry}>OK</button>
                  </div>
                  <div className="quick-row">
                    {[26, 41, 45, 60, 81, 100, 140, 180].map((q) => <button key={q} className="chip" onClick={() => submit(q)}>{q}</button>)}
                    <button className="chip" onClick={() => submit(0)}>0</button>
                    <button className="chip" onClick={undo} disabled={history.length === 0}>↶ Annuler</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="visit-strip">
                    {[0, 1, 2].map((i) => <span key={i} className={'visit-slot' + (liveVisit[i] ? ' filled' : '')}>{liveVisit[i] ? dlabel(liveVisit[i]) : '—'}</span>)}
                    <span className="mono visit-total">Σ {liveTotal}</span>
                  </div>
                  {inputMode === 'grid'
                    ? <DartGrid onDart={onDart} onUndo={liveVisit.length ? () => setLiveVisit((v) => v.slice(0, -1)) : (history.length ? undo : undefined)} />
                    : <Dartboard onDart={onDart} onUndo={liveVisit.length ? () => setLiveVisit((v) => v.slice(0, -1)) : (history.length ? undo : undefined)} />}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
