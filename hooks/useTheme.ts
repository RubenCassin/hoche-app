import { create } from 'zustand';
import * as SecureStore from '@/services/secureStorage';
import { PALETTES, type Palette, type Scheme } from '@/constants/theme';

const KEY = 'oche.scheme';

interface ThemeState {
  scheme: Scheme;
  setScheme: (s: Scheme) => void;
  toggle: () => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  scheme: 'dark',
  setScheme: (scheme) => {
    set({ scheme });
    SecureStore.setItemAsync(KEY, scheme).catch(() => {});
  },
  toggle: () => get().setScheme(get().scheme === 'dark' ? 'light' : 'dark'),
  hydrate: async () => {
    try {
      const s = await SecureStore.getItemAsync(KEY);
      if (s === 'light' || s === 'dark') set({ scheme: s });
    } catch {
      // keep default
    }
  },
}));

/** Active palette — components re-render when the scheme changes. */
export function useTheme(): Palette {
  return PALETTES[useThemeStore((s) => s.scheme)];
}
