/**
 * GRYD — LE FILET RESEAU DU HARNAIS DE PARCOURS.
 *
 * ═══ LA REGLE, ET POURQUOI ELLE EST ABSOLUE ════════════════════════════════
 * AUCUNE requete de ces tests ne sort de la machine. Le routeur ci-dessous
 * intercepte `**\/*` — pas seulement Supabase — et classe chaque requete dans
 * exactement une de quatre cases :
 *
 *   1. l'origine LOCALE du bundle servi         → laissee passer telle quelle ;
 *   2. `*.supabase.co`                          → repondue par une FIXTURE ;
 *   3. un tiers CONNU et hors perimetre         → coupee, silencieusement ;
 *   4. tout le reste                            → coupee ET enregistree comme
 *                                                 VIOLATION (le test echoue).
 *
 * La case 4 est le coeur : un harnais qui laisserait fuir une requete vers la
 * prod du fondateur ne serait pas un harnais, ce serait un risque. Et la case 3
 * est nommee, jamais implicite — un tiers muet qu'on n'a pas decide de couper
 * est un tiers qu'on n'a pas vu.
 *
 * ═══ LES FIXTURES SONT HONNETES ════════════════════════════════════════════
 * Elles rendent du VIDE (`[]`, `null`, aucun terrain, aucun crew), jamais des
 * chiffres inventes. C'est la contrainte constitutionnelle du projet reportee
 * sur ses tests : si un ecran affiche un nombre alors que le serveur n'a rien
 * donne, ce harnais doit le montrer, pas le couvrir. Un compte de test qui
 * arriverait sur une carte pleine de zones prouverait le contraire de ce qu'on
 * cherche.
 *
 * ═══ LE LIEN MAGIQUE NE SE SIMULE PAS PAR UNE REPONSE, MAIS PAR UN RETOUR ══
 * L'app ne demande plus de code : `EMAIL_DELIVERY` vaut `'link'` tant qu'aucune
 * source ne PROUVE que le gabarit e-mail porte `{{ .Token }}` (voir
 * `emailDelivery2026`, et l'en-tete de `e2e/build-dist.mjs`). Il n'y a donc plus
 * de `POST /auth/v1/verify` a simuler : ce qu'un joueur fait, c'est OUVRIR un
 * lien. Le harnais joue ce geste-la — une navigation vers `/callback` avec, dans
 * le FRAGMENT, ce que GoTrue y met en flux implicite (`magicLinkReturn`) ou
 * l'erreur qu'il y met quand le lien est mort (`EXPIRED_LINK_RETURN`).
 *
 * `/auth/v1/verify` n'est plus servi VOLONTAIREMENT : si un ecran redemandait un
 * code un jour, sa requete tomberait dans la case « chemin Supabase sans
 * fixture » et le test le dirait, au lieu de reussir sur un vestige.
 *
 * ═══ CE QUE LA SESSION SIMULEE EST, ET N'EST PAS ════════════════════════════
 * L'`access_token` rendu (dans le fragment du retour, par `/auth/v1/user` et par
 * `/auth/v1/token`) est un JWT de FORME valide mais de SIGNATURE bidon. C'est
 * suffisant et c'est exact : le client `@supabase/auth-js` ne verifie AUCUNE
 * signature — `setSession` decode le JWT, lit son `exp`, puis demande l'utilisateur
 * au serveur (`GET /auth/v1/user`). Ce jeton ne serait accepte par aucun serveur
 * reel, et c'est tres bien : le harnais prouve le comportement de l'APP une fois
 * connectee, jamais la validite d'un jeton.
 */
import type { Page, Route } from '@playwright/test';

/** Hote fictif inline dans le bundle E2E (cf. `e2e/build-dist.mjs`). */
const SUPABASE_HOST = 'e2e-mock.supabase.co';

/**
 * Tiers CONNUS, hors perimetre de ce harnais, coupes sans faire echouer :
 * fonds de carte, glyphes, geocodage, calcul d'itineraire. Le parcours client
 * teste ici n'en depend pas — et la carte MapLibre rend noire en capture
 * headless de toute facon (piege documente dans CLAUDE.md).
 */
const THIRD_PARTY_OUT_OF_SCOPE = [
  'basemaps.cartocdn.com',
  'tiles.basemaps.cartocdn.com',
  'fonts.openmaptiles.org',
  'nominatim.openstreetmap.org',
  'server.arcgisonline.com',
  'routing.openstreetmap.de',
  'geo.api.gouv.fr',
];

export interface MockUser {
  readonly id: string;
  readonly email: string;
}

export type SupabaseOutage = 'none' | 'http-503' | 'abort';

export interface MockConfig {
  /** L'utilisateur que le retour de lien connecte. */
  readonly user: MockUser;
  /** Panne simulee du backend (scenario S4). */
  readonly outage: SupabaseOutage;
}

export const DEFAULT_USER: MockUser = {
  // UUID fixe : aucune ressemblance avec un compte reel de la base du fondateur.
  id: '00000000-0000-4000-8000-0000000e2e01',
  email: 'parcours.e2e@example.test',
};

/** Base64url sans padding — les trois segments d'un JWT de forme valide. */
function b64url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fakeJwt(user: MockUser, expiresAtS: number): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      iss: `https://${SUPABASE_HOST}/auth/v1`,
      sub: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      exp: expiresAtS,
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  // Signature deliberement fausse : aucun serveur reel n'accepterait ce jeton.
  return `${header}.${payload}.e2e-signature-is-not-valid`;
}

export interface FakeSession {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly token_type: 'bearer';
  readonly expires_in: number;
  readonly expires_at: number;
  readonly user: Record<string, unknown>;
}

/** Session complete au format GoTrue, valable une heure. */
export function makeSession(user: MockUser = DEFAULT_USER): FakeSession {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 3600;
  const iso = new Date(now * 1000).toISOString();
  return {
    access_token: fakeJwt(user, expiresAt),
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: iso,
      phone: '',
      confirmed_at: iso,
      last_sign_in_at: iso,
      app_metadata: { provider: 'email', providers: ['email'] },
      // VIDE, volontairement : un compte neuf n'a ni nom ni avatar. L'app doit
      // deriver son identite visible de l'e-mail, ce que le scenario S2 verifie.
      user_metadata: {},
      identities: [],
      created_at: iso,
      updated_at: iso,
      is_anonymous: false,
    },
  };
}

/**
 * LE RETOUR D'UN LIEN VALIDE — flux implicite, tel que GoTrue le rend.
 *
 * Le lien de l'e-mail passe par `…/auth/v1/verify?token=…&type=magiclink`, qui
 * REDIRIGE vers l'app avec la session dans le FRAGMENT (`#access_token=…`).
 * C'est cette redirection-la que l'app voit ; le harnais la joue directement,
 * parce que l'etape d'avant se passe dans une boite mail qu'aucun test ne peut
 * ouvrir. Le fragment ne part jamais au serveur : `callback.tsx` le lit avec
 * `Linking.useLinkingURL()` (sur le web : `window.location.href`), et
 * `completeAuthCallback` appelle `setSession` avec les deux jetons.
 */
export function magicLinkReturn(user: MockUser = DEFAULT_USER): string {
  const session = makeSession(user);
  const fragment = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: String(session.expires_in),
    token_type: session.token_type,
    type: 'magiclink',
  });
  return `/callback#${fragment.toString()}`;
}

/**
 * LE RETOUR D'UN LIEN MORT — expire, ou deja servi (ils sont a usage unique).
 * Parametres copies de GoTrue mot pour mot : c'est `error_description` qui porte
 * le mot « expired », et c'est lui que `linkVerdictFromParams` lit pour
 * distinguer « expire » de « incomplet ».
 */
export const EXPIRED_LINK_RETURN = `/callback#${new URLSearchParams({
  error: 'access_denied',
  error_code: 'otp_expired',
  error_description: 'Email link is invalid or has expired',
}).toString()}`;

/** Instantane de propriete VIDE, au contrat que `parseOwnership2026` exige. */
function emptyOwnership(activity: string): Record<string, unknown> {
  return {
    type: 'FeatureCollection',
    contract: 'ownership.2026.3',
    activity,
    features: [],
    asOf: new Date().toISOString(),
    crew: null,
  };
}

/**
 * Reponses des RPC PostgREST. Chaque entree est un VIDE honnete.
 * Un RPC absent de cette table est une VIOLATION : il faut le regarder et
 * decider ce que « vide » veut dire pour lui, jamais rendre `null` au hasard.
 */
function rpcFixture(name: string, body: Record<string, unknown>, user: MockUser): unknown {
  switch (name) {
    // Aucune suppression de compte n'etait programmee : rien a annuler.
    case 'cancel_account_deletion':
      return { ok: true, restored: false };
    // Compte neuf : aucun profil social enregistre cote serveur.
    case 'my_social_profile_2026':
      return { ownerId: user.id, profile: null };
    case 'get_ownership_2026':
      return emptyOwnership(typeof body.p_activity === 'string' ? body.p_activity : 'run');
    // Aucun objet commercial possede ni equipe : la liste vide EST la reponse.
    case 'get_commercial_collections_2026':
      return [];
    // Aucune preference d'enregistrement enregistree pour ce compte neuf.
    case 'route_prefs_get':
      return null;
    // Aucun crew, aucun code d'invitation, aucune suppression programmee.
    case 'my_crew_code':
    case 'crew_overview':
      return null;
    case 'account_deletion_status':
      return { scheduled: false };
    // Aucun droit GRYD+ : le compte est neuf, et on n'invente pas un abonnement.
    case 'get_gryd_plus_access_2026':
      return null;
    // Aucun cosmetique equipe : un objet sans emplacement rempli EST la reponse
    // (0180/0181 : les emplacements par defaut sont derives cote client).
    case 'get_profile_cosmetics_2026':
      return {};
    // Parrainage (0184-0186) : le serveur cree le code a la premiere lecture ;
    // un compte neuf n'a ni parrain, ni filleul, ni recompense, ni credit.
    case 'my_referral_2026':
      return {
        code: 'ABCDEF', accountAgeDays: 0, canRedeem: true, redeemBlockedReason: null,
        myRunDone: false, sponsor: null, referees: [], rewards: [], boostActive: false,
        bonusXp: 0, grydPlusCredit: null, remainingThisSeason: 5, nextStep: 'share',
      };
    // Personne n'est moderateur dans le harnais (0187 : habilitation nominative).
    case 'am_i_moderator_2026':
      return false;
    default:
      return undefined;
  }
}

export interface NetworkLog {
  /** Toutes les requetes Supabase vues, sous la forme `POST /auth/v1/otp`. */
  readonly calls: string[];
  /** Requetes qu'aucune fixture ne couvre : chacune fait echouer le test. */
  readonly violations: string[];
}

export interface SupabaseMock extends NetworkLog {
  /** Bascule la panne backend en cours de test (scenario S4). */
  setOutage(outage: SupabaseOutage): void;
  /** Nombre d'appels vus sur ce chemin exact. */
  countOf(signature: string): number;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-expose-headers': '*',
  'access-control-max-age': '86400',
};

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
}

/**
 * Installe le filet sur une page. A appeler AVANT la premiere navigation :
 * `page.route` ne rattrape pas une requete deja partie.
 */
export async function installSupabaseMock(
  page: Page,
  config: Partial<MockConfig> = {},
): Promise<SupabaseMock> {
  const user = config.user ?? DEFAULT_USER;
  let outage: SupabaseOutage = config.outage ?? 'none';

  const calls: string[] = [];
  const violations: string[] = [];

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    // 1. Le bundle lui-meme (et ses assets) : rien a simuler.
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();

    // 3. Tiers connus hors perimetre — coupes, jamais comptes comme un defaut.
    if (THIRD_PARTY_OUT_OF_SCOPE.includes(url.hostname)) return route.abort('blockedbyclient');

    // 4. Inconnu : on coupe ET on l'ecrit. Le test doit tomber la-dessus.
    if (!url.hostname.endsWith('.supabase.co')) {
      violations.push(`${method} ${url.origin}${url.pathname} (hote non simule)`);
      return route.abort('blockedbyclient');
    }

    // 2. Supabase.
    const path = url.pathname;
    calls.push(`${method} ${path}`);

    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });

    if (outage === 'abort') return route.abort('connectionfailed');
    if (outage === 'http-503') {
      return json(route, 503, { code: 503, message: 'service unavailable (panne simulee E2E)' });
    }

    // ─── GoTrue ────────────────────────────────────────────────────────────
    if (path === '/auth/v1/otp') {
      // GoTrue ne dit JAMAIS si l'adresse existe : la reponse est la meme pour
      // une inscription et pour un retour. Le mock ne le dit pas non plus. Ce
      // 200 signifie « le lien est parti », rien de plus — comme en vrai.
      return json(route, 200, { message_id: null });
    }
    if (path === '/auth/v1/token') {
      return json(route, 200, makeSession(user));
    }
    if (path === '/auth/v1/user') {
      return json(route, 200, makeSession(user).user);
    }
    if (path === '/auth/v1/logout') {
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }

    // ─── PostgREST ─────────────────────────────────────────────────────────
    if (path.startsWith('/rest/v1/rpc/')) {
      const name = path.slice('/rest/v1/rpc/'.length);
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      const value = rpcFixture(name, body, user);
      if (value === undefined) {
        violations.push(`POST ${path} (RPC sans fixture)`);
        return json(route, 500, { code: 'PGRST202', message: `RPC ${name} sans fixture E2E` });
      }
      return json(route, 200, value);
    }
    if (path.startsWith('/rest/v1/')) {
      // Une table lue par un compte neuf ne rend RIEN. Pas une ligne inventee.
      return json(route, 200, []);
    }

    // ─── Edge Functions ────────────────────────────────────────────────────
    if (path.startsWith('/functions/v1/')) {
      return json(route, 200, { ok: true });
    }

    // ─── Storage ───────────────────────────────────────────────────────────
    if (path.startsWith('/storage/v1/')) {
      // Aucun media : l'app doit peindre l'initiale, pas une image cassee.
      return json(route, 404, { statusCode: '404', error: 'not_found', message: 'aucun objet' });
    }

    violations.push(`${method} ${path} (chemin Supabase sans fixture)`);
    return json(route, 500, { message: 'chemin Supabase sans fixture E2E' });
  });

  return {
    calls,
    violations,
    setOutage: (next: SupabaseOutage) => {
      outage = next;
    },
    countOf: (signature: string) => calls.filter((entry) => entry === signature).length,
  };
}
