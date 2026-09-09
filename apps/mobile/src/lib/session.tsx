/**
 * GRYD — contexte de session Supabase.
 *
 * Règle de redirection : Supabase configuré + pas de session → la carte reste
 * ouverte en visiteur, la porte de compte est `(auth)/sign-in` (cahier G01/G02,
 * ADR-012 — l'exploration précède la création de compte) ; Supabase non
 * configuré (O1) → mode dev, accès direct à la carte.
 *
 * ─── CE QUE CE FICHIER PORTE, ET QUI N'ÉTAIT RENDU NULLE PART ───────────────
 * Deux FAITS de session étaient calculés ici et n'atteignaient aucun écran :
 *
 *  1. `deletionCancelled` — « toute reconnexion annule la suppression » (0046).
 *     Le champ existait, son acquittement aussi, et AUCUN composant ne les
 *     lisait : un compte en attente de suppression était restauré EN SILENCE.
 *  2. `sessionExpired` (ajouté le 10/09/2026) — un `SIGNED_OUT` issu d'un
 *     rafraîchissement raté faisait retomber l'app en visiteur sans un mot. Le
 *     joueur relançait, voyait la carte d'un inconnu, et n'avait aucune raison
 *     de penser à se reconnecter.
 *
 * Les deux sont désormais rendus par `features/account/SessionNotices2026.tsx`,
 * monté dans `app/(tabs)/_layout.tsx`, et tous deux sont ACQUITTABLES.
 *
 * ─── LE RAFRAÎCHISSEMENT SUIT LE CYCLE DE VIE DE L'APP ──────────────────────
 * `autoRefreshToken: true` (lib/supabase.ts) ne suffit pas en React Native : la
 * minuterie du SDK continue de tourner en arrière-plan, où l'OS suspend le
 * JavaScript — au réveil elle a raté ses échéances, et le premier appel part
 * avec un jeton périmé. `startAutoRefresh`/`stopAutoRefresh` branchés sur
 * `AppState` est la voie documentée par Supabase pour React Native ; sur web,
 * `AppState` n'a pas ce sens (l'onglet garde ses minuteries) et le SDK gère
 * seul, donc on n'y touche pas.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import { initialTokenProbe } from '../features/boot/bootSequence';
import { setResultOwner2026 } from '../features/run/resultOwner2026';
import { cancelAccountDeletion } from '../features/account/deletion';
import { consumeIntentionalSignOut2026 } from '../features/account/signOutIntent2026';

export interface SessionState {
  /** Session Supabase courante (null : déconnecté ou mode dev). */
  session: Session | null;
  /** True pendant la restauration initiale de session (splash implicite). */
  loading: boolean;
  /** False = mode dev sans backend (O1) : pas d'écran d'auth. */
  configured: boolean;
  /**
   * True quand la reconnexion qui vient d'avoir lieu a ANNULÉ une suppression
   * de compte en cours (0046). L'app le DIT clairement — on ne restaure jamais
   * un compte en silence. Remis à false une fois annoncé.
   */
  deletionCancelled: boolean;
  acknowledgeDeletionCancelled: () => void;
  /**
   * True quand la session s'est terminée SANS que personne ne l'ait demandé —
   * en pratique : le jeton n'a pas pu être rafraîchi. Distinct d'une
   * déconnexion volontaire (`signOut`), qui ne mérite aucun commentaire.
   * Voir `features/account/signOutIntent2026.ts`.
   */
  sessionExpired: boolean;
  acknowledgeSessionExpired: () => void;
}

const SessionContext = createContext<SessionState>({
  session: null,
  loading: false,
  configured: isSupabaseConfigured,
  deletionCancelled: false,
  acknowledgeDeletionCancelled: () => {},
  sessionExpired: false,
  acknowledgeSessionExpired: () => {},
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
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!supabase) { setResultOwner2026(null); return; }
    const client = supabase;
    let revision = 0;
    let alive = true;
    /** Y avait-il une session AVANT cet événement ? Un `SIGNED_OUT` sans session en cours ne dit rien. */
    let hadSession = false;
    setResultOwner2026(undefined);
    client.auth
      .getSession()
      .then(({ data }) => {
        if (!alive || revision !== 0) return;
        hadSession = data.session !== null;
        setResultOwner2026(data.session?.user.id ?? null); setSession(data.session);
      }).catch(() => { if (alive && revision === 0) setResultOwner2026(undefined); })
      .finally(() => { if (alive) setLoading(false); });
    const { data: listener } = client.auth.onAuthStateChange((event, next) => {
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
        setSessionExpired(false);
        const authRevision = revision;
        void cancelAccountDeletion().then(({ restored }) => {
          if (alive && revision === authRevision && restored) setDeletionCancelled(true);
        }).catch(() => {});
      }
      if (event === 'SIGNED_OUT') {
        // Une déconnexion DEMANDÉE ne se commente pas ; une session qui s'éteint
        // toute seule, si. `hadSession` évite d'annoncer l'expiration d'une
        // session qui n'avait jamais commencé (un `SIGNED_OUT` peut suivre une
        // restauration vide au lancement).
        const asked = consumeIntentionalSignOut2026();
        setSessionExpired(hadSession && !asked);
      }
      hadSession = next !== null;
    });

    // ── Le rafraîchissement suit l'app, pas une minuterie aveugle ───────────
    // (voir l'entête). Rien sur web : l'onglet garde ses minuteries, et
    // `AppState` n'y décrit pas la même chose.
    let appState: { remove: () => void } | null = null;
    if (Platform.OS !== 'web') {
      client.auth.startAutoRefresh();
      appState = AppState.addEventListener('change', (state: AppStateStatus) => {
        if (state === 'active') client.auth.startAutoRefresh();
        else client.auth.stopAutoRefresh();
      });
    }

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
      appState?.remove();
      if (Platform.OS !== 'web') client.auth.stopAutoRefresh();
      setResultOwner2026(undefined);
    };
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        configured: isSupabaseConfigured,
        deletionCancelled,
        acknowledgeDeletionCancelled: () => setDeletionCancelled(false),
        sessionExpired,
        acknowledgeSessionExpired: () => setSessionExpired(false),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
