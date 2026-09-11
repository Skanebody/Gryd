/**
 * GRYD — client Supabase (SPEC §6.1).
 * Milestone 1 : l'app doit tourner SANS backend. Si les env EXPO_PUBLIC_*
 * sont absentes (point ouvert O1), le client est null et l'app passe en
 * mode dev : accès direct à la carte, aucun appel réseau.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { shouldAutoDetectAuth2026, webPathnameForAuthDetect2026 } from '../features/account/authCallback2026';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * DÉFENSIF : `createClient` s'exécute à l'import et LÈVE une exception si l'URL
 * est malformée (le garde ci-dessous ne teste que la présence, pas le format).
 * Un throw ici tuerait l'app au démarrage, avant tout écran. On retombe alors
 * sur le mode sans backend plutôt que de faire planter le lancement.
 */
/** Message de l'exception qui a empêché la création du client, s'il y en a eu une. */
let initError: string | null = null;

function makeSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        /**
         * ⚠️ `true` NE SUFFIT PAS EN REACT NATIVE, et ce n'est pas un détail.
         * La minuterie du SDK continue de tourner en arrière-plan, là où l'OS
         * suspend le JavaScript : au réveil, elle a raté ses échéances et le
         * premier appel part avec un jeton périmé — d'où un `SIGNED_OUT` qui
         * n'a été demandé par personne. Le pilotage réel vit dans
         * `lib/session.tsx` : `startAutoRefresh`/`stopAutoRefresh` branchés sur
         * `AppState` (voie documentée par Supabase pour React Native). Ce
         * drapeau reste `true` parce que le SDK en a besoin pour armer la
         * minuterie ; c'est `AppState` qui décide quand elle vit.
         */
        autoRefreshToken: true,
        persistSession: true,
        // /callback has one explicit exchange on every platform. Letting the
        // SDK auto-consume that URL before the screen exchanges it would reuse
        // a one-time PKCE code. Keep automatic detection for older web URLs.
        // `window` existe sur React Native SANS `location` : on ne lit jamais
        // `window.location.pathname` en direct (cf. webPathnameForAuthDetect2026).
        detectSessionInUrl: shouldAutoDetectAuth2026(Platform.OS, webPathnameForAuthDetect2026(Platform.OS, typeof window === 'undefined' ? null : window)),
      },
    });
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e);
    // `error`, pas `warn` : en build release, seul le niveau erreur atteint la
    // console de l'appareil (`devicectl … launch --console`).
    console.error('[GRYD] client Supabase indisponible', e);
    return null;
  }
}

/** Null tant que O1 (projet Supabase) n'est pas configuré. */
export const supabase: SupabaseClient | null = makeSupabase();

export const isSupabaseConfigured: boolean = supabase !== null;

/**
 * Non nul quand l'URL et la clé existent mais que `createClient` a jeté : le
 * serveur EST configuré, c'est le client qui manque. Les écrans le disent tel
 * quel plutôt que « non configuré » (l'app ne ment jamais).
 */
export const supabaseInitError: string | null = initError;
