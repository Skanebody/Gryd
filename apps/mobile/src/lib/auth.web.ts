/**
 * GRYD — variante WEB de l'auth. Metro résout `.web.ts` avant `.ts` sur la cible
 * web : les modules natifs-only (expo-apple-authentication, expo-auth-session,
 * expo-crypto) ne sont JAMAIS importés ici, donc le bundle web compile.
 *
 * ─── CE QUE CE FICHIER FAISAIT DE FAUX (corrigé le 21/07/2026) ──────────────
 * `signInWithApple` et `signInWithGoogle` retournaient `{ ok: true }` SANS
 * jamais appeler `supabase.auth`. Aucune session n'était créée : l'app se
 * mentait à elle-même (« connexion réussie » pour une connexion qui n'a pas eu
 * lieu), et comme `session.web.tsx` lit désormais la VRAIE session, l'état
 * connecté était devenu INATTEIGNABLE dans un navigateur. Pire, ces no-op
 * appelaient `identify('web-preview')` + `track(signupCompleted)` : chaque clic
 * du fondateur injectait un FAUX `signup_completed` dans le funnel PostHog du
 * pilote. `signOut` n'appelait pas non plus `supabase.auth.signOut()`.
 *
 * ─── CE QU'IL FAIT MAINTENANT ───────────────────────────────────────────────
 * Une VRAIE connexion, par e-mail OTP (code à 6 chiffres) : `signInWithOtp` /
 * `verifyOtp` sont du pur HTTP, aucun module natif, ça marche en navigateur.
 * C'est le même filet que le natif (auth.ts, P0 D1), donc la même porte
 * d'entrée sur localhost et sur l'iPhone.
 *
 * Apple / Google : REFUS HONNÊTE (`web_unsupported`), pas un `{ ok: true }` qui
 * ment. Les deux flux natifs passent par un provider système (Apple) ou une
 * feuille expo-auth-session absente du bundle web. La voie web serait
 * `supabase.auth.signInWithOAuth`, qui exige une config serveur qui n'existe pas
 * (O2 : identifiants Google placeholders ; Apple web = Services ID + secret non
 * créés) ET une URL de redirection `http://localhost:8081` allowlistée côté
 * Supabase. Tant que ce n'est pas fait, lancer une redirection OAuth ferait
 * QUITTER localhost pour atterrir sur la Site URL de production : un cul-de-sac
 * plus trompeur qu'un refus. Le jour où O2 est fermé, remplacer ces deux corps
 * par `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` —
 * `detectSessionInUrl` est DÉJÀ activé sur web (supabase.ts) pour capter le
 * retour par fragment d'URL.
 *
 * ⚠️ PARITÉ : `requestEmailOtp` / `verifyEmailOtp` / `signOut` doivent rester
 * strictement équivalents à ceux de `auth.ts`. La duplication est subie —
 * `auth.ts` importe expo-apple-authentication au niveau module, donc ce fichier
 * ne peut pas le réutiliser. Toute évolution de l'un se reporte sur l'autre.
 */
import { EVENTS, identify, resetAnalytics, track } from './analytics';
import { supabase } from './supabase';

export type SignInMethod = 'apple' | 'google' | 'email_otp';

export type AuthFailureReason =
  | 'supabase_not_configured'
  | 'google_not_configured'
  | 'cancelled'
  | 'no_identity_token'
  | 'auth_error'
  /** Propre au web : le fournisseur n'a pas de chemin utilisable ici (cf. entête). */
  | 'web_unsupported';

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: AuthFailureReason; message?: string };

/**
 * Apple dans un navigateur : indisponible. On ne track RIEN — ni
 * `signup_started` (aucune tentative n'a atteint un fournisseur) ni
 * `signup_completed` (aucun compte n'a été créé). L'écran de connexion web
 * n'affiche d'ailleurs pas ce bouton : on ne peint pas un bouton mort. Le refus
 * reste exporté pour l'onboarding, qui appelle ces fonctions sur toutes les
 * plateformes.
 */
export async function signInWithApple(): Promise<AuthResult> {
  return { ok: false, reason: 'web_unsupported' };
}

/** Google dans un navigateur : indisponible (O2 + redirection, cf. entête). */
export async function signInWithGoogle(): Promise<AuthResult> {
  return { ok: false, reason: 'web_unsupported' };
}

/**
 * Filet e-mail OTP — la VRAIE porte d'entrée du web (parité auth.ts).
 * OTP par CODE et non magic-link : aucun handler de deep link requis, et le code
 * se tape dans l'onglet déjà ouvert (une redirection perdrait localhost).
 * ⚠️ Fondateur : le template « Magic Link » du dashboard Supabase doit afficher
 * {{ .Token }} pour que le code à 6 chiffres apparaisse dans l'e-mail.
 */
export async function requestEmailOtp(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  track(EVENTS.signupStarted, { method: 'email_otp' satisfies SignInMethod });
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  return { ok: true };
}

/**
 * Vérifie le code reçu par e-mail → session RÉELLE (trigger 0028 provisionne
 * users). C'est le SEUL endroit du fichier qui a le droit d'émettre
 * `signup_completed` : un compte existe désormais vraiment.
 */
export async function verifyEmailOtp(email: string, code: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  if (data.user) identify(data.user.id);
  track(EVENTS.signupCompleted, { method: 'email_otp' satisfies SignInMethod });
  return { ok: true };
}

/** Déconnexion RÉELLE (+ détache l'utilisateur des events) — parité auth.ts. */
export async function signOut(): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  resetAnalytics();
  return { ok: true };
}
