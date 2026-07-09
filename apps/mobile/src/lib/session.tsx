/**
 * GRYD — contexte de session Supabase minimal (Milestone 1).
 * Règle de redirection : Supabase configuré + pas de session → (auth)/sign-in ;
 * Supabase non configuré (O1) → mode dev, accès direct à la carte.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { reloadProfileFromServer } from '../features/social/profileStore';
import { configurePurchases } from './purchases';
import { isSupabaseConfigured, supabase } from './supabase';

export interface SessionState {
  /** Session Supabase courante (null : déconnecté ou mode dev). */
  session: Session | null;
  /** True pendant la restauration initiale de session (splash implicite). */
  loading: boolean;
  /** False = mode dev sans backend (O1) : pas d'écran d'auth. */
  configured: boolean;
}

const SessionContext = createContext<SessionState>({
  session: null,
  loading: false,
  configured: isSupabaseConfigured,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (next !== null && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        void reloadProfileFromServer();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading, configured: isSupabaseConfigured }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
