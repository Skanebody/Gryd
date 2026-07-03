/**
 * GRYD — variante WEB du contexte de session (aperçu navigateur).
 * Metro résout `.web.tsx` avant `.tsx` sur la cible web. Le natif garde
 * session.tsx intact (garde d'auth réelle Supabase).
 *
 * Sur web, l'objectif est un aperçu des écrans côté utilisateur SANS mur de
 * connexion : on force `configured: false` (comme le mode dev O1) pour que la
 * garde de (tabs)/_layout laisse passer directement vers les onglets, quel que
 * soit l'état Supabase. Aucun appel réseau d'auth n'est déclenché.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

export interface SessionState {
  session: Session | null;
  loading: boolean;
  /** Toujours false sur web → mode aperçu, pas d'écran d'auth. */
  configured: boolean;
}

const WEB_PREVIEW_STATE: SessionState = {
  session: null,
  loading: false,
  configured: false,
};

const SessionContext = createContext<SessionState>(WEB_PREVIEW_STATE);

export function SessionProvider({ children }: { children: ReactNode }) {
  return <SessionContext.Provider value={WEB_PREVIEW_STATE}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
