/**
 * GRYD — lecture statut Club (users.is_club).
 */
import { supabase } from '../../lib/supabase';

export async function fetchClubStatus(userId: string): Promise<boolean> {
  if (supabase === null) return false;
  const { data, error } = await supabase
    .from('users')
    .select('is_club')
    .eq('id', userId)
    .maybeSingle();
  if (error || data === null) return false;
  return data.is_club === true;
}
