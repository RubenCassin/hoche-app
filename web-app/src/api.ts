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

// ── Profil ────────────────────────────────────────────────────────────────────
export const getFollowCounts = (id: number) =>
  api.get<{ followers: number; following: number }>(`/social/counts/${id}`).then((r) => r.data);
export const updateMe = (patch: { name?: string; avatarUrl?: string | null; currentPassword?: string; newPassword?: string }) =>
  api.patch<User>('/auth/me', patch).then((r) => r.data);

// ── Feed ──────────────────────────────────────────────────────────────────────
export interface FeedItem {
  kind: 'post' | 'match';
  id: string;
  user_id: number;
  userName: string;
  username: string;
  created_at: string;
  text?: string;
  likeCount?: number;
  liked?: boolean;
  commentCount?: number;
  postId?: number;
  gameType?: string;
  matchWon?: boolean;
  legsWon?: number;
  oppLegs?: number;
  opponents?: string[];
  total180s?: number;
  highestCheckout?: number;
  score?: number;
}
export const getFeed = (scope: 'foryou' | 'friends') =>
  api.get<FeedItem[]>(`/feed?scope=${scope}`).then((r) => r.data);
export const createPost = (text: string) =>
  api.post('/posts', { text }).then((r) => r.data);
export const likePost = (postId: number) =>
  api.post<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`).then((r) => r.data);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  api.post<{ token: string; user: User }>('/auth/login', { username, password }).then((r) => r.data);
export const register = (name: string, username: string, password: string) =>
  api.post<{ token: string; user: User }>('/auth/register', { name, username, password }).then((r) => r.data);
export const fetchMe = () => api.get<User>('/auth/me').then((r) => r.data);
export const getStats = (id: number) => api.get<Stats>(`/users/${id}/stats`).then((r) => r.data);

// ── Recherche / amis ────────────────────────────────────────────────────────
export interface SearchUser extends User { isFollowing?: boolean; mutual?: boolean }
export const searchUsers = (q: string) =>
  api.get<SearchUser[]>(`/social/search?q=${encodeURIComponent(q)}`).then((r) => r.data);
export const getFollowingList = () =>
  api.get<SearchUser[]>('/social/following').then((r) => r.data);

// ── Chat ──────────────────────────────────────────────────────────────────────
export type MsgKind = 'text' | 'match_invite' | 'tournament';
export interface ChatMessage {
  id: number; conversationId: number; senderId: number; senderName: string;
  text: string; kind: MsgKind; meta: any; created_at: string;
}
export interface Conversation {
  id: number; isGroup: boolean; name: string; avatarUrl: string | null; otherId: number | null;
  members: User[];
  lastMessage: { text: string; kind: MsgKind; senderId: number; created_at: string } | null;
  unread: number; updated_at: string;
}
export const getConversations = () => api.get<Conversation[]>('/chat/conversations').then((r) => r.data);
export const getChatUnread = () => api.get<{ unread: number }>('/chat/unread').then((r) => r.data.unread);
export const getMessages = (id: number) =>
  api.get<ChatMessage[]>(`/chat/conversations/${id}/messages`).then((r) => r.data);
export const createDirect = (userId: number) =>
  api.post<Conversation>('/chat/conversations', { userId }).then((r) => r.data);
export const createGroup = (name: string, memberIds: number[]) =>
  api.post<Conversation>('/chat/conversations', { name, memberIds }).then((r) => r.data);
export const sendMessage = (id: number, body: { text: string; kind?: MsgKind; meta?: any }) =>
  api.post<ChatMessage>(`/chat/conversations/${id}/messages`, body).then((r) => r.data);
export const markRead = (id: number) => api.post(`/chat/conversations/${id}/read`).then((r) => r.data);
export const addMembers = (id: number, memberIds: number[]) =>
  api.post<Conversation>(`/chat/conversations/${id}/members`, { memberIds }).then((r) => r.data);

// ── Tournois ──────────────────────────────────────────────────────────────────
export type Finish = 'simple' | 'double' | 'master';
export interface TournamentMatch {
  id: number; round: number; slot: number;
  player1Id: number | null; player1Name: string | null;
  player2Id: number | null; player2Name: string | null;
  winnerId: number | null; roomCode: string | null;
  status: 'pending' | 'ready' | 'playing' | 'done';
}
export interface Tournament {
  id: number; conversationId: number | null; name: string;
  status: 'lobby' | 'running' | 'done'; createdById: number;
  config: { startScore: number; legsToWin: number; finishMode: Finish };
  winnerId: number | null; winnerName: string | null;
  players: { userId: number; name: string | null; seed: number; place: number | null }[];
  matches: TournamentMatch[];
}
export const getTournament = (id: number) =>
  api.get<Tournament>(`/tournaments/${id}`).then((r) => r.data);
export const createTournament = (body: { conversationId?: number; name: string; startScore: number; legsToWin: number; finishMode: Finish }) =>
  api.post<Tournament>('/tournaments', body).then((r) => r.data);
export const joinTournament = (id: number) =>
  api.post<Tournament>(`/tournaments/${id}/join`).then((r) => r.data);
export const startTournament = (id: number) =>
  api.post<Tournament>(`/tournaments/${id}/start`).then((r) => r.data);
