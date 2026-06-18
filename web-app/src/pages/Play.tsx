import { useState, type ReactNode } from 'react';
import { useAuth } from '../auth';
import { saveGame, type GameResult } from '../api';
import { X01Game } from '../components/X01Game';
import { ModeGame } from '../components/ModeGame';
import { BOT_ORDER, BOT_LABELS } from '../game/bots';
import { soundsEnabled, setSoundsEnabled, play } from '../sound';
import type { ModeType } from '../game/modes';

type GameType = 'x01' | ModeType;
const MODES: { key: GameType; label: string; desc: string }[] = [
  { key: 'x01', label: 'X01', desc: '301 / 501 / 701 — descendre à zéro' },
  { key: 'cricket', label: 'Cricket', desc: 'Fermer 15→20 + Bull' },
  { key: 'atc', label: 'Around the Clock', desc: 'Toucher 1→20 puis Bull' },
  { key: 'killer', label: 'Killer', desc: "S'armer puis éliminer" },
  { key: 'shanghai', label: 'Shanghai', desc: 'Marquer la cible du tour' },
  { key: 'halveit', label: 'Halve-it', desc: 'Rate la cible → score divisé' },
];
const VARIANTS = [301, 501, 701];
const LEGS = [1, 3, 5];

interface Slot { name: string; bot: string | null }

export function Play() {
  const { user } = useAuth();
  const [gameType, setGameType] = useState<GameType>('x01');
  const [started, setStarted] = useState(false);

  // options
  const [startScore, setStartScore] = useState(501);
  const [legsToWin, setLegsToWin] = useState(3);
  const [doubleOut, setDoubleOut] = useState(true);
  const [cutThroat, setCutThroat] = useState(false);
  const [advanceByMarks, setAdvanceByMarks] = useState(false);
  const [startLives, setStartLives] = useState(3);
  const [shanghaiRounds, setShanghaiRounds] = useState(7);

  const [slots, setSlots] = useState<Slot[]>([
    { name: user?.name || 'Joueur 1', bot: null },
    { name: 'Joueur 2', bot: null },
  ]);
  const [sounds, setSounds] = useState(soundsEnabled());

  const minPlayers = gameType === 'killer' ? 2 : 1;
  const setName = (i: number, name: string) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, name } : x)));
  const setBot = (i: number, bot: string | null) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, bot } : x)));

  const onFinish = (r: GameResult) => { if (user) saveGame(r).catch(() => {}); };

  if (started) {
    const roster = slots.map((s) => ({ name: s.name.trim() || 'Joueur', bot: s.bot }));
    if (gameType === 'x01') {
      return <X01Game roster={roster} config={{ startScore, legsToWin, doubleOut }} onExit={() => setStarted(false)} onFinish={onFinish} />;
    }
    return <ModeGame gameType={gameType} roster={roster} config={{ cutThroat, advanceByMarks, startLives, shanghaiRounds }} onExit={() => setStarted(false)} onFinish={onFinish} />;
  }

  return (
    <div className="page">
      <h1 className="display page-title">Nouvelle partie</h1>
      <div className="card setup" style={{ maxWidth: 620 }}>
        <Row label="Mode de jeu">
          <div className="mode-grid">
            {MODES.map((m) => (
              <button key={m.key} className={'mode-card' + (gameType === m.key ? ' on' : '')} onClick={() => setGameType(m.key)}>
                <span className="mode-name">{m.label}</span>
                <span className="mode-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </Row>

        {gameType === 'x01' && (
          <>
            <Row label="Score">{VARIANTS.map((v) => <button key={v} className={'chip' + (startScore === v ? ' on' : '')} onClick={() => setStartScore(v)}>{v}</button>)}</Row>
            <Row label="Legs (premier à)">{LEGS.map((v) => <button key={v} className={'chip' + (legsToWin === v ? ' on' : '')} onClick={() => setLegsToWin(v)}>{v}</button>)}</Row>
            <Row label="Sortie"><button className={'chip' + (doubleOut ? ' on' : '')} onClick={() => setDoubleOut(true)}>Double</button><button className={'chip' + (!doubleOut ? ' on' : '')} onClick={() => setDoubleOut(false)}>Simple</button></Row>
          </>
        )}
        {gameType === 'cricket' && <Row label="Variante"><button className={'chip' + (!cutThroat ? ' on' : '')} onClick={() => setCutThroat(false)}>Standard</button><button className={'chip' + (cutThroat ? ' on' : '')} onClick={() => setCutThroat(true)}>Cut-throat</button></Row>}
        {gameType === 'atc' && <Row label="Progression"><button className={'chip' + (!advanceByMarks ? ' on' : '')} onClick={() => setAdvanceByMarks(false)}>Simple (×1)</button><button className={'chip' + (advanceByMarks ? ' on' : '')} onClick={() => setAdvanceByMarks(true)}>Double/Triple ×2/×3</button></Row>}
        {gameType === 'killer' && <Row label="Vies">{[3, 5].map((v) => <button key={v} className={'chip' + (startLives === v ? ' on' : '')} onClick={() => setStartLives(v)}>{v}</button>)}</Row>}
        {gameType === 'shanghai' && <Row label="Tours">{[7, 20].map((v) => <button key={v} className={'chip' + (shanghaiRounds === v ? ' on' : '')} onClick={() => setShanghaiRounds(v)}>{v}</button>)}</Row>}

        <div className="setup-players">
          <div className="field-label">Joueurs ({slots.length})</div>
          {slots.map((s, i) => (
            <div key={i} className="player-row">
              <input value={s.name} onChange={(e) => setName(i, e.target.value)} maxLength={20} />
              <select className="bot-select" value={s.bot ?? ''} onChange={(e) => setBot(i, e.target.value || null)}>
                <option value="">Humain</option>
                {BOT_ORDER.map((b) => <option key={b} value={b}>{BOT_LABELS[b]}</option>)}
              </select>
              {slots.length > minPlayers && <button className="chip" onClick={() => setSlots(slots.filter((_, j) => j !== i))}>✕</button>}
            </div>
          ))}
          {slots.length < (gameType === 'killer' ? 6 : 4) && (
            <button className="chip" onClick={() => setSlots([...slots, { name: `Joueur ${slots.length + 1}`, bot: null }])}>+ Ajouter un joueur</button>
          )}
        </div>

        <Row label="Sons d'ambiance">
          <button className={'chip' + (sounds ? ' on' : '')} onClick={() => { setSoundsEnabled(true); setSounds(true); play('checkout'); }}>🔊 On</button>
          <button className={'chip' + (!sounds ? ' on' : '')} onClick={() => { setSoundsEnabled(false); setSounds(false); }}>🔇 Off</button>
        </Row>
        <button className="btn btn-primary" disabled={slots.length < minPlayers} onClick={() => setStarted(true)}>Démarrer</button>
        {!user && <div className="muted">Tu joues en invité — la partie ne sera pas enregistrée dans tes stats.</div>}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="setup-row"><div className="field-label">{label}</div><div className="chip-row">{children}</div></div>;
}
