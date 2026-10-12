import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, AuthUser, getToken, setToken } from '../api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  function logout() {
    setToken(null);
    setUser(null);
  }

  // Restore a session on page load if a token was saved from a previous visit.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // api.ts broadcasts this when a request comes back 401 with an
  // already-expired/invalid token, so the app can snap back to the login
  // screen from anywhere.
  useEffect(() => {
    window.addEventListener('qadmin:unauthorized', logout);
    return () => window.removeEventListener('qadmin:unauthorized', logout);
  }, []);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    setToken(res.token);
    setUser(res.user);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
