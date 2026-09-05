import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  demoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(() => sessionStorage.getItem('intelsight-demo') === '1');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    demoMode,
    enableDemoMode: () => {
      sessionStorage.setItem('intelsight-demo', '1');
      setDemoMode(true);
    },
    disableDemoMode: () => {
      sessionStorage.removeItem('intelsight-demo');
      setDemoMode(false);
    },
    sendOtp: async (email: string) => {
      if (!supabase || !isSupabaseConfigured) return { error: 'Supabase authentication is not configured yet.' };
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      return error ? { error: error.message } : {};
    },
    signOut: async () => {
      sessionStorage.removeItem('intelsight-demo');
      setDemoMode(false);
      if (supabase) await supabase.auth.signOut();
    },
  }), [demoMode, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
