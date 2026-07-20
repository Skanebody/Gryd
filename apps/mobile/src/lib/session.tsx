/**
 * GRYD — contexte de session Supabase minimal (Milestone 1).
 * Règle de redirection : Supabase configuré + pas de session → (auth)/sign-in ;
 * Supabase non configuré (O1) → mode dev, accès direct à la carte.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import { cancelAccountDeletion } from '../features/account/deletion';

export interface SessionState {
  /** Session Supabase courante (null : déconnecté ou mode dev). */
  session: Session | null;
  /** True pendant la restauration initiale de session (splash implicite). */
  loading: boolean;
  /** False = mode dev sans backend (O1) : pas d'écran d'auth. */
  configured: boolean;
  /**
   * True quand la reconnexion qui vient d'avoir lieu a ANNULÉ une suppression
   * de compte en cours (0046). L'écran d'accueil le DIT clairement — on ne
   * restaure jamais un compte en silence. Remis à false une fois annoncé.
   */
  deletionCancelled: boolean;
  acknowledgeDeletionCancelled: () => void;
}

const SessionContext = createContext<SessionState>({
  session: null,
  loading: false,
  configured: isSupabaseConfigured,
  deletionCancelled: false,
  acknowledgeDeletionCancelled: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [deletionCancelled, setDeletionCancelled] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // « Toute reconnexion annule la suppression » (0046) — mais UNIQUEMENT sur
      // une authentification RÉELLE. Surtout PAS sur `INITIAL_SESSION` (session
      // restaurée au lancement) : sinon ouvrir l'app une seule fois pendant les
      // 30 jours empêcherait la suppression de jamais aboutir, alors que
      // l'utilisateur la croit programmée. Demander la suppression déconnecte,
      // donc revenir passe forcément par un vrai SIGNED_IN.
      if (event === 'SIGNED_IN' && next) {
        void cancelAccountDeletion().then(({ restored }) => {
          if (restored) setDeletionCancelled(true);
        });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        configured: isSupabaseConfigured,
        deletionCancelled,
        acknowledgeDeletionCancelled: () => setDeletionCancelled(false),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
