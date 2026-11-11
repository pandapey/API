import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem('devapi_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[Auth readStoredUser failed]', e);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(true);

  const persist = (u, token) => {
    setUser(u || null);
    try {
      if (u) localStorage.setItem('devapi_user', JSON.stringify(u));
      else localStorage.removeItem('devapi_user');
      if (token) localStorage.setItem('devapi_token', token);
    } catch (e) { console.error('[Auth persist failed]', e); }
  };

  const fetchMe = useCallback(async () => {
    try {
      const token = (() => {
        try { return localStorage.getItem('devapi_token'); } catch { return null; }
      })();
      if (!token) {
        // No access token: clear any stale stored user so logged-out state is correct.
        try { localStorage.removeItem('devapi_user'); } catch {}
        setUser(null);
        return null;
      }
      const data = await authService.me();
      const u = data?.user ?? data?.data?.user ?? data;
      if (u && (u.id || u._id || u.email)) {
        const normalized = { ...u, id: u.id || u._id, role: u.role === 'user' ? 'developer' : u.role };
        persist(normalized);
        return normalized;
      }
      try { localStorage.removeItem('devapi_token'); localStorage.removeItem('devapi_user'); } catch {}
      setUser(null);
      return null;
    } catch (e) {
      console.error('[Auth fetchMe failed]', e?.response?.data || e.message);
      try { localStorage.removeItem('devapi_token'); localStorage.removeItem('devapi_user'); } catch {}
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    const onUnauth = () => {
      try {
        localStorage.removeItem('devapi_token');
        localStorage.removeItem('devapi_user');
      } catch {}
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('devapi:unauthorized', onUnauth);
    return () => window.removeEventListener('devapi:unauthorized', onUnauth);
  }, [fetchMe]);

  const login = useCallback(async (payload) => {
    const data = await authService.login(payload);
    const token = data?.token || data?.accessToken || data?.data?.accessToken;
    const raw = data?.user ?? data?.data?.user ?? null;
    if (!raw || !token) {
      try { localStorage.removeItem('devapi_token'); localStorage.removeItem('devapi_user'); } catch {}
      setUser(null);
      throw new Error('Login failed: invalid server response');
    }
    const u = { ...raw, id: raw.id || raw._id, role: raw.role === 'user' ? 'developer' : raw.role };
    persist(u, token);
    return { user: u, token };
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    const token = data?.token || data?.accessToken || data?.data?.accessToken;
    const raw = data?.user ?? data?.data?.user ?? null;
    if (!raw || !token) {
      throw new Error('Registration failed: invalid server response');
    }
    const u = { ...raw, id: raw.id || raw._id, role: raw.role === 'user' ? 'developer' : raw.role };
    persist(u, token);
    return { user: u, token };
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (e) { console.error('[Auth logout api failed]', e?.response?.data || e.message); }
    try {
      localStorage.removeItem('devapi_token');
      localStorage.removeItem('devapi_user');
    } catch (e) { console.error('[Auth logout cleanup failed]', e); }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      role: user?.role || 'developer',
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      fetchMe,
      setUser: (next) => {
        // Accept either a user object (Profile-style merge) or persist(user, token).
        if (next && typeof next === 'object' && !Array.isArray(next) && next.email && !next.token) {
          persist(next);
          return;
        }
        persist(next);
      },
      persist,
    }),
    [user, loading, login, register, logout, fetchMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
