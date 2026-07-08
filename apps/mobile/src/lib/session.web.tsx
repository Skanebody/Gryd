/**
 * GRYD — session web dev : Supabase staging réel + auto-login compte preview.
 * En `__DEV__`, on ne masque plus le backend : l'aperçu localhost teste les
 * vraies données (carte, profil, crew) avec preview@gryd.dev.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ensureDevPreviewSession } from './devPreview';
import { isSupabaseConfigured, supabase } from './supabase';

export interface SessionState {
  session: Session | null;
  loading: boolean;
  configured: boolean;
}

const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
  configured: isSupabaseConfigured,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let alive = true;

    void (async () => {
      if (__DEV__) {
        await ensureDevPreviewSession();
      }
      const { data } = await supabase.auth.getSession();
      if (alive) setSession(data.session);
    })().finally(() => {
      if (alive) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{ session, loading, configured: isSupabaseConfigured }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
