import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Doubles préférés du joueur (ceux qu'il réussit le mieux). Valeurs = segment de
// base : 1..20 pour D1..D20, 25 pour le Bull. Réglé dans le Profil, utilisé par
// la suggestion de checkout (CheckoutPill) pour router vers ces doubles quand
// c'est possible sans rallonger la finition. Préférence par appareil (comme les
// sons / le thème).
interface FavoritesState {
  favoriteDoubles: number[];
  toggle: (seg: number) => void;
  has: (seg: number) => boolean;
  /** Remplace les favoris (hydratation depuis le compte à la connexion). */
  setFavorites: (arr: number[] | undefined | null) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteDoubles: [],
      toggle: (seg) => {
        const cur = get().favoriteDoubles;
        set({
          favoriteDoubles: cur.includes(seg) ? cur.filter((s) => s !== seg) : [...cur, seg],
        });
      },
      has: (seg) => get().favoriteDoubles.includes(seg),
      setFavorites: (arr) => set({ favoriteDoubles: Array.isArray(arr) ? arr.slice() : [] }),
    }),
    {
      name: 'oche.favoriteDoubles',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ favoriteDoubles: s.favoriteDoubles }),
    }
  )
);
