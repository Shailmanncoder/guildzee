'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarConfig: any;
  bannerUrl: string | null;
  bio: string | null;
  status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
  customStatus: string | null;
  xp: number;
  level: number;
  streak: number;
  themePreference: 'dark' | 'light' | 'amoled';
  accentColor: string;
}

const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;
  if (typeof window !== 'undefined') {
    if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return `${window.location.protocol}//${window.location.host}/api/backend`;
    }
  }
  return 'http://localhost:4000';
};

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (accessToken: string, userData: User) => void;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
  setTheme: (theme: 'dark' | 'light' | 'amoled') => void;
  setAccentColor: (color: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load token and user profile on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      applyTheme(parsedUser.themePreference || 'dark');
    }
    setLoading(false);
  }, []);

  const applyTheme = (theme: 'dark' | 'light' | 'amoled') => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-amoled');
    if (theme === 'dark') {
      root.classList.add('theme-dark');
    } else if (theme === 'amoled') {
      root.classList.add('theme-amoled');
    }
  };

  const login = (accessToken: string, userData: User) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    applyTheme(userData.themePreference);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      // Best-effort call to backend logout to clear HTTP cookie and delete session
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.warn('Backend logout failed', e);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    document.documentElement.classList.remove('theme-dark', 'theme-amoled');
    router.push('/login');
  };

  const updateUser = (updatedData: Partial<User>) => {
    if (!user) return;
    const mergedUser = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(mergedUser));
    setUser(mergedUser);
    if (updatedData.themePreference) {
      applyTheme(updatedData.themePreference);
    }
  };

  const setTheme = async (theme: 'dark' | 'light' | 'amoled') => {
    if (!user || !token) return;
    updateUser({ themePreference: theme });
    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ themePreference: theme }),
      });
    } catch (err) {
      console.error('Failed to sync theme preference with server', err);
    }
  };

  const setAccentColor = async (color: string) => {
    if (!user || !token) return;
    updateUser({ accentColor: color });
    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accentColor: color }),
      });
    } catch (err) {
      console.error('Failed to sync accent color with server', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        updateUser,
        setTheme,
        setAccentColor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
