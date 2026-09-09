/**
 * GRYD — client Supabase (SPEC §6.1).
 * Milestone 1 : l'app doit tourner SANS backend. Si les env EXPO_PUBLIC_*
 * sont absentes (point ouvert O1), le client est null et l'app passe en
 * mode dev : accès direct à la carte, aucun appel réseau.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { shouldAutoDetectAuth2026 } from '../features/account/authCallback2026';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * DÉFENSIF : `createClient` s'exécute à l'import et LÈVE une exception si l'URL
 * est malformée (le garde ci-dessous ne teste que la présence, pas le format).
 * Un throw ici tuerait l'app au démarrage, avant tout écran. On retombe alors
 * sur le mode sans backend plutôt que de faire planter le lancement.
 */
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
        detectSessionInUrl: shouldAutoDetectAuth2026(Platform.OS, typeof window === 'undefined' ? null : window.location.pathname),
      },
    });
  } catch (e) {
    console.warn('[GRYD] client Supabase indisponible', e);
    return null;
  }
}

/** Null tant que O1 (projet Supabase) n'est pas configuré. */
export const supabase: SupabaseClient | null = makeSupabase();

export const isSupabaseConfigured: boolean = supabase !== null;
