/**
 * GRYD — auth Apple / Google → Supabase (SPEC §4.1 étape 3 : 2 taps, zéro formulaire).
 * Flux natifs : identityToken (Apple) / id_token (Google) → supabase.auth.signInWithIdToken.
 * Nonce : la valeur HASHÉE (SHA-256) part chez le provider, la valeur BRUTE part
 * chez Supabase qui recalcule le hash pour comparer (anti-replay).
 * Config OAuth = point ouvert O2 : flux codé, identifiants placeholders.
 *
 * ─── LA CAPACITÉ D'UN FOURNISSEUR VIT ICI, PAS DANS LES ÉCRANS (21/07/2026) ──
 * Deux écrans peignaient les mêmes boutons avec deux règles différentes
 * (`app/onboarding/index.tsx` et `app/(auth)/sign-in.tsx`), chacun réinventant sa
 * notion de « configuré ». C'est la source du bouton mort : l'écran devinait la
 * capacité au lieu de la LIRE. Ce module l'expose désormais, une fois :
 *   • `isAppleAuthAvailable()` — probe RUNTIME (`isAvailableAsync`) ;
 *   • `googleClientId()` / `GOOGLE_CAPABLE` — l'identifiant de LA plateforme
 *     courante, jamais celui d'une autre.
 * Un écran n'a plus rien à déduire de `Platform.OS`.
 *
 * ─── APPLE N'A QUE DEUX CONDITIONS, ET C'EST DÉMONTRABLE ────────────────────
 * L'entête de l'écran compte annonce « TROIS conditions : plateforme +
 * identifiant OAuth + backend ». C'est vrai pour Google, FAUX pour Apple en
 * natif : `AppleAuthentication.signInAsync` ne consomme AUCUN identifiant client
 * côté app — l'audience du token est le BUNDLE ID, et l'autorisation vient de
 * l'entitlement « Sign in with Apple » du profil de provisionnement, pas d'une
 * variable d'environnement. Il n'existe donc pas de troisième variable à lire.
 * Ce qui manquait n'était pas un `EXPO_PUBLIC_APPLE_*` (il n'en existe pas) mais
 * la VÉRIFICATION que le module natif répond sur cet appareil : `Platform.OS ===
 * 'ios'` est vrai sur un build sans l'entitlement, où `signInAsync` échoue à
 * 100 %. `isAvailableAsync()` interroge le système et tranche pour de vrai —
 * c'est la garde de capacité qui manquait, et elle vaut mieux qu'une 3ᵉ variable
 * qui n'aurait rien prouvé.
 * (Le pendant Supabase — Services ID + secret Apple côté serveur — est réel mais
 * INVISIBLE du client : il ressort en `auth_error` à l'échange de token, pas en
 * capacité peignable. On ne peut pas le sonder, donc on ne prétend pas le lire.)
 */
import { Platform } from 'react-native';
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

export type SignInMethod = 'apple' | 'google' | 'email_otp';

export type AuthFailureReason =
  | 'supabase_not_configured' // O1 : pas de backend → mode dev, carte en accès direct
  | 'google_not_configured' // O2 : aucun client id Google POUR CETTE plateforme
  | 'apple_not_available' // le système ne propose pas Sign in with Apple ici
  | 'cancelled' // l'utilisateur a fermé la feuille d'auth — jamais un mur (§4.1)
  | 'no_identity_token'
  | 'auth_error';

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: AuthFailureReason; message?: string };

/**
 * UNE ANNULATION N'EST PAS UN ÉCHEC. Fermer la feuille Apple ou la popup Google
 * est un geste banal, volontaire, non erroné : le joueur qui change d'avis ne
 * doit pas lire « Connexion impossible. Réessaie », qui lui impute une panne
 * inexistante. `app/(auth)/sign-in.tsx` le savait déjà (son `failureMessage`
 * renvoie `null` sur `cancelled`) ; ce prédicat existe pour que TOUTE surface
 * applique la même règle sans la réécrire — et sans oublier `web_unsupported`,
 * qui n'est pas une panne non plus mais l'absence d'un chemin (auth.web.ts).
 *
 * Contrat : `true` ⇒ l'écran ne montre AUCUN message d'erreur, et il ne sort pas
 * non plus (rien n'a réussi) — il reste exactement où il était.
 */
export function isSilentFailure(result: AuthResult): boolean {
  return !result.ok && result.reason === 'cancelled';
}

/**
 * CAPACITÉ APPLE — probe RUNTIME, pas une déduction de plateforme.
 * `Platform.OS === 'ios'` dit sur quel OS on tourne ; il ne dit PAS que Sign in
 * with Apple est utilisable (entitlement absent du profil, iOS < 13, simulateur
 * sans compte Apple). `isAvailableAsync()` interroge le système. C'est cette
 * garde qui manquait côté Apple, là où Google avait déjà la sienne.
 */
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    // Module natif absent du build : l'inconnu se traite comme l'indisponible —
    // on ne peint jamais un bouton qu'on n'a pas su prouver.
    return false;
  }
}

/**
 * CAPACITÉ GOOGLE — l'identifiant de LA plateforme courante.
 *
 * L'ancienne règle lisait `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — un identifiant
 * explicitement **iOS** — et s'en servait pour autoriser Google sur **Android**.
 * Ce n'était pas une capacité : un client id iOS renseigné ne rend pas le flux
 * Android possible (Google refuse l'audience), et le bouton peint sur cette base
 * était mort. Un client OAuth Google est lié à une plateforme et à un
 * identifiant d'app ; il en faut donc UN PAR PLATEFORME.
 *
 * Les deux accès `process.env.EXPO_PUBLIC_*` sont écrits en toutes lettres :
 * Metro/Expo les remplace littéralement au build (un accès dynamique ne serait
 * pas inliné et vaudrait `undefined` en production).
 *
 * ⚠️ `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` doit être ajouté à
 * `apps/mobile/.env.example` (hors du périmètre de ce chantier — inscrit au
 * rapport). Tant qu'aucun des deux n'est renseigné (état O2 actuel), Google
 * reste MASQUÉ partout : on ne peut pas le prouver, on ne le peint pas.
 */
export function googleClientId(): string | undefined {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  // Web : le flux passerait par `signInWithOAuth` (redirection), pas par
  // expo-auth-session — aucune capacité tant que O2 est ouvert (auth.web.ts).
  return undefined;
}

/** Google est-il utilisable ICI ? (plateforme + identifiant de CETTE plateforme) */
export const GOOGLE_CAPABLE = Boolean(googleClientId());

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

/**
 * Sign in with Apple (composant natif côté écran, logique ici).
 *
 * La garde de CAPACITÉ passe avant le tracking, comme dans auth.web.ts : si le
 * système ne propose pas Sign in with Apple, aucune tentative n'a atteint un
 * fournisseur — un `signup_started` serait un faux départ dans le funnel.
 */
export async function signInWithApple(): Promise<AuthResult> {
  if (!(await isAppleAuthAvailable())) return { ok: false, reason: 'apple_not_available' };
  track(EVENTS.signupStarted, { method: 'apple' satisfies SignInMethod });
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
  track(EVENTS.signupStarted, { method: 'google' satisfies SignInMethod });
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  // Le client id de CETTE plateforme (jamais celui d'une autre — cf. googleClientId).
  const clientId = googleClientId();
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
/**
 * P0 D1 (MVP_CHANGESET) — FILET EMAIL OTP. L'app n'offrait QUE Apple+Google
 * (tous deux désactivés côté serveur au moment de l'audit) : zéro porte
 * d'entrée. L'OTP par CODE (pas magic-link : aucun handler de deep link requis)
 * est la voie de secours du test fermé — email actif côté serveur (vérifié).
 * ⚠️ Fondateur : le template « Magic Link » du dashboard doit afficher
 * {{ .Token }} pour que le code à 6 chiffres apparaisse dans l'e-mail.
 */
/**
 * Le gabarit e-mail est GLOBAL au projet : il porte un LIEN, pas un code (voir
 * auth.web.ts pour la preuve — l'API de gestion refuse de le modifier sur le
 * plan gratuit avec l'expéditeur par défaut). Le natif reçoit donc le même
 * courrier que le web, et l'écran doit le dire au lieu de réclamer six chiffres
 * que personne ne reçoit. Repassera à `'code'` avec un SMTP personnalisé.
 */
export const EMAIL_DELIVERY: 'link' | 'code' = 'link';

export async function requestEmailOtp(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  track(EVENTS.signupStarted, { method: 'email_otp' satisfies SignInMethod });
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // Retour vers l'app par son scheme (déclaré dans l'`uri_allow_list`).
      emailRedirectTo: 'gryd://',
    },
  });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  return { ok: true };
}

/** Vérifie le code reçu par e-mail → session (trigger 0028 provisionne users). */
export async function verifyEmailOtp(email: string, code: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  if (data.user) identify(data.user.id);
  track(EVENTS.signupCompleted, { method: 'email_otp' satisfies SignInMethod });
  return { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  resetAnalytics();
  return { ok: true };
}
