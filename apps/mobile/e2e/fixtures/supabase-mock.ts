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
 * ═══ CE QUE LA SESSION SIMULEE EST, ET N'EST PAS ════════════════════════════
 * `POST /auth/v1/verify` rend une session dont l'`access_token` est un JWT de
 * FORME valide mais de SIGNATURE bidon. C'est suffisant et c'est exact : le
 * client `@supabase/auth-js` ne verifie AUCUNE signature — il lit `expires_at`,
 * `refresh_token` et `user` (`_isValidSession`, GoTrueClient.js). Ce jeton ne
 * serait accepte par aucun serveur reel, et c'est tres bien : le harnais prouve
 * le comportement de l'APP une fois connectee, jamais la validite d'un jeton.
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
  /** Le seul code a 6 chiffres accepte par `/auth/v1/verify`. */
  readonly otpCode: string;
  /** L'utilisateur rendu par une verification reussie. */
  readonly user: MockUser;
  /** Panne simulee du backend (scenario S4). */
  readonly outage: SupabaseOutage;
}

export const DEFAULT_USER: MockUser = {
  // UUID fixe : aucune ressemblance avec un compte reel de la base du fondateur.
  id: '00000000-0000-4000-8000-0000000e2e01',
  email: 'parcours.e2e@example.test',
};

export const GOOD_CODE = '123456';
export const BAD_CODE = '999999';

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
  const otpCode = config.otpCode ?? GOOD_CODE;
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
      // une inscription et pour un retour. Le mock ne le dit pas non plus.
      return json(route, 200, { message_id: null });
    }
    if (path === '/auth/v1/verify') {
      const sent = request.postDataJSON() as { token?: string } | null;
      if (sent?.token !== otpCode) {
        return json(route, 403, {
          code: 403,
          error_code: 'otp_expired',
          msg: 'Token has expired or is invalid',
          message: 'Token has expired or is invalid',
        });
      }
      return json(route, 200, makeSession(user));
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
