/**
 * GRYD — variante WEB de l'auth (aperçu navigateur pour le fondateur).
 * Metro résout `.web.ts` avant `.ts` sur la cible web : les modules natifs-only
 * (expo-apple-authentication, expo-auth-session) ne sont JAMAIS importés ici,
 * donc le bundle web compile. Même API exportée que auth.ts.
 *
 * Sur web on ne fait PAS de vraie connexion : l'aperçu doit atterrir direct sur
 * les onglets (cf. session.web.tsx + garde (tabs)). Les sign-in sont des no-op
 * « ok » et signOut est inerte. Le natif iOS/Android garde auth.ts intact.
 */
import { EVENTS, identify, resetAnalytics, track } from './analytics';

export type SignInMethod = 'apple' | 'google';

export type AuthFailureReason =
  | 'supabase_not_configured'
  | 'google_not_configured'
  | 'cancelled'
  | 'no_identity_token'
  | 'auth_error';

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: AuthFailureReason; message?: string };

/** Aperçu web : pose l'identité factice et log l'event, sans provider natif. */
export async function signInWithApple(): Promise<AuthResult> {
  identify('web-preview');
  track(EVENTS.signupCompleted, { method: 'apple' satisfies SignInMethod });
  return { ok: true };
}

/** Aperçu web : idem, no-op « ok ». */
export async function signInWithGoogle(): Promise<AuthResult> {
  identify('web-preview');
  track(EVENTS.signupCompleted, { method: 'google' satisfies SignInMethod });
  return { ok: true };
}

/** Aperçu web : déconnexion inerte (pas de session Supabase réelle). */
export async function signOut(): Promise<AuthResult> {
  resetAnalytics();
  return { ok: true };
}
