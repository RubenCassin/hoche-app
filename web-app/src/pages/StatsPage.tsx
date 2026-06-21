import { useQuery } from '@tanstack/react-query';
import { getStats, getEloHistory } from '../api';
import { useAuth } from '../auth';
import { Sparkline } from '../components/Sparkline';

const GAME_LABELS: Record<string, string> = {
  x01: 'X01', cricket: 'Cricket', atc: 'Around the Clock', killer: 'Killer', shanghai: 'Shanghai', halveit: 'Halve-it',
};

export function StatsPage() {
  const { user } = useAuth();
  const { data: s, isLoading } = useQuery({ queryKey: ['stats', user?.id], queryFn: () => getStats(user!.id), enabled: !!user });
  const { data: elo = [] } = useQuery({ queryKey: ['elo', user?.id], queryFn: () => getEloHistory(user!.id), enabled: !!user });

  if (isLoading) return <div className="page"><h1 className="display page-title">Stats</h1><p className="muted">Chargement…</p></div>;
  if (!s || s.matches_played === 0) {
    return (
      <div className="page">
        <h1 className="display page-title">Stats</h1>
        <div className="card"><p className="muted">Joue ta première partie : moyenne, 180s, checkouts et zones de jeu apparaîtront ici.</p></div>
      </div>
    );
  }

  const avgHistory = s.avg_history ?? [];
  const heroDelta = avgHistory.length >= 2 ? +(avgHistory[avgHistory.length - 1] - avgHistory[0]).toFixed(1) : 0;

  // Top segments depuis la heatmap réelle.
  const hits = s.heatmap ?? {};
  const totalHits = Object.values(hits).reduce((a, n) => a + n, 0);
  const topSegments = Object.entries(hits)
    .map(([seg, n]) => ({ seg, n, pct: totalHits > 0 ? (n / totalHits) * 100 : 0 }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);
  const maxPct = topSegments[0]?.pct ?? 1;

  // Ventilation par type de jeu.
  const byType = s.by_game_type ?? {};
  const typeRows = Object.keys(byType)
    .map((k) => ({ key: k, played: byType[k].played, won: byType[k].won }))
    .sort((a, b) => b.played - a.played);
  const maxPlayed = typeRows[0]?.played ?? 1;
  const hasCheckout = (s.checkout_attempts ?? 0) > 0;

  const cards: { label: string; value: number | string; sub?: string; accent?: boolean }[] = [
    { label: 'Moyenne 3 fléch.', value: s.three_dart_avg, accent: true },
    { label: 'First 9', value: s.first9_avg },
    { label: 'Meilleure moy.', value: s.best_game_avg },
    { label: 'Checkout %', value: hasCheckout ? `${s.checkout_pct}%` : '—', sub: `${s.checkout_hits}/${s.checkout_attempts} fermetures` },
    { label: '180s', value: s.total_180s, accent: true },
    { label: 'High checkout', value: s.highest_checkout },
    { label: 'Parties', value: s.matches_played, sub: `${s.matches_won}/${s.matches_played}` },
    { label: 'Victoires', value: `${s.win_pct}%` },
    { label: 'Série en cours', value: s.current_win_streak, sub: `record ${s.best_win_streak}` },
    { label: 'Fléch./leg', value: s.darts_per_leg || '—' },
    { label: 'Meilleur leg', value: s.best_leg ? `${s.best_leg} flé.` : '—' },
    { label: 'Doubles plantés', value: s.doubles_hit },
  ];

  const bands = [
    { label: '180', value: s.total_180s, accent: true },
    { label: '140+', value: s.scores_140 },
    { label: '100+', value: s.scores_100 },
    { label: '60+', value: s.scores_60 },
  ];
  const maxBand = Math.max(1, ...bands.map((b) => b.value));

  return (
    <div className="page">
      <h1 className="display page-title">Stats</h1>

      {/* Hero — moyenne 3 fléchettes + progression */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="stat-label">Moyenne 3 fléchettes</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span className="display" style={{ fontSize: 52, color: 'var(--cream)', lineHeight: 1 }}>{s.three_dart_avg}</span>
          {heroDelta !== 0 && (
            <span className="mono" style={{ color: heroDelta >= 0 ? 'var(--win)' : 'var(--brick)', fontWeight: 700 }}>
              {heroDelta >= 0 ? '+' : ''}{heroDelta} {heroDelta >= 0 ? '↗' : '↘'}
            </span>
          )}
        </div>
        {avgHistory.length >= 2
          ? <div style={{ marginTop: 8 }}><Sparkline values={avgHistory} width={640} height={70} /></div>
          : <div className="muted" style={{ marginTop: 6 }}>Joue quelques parties X01 pour voir ta courbe.</div>}
      </div>

      {/* Courbe Elo perso */}
      {elo.length >= 2 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="stat-label">Courbe Elo · {elo[elo.length - 1].elo}</div>
          <div style={{ marginTop: 8 }}><Sparkline values={elo.map((e) => e.elo)} width={640} height={70} color="var(--info, #5a8fc7)" /></div>
        </div>
      )}

      {/* Cartes clés */}
      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className="card stat-card">
            <div className="stat-label">{c.label}</div>
            <div className="display stat-value" style={{ color: c.accent ? 'var(--amber)' : 'var(--cream)' }}>{c.value}</div>
            {c.sub && <div className="mono stat-sub">{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tranches de volée */}
      <h3 className="display section-title">Tranches de volée</h3>
      <div className="card">
        <div className="bands">
          {bands.map((b) => (
            <div key={b.label} className="band">
              <div className="band-bar-wrap"><div className="band-bar" style={{ height: `${(b.value / maxBand) * 100}%`, background: b.accent ? 'var(--amber)' : undefined }} /></div>
              <div className="mono band-val">{b.value}</div>
              <div className="band-label">{b.label}</div>
            </div>
          ))}
        </div>
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>Meilleure volée : {s.highest_score} · fléchettes/leg : {s.darts_per_leg || '—'}</div>
      </div>

      {/* Par type de jeu */}
      {typeRows.length > 0 && (
        <>
          <h3 className="display section-title">Par jeu</h3>
          <div className="card">
            {typeRows.map((t) => (
              <div key={t.key} className="seg-stat-row">
                <span className="seg-stat-label">{GAME_LABELS[t.key] ?? t.key}</span>
                <div className="seg-stat-track"><div className="seg-stat-fill" style={{ width: `${(t.played / maxPlayed) * 100}%`, background: 'var(--brick)' }} /></div>
                <span className="mono seg-stat-val">{t.won}V · {t.played}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Top segments (heatmap) */}
      {topSegments.length > 0 && (
        <>
          <h3 className="display section-title">Top segments</h3>
          <div className="card">
            {topSegments.map((seg, i) => (
              <div key={seg.seg} className="seg-stat-row">
                <span className="mono" style={{ width: 22, color: 'var(--fg3)' }}>#{i + 1}</span>
                <span className="display" style={{ width: 36, color: i === 0 ? 'var(--amber)' : 'var(--cream)' }}>{seg.seg === '25' ? 'B' : seg.seg}</span>
                <div className="seg-stat-track"><div className="seg-stat-fill" style={{ width: `${(seg.pct / maxPct) * 100}%`, background: i === 0 ? 'var(--amber)' : 'var(--brick)' }} /></div>
                <span className="mono seg-stat-val">{seg.pct.toFixed(0)}% · {seg.n}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
