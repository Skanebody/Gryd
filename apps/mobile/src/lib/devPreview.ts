/**
 * GRYD — compte preview local (web dev uniquement, jamais bundlé en prod store).
 * Connexion email/mot de passe vers le projet staging O1.
 */
import { EVENTS, identify, track } from './analytics';
import { supabase } from './supabase';

export const DEV_PREVIEW_EMAIL = 'preview@gryd.dev';
export const DEV_PREVIEW_PASSWORD = 'GrydPreview2026!';

/** Tente la connexion du compte preview staging (idempotent). */
export async function ensureDevPreviewSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return true;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEV_PREVIEW_EMAIL,
    password: DEV_PREVIEW_PASSWORD,
  });
  if (error || !data.session) return false;
  identify(data.user.id);
  track(EVENTS.signupCompleted, { method: 'dev_preview' });
  return true;
}
