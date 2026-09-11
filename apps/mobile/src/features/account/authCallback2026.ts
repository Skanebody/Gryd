import { authCallbackParam, parseAuthCallbackUrl } from '../../lib/links';

/**
 * LES TYPES DE VÉRIFICATION QUE GOTRUE ACCEPTE SUR `POST /auth/v1/verify`.
 *
 * Fermé, et recopié depuis `EmailOtpType` de `@supabase/auth-js` (2.110) — dont
 * le type public est ouvert (`| (string & {})`) et ne protégerait donc de rien.
 * `'email'` n'est pas un doublon des deux autres : côté GoTrue il COUVRE à la
 * fois `signup` et `magiclink`, ce qui en fait le seul repli honnête quand un
 * client mail a mangé le paramètre `type` (voir `TOKEN_HASH_FALLBACK_TYPE`).
 */
export type TokenHashType2026 =
  | 'signup'
  | 'magiclink'
  | 'recovery'
  | 'invite'
  | 'email_change'
  | 'email';

const TOKEN_HASH_TYPES: readonly string[] = [
  'signup',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
  'email',
];

/**
 * CE QU'ON VÉRIFIE QUAND LE LIEN N'A PLUS SON `type`.
 *
 * Ce n'est PAS une devinette : `email` est le type de vérification que GoTrue
 * définit comme couvrant `signup` ET `magiclink` — c'est-à-dire exactement les
 * deux gabarits que GRYD émet avec un `token_hash`. Un lien recopié à la main,
 * ou tronqué après le `&`, reste donc vérifiable ; et si le haché venait d'un
 * `recovery` ou d'un `email_change`, le serveur refuse — l'app dit alors que le
 * lien n'est plus valide, ce qui est vrai, au lieu d'inventer un succès.
 */
export const TOKEN_HASH_FALLBACK_TYPE: TokenHashType2026 = 'email';

/** Données minimales d'un retour Supabase. Les jetons ne doivent jamais être journalisés. */
export type AuthCallback2026 =
  /**
   * LIEN DIRECT (E4) — `?token_hash=…&type=…`, ce que le gabarit d'e-mail
   * envoie depuis le 12/09/2026. Aucune session n'est encore ouverte : ce
   * haché à USAGE UNIQUE doit être échangé par `supabase.auth.verifyOtp`.
   */
  | { readonly kind: 'token_hash'; readonly tokenHash: string; readonly type: TokenHashType2026 }
  | { readonly kind: 'pkce'; readonly code: string }
  | { readonly kind: 'tokens'; readonly accessToken: string; readonly refreshToken: string }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'none' };

/**
 * Accepte les TROIS retours que Supabase sait produire : haché de lien direct
 * (`?token_hash=…`, le parcours d'aujourd'hui), code PKCE dans la query, ou
 * session implicite dans le fragment (la redirection de `…/auth/v1/verify`,
 * encore reçue par les liens déjà partis). Fonction pure pour que la régression
 * du deep link natif soit testable sans ouvrir un e-mail.
 *
 * ⚠️ LES TROIS SONT MUTUELLEMENT EXCLUSIFS dans un retour réel : GoTrue ne pose
 * jamais deux formes à la fois. L'ordre ci-dessous n'arbitre donc rien — il dit
 * seulement lequel est le parcours courant.
 */
export function parseAuthCallback2026(rawUrl: string | null | undefined): AuthCallback2026 {
  const parts = parseAuthCallbackUrl(rawUrl);
  if (parts === null) return { kind: 'none' };

  // L'ERREUR D'ABORD. `verify` refuse AVANT toute redirection en la posant dans
  // la query ; le flux implicite la pose dans le fragment. Les deux sont lus.
  const error = authCallbackParam(parts, 'error_description', ['query', 'fragment']) ??
    authCallbackParam(parts, 'error', ['query', 'fragment']);
  if (error !== null) return { kind: 'error', message: error };

  // ① LIEN DIRECT. Le gabarit le pose dans la QUERY (un lien d'e-mail ne peut
  //    pas porter de fragment utile : il doit être une adresse complète pour
  //    qu'iOS le remette à l'app). Le fragment est lu quand même, au cas où un
  //    client mail réécrirait l'adresse.
  const tokenHash = authCallbackParam(parts, 'token_hash', ['query', 'fragment']);
  if (tokenHash !== null) {
    const raw = authCallbackParam(parts, 'type', ['query', 'fragment']);
    return {
      kind: 'token_hash',
      tokenHash,
      type: raw !== null && TOKEN_HASH_TYPES.includes(raw)
        ? (raw as TokenHashType2026)
        : TOKEN_HASH_FALLBACK_TYPE,
    };
  }

  // ② CODE PKCE.
  const code = authCallbackParam(parts, 'code', ['query', 'fragment']);
  if (code !== null) return { kind: 'pkce', code };

  // ③ SESSION IMPLICITE. Les DEUX jetons sont exigés : `setSession` ne sait
  //    rien faire d'un `access_token` seul, et prétendre le contraire ferait
  //    échouer l'ouverture après avoir annoncé une réussite.
  const accessToken = authCallbackParam(parts, 'access_token');
  const refreshToken = authCallbackParam(parts, 'refresh_token');
  if (accessToken !== null && refreshToken !== null) {
    return { kind: 'tokens', accessToken, refreshToken };
  }
  return { kind: 'none' };
}

/**
 * CE QUE L'E-MAIL CONTIENT VRAIMENT — un lien, ou un code à six chiffres.
 *
 * ⚠️ `'code'` DEMANDE UNE PREUVE (10/09/2026). L'ancienne règle rendait `'code'`
 * dès que `EXPO_PUBLIC_EMAIL_AUTH_MODE` valait `'code'`. Or le gabarit e-mail
 * est GLOBAL au projet Supabase et porte un LIEN : sur le plan hébergé avec
 * l'expéditeur par défaut, l'API de gestion refuse de le modifier
 * (`supabase/config.toml`, section des gabarits, commentée). Poser cette
 * variable suffisait donc à faire réclamer par l'écran six chiffres que
 * personne ne recevrait — un écran qui attend une saisie impossible, c'est-à-dire
 * un cul-de-sac. Une variable d'environnement CLIENT ne peut pas prouver ce que
 * le SERVEUR envoie.
 *
 * `otpTemplateProven` est donc obligatoire, et il n'existe aujourd'hui AUCUNE
 * source capable de le mettre à `true` : les deux appelants (`lib/auth.ts` et
 * `lib/auth.web.ts`) passent un `false` littéral et greppable. Le jour où un
 * SMTP personnalisé et un gabarit `{{ .Token }}` existent, la preuve devient un
 * fait vérifiable côté serveur — et c'est ELLE qu'on branchera ici, pas la
 * variable d'environnement.
 */
export function emailDelivery2026(
  raw: string | undefined,
  otpTemplateProven: boolean,
): 'link' | 'code' {
  return raw === 'code' && otpTemplateProven ? 'code' : 'link';
}

/**
 * PLAFOND DE PATIENCE du retour de lien magique (`app/(auth)/callback.tsx`).
 *
 * `Linking.useLinkingURL()` peut rendre `null` au tout premier rendu — l'URL
 * initiale d'un lancement à froid arrive par un événement, pas de façon
 * synchrone. L'écran concluait « ce retour n'est plus valide » sur ce premier
 * `null`, c'est-à-dire avant que le système ait eu le temps de répondre : le
 * joueur voyait un échec là où rien n'avait encore échoué.
 *
 * Ce n'est PAS une règle de jeu (elle ne décide ni claim, ni point, ni
 * distance) : elle ne vit donc pas dans `game-rules.ts` — même distinction que
 * `BOOT_STORAGE_TIMEOUT_MS` ou `PROFILE_READ_TIMEOUT_MS`. Valeur alignée sur les
 * autres plafonds de LECTURE LOCALE (3 s, `STORAGE_TIMEOUT_MS`) : au-delà, ce
 * n'est plus une latence de système, c'est une absence de retour.
 */
export const AUTH_CALLBACK_URL_WAIT_MS = 3000;

/**
 * CE QUE L'ÉCRAN DE RETOUR A LE DROIT D'AFFIRMER. PURE.
 *
 * ÉTAPE 0 — LE DÉFAUT : `callback.tsx` n'avait qu'un booléen `failed` et une
 * seule phrase (« Ce retour de connexion n'est plus valide. Demande un nouveau
 * lien. ») pour QUATRE faits incompatibles : un lien expiré, un lien tronqué par
 * un client mail, une panne réseau pendant l'échange, et l'absence pure et
 * simple de retour. Conseiller « demande un nouveau lien » à quelqu'un dont le
 * réseau est coupé lui fait brûler son quota d'envoi pour rien.
 *
 *  · `'expired'`   — GoTrue a nommé l'expiration (`otp_expired`, ou
 *                    « Email link is invalid or has expired ») ;
 *  · `'invalid'`   — le retour porte une erreur SANS mention d'expiration : lien
 *                    recopié à la main, coupé, déjà consommé ;
 *  · `'network'`   — l'échange a été TENTÉ et le transport a lâché ;
 *  · `'no_return'` — aucune URL n'est arrivée dans le délai. On n'accuse ni le
 *                    lien ni le réseau : on dit qu'il ne s'est rien passé ;
 *  · `'unknown'`   — le serveur a refusé sans se laisser classer. On ne devine
 *                    pas la cause (même refus que `classifyEmailLinkFailure`).
 */
export type AuthCallbackVerdict2026 = 'expired' | 'invalid' | 'network' | 'no_return' | 'unknown';

export function authCallbackVerdict2026(input: {
  /** Ce que `parseAuthCallback2026` a lu de l'URL de retour. */
  readonly parsed: AuthCallback2026;
  /**
   * `true` quand le délai est écoulé sans qu'aucune URL ne soit arrivée. Un
   * `parsed.kind === 'none'` AVANT le délai n'est pas un verdict : c'est une
   * attente, et l'écran doit continuer d'attendre.
   */
  readonly waited: boolean;
  /** Message du refus d'échange, s'il y en a eu un. */
  readonly exchangeMessage?: string;
  /** L'échange a-t-il seulement été tenté ? */
  readonly exchanged: boolean;
  /**
   * Verdict de forme, lu dans les paramètres du retour — injecté plutôt
   * qu'importé pour que ce module reste sans dépendance (voir `emailLink.ts`,
   * `linkVerdictFromParams`).
   */
  readonly linkVerdict: 'expired' | 'invalid' | null;
}): AuthCallbackVerdict2026 | null {
  if (input.parsed.kind === 'error') return input.linkVerdict === 'expired' ? 'expired' : 'invalid';
  if (input.exchanged) {
    const m = (input.exchangeMessage ?? '').toLowerCase();
    if (m.length === 0) return 'unknown';
    if (m.includes('expired')) return 'expired';
    if (
      m.includes('failed to fetch') || m.includes('network request failed') ||
      m.includes('networkerror') || m.includes('load failed') || m.includes('timeout')
    ) return 'network';
    // Un code PKCE à usage unique déjà consommé, un `code_verifier` absent : le
    // lien ne vaut plus rien, mais rien ne dit qu'il a EXPIRÉ.
    return 'invalid';
  }
  if (input.parsed.kind === 'none') return input.waited ? 'no_return' : null;
  return null;
}

/** The dedicated callback consumes its own one-use code. Legacy URLs retain SDK detection. */
/**
 * Le chemin courant du navigateur, ou `null` hors web.
 *
 * ─── LE BUG (09/09 → 11/09/2026, TOUS les builds natifs sans serveur) ────────
 * Sur React Native, `window` EXISTE (`global.window = global`, InitializeCore)
 * mais `window.location` n'existe pas : `window.location.pathname` y jette
 * « Cannot read property 'pathname' of undefined ». Cette lecture vivait dans
 * le `createClient` de `lib/supabase.ts`, sous un try/catch qui rend `null` :
 * le client Supabase n'a donc jamais existé sur iPhone depuis la capture Codex
 * (`a5b2b0d`), l'app affichait « Serveur non configuré sur ce build », et le
 * fondateur ne pouvait pas créer de compte. Le web, lui, a une `location` :
 * aucun test ne rougissait.
 */
export function webPathnameForAuthDetect2026(platform: string, win: unknown): string | null {
  if (platform !== 'web' || typeof win !== 'object' || win === null) return null;
  const loc = (win as { location?: { pathname?: unknown } }).location;
  return typeof loc?.pathname === 'string' ? loc.pathname : null;
}

export function shouldAutoDetectAuth2026(platform: string, pathname: string | null): boolean {
  return platform === 'web' && pathname !== null && !/^\/callback\/?$/.test(pathname);
}
