import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { get, post } from '@/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lf_user')) || null; } catch { return null; }
  });
  const [permissions, setPermissions] = useState([]);
  const [booting, setBooting] = useState(!!localStorage.getItem('lf_token'));

  const persist = useCallback((token, usr, perms) => {
    localStorage.setItem('lf_token', token);
    localStorage.setItem('lf_user', JSON.stringify(usr));
    setUser(usr);
    setPermissions(perms || []);
  }, []);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('lf_token')) { setBooting(false); return; }
    try {
      const res = await get('/auth/me');
      setUser(res.data.user);
      setPermissions(res.data.permissions || []);
      localStorage.setItem('lf_user', JSON.stringify(res.data.user));
    } catch {
      localStorage.removeItem('lf_token');
      localStorage.removeItem('lf_user');
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await post('/auth/login', { email, password });
    persist(res.data.token, res.data.user, res.data.permissions);
    return res.data.user;
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem('lf_token');
    localStorage.removeItem('lf_user');
    setUser(null);
    setPermissions([]);
    window.location.href = '/login';
  }, []);

  const can = useCallback(
    (perm) => !perm || user?.role === 'admin' || permissions.includes(perm),
    [permissions, user]
  );

  const value = useMemo(
    () => ({ user, permissions, booting, login, logout, refresh, can, isAuthenticated: !!user }),
    [user, permissions, booting, login, logout, refresh, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
