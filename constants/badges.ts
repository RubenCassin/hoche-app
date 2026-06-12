import type { Stats } from '@/services/api';

// ─── Achievements / badges ────────────────────────────────────────────────────
// Computed entirely client-side from a player's Stats — so they show on your own
// fight card AND on anyone's public profile (their stats are fetched the same way).

export interface Badge {
  id: string;
  name: string;
  icon: string; // emoji
  desc: string;
  earned: (s: Stats) => boolean;
  /** Progression vers le badge (valeur courante / objectif) — fiche détail. */
  progress?: (s: Stats) => { value: number; target: number };
}

export const BADGES: Badge[] = [
  // Volume
  { id: 'first_game', name: 'Première', icon: '🎯', desc: 'Joue ta première partie.', earned: (s) => s.matches_played >= 1, progress: (s) => ({ value: s.matches_played, target: 1 }) },
  { id: 'regular', name: 'Habitué', icon: '🔥', desc: 'Joue 10 parties.', earned: (s) => s.matches_played >= 10, progress: (s) => ({ value: s.matches_played, target: 10 }) },
  { id: 'veteran', name: 'Vétéran', icon: '🎖️', desc: 'Joue 50 parties.', earned: (s) => s.matches_played >= 50, progress: (s) => ({ value: s.matches_played, target: 50 }) },
  { id: 'centurion', name: 'Centurion', icon: '💯', desc: 'Joue 100 parties.', earned: (s) => s.matches_played >= 100, progress: (s) => ({ value: s.matches_played, target: 100 }) },
  // 180s
  { id: 'maximum', name: 'Maximum', icon: '💥', desc: 'Réussis un 180.', earned: (s) => s.total_180s >= 1, progress: (s) => ({ value: s.total_180s, target: 1 }) },
  { id: 'ton_machine', name: 'Machine à 180', icon: '⚡', desc: 'Réussis 10 fois 180.', earned: (s) => s.total_180s >= 10, progress: (s) => ({ value: s.total_180s, target: 10 }) },
  // Checkouts
  { id: 'big_checkout', name: 'Gros checkout', icon: '🎪', desc: 'Ferme à 100 ou plus.', earned: (s) => s.highest_checkout >= 100, progress: (s) => ({ value: s.highest_checkout, target: 100 }) },
  { id: 'big_fish', name: 'The Big Fish', icon: '🐟', desc: 'Ferme le mythique 170.', earned: (s) => s.highest_checkout >= 170, progress: (s) => ({ value: s.highest_checkout, target: 170 }) },
  { id: 'finisher', name: 'Finisseur', icon: '🔒', desc: '40% de checkout (10+ tentatives).', earned: (s) => s.checkout_attempts >= 10 && s.checkout_pct >= 40, progress: (s) => ({ value: s.checkout_pct, target: 40 }) },
  // Averages
  { id: 'avg60', name: 'Tir groupé', icon: '📈', desc: 'Atteins 60 de moyenne sur une partie.', earned: (s) => s.best_game_avg >= 60, progress: (s) => ({ value: s.best_game_avg, target: 60 }) },
  { id: 'avg80', name: 'Niveau pro', icon: '🚀', desc: 'Atteins 80 de moyenne sur une partie.', earned: (s) => s.best_game_avg >= 80, progress: (s) => ({ value: s.best_game_avg, target: 80 }) },
  { id: 'avg100', name: 'Légende', icon: '👑', desc: 'Atteins 100 de moyenne sur une partie.', earned: (s) => s.best_game_avg >= 100, progress: (s) => ({ value: s.best_game_avg, target: 100 }) },
  // Wins / streaks
  { id: 'winner', name: 'Gagnant', icon: '🥇', desc: 'Gagne 10 matchs.', earned: (s) => s.matches_won >= 10, progress: (s) => ({ value: s.matches_won, target: 10 }) },
  { id: 'streak3', name: 'En feu', icon: '🔗', desc: '3 victoires d’affilée.', earned: (s) => s.best_win_streak >= 3, progress: (s) => ({ value: s.best_win_streak, target: 3 }) },
  { id: 'streak5', name: 'Invincible', icon: '🛡️', desc: '5 victoires d’affilée.', earned: (s) => s.best_win_streak >= 5, progress: (s) => ({ value: s.best_win_streak, target: 5 }) },
  // Doubles
  { id: 'doubles', name: 'Maître des doubles', icon: '🎯', desc: 'Plante 50 doubles.', earned: (s) => s.doubles_hit >= 50, progress: (s) => ({ value: s.doubles_hit, target: 50 }) },
];

export interface EarnedBadge extends Badge {
  on: boolean;
}

/** The full catalog flagged with whether the given stats earn each badge. */
export function badgesFor(stats?: Stats | null): EarnedBadge[] {
  return BADGES.map((b) => ({ ...b, on: stats ? b.earned(stats) : false }));
}

export function earnedCount(stats?: Stats | null): number {
  if (!stats) return 0;
  return BADGES.reduce((n, b) => n + (b.earned(stats) ? 1 : 0), 0);
}
