import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { getStats } from '../api';

export function Dashboard() {
  const { user } = useAuth();
  const { data: stats } = useQuery({ queryKey: ['stats', user?.id], queryFn: () => getStats(user!.id), enabled: !!user });
  const first = (user?.name || 'Joueur').split(' ')[0];

  return (
    <div className="page">
      <h1 className="display page-title">Salut {first}.</h1>

      <div className="dash-grid">
        {/* Hero */}
        <section className="card card-accent hero">
          <div className="eyebrow">5 jeux · solo · duo · équipes</div>
          <h2 className="display hero-title">Nouvelle<br />partie</h2>
          <p className="muted">X01, Cricket, Around the Clock, Killer, Shanghai, Halve-it.</p>
          <button className="btn btn-primary hero-cta">→ Choisir un jeu</button>
        </section>

        {/* Cartes soirée */}
        <div className="dash-side">
          <section className="card tile">
            <div>
              <div className="eyebrow" style={{ color: 'var(--fg3)' }}>Soirée</div>
              <h3 className="tile-title">🏆 Tournoi</h3>
              <p className="muted">Bracket à élimination, 3-16 joueurs.</p>
            </div>
            <span className="tile-go">Lancer →</span>
          </section>
          <section className="card tile">
            <div>
              <div className="eyebrow" style={{ color: 'var(--fg3)' }}>Online</div>
              <h3 className="tile-title">🌐 Jouer en direct</h3>
              <p className="muted">Défie un ami, 1v1 ou groupe.</p>
            </div>
            <span className="tile-go">Rejoindre →</span>
          </section>
        </div>
      </div>

      {/* Stats */}
      <h3 className="display section-title">Tes stats</h3>
      <div className="stat-row">
        <Stat label="Moyenne" value={stats?.three_dart_avg ?? 0} />
        <Stat label="180s" value={stats?.total_180s ?? 0} accent />
        <Stat label="Victoires" value={`${stats?.win_pct ?? 0}%`} sub={`${stats?.matches_won ?? 0}/${stats?.matches_played ?? 0}`} />
        <Stat label="High checkout" value={stats?.highest_checkout ?? 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="display stat-value" style={{ color: accent ? 'var(--amber)' : 'var(--cream)' }}>{value}</div>
      {sub && <div className="mono stat-sub">{sub}</div>}
    </div>
  );
}
