import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe } from '../services/api';

interface User { id: string; name: string; email: string; }
interface AuthCtx {
  user: User | null; token: string | null; loading: boolean;
  setAuth: (token: string, user: User) => void; logout: () => void;
}

const AuthContext = createContext<AuthCtx>({ user: null, token: null, loading: true, setAuth: () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe().then((r) => setUser(r.data)).catch(() => { localStorage.removeItem('token'); setToken(null); }).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [token]);

  const setAuth = (t: string, u: User) => { localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); setToken(t); setUser(u); };
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(null); setUser(null); };

  return <AuthContext.Provider value={{ user, token, loading, setAuth, logout }}>{children}</AuthContext.Provider>;
}
