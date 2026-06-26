import { create } from 'zustand';
import * as SecureStore from '@/services/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setAuthToken,
  login as apiLogin,
  register as apiRegister,
  fetchMe,
  apiErrorMessage,
  type User,
} from '@/services/api';
import { queryClient } from '@/services/queryClient';
import { usePracticeStore } from '@/hooks/usePracticeStore';
import { useFavoritesStore } from '@/hooks/useFavoritesStore';

const TOKEN_KEY = 'oche.token';
const GUEST_KEY = 'oche.guest';

/** Point the device-local practice records at the right account bucket
 *  (waits for the persisted store to finish hydrating to avoid a race). */
function scopePractice(user: User | null) {
  const apply = () => usePracticeStore.getState().setAccount(user ? `u${user.id}` : 'guest');
  const p = usePracticeStore.persist;
  if (p.hasHydrated()) apply();
  else p.onFinishHydration(apply);
}

/** Hydrate les doubles préférés depuis le compte (sync multi-appareils). En
 *  invité, on garde la préférence locale (rien à faire). */
function scopeFavorites(user: User | null) {
  if (!user) return;
  useFavoritesStore.getState().setFavorites(user.favoriteDoubles);
}

type AuthStatus = 'loading' | 'authed' | 'guest';

interface AuthStore {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  /** Guest = chose to play locally without an account (offline party mode). */
  guestMode: boolean;
  /** Restore a saved session on app launch. */
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Enter offline guest mode (no account). */
  continueAsGuest: () => Promise<void>;
  /** Leave guest mode → back to the auth screen (to log in / sign up). */
  exitGuest: () => Promise<void>;
  /** Re-pull the account from the server (e.g. after a location update). */
  refreshUser: () => Promise<void>;
}

async function persistToken(token: string | null) {
  setAuthToken(token);
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: 'loading',
  token: null,
  user: null,
  guestMode: false,

  bootstrap: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        const g = await AsyncStorage.getItem(GUEST_KEY);
        set({ status: 'guest', guestMode: g === '1' });
        scopePractice(null);
        return;
      }
      setAuthToken(token);
      const user = await fetchMe(); // validates the token
      set({ status: 'authed', token, user, guestMode: false });
      scopePractice(user);
      scopeFavorites(user);
    } catch (e) {
      await persistToken(null);
      set({ status: 'guest', token: null, user: null });
      scopePractice(null);
    }
  },

  login: async (username, password) => {
    try {
      const { token, user } = await apiLogin(username, password);
      await persistToken(token);
      await AsyncStorage.removeItem(GUEST_KEY);
      queryClient.clear();
      set({ status: 'authed', token, user, guestMode: false });
      scopePractice(user);
      scopeFavorites(user);
    } catch (e) {
      throw new Error(apiErrorMessage(e, 'Connexion impossible'));
    }
  },

  register: async (name, username, password) => {
    try {
      const { token, user } = await apiRegister(name, username, password);
      await persistToken(token);
      await AsyncStorage.removeItem(GUEST_KEY);
      queryClient.clear();
      set({ status: 'authed', token, user, guestMode: false });
      scopePractice(user);
      scopeFavorites(user);
    } catch (e) {
      throw new Error(apiErrorMessage(e, 'Inscription impossible'));
    }
  },

  logout: async () => {
    await persistToken(null);
    await AsyncStorage.removeItem(GUEST_KEY);
    queryClient.clear();
    set({ status: 'guest', token: null, user: null, guestMode: false });
    scopePractice(null);
  },

  continueAsGuest: async () => {
    await AsyncStorage.setItem(GUEST_KEY, '1');
    queryClient.clear();
    set({ status: 'guest', token: null, user: null, guestMode: true });
    scopePractice(null);
  },

  exitGuest: async () => {
    await AsyncStorage.removeItem(GUEST_KEY);
    set({ guestMode: false });
  },

  refreshUser: async () => {
    try {
      const user = await fetchMe();
      set({ user });
      scopeFavorites(user);
    } catch (e) {
      // keep the current user on a transient failure
    }
  },
}));
