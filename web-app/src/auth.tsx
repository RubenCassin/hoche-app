import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fetchMe, getToken, setToken, type User } from './api';
import { liveConnect, liveDisconnect } from './live';
import { detectAndSyncLocation } from './geo';

const GUEST_KEY = 'hoche.web.guest';

interface AuthCtx {
  user: User | null;
  guest: boolean;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  continueAsGuest: () => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sans pays renseigné : tente une détection (autorisation navigateur) pour
  // alimenter le classement Pays/Europe — une fois, sans bloquer l'UI.
  const geoDone = useRef(false);
  const maybeGeo = (u: User) => {
    if (geoDone.current || u.countryCode) return;
    geoDone.current = true;
    detectAndSyncLocation().then((updated) => { if (updated) setUser(updated); });
  };

  useEffect(() => {
    const t = getToken();
    if (!t) { if (localStorage.getItem(GUEST_KEY) === '1') setGuest(true); setLoading(false); return; }
    fetchMe()
      .then((u) => { setUser(u); liveConnect(); maybeGeo(u); })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = (token: string, u: User) => { localStorage.removeItem(GUEST_KEY); setGuest(false); setToken(token); setUser(u); liveConnect(); maybeGeo(u); };
  const signOut = () => { liveDisconnect(); localStorage.removeItem(GUEST_KEY); setGuest(false); setToken(null); setUser(null); };
  const continueAsGuest = () => { localStorage.setItem(GUEST_KEY, '1'); setGuest(true); };

  return <Ctx.Provider value={{ user, guest, loading, signIn, signOut, continueAsGuest, setUser }}>{children}</Ctx.Provider>;
}
