/**
 * GRYD — mode live : backend Supabase configuré + session active.
 * Hors de ce cas, les écrans affichent des états vides honnêtes (jamais de démo).
 */
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './supabase';

export function isBackendLive(session: Session | null): boolean {
  return isSupabaseConfigured && session !== null;
}

/** Soldes vides tant que le wallet serveur n'est pas chargé. */
export const EMPTY_WALLET = { eclats: 0, foulees: 0 } as const;
