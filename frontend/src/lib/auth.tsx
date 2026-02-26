import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'ProjectManager' | 'TeamMember';
  teamMemberId?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isProjectManager: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'paradise_pm_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inject token into every request
  useEffect(() => {
    const interceptor = api.interceptors.request.use(config => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers = config.headers ?? {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, []);

  // On mount, verify stored token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(r => setUser(r.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, r.data.token);
    setUser(r.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'Admin';
  const isProjectManager = user?.role === 'Admin' || user?.role === 'ProjectManager';

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin, isProjectManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
