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
 * la VÉRIFICATION que le module natif répond sur cet appareil. `isAvailableAsync()`
 * interroge le système : c'est la garde de capacité qui manquait, et elle vaut
 * mieux qu'une 3ᵉ variable qui n'aurait rien prouvé.
 *
 * ⚠️ CE QU'`isAvailableAsync` NE DIT PAS (corrigé le 10/09/2026 — l'entête
 * précédente lui prêtait ce pouvoir). Elle répond « ce SYSTÈME propose Sign in
 * with Apple » (iOS 13+, module natif présent) — elle NE VÉRIFIE PAS
 * l'entitlement « Sign in with Apple » du profil de provisionnement. Un build
 * sans cet entitlement peut donc rendre `true` ici et échouer à `signInAsync`.
 * Conséquence tenue à l'écran : `apple_not_available` (capacité absente —
 * réessayer ne changera jamais rien) et `auth_error` (le système a dit oui, la
 * tentative a échoué — réessayer a du sens) ne disent PAS la même phrase, cf.
 * `features/account/authFailure2026.ts`.
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
import { AUTH_HANDOFF_2026 } from '@klaim/shared';
import { EVENTS, identify, resetAnalytics, track } from './analytics';
import { AUTH_CALLBACK_URL } from './links';
import { handoffRedirectUrl2026, hexFromBytes2026 } from '../features/account/authHandoff2026';
import { rememberHandoff2026 } from '../features/account/authHandoffSession2026';
import { rememberProviderName2026 } from '../features/account/providerIdentity2026';
import { markSignupT0 } from './activation';
import { supabase } from './supabase';
import { emailDelivery2026, parseAuthCallback2026 } from '../features/account/authCallback2026';
import {
  isSilentFailure2026,
  type AuthFailureReason2026,
  type AuthResult2026,
} from '../features/account/authFailure2026';
import {
  forgetIntentionalSignOut2026,
  markIntentionalSignOut2026,
} from '../features/account/signOutIntent2026';

// Ferme proprement la popup d'auth au retour dans l'app (deep link scheme "gryd", cf. app.json).
WebBrowser.maybeCompleteAuthSession();

export type SignInMethod = 'apple' | 'google' | 'email_otp';

/**
 * ⚠️ LE MOTIF D'ÉCHEC A DÉMÉNAGÉ (10/09/2026) — il vit dans
 * `features/account/authFailure2026.ts`, module PUR. Raison : ce fichier-ci
 * importe `expo-apple-authentication` au niveau module, donc rien de ce qu'il
 * définit n'est typecheckable sous Deno ; le type était condamné à être
 * DUPLIQUÉ dans `auth.web.ts`, et les deux copies avaient déjà divergé (voir
 * `isSilentFailure2026`). Réexporté ici pour que les appelants ne changent pas.
 */
export type AuthFailureReason = AuthFailureReason2026;
export type AuthResult = AuthResult2026;

/** Voir `isSilentFailure2026` — la règle vit là-bas, une seule fois. */
export function isSilentFailure(result: AuthResult): boolean {
  return isSilentFailure2026(result);
}

/**
 * CAPACITÉ APPLE — probe RUNTIME, pas une déduction de plateforme.
 * `Platform.OS === 'ios'` dit sur quel OS on tourne ; il ne dit PAS que Sign in
 * with Apple est proposé par cet appareil (iOS < 13, module natif absent du
 * build). `isAvailableAsync()` interroge le système. C'est cette garde qui
 * manquait côté Apple, là où Google avait déjà la sienne.
 *
 * ⚠️ ELLE NE COUVRE PAS L'ENTITLEMENT du profil de provisionnement : un build
 * qui en manque peut répondre `true` ici et échouer à `signInAsync`. Ce cas-là
 * ressort en `auth_error`, pas en `apple_not_available` — et les deux se disent
 * différemment à l'écran (`features/account/authFailure2026.ts`).
 */
/**
 * LA PLATEFORME PEUT-ELLE, EN PRINCIPE, PROPOSER APPLE ? Lecture SYNCHRONE.
 *
 * Elle ne remplace pas `isAppleAuthAvailable()` (qui interroge le système) : elle
 * répond à une autre question, posée AVANT le premier rendu — « faut-il réserver
 * la place du bouton Apple ? ». Sans elle, l'écran se peint sans le bouton, la
 * sonde répond quelques dizaines de ms plus tard, et tout le panneau saute sous
 * le doigt du joueur au moment précis où il vise un bouton.
 */
export const APPLE_PLATFORM: boolean = Platform.OS === 'ios';

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (!APPLE_PLATFORM) return false;
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
  /**
   * ⚠️ APPLE NE DONNE LE NOM QU'UNE FOIS, ET IL ÉTAIT JETÉ. `requestedScopes`
   * demande `FULL_NAME` depuis toujours ; `credential.fullName` n'est rempli
   * qu'au PREMIER consentement d'un compte Apple pour cette app, et le token
   * d'identité ne le porte pas — Supabase ne peut donc pas le mettre dans
   * `user_metadata`. Ne pas l'attraper ICI revenait à le perdre définitivement,
   * et à redemander deux écrans plus loin un nom que le joueur venait
   * d'accorder. Il est retenu EN MÉMOIRE, jamais sur le disque, et il ne
   * devient public que si le joueur le confirme (voir `providerIdentity2026`).
   */
  rememberProviderName2026(credential.fullName);
  track(EVENTS.signupCompleted, { method: 'apple' satisfies SignInMethod });
  void markSignupT0(); // t0 du funnel activation (1re inscription gagne)
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
  void markSignupT0(); // t0 du funnel activation (1re inscription gagne)
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
/**
 * ⚠️ `false` EN DUR, ET C'EST LE POINT. Le second argument est la PREUVE que le
 * gabarit e-mail du projet envoie un code à six chiffres. Aucune source n'est
 * capable de la produire aujourd'hui : le gabarit est global au projet, il porte
 * un LIEN, et l'API de gestion refuse de le changer sur le plan hébergé avec
 * l'expéditeur par défaut. Tant que ce littéral vaut `false`, poser
 * `EXPO_PUBLIC_EMAIL_AUTH_MODE=code` ne fait plus réclamer à l'écran un code que
 * l'e-mail ne contient pas.
 */
export const EMAIL_DELIVERY: 'link' | 'code' = emailDelivery2026(
  process.env.EXPO_PUBLIC_EMAIL_AUTH_MODE,
  false,
);

/**
 * LE TIRAGE DU NONCE DE REMISE (E5, 12/09/2026). NATIF.
 *
 * `expo-crypto` est déjà importé par ce fichier (il sert le nonce Apple, plus
 * haut) et `getRandomBytes` y est un CSPRNG natif. C'est la SEULE chose que ce
 * fichier ne partage pas avec `auth.web.ts` — tout le reste de la remise vit
 * dans `features/account/authHandoff*2026.ts`, une seule fois.
 *
 * ⚠️ ÉCHEC = PAS DE NONCE, JAMAIS UN NONCE FAIBLE. Si le module natif ne
 * répond pas, on rend `null` et l'app retombe sur le parcours E4 (la page web
 * et son bouton « Ouvrir GRYD »). Un repli sur `Math.random()` serait un secret
 * devinable écrit dans un e-mail : le pire des deux mondes.
 */
function drawHandoffNonce2026(): string | null {
  try {
    return hexFromBytes2026(Crypto.getRandomBytes(AUTH_HANDOFF_2026.nonceBytes));
  } catch {
    return null;
  }
}

export async function requestEmailOtp(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  track(EVENTS.signupStarted, { method: 'email_otp' satisfies SignInMethod });
  const nonce = drawHandoffNonce2026();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      /**
       * ⚠️ CE N'EST PLUS `gryd://callback` (12/09/2026, défaut fondateur : « le
       * bouton mène vers rien du tout »). Un client mail ne rend cliquable que
       * `http`/`https` — un schéma privé dans un courrier n'est pas un lien,
       * c'est du texte. Le retour passe donc par une URL HTTPS réelle, servie
       * par `apps/web`, qui rouvre l'app soit par LIEN UNIVERSEL (iOS a vérifié
       * `apple-app-site-association`), soit par son bouton « Ouvrir GRYD » vers
       * `AUTH_CALLBACK_DEEP_LINK`. Les deux formes arrivent sur la MÊME route,
       * et `completeAuthCallback` les lit toutes les deux.
       *
       * Elle doit figurer dans l'`uri_allow_list` du projet Supabase : sans
       * elle, GoTrue retombe sur `SITE_URL` et le lien ramène ailleurs. Réglage
       * de dashboard, invérifiable depuis le client — dit, jamais supposé.
       *
       * ⚠️ DEPUIS E4, CE N'EST PLUS ELLE QUI FABRIQUE LE LIEN DE L'E-MAIL. Les
       * gabarits (`supabase/email-templates/2026-09/`) écrivent l'adresse
       * eux-mêmes à partir de `{{ .SiteURL }}` et de `{{ .TokenHash }}` : ils
       * ne rendent plus `{{ .ConfirmationURL }}`, donc plus aucune redirection
       * ne s'intercale — c'est toute la raison d'être du lot. Ce paramètre
       * reste posé parce qu'il est le repli du jour où un gabarit reviendrait à
       * `{{ .ConfirmationURL }}` : sans lui, ce jour-là, le lien ramènerait sur
       * `SITE_URL` au lieu du retour.
       *
       * ⚠️ DEPUIS E5, ELLE PORTE UN NONCE (`?n=…`), ET C'EST CE QUI FAIT
       * FONCTIONNER LE COMPTE « DERRIÈRE » LA PAGE. Les gabarits rendent
       * `{{ .RedirectTo }}` — c'est-à-dire CETTE adresse, nonce compris — puis
       * y accrochent `&token_hash=…&type=…`. La page web vérifie, dépose son
       * jeton de rafraîchissement contre `sha256(nonce)` (migration 0198), et
       * l'app vient le réclamer : plus aucun lien universel dans la boucle,
       * donc plus aucune dépendance au build EAS qu'Apple n'a pas encore signé.
       * Voir `features/account/authHandoff2026.ts`.
       */
      emailRedirectTo: handoffRedirectUrl2026(AUTH_CALLBACK_URL, nonce),
    },
  });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  // APRÈS l'acceptation du serveur, jamais avant : mémoriser une remise pour un
  // courrier qui n'est pas parti ferait attendre l'écran pour rien.
  if (nonce !== null) await rememberHandoff2026(nonce, email, Date.now());
  return { ok: true };
}

/**
 * Termine réellement le retour du lien e-mail, y compris sur iOS/Android.
 * TROIS formes possibles, décrites par `parseAuthCallback2026` : le haché du
 * lien direct (`?token_hash=…`, le parcours courant depuis E4), un code PKCE,
 * ou une session implicite déjà ouverte par GoTrue (`#access_token=…`, la forme
 * des liens partis avant E4 — ils restent valides jusqu'à leur expiration).
 */
export async function completeAuthCallback(url: string | null): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const callback = parseAuthCallback2026(url);
  if (callback.kind === 'error') {
    return { ok: false, reason: 'auth_error', message: callback.message };
  }
  /**
   * ⚠️ `token_hash` D'ABORD : C'EST LE PARCOURS D'AUJOURD'HUI (E4). Le lien de
   * l'e-mail vise `gryd.run/callback?token_hash=…&type=…` — un lien universel
   * de PREMIÈRE MAIN, seul capable d'ouvrir l'app sans passer par Safari (iOS
   * ne remet pas à l'app un lien atteint au bout d'une redirection). Le haché
   * n'est PAS une session : `verifyOtp` l'échange contre une vraie session, et
   * il ne sert QU'UNE FOIS — d'où l'interdiction faite à la page web de le
   * consommer à la place de l'app (`apps/web/lib/authCallbackLink2026.ts`).
   */
  const result = callback.kind === 'token_hash'
    ? await supabase.auth.verifyOtp({ token_hash: callback.tokenHash, type: callback.type })
    : callback.kind === 'pkce'
      ? await supabase.auth.exchangeCodeForSession(callback.code)
      : callback.kind === 'tokens'
        ? await supabase.auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          })
        : await supabase.auth.getSession();
  if (result.error || !result.data.session) {
    return { ok: false, reason: 'auth_error', message: result.error?.message };
  }
  identify(result.data.session.user.id);
  track(EVENTS.signupCompleted, { method: 'email_otp' satisfies SignInMethod });
  void markSignupT0();
  return { ok: true };
}

/** Vérifie le code reçu par e-mail → session (trigger 0028 provisionne users). */
export async function verifyEmailOtp(email: string, code: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  if (data.user) identify(data.user.id);
  track(EVENTS.signupCompleted, { method: 'email_otp' satisfies SignInMethod });
  void markSignupT0(); // t0 du funnel activation (1re inscription gagne)
  return { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  // ⚠️ AVANT L'APPEL, PAS APRÈS. `supabase-js` émet `SIGNED_OUT` pendant cet
  // `await` : marquer l'intention ensuite arriverait trop tard, et `session.tsx`
  // classerait une déconnexion DEMANDÉE comme une session expirée.
  markIntentionalSignOut2026();
  const { error } = await supabase.auth.signOut();
  if (error) {
    // Rien ne s'est déconnecté : l'intention doit s'effacer, sinon elle
    // avalerait le message de la PROCHAINE déconnexion, celle-là subie.
    forgetIntentionalSignOut2026();
    return { ok: false, reason: 'auth_error', message: error.message };
  }
  resetAnalytics();
  return { ok: true };
}

/**
 * E78 — LA SEULE ACTION « APPAREILS » QUI EXISTE VRAIMENT.
 *
 * Ce que Supabase Auth expose au CLIENT, vérifié avant d'écrire quoi que ce soit
 * à l'écran (`@supabase/auth-js` 2.x, `GoTrueClient`) :
 *   · `getSession()` / `getUser()` — la session de CET appareil, et elle seule ;
 *   · `signOut({ scope })` — `local` (ici), `global` (partout) ou `others`
 *     (toutes les AUTRES sessions, celle-ci conservée). C'est un vrai appel
 *     serveur (`POST /logout?scope=others`) qui révoque les refresh tokens.
 * Ce qu'il N'EXPOSE PAS : la LISTE des sessions. Il n'existe aucun endpoint
 * client pour énumérer les appareils connectés — ni leur modèle, ni leur ville,
 * ni leur date de dernière activité. Une liste d'appareils ne peut donc pas être
 * peinte sans être inventée, et l'écran le DIT au lieu de la simuler.
 *
 * Reste donc une action, réelle et vérifiable : couper toutes les autres
 * sessions. `scope: 'others'` n'émet PAS d'événement `SIGNED_OUT` et laisse la
 * session courante intacte — le joueur n'est pas éjecté de l'appareil qu'il
 * tient. C'est exactement ce qu'on attend d'un téléphone perdu.
 *
 * Aucun `resetAnalytics()` ici, volontairement : l'identité de CET appareil n'a
 * pas changé.
 */
export async function signOutOtherDevices(): Promise<AuthResult> {
  if (!supabase) return { ok: false, reason: 'supabase_not_configured' };
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };
  return { ok: true };
}
