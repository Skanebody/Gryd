/**
 * GRYD — client Supabase (SPEC §6.1).
 * Milestone 1 : l'app tourne SANS backend si les credentials ne sont pas
 * injectés au build (EAS env ou .env local gitignoré). Jamais de clé en dur.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveSupabaseConfig } from './supabaseConfig';

const cfg = resolveSupabaseConfig();

/** Null tant que O1 n'est pas configuré au build. */
export const supabase: SupabaseClient | null = cfg
  ? createClient(cfg.url, cfg.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const isSupabaseConfigured: boolean = supabase !== null;
