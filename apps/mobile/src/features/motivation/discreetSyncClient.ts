/**
 * GRYD — MODE DISCRET : l'écriture, et RIEN QUE l'écriture.
 *
 * Séparé de `discreetSync.ts` parce que ce dernier doit rester PUR (il est
 * chargé par le gate Deno, où `lib/supabase.ts` ne se typecheck pas). Ce fichier
 * ne décide de rien : il appelle, et délègue la lecture du résultat à
 * `discreetSyncOutcome`. Toute la doctrine — pourquoi ce réglage doit atteindre
 * le serveur, et pourquoi quatre issues et pas trois — est documentée là-bas.
 */
import { supabase } from '../../lib/supabase';
import { discreetSyncOutcome, type DiscreetSyncOutcome } from './discreetSync';

/**
 * Écrit `discreet_mode` sur MA ligne `user_profiles`. Ne crée JAMAIS la ligne :
 * elle exige un `handle` (contrainte `not null` + regex de 0011), et fabriquer
 * un handle à la place du joueur serait inventer une identité. L'absence de
 * profil se dit ('no_profile'), elle ne se comble pas.
 */
export async function syncDiscreetMode(
  value: boolean,
  userId: string | null,
): Promise<DiscreetSyncOutcome> {
  const client = supabase;
  if (!client) {
    return discreetSyncOutcome({ hasBackend: false, userId, error: null, updatedRows: null });
  }
  if (userId === null) {
    return discreetSyncOutcome({ hasBackend: true, userId: null, error: null, updatedRows: null });
  }
  try {
    // `select('user_id')` : sans lui, PostgREST ne rend aucune ligne et l'on ne
    // saurait pas distinguer « écrit » de « aucune ligne à écrire ».
    const { data, error } = await client
      .from('user_profiles')
      .update({ discreet_mode: value })
      .eq('user_id', userId)
      .select('user_id');
    return discreetSyncOutcome({
      hasBackend: true,
      userId,
      error,
      updatedRows: error ? null : (data?.length ?? 0),
    });
  } catch (error) {
    return discreetSyncOutcome({ hasBackend: true, userId, error, updatedRows: null });
  }
}
