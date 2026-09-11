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
 *      `https://gryd.run/callback#access_token=…`. Le fragment est CONSERVÉ
 *      (expo-router le passe à `getStateFromPath`, et `Linking.useLinkingURL()`
 *      rend l'URL BRUTE) ;
 *   2. SCHÉMA — l'app n'est pas installée, ou le lien universel n'est pas
 *      vérifié : le navigateur ouvre la page web, qui dit « Félicitations » et
 *      propose un bouton vers `AUTH_CALLBACK_DEEP_LINK` (`gryd://callback#…`).
 *      C'est le seul contexte où un schéma privé fonctionne : un geste de
 *      l'utilisateur, depuis une page qu'il regarde déjà.
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
