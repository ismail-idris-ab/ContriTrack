import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

// Strip the token field before persisting — JWT lives in the httpOnly cookie only
const stripToken = ({ token: _, ...rest }) => rest;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  // On mount, verify session via cookie and sync user state
  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        const payload = data.data ?? data;
        localStorage.setItem('user', JSON.stringify(payload));
        setUser(payload);
      })
      .catch(() => {
        // No valid cookie — clear any stale localStorage
        localStorage.removeItem('user');
        setUser(null);
      });
  }, []);

  const login = (userData) => {
    const safe = stripToken(userData);
    localStorage.setItem('user', JSON.stringify(safe));
    setUser(safe);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('user');
    setUser(null);
  };

  // Re-fetch subscription status from the server and update stored user
  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/subscription/status');
      const updated = { ...user, subscription: { plan: data.plan, status: data.status, trialEndsAt: data.trialEndsAt ?? null } };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch {
      // silently ignore — stale subscription data is acceptable
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
