import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchMe, getToken, setToken, type User } from './api';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) { setLoading(false); return; }
    fetchMe()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = (token: string, u: User) => { setToken(token); setUser(u); };
  const signOut = () => { setToken(null); setUser(null); };

  return <Ctx.Provider value={{ user, loading, signIn, signOut, setUser }}>{children}</Ctx.Provider>;
}
