'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';

interface AuthError {
  message: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const supabase = createClient();
  const mountedRef = useRef(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (mountedRef.current && data) {
      setProfile(data as Profile);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mountedRef.current) {
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
          setLoading(false);
          setInitializing(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
          if (!mountedRef.current) return;

          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
          
          setLoading(false);
          setInitializing(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        if (mountedRef.current) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    initAuth();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: { message: error.message } };
    }

    if (data.user) {
      await fetchProfile(data.user.id);
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
        emailRedirectTo: 'https://contabilidad-pichangas.vercel.app/dashboard',
      },
    });

    if (error) {
      return { error: { message: error.message } };
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        avatar_url: null,
      });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading: initializing || loading, signIn, signUp, signOut }}>
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