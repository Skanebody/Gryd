/**
 * GRYD — soldes Éclats / Foulées depuis users (lecture propre ligne).
 */
import { supabase } from '../../lib/supabase';

export interface UserWallet {
  eclats: number;
  foulees: number;
}

export async function fetchUserWallet(userId: string): Promise<UserWallet | null> {
  if (supabase === null) return null;
  const { data, error } = await supabase
    .from('users')
    .select('eclats, foulees')
    .eq('id', userId)
    .maybeSingle();
  if (error || data === null) return null;
  return {
    eclats: Number(data.eclats),
    foulees: Number(data.foulees),
  };
}
