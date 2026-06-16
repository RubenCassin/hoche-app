import axios from 'axios';

// Même origine que le backend qui sert cette app web (Railway). En dev local,
// override via VITE_API_URL.
const BASE = (import.meta as any).env?.VITE_API_URL || window.location.origin;

export const api = axios.create({ baseURL: BASE });

const TOKEN_KEY = 'hoche.web.token';
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
  api.defaults.headers.common.Authorization = t ? `Bearer ${t}` : '';
}
setToken(getToken());

export function wsUrl(token: string) {
  return BASE.replace(/^http/, 'ws') + '/ws?token=' + encodeURIComponent(token);
}

export function apiError(e: any, fallback = 'Une erreur est survenue') {
  return e?.response?.data?.error || fallback;
}

// ── Types (formes renvoyées par le backend) ──────────────────────────────────
export interface User {
  id: number; name: string; username: string; avatarUrl?: string | null;
  elo?: number; eloGames?: number; country?: string | null; countryCode?: string | null;
}
export interface Stats {
  matches_played: number; matches_won: number; win_pct: number;
  legs_played: number; legs_won: number;
  three_dart_avg: number; first9_avg: number; best_game_avg: number;
  total_180s: number; highest_checkout: number;
  checkout_pct: number; doubles_hit: number;
  best_win_streak: number;
  scores_60: number; scores_100: number; scores_140: number; highest_score: number;
  darts_per_leg: number; best_leg: number;
  avg_history: number[];
}

export type LbScope = 'world' | 'europe' | 'country' | 'friends';
export interface LbRow {
  id: number; name: string; username: string; countryCode: string | null;
  matches_played: number; matches_won: number; win_pct: number;
  three_dart_avg: number; total_180s: number; highest_checkout: number;
  elo: number; elo_games: number; flags: number;
}
export const getLeaderboard = (scope: LbScope) =>
  api.get<LbRow[]>(`/leaderboard?scope=${scope}`).then((r) => r.data);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  api.post<{ token: string; user: User }>('/auth/login', { username, password }).then((r) => r.data);
export const register = (name: string, username: string, password: string) =>
  api.post<{ token: string; user: User }>('/auth/register', { name, username, password }).then((r) => r.data);
export const fetchMe = () => api.get<User>('/auth/me').then((r) => r.data);
export const getStats = (id: number) => api.get<Stats>(`/users/${id}/stats`).then((r) => r.data);
