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
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    const storedUser = localStorage.getItem('auth_user');
    const token = localStorage.getItem('auth_token');
    
    // IMPORTANT: Ignore anonymous/guest tokens - they are not authenticated users
    if (storedUser && token && token !== 'anonymous') {
      try {
        const userData = JSON.parse(storedUser);
        // Make sure this is not a guest user
        if (!userData.isAnonymous) {
          setUser(userData);
        } else {
          // Clear guest data from auth context
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_token');
        }
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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