/**
 * GRYD — CE QUE LA PAGE `https://gryd.run/callback` A LE DROIT DE DIRE. PURE.
 *
 * ── LE DÉFAUT, ET SA CAUSE EXACTE (retour fondateur du 12/09/2026) ──────────
 * « Le bouton pour s'inscrire mène vers rien du tout. » Le lien magique
 * pointait sur `gryd://callback` (`apps/mobile/src/lib/auth.ts`), un schéma
 * PRIVÉ : un client mail, un webmail ou un Mac ne savent pas l'ouvrir — le clic
 * ne produisait donc littéralement rien. Le lien vise désormais une PAGE WEB,
 * qui félicite, puis rend la session à l'app.
 *
 * ── POURQUOI CE MODULE EXISTE SÉPARÉMENT DE LA PAGE ─────────────────────────
 * La page est un composant client : elle ne peut être jouée ni par Deno ni par
 * un rendu statique. La DÉCISION (« qu'est-ce que ce lien contient ? ») n'a
 * besoin ni de React ni du DOM : elle vit ici, elle est testée
 * (`authCallbackLink2026.test.ts`, joué par `npm run test:web`), et la page ne
 * fait que la PEINDRE. Une condition écrite au milieu d'un JSX n'aurait jamais
 * été rejouable sans ouvrir un e-mail.
 *
 * ── LES DEUX FORMES QUE SUPABASE ENVOIE, ET RIEN D'AUTRE ────────────────────
 *  · session implicite — `#access_token=…&refresh_token=…&type=signup|magiclink|
 *    recovery|email_change` (le FRAGMENT, que le serveur ne voit jamais) ;
 *  · code PKCE — `?code=…` dans la query.
 * Miroir exact de `parseAuthCallback2026` (apps/mobile/src/features/account/) :
 * ce que l'app sait consommer est ce que cette page sait transmettre. Les deux
 * fichiers doivent rester d'accord — s'ils divergent, le lien se perd entre le
 * navigateur et l'app, c'est-à-dire à l'endroit précis du défaut d'aujourd'hui.
 *
 * ── CE QUE CE MODULE REFUSE DE FAIRE ────────────────────────────────────────
 *  1. DEVINER UN SUCCÈS. Sans jeton ni code, le verdict est `incomplete` — pas
 *     « bienvenue ». Féliciter quelqu'un dont le lien est tronqué, c'est lui
 *     faire croire qu'il a un compte qu'il n'a pas.
 *  2. CONFONDRE EXPIRÉ ET CASSÉ. Un lien périmé se redemande ; un lien invalide
 *     ne se redemande pas de la même manière. Même séparation que
 *     `linkVerdictFromParams` côté mobile, et même marqueur (`expired`).
 *  3. JOURNALISER QUOI QUE CE SOIT. `appUrl` contient des jetons de session :
 *     il n'est ni tracé, ni envoyé en analytics, ni mis dans un titre de page.
 */

/** Les cinq verdicts possibles d'un lien de connexion ouvert dans un navigateur. */
export type AuthCallbackLinkKind =
  /** Compte créé à l'instant (`type=signup`) : la seule félicitation légitime. */
  | 'signup'
  /** Session valide d'un compte qui existait déjà (magiclink, recovery, email_change). */
  | 'return'
  /** Le serveur a nommé l'expiration : le lien se redemande. */
  | 'expired'
  /** Le serveur a refusé pour une autre raison : redemander ne suffira pas forcément. */
  | 'failed'
  /** Ni jeton, ni code, ni erreur : il n'y a rien à lire dans cette adresse. */
  | 'incomplete';

export interface AuthCallbackLinkView {
  readonly kind: AuthCallbackLinkKind;
  /**
   * Adresse `gryd://callback…` qui REND la session à l'app installée.
   * `null` dès qu'il n'y a rien à rendre : un bouton sans charge utile serait
   * un bouton mort (MASTER §12), et sur un lien expiré il ferait en plus
   * croire que l'app peut rattraper ce que le serveur a déjà refusé.
   */
  readonly appUrl: string | null;
}

/** Ce que la page lit de `window.location`. Rien d'autre n'entre ici. */
export interface AuthCallbackLinkLocation {
  /** `window.location.hash`, avec ou sans son `#`. */
  readonly hash?: string | null;
  /** `window.location.search`, avec ou sans son `?`. */
  readonly search?: string | null;
}

/** Le schéma privé de l'app (`expo.scheme` dans apps/mobile/app.json). */
const APP_SCHEME_URL = 'gryd://callback';

function paramsFrom(part: string | null | undefined): URLSearchParams {
  if (!part) return new URLSearchParams();
  return new URLSearchParams(part.replace(/^[?#]/, ''));
}

/** Première valeur non vide parmi plusieurs clés, dans l'ordre donné. */
function firstOf(sources: readonly URLSearchParams[], keys: readonly string[]): string {
  for (const key of keys) {
    for (const source of sources) {
      const value = source.get(key);
      if (value !== null && value.trim().length > 0) return value;
    }
  }
  return '';
}

/**
 * Ré-sérialise les paramètres reçus vers l'URL de l'app.
 *
 * POURQUOI RÉ-SÉRIALISER PLUTÔT QUE RECOPIER LA CHAÎNE BRUTE : la chaîne brute
 * vient de la barre d'adresse et finit dans un attribut `href`. `URLSearchParams`
 * en rend une forme canonique et percent-encodée, que `parseAuthCallback2026`
 * relit à l'identique (les jetons Supabase sont en base64url — aucun de leurs
 * caractères n'est réécrit par l'encodage).
 */
function appUrlFrom(params: URLSearchParams, separator: '#' | '?'): string {
  return `${APP_SCHEME_URL}${separator}${params.toString()}`;
}

/**
 * Lit une adresse de retour de connexion et rend le SEUL verdict qu'elle permet.
 * Pure : ni DOM, ni réseau, ni horloge.
 */
export function readAuthCallbackLink2026(
  location: AuthCallbackLinkLocation,
): AuthCallbackLinkView {
  const fragment = paramsFrom(location.hash);
  const query = paramsFrom(location.search);
  const both = [fragment, query] as const;

  // ① L'ERREUR D'ABORD. Supabase la pose dans le fragment en flux implicite et
  //    dans la query quand `verify` refuse avant toute redirection : les deux
  //    sont lus, sinon la moitié des refus passerait pour un lien vide.
  const errorCode = firstOf(both, ['error_code']);
  const errorDescription = firstOf(both, ['error_description']);
  const error = firstOf(both, ['error']);
  if (errorCode.length > 0 || errorDescription.length > 0 || error.length > 0) {
    // `error_description` arrive encodée (« Email+link+is+invalid+or+has+expired ») :
    // `URLSearchParams` l'a déjà décodée, on ne cherche donc que le mot.
    const expired = `${errorCode} ${errorDescription}`.toLowerCase().includes('expired');
    return { kind: expired ? 'expired' : 'failed', appUrl: null };
  }

  // ② SESSION IMPLICITE. Les DEUX jetons sont exigés : l'app ne sait rien faire
  //    d'un `access_token` seul (`parseAuthCallback2026` rend `none`), et lui en
  //    passer un ferait échouer l'ouverture après avoir promis une réussite.
  const accessToken = firstOf(both, ['access_token']);
  const refreshToken = firstOf(both, ['refresh_token']);
  if (accessToken.length > 0 && refreshToken.length > 0) {
    const carrier = fragment.get('access_token') !== null ? fragment : query;
    const type = firstOf(both, ['type']);
    return {
      kind: type === 'signup' ? 'signup' : 'return',
      appUrl: appUrlFrom(carrier, '#'),
    };
  }

  // ③ CODE PKCE. Le type d'e-mail n'y figure pas : on ne peut donc PAS
  //    féliciter pour une inscription, on accueille sans prétendre savoir.
  const code = query.get('code') ?? fragment.get('code');
  if (code !== null && code.trim().length > 0) {
    const carrier = query.get('code') !== null ? query : fragment;
    return { kind: 'return', appUrl: appUrlFrom(carrier, '?') };
  }

  // ④ RIEN. Ce n'est pas un échec du serveur : c'est une adresse incomplète.
  return { kind: 'incomplete', appUrl: null };
}
