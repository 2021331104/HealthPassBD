import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, Role } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, user: null, profile: null, loading: true });

  async function loadProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error) return null;
    if (data) return data as Profile;
    // Profile row missing — auto-create a default patient profile
    const { data: user } = await supabase.auth.getUser();
    const fullName = (user?.user?.user_metadata?.full_name as string) || 'User';
    const { data: created, error: insErr } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, role: 'patient', full_name: fullName }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();
    if (insErr) return null;
    return created as Profile | null;
  }

  function applyState(session: Session | null, profile: Profile | null) {
    setState({ session, user: session?.user ?? null, profile, loading: false });
  }

  useEffect(() => {
    let mounted = true;

    // Initial load: get session then load profile
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        applyState(null, null);
        return;
      }
      const profile = await loadProfile(data.session.user.id);
      if (mounted) applyState(data.session, profile);
    });

    // Auth state changes — wrap async in IIFE to avoid deadlock
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      (async () => {
        if (!session) {
          applyState(null, null);
          return;
        }
        const profile = await loadProfile(session.user.id);
        if (mounted) applyState(session, profile);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useRole(): Role | null {
  const { profile } = useAuth();
  return profile?.role ?? null;
}
