'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserData {
  id?: string | number;
  username: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  login: (userData: UserData, token: string) => void;
  updateUser: (updates: Partial<UserData>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const decodeJwtSub = (token: string): string | null => {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      return typeof payload?.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // Check for existing session on app load
    const storedUser = localStorage.getItem('auth_user');
    const token = localStorage.getItem('auth_token');
    
    if (storedUser && token) {
      try {
        let userData = JSON.parse(storedUser);

        // Older sessions may not have stored `id`. Recover it from JWT.
        if ((!userData?.id || String(userData.id).trim() === '') && token !== 'anonymous') {
          const sub = decodeJwtSub(token);
          const parsedId = sub ? Number(sub) : NaN;
          if (Number.isFinite(parsedId)) {
            userData = { ...userData, id: parsedId };
            localStorage.setItem('auth_user', JSON.stringify(userData));
          }
        }

        setUser(userData);
      } catch (error) {
        console.error('Failed to parse user data', error);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: UserData, token: string) => {
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_token', token);
  };

  const updateUser = (updates: Partial<UserData>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      localStorage.setItem('auth_user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}