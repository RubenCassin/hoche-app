import { useQuery } from '@tanstack/react-query';
import { getStats } from '../api';
import { useAuth } from '../auth';

export function StatsPage() {
  const { user } = useAuth();
  const { data: s, isLoading } = useQuery({ queryKey: ['stats', user?.id], queryFn: () => getStats(user!.id), enabled: !!user });

  if (isLoading) return <div className="page"><h1 className="display page-title">Stats</h1><p className="muted">Chargement…</p></div>;
  if (!s || s.matches_played === 0) {
    return (
      <div className="page">
        <h1 className="display page-title">Stats</h1>
        <div className="card"><p className="muted">Joue ta première partie : moyenne, 180s, checkouts et zones de jeu apparaîtront ici.</p></div>
      </div>
    );
  }

  const cards: { label: string; value: number | string; sub?: string; accent?: boolean }[] = [
    { label: 'Moyenne 3 fléch.', value: s.three_dart_avg, accent: true },
    { label: 'First 9', value: s.first9_avg },
    { label: 'Meilleure moy. (partie)', value: s.best_game_avg },
    { label: 'Checkout %', value: `${s.checkout_pct}%` },
    { label: '180s', value: s.total_180s, accent: true },
    { label: 'High checkout', value: s.highest_checkout },
    { label: 'Parties', value: s.matches_played },
    { label: 'Victoires', value: `${s.win_pct}%`, sub: `${s.matches_won}/${s.matches_played}` },
    { label: 'Meilleure série', value: s.best_win_streak },
    { label: 'Fléch./leg', value: s.darts_per_leg },
    { label: 'Meilleur leg', value: s.best_leg ? `${s.best_leg} fléch.` : '—' },
    { label: 'Doubles plantés', value: s.doubles_hit },
  ];

  const bands = [
    { label: '60+', value: s.scores_60 },
    { label: '100+', value: s.scores_100 },
    { label: '140+', value: s.scores_140 },
    { label: '180', value: s.total_180s },
  ];
  const maxBand = Math.max(1, ...bands.map((b) => b.value));

  return (
    <div className="page">
      <h1 className="display page-title">Stats</h1>
      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className="card stat-card">
            <div className="stat-label">{c.label}</div>
            <div className="display stat-value" style={{ color: c.accent ? 'var(--amber)' : 'var(--cream)' }}>{c.value}</div>
            {c.sub && <div className="mono stat-sub">{c.sub}</div>}
          </div>
        ))}
      </div>

      <h3 className="display section-title">Tranches de volée</h3>
      <div className="card">
        <div className="bands">
          {bands.map((b) => (
            <div key={b.label} className="band">
              <div className="band-bar-wrap">
                <div className="band-bar" style={{ height: `${(b.value / maxBand) * 100}%` }} />
              </div>
              <div className="mono band-val">{b.value}</div>
              <div className="band-label">{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
