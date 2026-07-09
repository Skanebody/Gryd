/**
 * GRYD — résolution des credentials Supabase (O1).
 * Lecture UNIQUEMENT depuis expo-constants `extra` (injecté au build par
 * app.config.ts depuis EAS / .env local). Aucune clé en dur dans le source.
 */
import Constants from 'expo-constants';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function extra(): SupabaseExtra {
  return (Constants.expoConfig?.extra ?? {}) as SupabaseExtra;
}

/** Refuse toute clé service (sb_secret_*) — elle ne doit jamais quitter le serveur. */
function assertClientKey(key: string): string | null {
  if (key.startsWith('sb_secret_') || key.includes('service_role')) {
    if (__DEV__) {
      console.error('[GRYD] Clé service Supabase détectée côté client — refusée.');
    }
    return null;
  }
  return key;
}

/** Retourne url + anon publishable, ou null si non configuré (mode démo). */
export function resolveSupabaseConfig(): SupabaseConfig | null {
  const { supabaseUrl, supabaseAnonKey } = extra();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const anonKey = assertClientKey(supabaseAnonKey);
  if (!anonKey) return null;
  return { url: supabaseUrl, anonKey };
}
