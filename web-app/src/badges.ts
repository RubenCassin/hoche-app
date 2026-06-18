// Catalogue de badges (miroir de backend/badges.js + constants/badges.ts).
// `test` calcule l'obtention depuis les stats ; `goal`/`progress` servent la
// fiche « comment l'obtenir » (barre de progression vers l'objectif).
import type { Stats } from './api';

export interface Badge {
  id: string; name: string; how: string;
  test: (s: Stats) => boolean;
  progress: (s: Stats) => { value: number; goal: number };
}
export const BADGES: Badge[] = [
  { id: 'first_game', name: 'Première', how: 'Jouer 1 partie', test: (s) => s.matches_played >= 1, progress: (s) => ({ value: s.matches_played, goal: 1 }) },
  { id: 'regular', name: 'Habitué', how: 'Jouer 10 parties', test: (s) => s.matches_played >= 10, progress: (s) => ({ value: s.matches_played, goal: 10 }) },
  { id: 'veteran', name: 'Vétéran', how: 'Jouer 50 parties', test: (s) => s.matches_played >= 50, progress: (s) => ({ value: s.matches_played, goal: 50 }) },
  { id: 'centurion', name: 'Centurion', how: 'Jouer 100 parties', test: (s) => s.matches_played >= 100, progress: (s) => ({ value: s.matches_played, goal: 100 }) },
  { id: 'maximum', name: 'Maximum', how: 'Marquer un 180', test: (s) => s.total_180s >= 1, progress: (s) => ({ value: s.total_180s, goal: 1 }) },
  { id: 'ton_machine', name: 'Machine à 180', how: 'Marquer 10 fois 180', test: (s) => s.total_180s >= 10, progress: (s) => ({ value: s.total_180s, goal: 10 }) },
  { id: 'big_checkout', name: 'Gros checkout', how: 'Checkout de 100+', test: (s) => s.highest_checkout >= 100, progress: (s) => ({ value: s.highest_checkout, goal: 100 }) },
  { id: 'big_fish', name: 'The Big Fish', how: 'Checkout de 170', test: (s) => s.highest_checkout >= 170, progress: (s) => ({ value: s.highest_checkout, goal: 170 }) },
  { id: 'finisher', name: 'Finisseur', how: '40% de checkout (10 tentatives)', test: (s) => s.checkout_pct >= 40, progress: (s) => ({ value: s.checkout_pct, goal: 40 }) },
  { id: 'avg60', name: 'Tir groupé', how: 'Moyenne de partie ≥ 60', test: (s) => s.best_game_avg >= 60, progress: (s) => ({ value: s.best_game_avg, goal: 60 }) },
  { id: 'avg80', name: 'Niveau pro', how: 'Moyenne de partie ≥ 80', test: (s) => s.best_game_avg >= 80, progress: (s) => ({ value: s.best_game_avg, goal: 80 }) },
  { id: 'avg100', name: 'Légende', how: 'Moyenne de partie ≥ 100', test: (s) => s.best_game_avg >= 100, progress: (s) => ({ value: s.best_game_avg, goal: 100 }) },
  { id: 'winner', name: 'Gagnant', how: 'Gagner 10 matchs', test: (s) => s.matches_won >= 10, progress: (s) => ({ value: s.matches_won, goal: 10 }) },
  { id: 'streak3', name: 'En feu', how: '3 victoires d’affilée', test: (s) => s.best_win_streak >= 3, progress: (s) => ({ value: s.best_win_streak, goal: 3 }) },
  { id: 'streak5', name: 'Invincible', how: '5 victoires d’affilée', test: (s) => s.best_win_streak >= 5, progress: (s) => ({ value: s.best_win_streak, goal: 5 }) },
  { id: 'doubles', name: 'Maître des doubles', how: 'Toucher 50 doubles', test: (s) => s.doubles_hit >= 50, progress: (s) => ({ value: s.doubles_hit, goal: 50 }) },
];
