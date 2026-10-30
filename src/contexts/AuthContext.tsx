import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<UserProfile | null>;
  loginDemo: (customProfile?: Partial<UserProfile>) => void;
  updateProfile: (profile: Partial<UserProfile>) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = await authService.getCurrentSession();
        setUser(session.user);
        setIsDemo(session.isDemo);
      } catch (err: unknown) {
        console.error('Session retrieval error:', err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const loginWithGoogle = async (): Promise<UserProfile | null> => {
    setError(null);
    setLoading(true);
    const { user: profile, error: authErr, url } = await authService.signInWithGoogle();
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return null;
    }
    if (profile) {
      setUser(profile);
      setIsDemo(false);
      setLoading(false);
      return profile;
    }
    if (url) {
      window.location.href = url;
    }
    setLoading(false);
    return null;
  };

  const loginDemo = (customProfile?: Partial<UserProfile>) => {
    setError(null);
    const demoProfile = authService.loginDemoUser(customProfile);
    setUser(demoProfile);
    setIsDemo(true);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!user) return false;
    const merged: UserProfile = { ...user, ...updates };
    const { success, error: saveErr } = await authService.saveProfile(merged);
    if (success) {
      setUser(merged);
      return true;
    }
    if (saveErr) {
      setError(saveErr.message);
    }
    return false;
  };

  const logout = async () => {
    await authService.signOut();
    setUser(null);
    setIsDemo(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo,
        error,
        loginWithGoogle,
        loginDemo,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
