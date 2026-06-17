import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { getTournament, joinTournament, startTournament, type Tournament as T, type TournamentMatch } from '../api';

const roundLabel = (round: number, total: number) => {
  const fromEnd = total - 1 - round;
  if (fromEnd === 0) return 'Finale';
  if (fromEnd === 1) return 'Demi-finales';
  if (fromEnd === 2) return 'Quarts';
  return `Tour ${round + 1}`;
};

export function Tournament() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const myId = user?.id;

  const { data: t, isLoading } = useQuery({ queryKey: ['tournament', id], queryFn: () => getTournament(id), enabled: id > 0, refetchInterval: 8000 });

  if (isLoading || !t) return <div className="page"><h1 className="display page-title">Tournoi</h1><p className="muted">Chargement…</p></div>;

  const joined = t.players.some((p) => p.userId === myId);
  const isCreator = t.createdById === myId;
  const rounds = t.matches.reduce((mx, m) => Math.max(mx, m.round), 0) + 1;
  const myReady = t.matches.find((m) => m.status === 'ready' && (m.player1Id === myId || m.player2Id === myId));

  const refetch = () => qc.invalidateQueries({ queryKey: ['tournament', id] });
  const doJoin = async () => { await joinTournament(id).catch(() => {}); refetch(); };
  const doStart = async () => { await startTournament(id).catch(() => {}); refetch(); };

  return (
    <div className="page">
      <div className="play-head" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {t.conversationId && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/messages/${t.conversationId}`)}>‹</button>}
          <h1 className="display" style={{ fontSize: 30, margin: 0 }}>{t.name}</h1>
        </div>
        <div className="muted mono">{t.config.startScore} · {t.players.length} joueurs</div>
      </div>

      {t.status === 'done' && (
        <div className="card champion-card">
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>🏆 Champion</div>
          <div className="display win-name">{t.winnerName || '—'}</div>
        </div>
      )}

      {myReady && (
        <div className="card callout-card">
          <div className="display" style={{ fontSize: 26 }}>À toi de jouer !</div>
          <div className="muted">{(myReady.player1Id === myId ? myReady.player2Name : myReady.player1Name) || 'Adversaire'} t'attend.</div>
          <button className="btn btn-primary" onClick={() => navigate(`/direct?tmatch=${myReady.id}`)}>🎯 Jouer mon match</button>
        </div>
      )}

      {t.status === 'lobby' ? (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="field-label" style={{ marginTop: 0 }}>Inscrits ({t.players.length})</div>
            <div className="conv-list" style={{ marginTop: 8 }}>
              {t.players.map((p) => (
                <div key={p.userId} className="lobby-row">
                  <div className="avatar-sm">{(p.name || '?').slice(0, 2).toUpperCase()}</div>
                  <span>{p.name}{p.userId === t.createdById ? ' 👑' : ''}{p.userId === myId ? ' · toi' : ''}</span>
                </div>
              ))}
            </div>
          </div>
          {!joined && <button className="btn btn-amber" style={{ marginRight: 8 }} onClick={doJoin}>Rejoindre le tournoi</button>}
          {isCreator && <button className="btn btn-primary" disabled={t.players.length < 2} onClick={doStart}>{t.players.length < 2 ? 'En attente de joueurs…' : `Lancer le tournoi (${t.players.length})`}</button>}
          {!isCreator && joined && <p className="muted">En attente du lancement par l'organisateur…</p>}
        </>
      ) : (
        <div className="bracket">
          {Array.from({ length: rounds }).map((_, r) => {
            const ms = t.matches.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot);
            if (ms.length === 0) return null;
            return (
              <div key={r} className="round-col">
                <div className="eyebrow round-label">{roundLabel(r, rounds)}</div>
                {ms.map((m) => <MatchCard key={m.id} m={m} myId={myId} />)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatchCard({ m, myId }: { m: TournamentMatch; myId?: number }) {
  const mine = m.player1Id === myId || m.player2Id === myId;
  const line = (pid: number | null, name: string | null) => (
    <div className={'bm-player' + (m.winnerId === pid && pid ? ' win' : '') + (!pid ? ' empty' : '')}>
      <span>{name || '—'}{pid && pid === myId ? ' (toi)' : ''}</span>
      {m.winnerId === pid && pid && <span>✓</span>}
    </div>
  );
  return (
    <div className={'bm' + (mine ? ' mine' : '')}>
      {line(m.player1Id, m.player1Name)}
      <div className="bm-div" />
      {line(m.player2Id, m.player2Name)}
      {m.status === 'playing' && <div className="bm-tag">● en cours</div>}
    </div>
  );
}
