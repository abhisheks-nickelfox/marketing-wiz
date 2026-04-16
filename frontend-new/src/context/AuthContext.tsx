import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../lib/api';
import type { User } from '../lib/api';

const TOKEN_KEY = 'mw_token';

interface AuthState {
  user: User | null;
  /** true while the initial token→me check is running */
  initialising: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Refresh the current user profile (call after updating profile fields) */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, initialising: true });

  // On mount: if a token exists, verify it and load the full user profile
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState({ user: null, initialising: false });
      return;
    }

    authApi.me()
      .then((user) => setState({ user, initialising: false }))
      .catch(() => {
        // Token invalid / expired — clear it
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, initialising: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    // Fetch full profile (including first_name, last_name, avatar_url, skills)
    const user = await authApi.me();
    setState({ user, initialising: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, initialising: false });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.me();
      setState((prev) => ({ ...prev, user }));
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
