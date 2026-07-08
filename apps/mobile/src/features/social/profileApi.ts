/**
 * GRYD — sync profil joueur avec user_profiles (0011).
 * Champs serveur : handle, display_name, bio, main_city.
 * Cosmétiques locaux (avatar couleur, badges affichés) restent AsyncStorage.
 */
import { supabase } from '../../lib/supabase';
import type { EditableProfile } from './profileStore';

export interface UserProfileRow {
  user_id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  main_city: string | null;
}

export function serverFieldsFromEditable(
  editable: Pick<EditableProfile, 'handle' | 'displayName' | 'city' | 'bio'>,
  userId: string,
): UserProfileRow {
  return {
    user_id: userId,
    handle: editable.handle.trim().toLowerCase(),
    display_name: editable.displayName.trim() || null,
    bio: editable.bio.trim() || null,
    main_city: editable.city.trim() || null,
  };
}

export function editableFromServerRow(row: UserProfileRow): Partial<EditableProfile> {
  return {
    handle: row.handle,
    displayName: row.display_name ?? undefined,
    city: row.main_city ?? undefined,
    bio: row.bio ?? undefined,
  };
}

export async function fetchUserProfile(userId: string): Promise<Partial<EditableProfile> | null> {
  if (supabase === null) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, handle, display_name, bio, main_city')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || data === null) return null;
  return editableFromServerRow(data as UserProfileRow);
}

/** Upsert des champs user_profiles (best-effort si pas de session). */
export async function upsertUserProfile(
  editable: EditableProfile,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase === null) return { ok: false, error: 'offline' };
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { ok: false, error: 'no_session' };

  const row = serverFieldsFromEditable(editable, userId);
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        handle: row.handle,
        display_name: row.display_name,
        bio: row.bio,
        main_city: row.main_city,
      })
      .eq('user_id', userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from('user_profiles').insert(row);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
