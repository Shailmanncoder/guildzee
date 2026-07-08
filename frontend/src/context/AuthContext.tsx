'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBackendUrl } from '../lib/backend';


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
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            applyTheme(parsedUser.themePreference || 'dark');
          } catch (e) {
            console.error('Failed to parse stored user', e);
          }
        }

        // Fetch fresh profile from backend to verify token and update status
        try {
          const BE = getBackendUrl();
          const res = await fetch(`${BE}/api/users/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            const freshUser = data.user || data;
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
            applyTheme(freshUser.themePreference || 'dark');
          } else {
            // Token is invalid/expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          console.error('Failed to fetch fresh user profile', err);
          // If network is offline, keep the local user cache as fallback
        }
      }
      setLoading(false);
    };

    initAuth();
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
