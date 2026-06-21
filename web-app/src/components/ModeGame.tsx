import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DartGrid } from './DartGrid';
import { Dartboard } from './Dartboard';
import { MomentOverlay } from './MomentOverlay';
import {
  createGame, commitVisit, pushDart, popDart, currentRoundLabel,
  CRICKET_TARGETS, isCricketTargetDead, atcCurrentTarget, ATC_SEQUENCE,
  type ModeState, type ModeType, type ModeConfig, type Dart,
} from '../game/modes';
import { cricketBotDarts, atcBotDarts, killerBotDarts, shanghaiBotDarts, halveBotDarts } from '../game/bots';
import type { GameResult } from '../api';
import { play } from '../sound';

function dlabel(d: Dart): string {
  if (d.segment === 0) return 'M';
  if (d.segment === 25) return d.points === 50 ? 'BULL' : '25';
  return `${d.modifier !== 'S' ? d.modifier : ''}${d.segment}`;
}
const MARK = ['', '/', '✕', '⊗'];

function botDartsFor(s: ModeState): Dart[] {
  const lvl = s.players[s.turn].bot!;
  switch (s.config.gameType) {
    case 'cricket': return cricketBotDarts(s.players, s.turn, lvl);
    case 'atc': return atcBotDarts(s.players, s.turn, lvl, s.config.advanceByMarks);
    case 'killer': return killerBotDarts(s.players, s.turn, lvl);
    case 'shanghai': return shanghaiBotDarts(s.round, lvl);
    case 'halveit': return halveBotDarts(s.round, lvl);
  }
}

export function ModeGame({ gameType, roster, config, onExit, onFinish }: {
  gameType: ModeType;
  roster: { name: string; bot: string | null }[];
  config: Partial<ModeConfig>;
  onExit: () => void;
  onFinish?: (r: GameResult) => void;
}) {
  const [state, setState] = useState<ModeState>(() => createGame(gameType, roster, config));
  const [modeInput, setModeInput] = useState<'grid' | 'board'>('grid');
  const [plays, setPlays] = useState(0);
  const finishedRef = useRef(false);

  const commit = () => { setState((s) => commitVisit(s)); setPlays((p) => p + 1); };

  // Auto-commit à 3 fléchettes (humain).
  useEffect(() => { if (state.visit.length >= 3) { const t = setTimeout(commit, 150); return () => clearTimeout(t); } }, [state.visit.length]);

  // Tour d'un bot : joue une volée complète puis valide.
  useEffect(() => {
    if (state.winner !== null) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish?.({
          gameType, matchWon: state.winner === 0,
          opponents: state.players.filter((_, i) => i !== 0).map((p) => p.name),
          score: state.players[0]?.score ?? 0,
        });
      }
      return;
    }
    if (!state.players[state.turn]?.bot) return;
    const darts = botDartsFor(state);
    const t = setTimeout(() => { setState((s) => commitVisit({ ...s, visit: darts.slice(0, 3) })); setPlays((p) => p + 1); }, 850);
    return () => clearTimeout(t);
  }, [state.turn, state.winner, state.round]);

  // Sons d'ambiance.
  useEffect(() => {
    if (state.winner !== null) play('win');
    else if (state.event === 'halved') play('bust');
  }, [state.players]);

  const onDart = (points: number, modifier: 'S' | 'D' | 'T', segment: number) =>
    setState((s) => pushDart(s, { points, modifier, segment }));

  const isBotTurn = !!state.players[state.turn]?.bot;
  const isOver = state.winner !== null;
  const me = state.players[state.turn];
  const TITLES: Record<ModeType, string> = { cricket: 'Cricket', atc: 'Around the Clock', killer: 'Killer', shanghai: 'Shanghai', halveit: 'Halve-it' };

  return (
    <div className="page play">
      <MomentOverlay event={state.winner !== null ? 'win' : state.event} nonce={plays} />
      <div className="play-head">
        <div className="muted mono">{TITLES[gameType]}{currentRoundLabel(state) ? ' · ' + currentRoundLabel(state) : ''}{gameType === 'cricket' && state.config.cutThroat ? ' · cut-throat' : ''}</div>
        <button className="btn btn-ghost btn-sm" onClick={onExit}>Quitter</button>
      </div>

      {gameType === 'cricket' ? <CricketBoard state={state} /> : <GenericBoard state={state} gameType={gameType} />}

      {isOver ? (
        <div className="card win-card">
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>🏆 Vainqueur{state.event === 'shanghai' ? ' · SHANGHAI !' : ''}</div>
          <div className="display win-name">{state.players[state.winner!].name}</div>
          <button className="btn btn-primary" onClick={onExit}>Terminer</button>
        </div>
      ) : (
        <>
          <div className="co-line">
            {state.event === 'halved' && <span className="bust-tag">SCORE DIVISÉ</span>}
            {state.event === 'shanghai' && <span className="amber-tag">SHANGHAI 💥</span>}
          </div>
          {isBotTurn ? (
            <div className="turn-line muted"><b>{me.name}</b> réfléchit… 🤖</div>
          ) : (
            <>
              <div className="turn-line"><b>{me.name}</b> — à toi de jouer</div>
              <div className="seg" style={{ maxWidth: 280, marginBottom: 12 }}>
                <button className={'seg-btn' + (modeInput === 'grid' ? ' on' : '')} onClick={() => setModeInput('grid')}>Grille</button>
                <button className={'seg-btn' + (modeInput === 'board' ? ' on' : '')} onClick={() => setModeInput('board')}>Cible</button>
              </div>
              <div className="visit-strip">
                {[0, 1, 2].map((i) => <span key={i} className={'visit-slot' + (state.visit[i] ? ' filled' : '')}>{state.visit[i] ? dlabel(state.visit[i]) : '—'}</span>)}
                {state.visit.length > 0 && <button className="btn btn-amber btn-sm visit-total" onClick={commit}>Valider la volée</button>}
              </div>
              {modeInput === 'grid'
                ? <DartGrid onDart={onDart} onUndo={state.visit.length ? () => setState((s) => popDart(s)) : undefined} />
                : <Dartboard onDart={onDart} onUndo={state.visit.length ? () => setState((s) => popDart(s)) : undefined} />}
            </>
          )}
        </>
      )}
    </div>
  );
}

function CricketBoard({ state }: { state: ModeState }) {
  return (
    <div className="card lb-card" style={{ overflowX: 'auto' }}>
      <table className="lb cricket-table">
        <thead>
          <tr>
            <th>Cible</th>
            {state.players.map((p, i) => <th key={i} className={'num' + (i === state.turn && state.winner === null ? ' active-col' : '')}>{p.name}{p.bot ? ' 🤖' : ''}</th>)}
          </tr>
        </thead>
        <tbody>
          {CRICKET_TARGETS.map((t) => {
            const dead = isCricketTargetDead(state.players, t);
            return (
              <tr key={t} className={dead ? 'dead' : ''}>
                <td className="rank">{t === 25 ? 'Bull' : t}</td>
                {state.players.map((p, i) => <td key={i} className="num mono cricket-mark">{MARK[Math.min(3, p.marks[t] ?? 0)]}</td>)}
              </tr>
            );
          })}
          <tr>
            <td className="rank">Score</td>
            {state.players.map((p, i) => <td key={i} className="num lb-val">{p.score}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function GenericBoard({ state, gameType }: { state: ModeState; gameType: ModeType }) {
  return (
    <div className={'board board-' + Math.min(state.players.length, 4)}>
      {state.players.map((p, i) => {
        const active = i === state.turn && state.winner === null;
        const dead = gameType === 'killer' && p.lives <= 0;
        let big = '';
        let meta: ReactNode = null;
        if (gameType === 'atc') {
          const tgt = atcCurrentTarget(p);
          big = tgt === null ? '✓' : (tgt === 25 ? 'Bull' : String(tgt));
          meta = <span>{p.hits}/{ATC_SEQUENCE.length}</span>;
        } else if (gameType === 'killer') {
          big = '♥'.repeat(p.lives) || '☠';
          meta = <span>n°{p.number}{p.isKiller ? ' · armé 🔪' : ''}</span>;
        } else {
          big = String(p.score);
          meta = <span className="muted">pts</span>;
        }
        return (
          <div key={i} className={'pscore' + (active ? ' active' : '') + (state.winner === i ? ' winner' : '') + (dead ? ' dead' : '')}>
            <div className="pscore-name">{p.name}{p.bot ? ' 🤖' : ''}{state.winner === i ? ' 🏆' : ''}</div>
            <div className="display pscore-rem" style={{ fontSize: gameType === 'killer' ? 36 : undefined }}>{big}</div>
            <div className="pscore-meta mono">{meta}</div>
          </div>
        );
      })}
    </div>
  );
}
