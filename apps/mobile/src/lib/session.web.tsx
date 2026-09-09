/**
 * GRYD — variante WEB du contexte de session.
 * Metro résout `.web.tsx` avant `.tsx` sur la cible web ; le natif garde
 * `session.tsx` intact.
 *
 * ─── CE QUE CE FICHIER FAISAIT DE FAUX (corrigé le 21/07/2026) ──────────────
 * Il renvoyait EN DUR `{ session: null, configured: false }`. `configured: false`
 * signifie « aucun backend n'existe » (mode dev O1) : la garde de (tabs)/_layout
 * laisse alors passer sans connexion, et TOUS les écrans qui testent
 * `configured && session` basculent en repli « pas de backend ». Le navigateur
 * était donc FIGÉ dans un TROISIÈME état, qui n'existe sur aucun téléphone :
 * ni connecté, ni « connecte-toi », mais « il n'y a pas de serveur ».
 *
 * Un premier correctif avait gardé ce stub derrière la vitrine
 * (`EXPO_PUBLIC_SHOWCASE=1`). Le mode vitrine étant ABANDONNÉ (décision
 * fondateur du 21/07 : plus aucune surface de GRYD n'affiche de données
 * fabriquées), cette branche a disparu à son tour.
 *
 * ─── CE QU'IL FAIT MAINTENANT ───────────────────────────────────────────────
 * La VRAIE session Supabase, sans condition, strictement comme le natif. L'auth
 * Supabase fonctionne en navigateur (persistance localStorage via AsyncStorage
 * web, cf. supabase.ts) — il n'y a aucune raison technique de la court-circuiter.
 * `npx expo start --web` montre donc exactement ce que l'iPhone montrera :
 * déconnecté → invite à se connecter (app/(auth)/sign-in.web.tsx, e-mail OTP) ;
 * connecté sans données → invite à courir.
 *
 * ⚠️ PARITÉ : `SessionState` et la logique de `SessionProvider` doivent rester
 * identiques à `session.tsx`. Toute évolution de l'un se reporte sur l'autre.
 * Ce fichier n'existe QUE pour donner à Metro un point de fork web ; il ne doit
 * plus jamais diverger dans son COMPORTEMENT.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import { initialTokenProbe } from '../features/boot/bootSequence';
import { setResultOwner2026 } from '../features/run/resultOwner2026';
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
    if (!supabase) { setResultOwner2026(null); return; }
    let revision = 0;
    let alive = true;
    setResultOwner2026(undefined);
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive || revision !== 0) return;
        setResultOwner2026(data.session?.user.id ?? null); setSession(data.session);
      }).catch(() => { if (alive && revision === 0) setResultOwner2026(undefined); })
      .finally(() => { if (alive) setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      revision++;
      setResultOwner2026(next?.user.id ?? null);
      setSession(next);
      setLoading(false);
      // « Toute reconnexion annule la suppression » (0046) — mais UNIQUEMENT sur
      // une authentification RÉELLE. Surtout PAS sur `INITIAL_SESSION` (session
      // restaurée au lancement) : sinon ouvrir l'app une seule fois pendant les
      // 30 jours empêcherait la suppression de jamais aboutir, alors que
      // l'utilisateur la croit programmée. Demander la suppression déconnecte,
      // donc revenir passe forcément par un vrai SIGNED_IN.
      setDeletionCancelled(false);
      if (event === 'SIGNED_IN' && next) {
        const authRevision = revision;
        void cancelAccountDeletion().then(({ restored }) => {
          if (alive && revision === authRevision && restored) setDeletionCancelled(true);
        }).catch(() => {});
      }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); setResultOwner2026(undefined); };
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
