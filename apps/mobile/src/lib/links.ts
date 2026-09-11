/**
 * GRYD — LES LIENS QUI RAMÈNENT DANS L'APP. UNE SEULE SOURCE, PURE.
 *
 * ═══ LE DÉFAUT DU FONDATEUR (12/09/2026) ════════════════════════════════════
 * « le bouton du mail mène vers rien du tout ». Il avait raison, et la cause
 * tenait en une chaîne écrite en dur : `emailRedirectTo: 'gryd://callback'`
 * (`lib/auth.ts`). Un client mail n'ouvre PAS un schéma privé — iOS et Android
 * ne rendent cliquables que `http`/`https` dans un courrier, et Gmail réécrit
 * de toute façon chaque lien par son proxy. Le lien existait, il était
 * inatteignable : exactement un bouton mort, à l'endroit où l'on demande à
 * quelqu'un de créer son compte.
 *
 * Le retour passe donc désormais par une URL HTTPS réelle
 * (`AUTH_CALLBACK_URL`), servie par `apps/web`. Deux chemins la suivent, et
 * l'app doit accepter les DEUX :
 *
 *   1. LIEN UNIVERSEL — iOS a vérifié `apple-app-site-association` sur le
 *      domaine, l'app est installée : le système ouvre GRYD directement sur
 *      `https://gryd.run/callback?token_hash=…&type=…`. Query ET fragment sont
 *      CONSERVÉS (expo-router les passe à `getStateFromPath`, et
 *      `Linking.useLinkingURL()` rend l'URL BRUTE) ;
 *   2. SCHÉMA — l'app n'est pas installée, ou le lien universel n'est pas
 *      vérifié : le navigateur ouvre la page web, qui propose un bouton vers
 *      `AUTH_CALLBACK_DEEP_LINK` (`gryd://callback?token_hash=…`). C'est le
 *      seul contexte où un schéma privé fonctionne : un geste de l'utilisateur,
 *      depuis une page qu'il regarde déjà.
 *
 * ═══ POURQUOI L'E-MAIL VISE CETTE ADRESSE, ET PAS CELLE DE SUPABASE (E4) ════
 * Le lien partait sur `https://<projet>.supabase.co/auth/v1/verify?token=…`,
 * qui vérifie puis répond 302 vers `gryd.run/callback#access_token=…`. C'est
 * fonctionnel et c'est pourtant un demi-échec : **iOS ne remet PAS un lien
 * universel à l'app au bout d'une chaîne de redirections** — Safari qui suit un
 * 302 garde la main. Le joueur voyait donc toujours la page web, et devait
 * appuyer sur « Ouvrir GRYD ».
 *
 * Depuis E4, le gabarit d'e-mail pointe DIRECTEMENT sur
 * `{{ .SiteURL }}/callback?token_hash={{ .TokenHash }}&type=…` : lien universel
 * de PREMIÈRE MAIN, donc l'app s'ouvre sans un clic de plus, et c'est ELLE qui
 * échange le haché contre une session (`supabase.auth.verifyOtp`). Le haché est
 * à USAGE UNIQUE : personne d'autre que l'app n'a le droit de le consommer —
 * raison pour laquelle la page web, elle, ne vérifie rien (voir
 * `apps/web/lib/authCallbackLink2026.ts`).
 *
 * ═══ POURQUOI ICI, ET PAS DANS `game-rules.ts` ══════════════════════════════
 * Un nom de domaine ne décide ni claim, ni point, ni distance : ce n'est pas
 * une règle de jeu (même distinction que `AUTH_CALLBACK_URL_WAIT_MS` ou
 * `PROFILE_READ_TIMEOUT_MS`). Il décide en revanche de DEUX fichiers qui
 * doivent s'accorder au caractère près — `app.json` (`associatedDomains`) et
 * le lien envoyé par Supabase — d'où ce module unique, et le test de couture
 * qui relit les deux (`links.test.ts`).
 *
 * ═══ PUR : ZÉRO IMPORT ══════════════════════════════════════════════════════
 * `npm run test:mobile` est un `deno test` sur tout `src/`, et Deno
 * TYPE-VÉRIFIE le graphe d'imports complet. Un seul `import` de React Native
 * ici rendrait ces règles impossibles à prouver sans téléphone — or c'est
 * précisément ce qu'il faut pouvoir prouver sans téléphone.
 */

/** Le schéma privé de l'app — déclaré par `expo.scheme` dans `app.json`. */
export const APP_SCHEME = 'gryd';

/**
 * LE DOMAINE DE GRYD. Arbitrage O10 RENDU : `gryd.run` (le domaine est acheté,
 * la boîte `no-reply@gryd.run` existe, le SMTP est en place — STATUS du
 * 11/09/2026). `gryd.app` reste ACCEPTÉ en lecture ci-dessous, jamais émis.
 */
export const GRYD_DOMAIN = 'gryd.run';

/**
 * Hôtes acceptés pour un lien web GRYD entrant.
 *
 * ⚠️ ACCEPTER N'EST PAS ÉMETTRE. `gryd.app` figure ici parce que des liens
 * anciens peuvent circuler (QR imprimés, messages partagés avant l'arbitrage) ;
 * rien dans l'app n'en FABRIQUE plus un seul — tout ce qui sort est construit
 * sur `GRYD_DOMAIN`. Retirer `gryd.app` casserait des liens déjà dans la
 * nature ; le laisser ne coûte qu'une alternative de regex.
 */
export const GRYD_LINK_HOSTS = [GRYD_DOMAIN, 'gryd.app'] as const;

/**
 * Chemin du retour d'authentification. Le MÊME des deux côtés : c'est la route
 * expo-router `app/(auth)/callback.tsx` ET le chemin servi par `apps/web`.
 */
export const AUTH_CALLBACK_PATH = '/callback';

/**
 * CE QUE SUPABASE MET DANS L'E-MAIL (`emailRedirectTo`).
 *
 * ⚠️ CÔTÉ SERVEUR, CETTE URL DOIT ÊTRE AUTORISÉE. GoTrue refuse toute
 * redirection absente de son `uri_allow_list` et retombe alors sur `SITE_URL` :
 * le lien partirait, et ramènerait ailleurs. C'est un réglage de projet
 * Supabase (dashboard → Authentication → URL Configuration), hors du code.
 * Tant qu'il n'est pas posé, ce module ne peut RIEN y faire — et il ne prétend
 * pas le vérifier.
 */
export const AUTH_CALLBACK_URL = `https://${GRYD_DOMAIN}${AUTH_CALLBACK_PATH}`;

/**
 * CE QUE LE BOUTON DE LA PAGE WEB OUVRE (`gryd://callback`). La page y recopie
 * le fragment reçu ; l'app le relit tel quel.
 */
export const AUTH_CALLBACK_DEEP_LINK = `${APP_SCHEME}://callback`;

/**
 * LES CHEMINS QUE LE DOMAINE REMET À L'APP — miroir de `applinks` dans
 * `apple-app-site-association` (servi par `apps/web`).
 *
 *   · `/callback` — le retour d'authentification (ce module) ;
 *   · `/c/*`      — une invitation de crew (`features/crew/pendingInvite.ts`) ;
 *   · `/r/*`      — un lien de parrainage (`features/referral/`) ;
 *   · `/u/*`      — un profil public.
 *
 * Écrits ici pour qu'un test puisse vérifier que chacun a bien une route
 * expo-router derrière lui : un chemin remis à l'app sans écran pour le servir
 * produirait « Unmatched route » chez le joueur — l'équivalent moderne d'un
 * lien mort.
 */
export const UNIVERSAL_LINK_SEGMENTS = ['callback', 'c', 'r', 'u'] as const;

/**
 * ⚠️ DES SEGMENTS, PAS DES CHEMINS, ET C'EST DÉLIBÉRÉ. Écrits `'/c'`, `'/r'`,
 * `'/u'`, ils étaient lus par `scripts/audit-routes.mjs` comme des LIENS vers
 * des routes qui n'existent pas (`/c` seul n'est pas une route : `/c/[code]`
 * l'est), et l'audit les signalait en liens morts — à juste titre, puisqu'un
 * `router.push('/c')` produirait bien « Unmatched route ». Un préfixe de
 * chemin n'est pas un chemin ; le type le dit maintenant.
 */
export type UniversalLinkSegment = (typeof UNIVERSAL_LINK_SEGMENTS)[number];

/** Échappe les points d'un hôte pour une alternative de regex (`gryd.run` ≠ `grydxrun`). */
function hostPattern(hosts: readonly string[]): string {
  return hosts.map((host) => host.replace(/\./g, '\\.')).join('|');
}

/**
 * Construit la regex d'un lien web GRYD pour un chemin donné, sur TOUS les
 * hôtes acceptés. `www.` toléré, casse ignorée.
 *
 * Existe pour que personne ne réécrive une seconde liste d'hôtes en dur : avec
 * deux hôtes recopiés dans une regex, éditer `GRYD_LINK_HOSTS` n'aurait AUCUN
 * effet sur le parsing réel — un piège documenté à l'envers.
 */
export function grydWebLinkPattern(pathPattern: string): RegExp {
  return new RegExp(
    `^https?://(?:www\\.)?(?:${hostPattern(GRYD_LINK_HOSTS)})${pathPattern}$`,
    'i',
  );
}

/** `https://gryd.run/callback` (fragment et query tolérés, comme GoTrue les pose). */
const WEB_CALLBACK_RE = grydWebLinkPattern(`${AUTH_CALLBACK_PATH}/*(?:[?#].*)?`);

/** `gryd://callback` — slashes tolérants (`gryd://callback` et `gryd:///callback`). */
const SCHEME_CALLBACK_RE = new RegExp(
  `^${APP_SCHEME}:/*callback/*(?:[?#].*)?$`,
  'i',
);

/**
 * Cette URL est-elle un retour d'authentification GRYD ? PURE.
 *
 * Sert au layout racine : un lien universel arrive par le MÊME canal qu'une
 * invitation de crew, et il ne faut ni le confondre avec elle, ni le jeter.
 * Tout ce qui ne colle pas EXACTEMENT rend `false` — un lien entrant est une
 * entrée hostile comme une autre.
 */
export function isAuthCallbackUrl(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  const url = raw.trim();
  return WEB_CALLBACK_RE.test(url) || SCHEME_CALLBACK_RE.test(url);
}

/**
 * ═══ CE QUE PORTE UNE URL DE RETOUR — LES DEUX MOITIÉS, JAMAIS FUSIONNÉES ════
 *
 * Une URL d'authentification range ses paramètres à DEUX endroits, et le choix
 * n'est pas cosmétique :
 *
 *   · le FRAGMENT (`#access_token=…`) ne part JAMAIS au serveur. GoTrue y met la
 *     session du flux implicite, précisément pour qu'aucun intermédiaire (proxy,
 *     journal d'accès, referrer) ne la voie ;
 *   · la QUERY (`?token_hash=…&type=…`, `?code=…`) part, elle, au serveur —
 *     c'est le prix à payer pour qu'un LIEN D'E-MAIL soit une adresse complète,
 *     donc un lien universel de première main qu'iOS remet directement à l'app.
 *     Le jeton qui s'y trouve est un HACHÉ à usage unique, pas une session.
 *
 * Les fusionner en un seul sac serait une erreur silencieuse : selon la clé, ce
 * n'est pas la même moitié qui fait foi (la session dans le fragment, le retour
 * de vérification dans la query). D'où deux `URLSearchParams` distincts et un
 * lecteur qui reçoit l'ORDRE de priorité au cas par cas.
 *
 * PURE, et ici plutôt que dans `features/account/` parce que c'est une propriété
 * du LIEN, pas du compte : la même lecture sert au retour d'authentification, et
 * servira à toute autre adresse que le domaine remet à l'app.
 */
export interface AuthCallbackParts {
  /** Ce qui suit le `?`. Vide (jamais `null`) quand il n'y en a pas. */
  readonly query: URLSearchParams;
  /** Ce qui suit le `#`. Vide (jamais `null`) quand il n'y en a pas. */
  readonly fragment: URLSearchParams;
}

/** Moitié d'URL, nommée pour que l'ordre de priorité soit lisible à l'appel. */
export type AuthCallbackHalf = 'query' | 'fragment';

/**
 * Découpe une URL de retour en ses deux moitiés. `null` si ce n'en est pas une.
 *
 * ⚠️ ELLE NE VÉRIFIE PAS L'HÔTE, ET C'EST VOULU. `isAuthCallbackUrl` répond à
 * « ce lien entrant est-il un retour GRYD ? » (question de SÉCURITÉ, hôtes
 * fermés) ; celle-ci répond à « que porte cette adresse ? » (question de
 * LECTURE). Les mélanger casserait le harnais de parcours, qui sert le retour
 * sur l'ORIGINE LOCALE du bundle exporté — la forme de l'adresse est la même,
 * l'hôte ne peut pas l'être.
 */
export function parseAuthCallbackUrl(raw: string | null | undefined): AuthCallbackParts | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  return {
    query: new URLSearchParams(url.search.replace(/^\?/, '')),
    fragment: new URLSearchParams(url.hash.replace(/^#/, '')),
  };
}

/**
 * Première valeur NON VIDE d'une clé, dans l'ordre de moitiés demandé.
 *
 * Une chaîne vide est traitée comme une absence : `?token_hash=&type=signup`
 * est un lien tronqué, pas un lien qui porte un jeton vide — et l'app doit le
 * refuser au lieu d'envoyer ce vide au serveur.
 */
export function authCallbackParam(
  parts: AuthCallbackParts | null,
  key: string,
  order: readonly AuthCallbackHalf[] = ['fragment', 'query'],
): string | null {
  if (parts === null) return null;
  for (const half of order) {
    const value = parts[half].get(key);
    if (value !== null && value.trim().length > 0) return value;
  }
  return null;
}
