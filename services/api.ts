import axios from 'axios';
import { API_BASE_URL } from '@/constants/theme';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Auth token ────────────────────────────────────────────────────────────
// The token is injected on every request once set by the auth store.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/** Pull a human-readable message out of an axios error. */
export function apiErrorMessage(e: unknown, fallback = 'Une erreur est survenue'): string {
  if (axios.isAxiosError(e)) {
    return (e.response?.data as { error?: string } | undefined)?.error ?? e.message ?? fallback;
  }
  return fallback;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  username: string;
  created_at: string;
  country?: string | null;
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  elo?: number;
  eloGames?: number;
  flags?: number;
}

export interface LocationInput {
  country: string | null;
  countryCode: string | null;
  region?: string | null;
  city?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Stats {
  user_id: number;
  matches_played: number;
  matches_won: number;
  win_pct: number;
  legs_played: number;
  legs_won: number;
  three_dart_avg: number;
  avg_history: number[];
  total_180s: number;
  highest_checkout: number;
  best_game_avg: number;
  heatmap: Record<string, number>;
  // Advanced
  checkout_pct: number;
  checkout_hits: number;
  checkout_attempts: number;
  doubles_hit: number;
  best_win_streak: number;
  current_win_streak: number;
  most_180s_game: number;
  first9_avg: number;
  by_game_type: Record<string, { played: number; won: number }>;
  // Advanced X01 (visit bands, highest visit, darts/leg, best leg)
  scores_60: number;
  scores_100: number;
  scores_140: number;
  highest_score: number;
  darts_per_leg: number;
  best_leg: number;
}

export interface GameVisit {
  total: number;
  bust: boolean;
  darts: string[]; // e.g. ["T20","20","D8"] (empty for numpad-entered visits)
}

export interface GameResultInput {
  gameType: 'x01' | 'cricket' | 'atc' | 'killer' | 'shanghai' | 'halveit';
  matchWon: boolean;
  legsWon: number;
  legsPlayed: number;
  opponents: string[];
  opponentIds: number[];
  dartsThrown: number;
  avg: number;
  total180s: number;
  highestCheckout: number;
  score: number;
  heatmap: Record<string, number>;
  /** X01 only: visits started "on a finish", and how many were converted. */
  checkoutAttempts?: number;
  checkoutHits?: number;
  /** X01 only: doubles + bullseyes actually landed (per-dart modes). */
  doublesHit?: number;
  /** X01 only: points + darts of the first 3 visits of each leg (first-9 average). */
  first9Points?: number;
  first9Darts?: number;
  /** X01 only: start score (501/301…), for the replay's remaining countdown. */
  startScore?: number;
  /** X01 only: per-visit log for the match-replay screen. */
  visits?: GameVisit[];
}

export interface GameResult extends GameResultInput {
  id: number;
  user_id: number;
  finished_at: string;
  online?: boolean;
  suspect?: boolean;
  reported?: boolean;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export const register = (name: string, username: string, password: string) =>
  api.post<AuthResponse>('/auth/register', { name, username, password }).then((r) => r.data);

export const login = (username: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data);

export const fetchMe = () => api.get<User>('/auth/me').then((r) => r.data);

export const updateLocation = (loc: LocationInput) =>
  api.post<User>('/auth/location', loc).then((r) => r.data);

/** Édition du compte : nom, avatar (URL), changement de mot de passe. */
export const updateMe = (patch: {
  name?: string;
  avatarUrl?: string | null;
  currentPassword?: string;
  newPassword?: string;
}) => api.patch<User>('/auth/me', patch).then((r) => r.data);

/** Suppression définitive du compte (cascade côté serveur). */
export const deleteMe = (password: string) =>
  api.delete<{ ok: boolean }>('/auth/me', { data: { password } }).then((r) => r.data);

export const registerPushToken = (token: string) =>
  api.post<{ ok: boolean }>('/auth/push-token', { token }).then((r) => r.data);

// ─── Stats + games ───────────────────────────────────────────────────────────

export const getStats = (userId: number) =>
  api.get<Stats>(`/users/${userId}/stats`).then((r) => r.data);

export const submitGameResult = (result: GameResultInput) =>
  api.post<GameResult>('/games', result).then((r) => r.data);

export const getHistory = () => api.get<GameResult[]>('/games').then((r) => r.data);

export const getGame = (id: number) => api.get<GameResult>(`/games/${id}`).then((r) => r.data);

// ─── Social ────────────────────────────────────────────────────────────────

export interface FeedItem {
  kind: 'post' | 'match';
  id: string;
  user_id: number;
  userName: string;
  username: string;
  created_at: string;
  // post
  text?: string;
  likeCount?: number;
  liked?: boolean;
  postId?: number;
  commentCount?: number;
  // match
  gameType?: 'x01' | 'cricket' | 'atc' | 'killer' | 'shanghai';
  matchWon?: boolean;
  legsWon?: number;
  oppLegs?: number;
  opponents?: string[];
  total180s?: number;
  highestCheckout?: number;
  score?: number;
}

export interface PostDetail {
  id: number;
  user_id: number;
  userName: string;
  username: string;
  text: string;
  created_at: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
}

export interface Comment {
  id: number;
  user_id: number;
  userName: string;
  username: string;
  text: string;
  created_at: string;
}

export type GameTypeId = 'x01' | 'cricket' | 'atc' | 'killer' | 'shanghai' | 'halveit';

export interface AppNotification {
  id: number;
  type: 'follow' | 'like' | 'comment' | 'match' | 'challenge' | 'challenge_result' | 'badge';
  actorId: number;
  actorName: string;
  postId: number | null;
  postSnippet: string | null;
  gameId: number | null;
  badge: string | null;
  challengeId: number | null;
  match: {
    gameType: GameTypeId;
    actorWon: boolean;
    actorLegs: number;
    oppLegs: number;
    confirmed: boolean;
    pending: boolean;
  } | null;
  challenge: {
    gameType: GameTypeId;
    legsToWin: number;
    status: 'pending' | 'accepted' | 'declined';
    pending: boolean; // recipient can act
  } | null;
  read: boolean;
  created_at: string;
}

export interface Challenge {
  id: number;
  gameType: GameTypeId;
  legsToWin: number;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  incoming: boolean;
  opponentId: number;
  opponentName: string;
  created_at: string;
}

export interface NotificationsResponse {
  unread: number;
  items: AppNotification[];
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  username: string;
  country?: string | null;
  countryCode?: string | null;
  matches_played: number;
  matches_won: number;
  win_pct: number;
  three_dart_avg: number;
  total_180s: number;
  highest_checkout: number;
  elo: number;
  elo_games: number;
  flags: number;
}

export type LeaderboardScope = 'world' | 'europe' | 'country' | 'friends';

export interface PersonResult extends User {
  isFollowing: boolean;
  mutual: boolean;
  isSelf?: boolean;
}

export interface UserProfile {
  user: User;
  stats: Stats;
  counts: { followers: number; following: number };
  relation: { following: boolean; followsMe: boolean; mutual: boolean; isSelf: boolean; blocked: boolean };
}

export const getFeed = (scope: 'foryou' | 'friends' = 'foryou') =>
  api.get<FeedItem[]>(`/feed?scope=${scope}`).then((r) => r.data);

export const createPost = (text: string) =>
  api.post('/posts', { text }).then((r) => r.data);

export const likePost = (postId: number) =>
  api.post<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`).then((r) => r.data);

export const getLeaderboard = (scope: LeaderboardScope = 'world') =>
  api.get<LeaderboardEntry[]>(`/leaderboard?scope=${scope}`).then((r) => r.data);

// ─── League (monthly seasons, skill-tier divisions) ──────────────────────────

export interface LeagueEntry {
  id: number;
  name: string;
  countryCode: string | null;
  three_dart_avg: number;
  points: number;
  played: number;
  won: number;
}
export interface LeagueResponse {
  season: string;
  seasonLabel: string;
  daysLeft: number;
  division: { key: string; name: string; index: number; total: number };
  nextDivisionName: string | null;
  avgToPromote: number | null;
  myAvg: number;
  you: { rank: number | null; points: number; played: number; won: number };
  entries: LeagueEntry[];
}
export const getLeague = () => api.get<LeagueResponse>('/league').then((r) => r.data);

// ─── Live (presence, spectating, head-to-head) ───────────────────────────────

export interface LiveMatch {
  code: string;
  names: string[];
  config: { startScore: number; legsToWin: number; finishMode: string };
  legs: number[];
  spectators: number;
}
export const getLiveMatches = () => api.get<LiveMatch[]>('/live/matches').then((r) => r.data);
export const getOnlineFriends = () => api.get<PersonResult[]>('/live/friends-online').then((r) => r.data);

export interface H2H { played: number; won: number; lost: number }
export const getH2H = (id: number) => api.get<H2H>(`/users/${id}/h2h`).then((r) => r.data);

// ─── Real-time online (WebSocket) ────────────────────────────────────────────
/** ws:// URL for the live-match socket, authenticated via the token query param. */
export const socketUrl = (token: string) =>
  API_BASE_URL.replace(/^http/, 'ws') + '/ws?token=' + encodeURIComponent(token);

export const searchPlayers = (q: string) =>
  api.get<PersonResult[]>(`/social/search?q=${encodeURIComponent(q)}`).then((r) => r.data);

export const followUser = (id: number) =>
  api.post<{ following: boolean; mutual: boolean }>(`/social/follow/${id}`).then((r) => r.data);

export const unfollowUser = (id: number) =>
  api.delete<{ following: boolean; mutual: boolean }>(`/social/follow/${id}`).then((r) => r.data);

export const getFollowCounts = (id: number) =>
  api.get<{ followers: number; following: number }>(`/social/counts/${id}`).then((r) => r.data);

export const getUserProfile = (id: number) =>
  api.get<UserProfile>(`/users/${id}/profile`).then((r) => r.data);

export const getFollowers = (id: number) =>
  api.get<PersonResult[]>(`/social/followers/${id}`).then((r) => r.data);

export const getFollowing = (id: number) =>
  api.get<PersonResult[]>(`/social/following/${id}`).then((r) => r.data);

// ─── Blocage ─────────────────────────────────────────────────────────────────

export const blockUser = (id: number) =>
  api.post<{ blocked: boolean }>(`/social/block/${id}`).then((r) => r.data);

export const unblockUser = (id: number) =>
  api.delete<{ blocked: boolean }>(`/social/block/${id}`).then((r) => r.data);

export const getBlockedUsers = () =>
  api.get<User[]>('/social/blocked').then((r) => r.data);

// ─── Historique Elo ──────────────────────────────────────────────────────────

export interface EloPoint {
  elo: number;
  gameId: number | null;
  created_at: string;
}

export const getEloHistory = (id: number) =>
  api.get<EloPoint[]>(`/users/${id}/elo-history`).then((r) => r.data);

// ─── Posts thread + comments ─────────────────────────────────────────────────

export const getPost = (id: number) =>
  api.get<PostDetail>(`/posts/${id}`).then((r) => r.data);

export const getComments = (id: number) =>
  api.get<Comment[]>(`/posts/${id}/comments`).then((r) => r.data);

export const addComment = (id: number, text: string) =>
  api.post(`/posts/${id}/comment`, { text }).then((r) => r.data);

// ─── Notifications ───────────────────────────────────────────────────────────

export const getNotifications = () =>
  api.get<NotificationsResponse>('/notifications').then((r) => r.data);

export const markNotificationsRead = () =>
  api.post('/notifications/read').then((r) => r.data);

export const confirmMatch = (gameId: number) =>
  api.post(`/games/${gameId}/confirm`).then((r) => r.data);

export const rejectMatch = (gameId: number) =>
  api.post(`/games/${gameId}/reject`).then((r) => r.data);

// ─── Challenges ──────────────────────────────────────────────────────────────

export const createChallenge = (toUserId: number, gameType: GameTypeId, legsToWin: number, message: string) =>
  api.post<Challenge>('/challenges', { toUserId, gameType, legsToWin, message }).then((r) => r.data);

export const acceptChallenge = (id: number) =>
  api.post<{ status: string }>(`/challenges/${id}/accept`).then((r) => r.data);

export const declineChallenge = (id: number) =>
  api.post<{ status: string }>(`/challenges/${id}/decline`).then((r) => r.data);

export const getChallenges = () => api.get<Challenge[]>('/challenges').then((r) => r.data);
