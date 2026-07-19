/**
 * GRYD — client Supabase (SPEC §6.1).
 * Milestone 1 : l'app doit tourner SANS backend. Si les env EXPO_PUBLIC_*
 * sont absentes (point ouvert O1), le client est null et l'app passe en
 * mode dev : accès direct à la carte, aucun appel réseau.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // React Native : pas d'URL de callback web
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
