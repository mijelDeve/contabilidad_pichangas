'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const initializedRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data as Profile);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.name === 'AuthTokenRefreshError') {
            await supabase.auth.signOut();
          }
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
        setLoading(false);
        initializedRef.current = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
          if (event === 'TOKEN_REFRESHED' && session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else if (event === 'SIGNED_OUT' || !session) {
            setUser(null);
            setProfile(null);
          } else if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
          
          setLoading(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initAuth();
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
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
}