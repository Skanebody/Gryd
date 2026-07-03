/**
 * GRYD — auth Apple / Google → Supabase (SPEC §4.1 étape 3 : 2 taps, zéro formulaire).
 * Flux natifs : identityToken (Apple) / id_token (Google) → supabase.auth.signInWithIdToken.
 * Nonce : la valeur HASHÉE (SHA-256) part chez le provider, la valeur BRUTE part
 * chez Supabase qui recalcule le hash pour comparer (anti-replay).
 * Config OAuth = point ouvert O2 : flux codé, identifiants placeholders.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  AuthRequest,
  ResponseType,
  makeRedirectUri,
  type DiscoveryDocument,
} from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { EVENTS, identify, resetAnalytics, track } from './analytics';
import { supabase } from './supabase';

// Ferme proprement la popup d'auth au retour dans l'app (deep link scheme "gryd", cf. app.json).
WebBrowser.maybeCompleteAuthSession();

export type SignInMethod = 'apple' | 'google';

export type AuthFailureReason =
  | 'supabase_not_configured' // O1 : pas de backend → mode dev, carte en accès direct
  | 'google_not_configured' // O2 : EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID absent
  | 'cancelled' // l'utilisateur a fermé la feuille d'auth — jamais un mur (§4.1)
  | 'no_identity_token'
  | 'auth_error';

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: AuthFailureReason; message?: string };

const GOOGLE_DISCOVERY: DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

function isAppleCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ERR_REQUEST_CANCELED'
  );
}

async function makeNoncePair(): Promise<{ raw: string; hashed: string }> {
  const raw = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}

/** Sign in with Apple (composant natif côté écran, logique ici). */
export async function signInWithApple(): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const nonce = await makeNoncePair();

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: nonce.hashed,
    });
  } catch (error) {
    if (isAppleCancellation(error)) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'auth_error', message: String(error) };
  }

  if (!credential.identityToken) return { ok: false, reason: 'no_identity_token' };

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: nonce.raw,
  });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };

  if (data.user) identify(data.user.id);
  track(EVENTS.signupCompleted, { method: 'apple' satisfies SignInMethod });
  return { ok: true };
}

/** Sign in with Google via expo-auth-session (id_token → Supabase). */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!clientId) return { ok: false, reason: 'google_not_configured' };

  const nonce = await makeNoncePair();
  const request = new AuthRequest({
    clientId,
    scopes: ['openid', 'email', 'profile'],
    // TODO O2 : le client iOS Google attend le scheme « reversed client id » —
    // à ajuster (makeRedirectUri({ native: ... })) quand les identifiants existent.
    redirectUri: makeRedirectUri({ scheme: 'gryd' }),
    responseType: ResponseType.IdToken,
    usePKCE: false,
    extraParams: { nonce: nonce.hashed },
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, reason: 'cancelled' };
  }
  if (result.type !== 'success') {
    return { ok: false, reason: 'auth_error', message: `auth-session: ${result.type}` };
  }

  const idToken = result.params['id_token'];
  if (!idToken) return { ok: false, reason: 'no_identity_token' };

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    nonce: nonce.raw,
  });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };

  if (data.user) identify(data.user.id);
  track(EVENTS.signupCompleted, { method: 'google' satisfies SignInMethod });
  return { ok: true };
}

/** Déconnexion (+ détache l'utilisateur des events). */
export async function signOut(): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  resetAnalytics();
  return { ok: true };
}
