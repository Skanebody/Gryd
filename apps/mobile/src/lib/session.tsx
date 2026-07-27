/**
 * GRYD — contexte de session Supabase minimal (Milestone 1).
 * Règle de redirection : Supabase configuré + pas de session → (auth)/sign-in ;
 * Supabase non configuré (O1) → mode dev, accès direct à la carte.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import { initialTokenProbe } from '../features/boot/bootSequence';
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
  /**
   * ANTI-FLASH E00 — LA VALEUR DU TOUT PREMIER RENDU, ET ELLE N'EST PAS ÉCRITE
   * ICI. Elle vient d'`initialTokenProbe` (features/boot/bootSequence.ts), la
   * fonction PURE que la séquence de démarrage utilise déjà et que ses tests
   * figent. Auparavant cette ligne portait `useState(isSupabaseConfigured)` et
   * `initialTokenProbe` en était une COPIE que personne n'appelait : les tests
   * « aucun flash de l'écran de connexion » validaient donc un duplicata, et
   * repasser cette ligne à `useState(false)` aurait ramené le flash en laissant
   * la suite verte. Un seul énoncé, un seul endroit — et `bootSequence.test.ts`
   * relit CE fichier pour vérifier que l'appel y est toujours.
   */
  const [loading, setLoading] = useState<boolean>(
    initialTokenProbe(isSupabaseConfigured) === 'reading',
  );
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
