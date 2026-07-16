import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAccessToken } from '../services/api';
import { useTheme } from './ThemeContext';
import type { User } from '../../../shared/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data;
        setAccessToken(accessToken);

        const profileRes = await api.get('/auth/me');
        const userData = profileRes.data;
        setUser(userData);
        if (userData.themePreference) {
          setTheme(userData.themePreference as any);
        }
      } catch (err) {
        console.log('No active session found on initialization.');
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user: userData } = response.data;
      
      setAccessToken(accessToken);
      setUser(userData);
      if (userData.themePreference) {
        setTheme(userData.themePreference as any);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await api.patch('/auth/change-password', { oldPassword, newPassword });
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Password update failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitialized,
        login,
        logout,
        changePassword,
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
