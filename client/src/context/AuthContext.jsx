import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  // Re-fetch subscription status from the server and update stored user
  const refreshSubscription = useCallback(async () => {
    if (!user?.token) return;
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
