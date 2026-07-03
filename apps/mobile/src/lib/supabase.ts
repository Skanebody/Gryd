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

/** Null tant que O1 (projet Supabase) n'est pas configuré. */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false, // React Native : pas d'URL de callback web
        },
      })
    : null;

export const isSupabaseConfigured: boolean = supabase !== null;
