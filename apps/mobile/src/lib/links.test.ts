/**
 * GRYD — LE LIEN DU MAIL, PROUVÉ SANS BOÎTE MAIL.
 *
 * ═══ ÉTAPE 0 — CE QUI ÉTAIT ROUGE AVANT CE FICHIER ═══════════════════════════
 * Trois faits, tous vérifiables sans appareil, et aucun n'était tenu :
 *   1. `lib/auth.ts` envoyait `emailRedirectTo: 'gryd://callback'` — un schéma
 *      privé, qu'aucun client mail ne rend cliquable. Le lien du fondateur ne
 *      « menait vers rien » pour cette raison exacte ;
 *   2. `app.json` ne déclarait AUCUN `associatedDomains` : même avec une URL
 *      https, iOS aurait ouvert Safari au lieu de l'app ;
 *   3. `INVITE_HOSTS` recopiait la liste d'hôtes au lieu de la dériver, si bien
 *      qu'il existait DEUX vérités sur le domaine de GRYD.
 * Les trois sont des tests de SOURCE ci-dessous : ils relisent les fichiers
 * réellement embarqués, pas une intention écrite dans un commentaire.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  APP_SCHEME,
  AUTH_CALLBACK_DEEP_LINK,
  AUTH_CALLBACK_PATH,
  AUTH_CALLBACK_URL,
  GRYD_DOMAIN,
  GRYD_LINK_HOSTS,
  UNIVERSAL_LINK_SEGMENTS,
  authCallbackParam,
  grydWebLinkPattern,
  isAuthCallbackUrl,
  parseAuthCallbackUrl,
} from './links.ts';

const MOBILE_DIR = new URL('../../', import.meta.url);

async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, MOBILE_DIR));
}

// ─── 1. Les constantes disent ce que le produit envoie ───────────────────────

Deno.test('le lien envoyé par e-mail est une URL https sur le domaine de GRYD', () => {
  assertEquals(AUTH_CALLBACK_URL, 'https://gryd.run/callback');
  assert(AUTH_CALLBACK_URL.startsWith('https://'), 'un client mail n’ouvre pas un schéma privé');
  assertEquals(AUTH_CALLBACK_DEEP_LINK, 'gryd://callback');
  assertEquals(GRYD_LINK_HOSTS[0], GRYD_DOMAIN, 'le domaine émis est le premier hôte accepté');
  assertEquals(APP_SCHEME, 'gryd');
});

// ─── 2. Les deux formes d'arrivée sont reconnues, et rien d'autre ────────────

Deno.test('les DEUX arrivées sont reconnues : lien universel et schéma', () => {
  assert(isAuthCallbackUrl('https://gryd.run/callback#access_token=a&refresh_token=b'));
  assert(isAuthCallbackUrl('https://www.gryd.run/callback'));
  assert(isAuthCallbackUrl('https://gryd.app/callback?code=xyz'));
  assert(isAuthCallbackUrl('gryd://callback#access_token=a&refresh_token=b'));
  assert(isAuthCallbackUrl('gryd:///callback'), 'les slashes varient selon l’OS et l’émetteur');
  assert(isAuthCallbackUrl('GRYD://CALLBACK'), 'la casse d’un schéma n’est pas significative');
});

Deno.test('rien d’autre ne passe pour un retour d’authentification', () => {
  assertEquals(isAuthCallbackUrl(null), false);
  assertEquals(isAuthCallbackUrl(''), false);
  assertEquals(isAuthCallbackUrl('https://grydxrun/callback'), false);
  assertEquals(isAuthCallbackUrl('https://evil.test/callback'), false);
  assertEquals(isAuthCallbackUrl('https://gryd.run.evil.test/callback'), false);
  assertEquals(isAuthCallbackUrl('https://gryd.run/callbackxyz'), false);
  assertEquals(isAuthCallbackUrl('https://gryd.run/c/ABCDEF'), false);
  assertEquals(isAuthCallbackUrl('gryd://c/ABCDEF'), false);
});

Deno.test('la regex d’un lien web se construit depuis la liste d’hôtes, jamais en dur', () => {
  const pattern = grydWebLinkPattern('/u/([a-z0-9_]+)');
  for (const host of GRYD_LINK_HOSTS) {
    assert(pattern.test(`https://${host}/u/koro`), `${host} doit être accepté`);
  }
  assertEquals(pattern.test('https://gryd.example/u/koro'), false);
});

// ─── 3. COUTURE — ce que les fichiers embarqués disent VRAIMENT ──────────────

Deno.test('lib/auth.ts n’écrit plus aucune URL de retour en dur', async () => {
  const src = await read('src/lib/auth.ts');
  assert(
    src.includes('emailRedirectTo: AUTH_CALLBACK_URL'),
    'le retour du lien e-mail doit venir de la constante, pas d’un littéral',
  );
  assertEquals(
    /emailRedirectTo:\s*['"`]/.test(src),
    false,
    'aucune URL de retour écrite en dur dans auth.ts',
  );
});

Deno.test('app.json déclare le domaine à iOS, sinon le lien universel ouvre Safari', async () => {
  const raw = await read('app.json');
  const config = JSON.parse(raw) as {
    expo: {
      scheme: string;
      ios: { associatedDomains?: readonly string[] };
      android: { package?: string; intentFilters?: readonly unknown[] };
    };
  };
  assertEquals(config.expo.scheme, APP_SCHEME);
  const domains = config.expo.ios.associatedDomains ?? [];
  assert(domains.includes(`applinks:${GRYD_DOMAIN}`), 'applinks manquant');
  assert(domains.includes(`webcredentials:${GRYD_DOMAIN}`), 'webcredentials manquant');
  // Android : un intent filter n'a de sens que s'il existe un paquet à ouvrir.
  if (config.expo.android.package) {
    assert(
      (config.expo.android.intentFilters ?? []).length > 0,
      'un paquet Android existe : ses liens https doivent être déclarés',
    );
  }
});

Deno.test('les hôtes d’invitation DÉRIVENT de la liste unique', async () => {
  const src = await read('src/features/crew/pendingInvite.ts');
  assert(
    src.includes('GRYD_LINK_HOSTS'),
    'INVITE_HOSTS doit être dérivé de lib/links.ts, pas recopié',
  );
  assertEquals(
    /INVITE_HOSTS\s*=\s*\[/.test(src),
    false,
    'une seconde liste d’hôtes en dur rouvrirait la divergence',
  );
});

Deno.test('chaque segment remis par le domaine a une route expo-router', async () => {
  const candidates: Record<string, string> = {
    callback: 'app/(auth)/callback.tsx',
    c: 'app/c/[code].tsx',
    r: 'app/r/[code].tsx',
    u: 'app/u/[handle].tsx',
  };
  for (const segment of UNIVERSAL_LINK_SEGMENTS) {
    const file = candidates[segment];
    assert(file !== undefined, `/${segment} n’est adossé à aucun fichier connu`);
    const stat = await Deno.stat(new URL(file, MOBILE_DIR));
    assert(stat.isFile, `/${segment} est remis à l’app sans écran pour le servir`);
  }
});

/**
 * COUTURE AVEC LE DOMAINE. `apps/web` publie l'`apple-app-site-association` ;
 * si ses `components` et cette liste divergent, iOS remet à l'app un chemin
 * qu'aucun écran ne sert (« Unmatched route »), ou n'en remet pas un qu'on
 * croyait couvert. Le fichier appartient à un autre lot : on le LIT, on ne le
 * modifie pas, et on échoue bruyamment s'il n'est pas là.
 */
Deno.test('le fichier de domaine et cette liste couvrent les mêmes segments', async () => {
  const file = new URL('../web/public/.well-known/apple-app-site-association', MOBILE_DIR);
  let raw: string;
  try {
    raw = await Deno.readTextFile(file);
  } catch {
    throw new Error(
      'apple-app-site-association introuvable : sans lui, iOS n’associe RIEN et ' +
        'tous les liens universels ouvrent Safari. Le fichier appartient à apps/web.',
    );
  }
  const aasa = JSON.parse(raw) as {
    applinks: { details: readonly { components: readonly { '/': string }[] }[] };
  };
  const declared = new Set<string>();
  for (const detail of aasa.applinks.details) {
    for (const component of detail.components) {
      const segment = component['/'].split('/').filter(Boolean)[0];
      if (segment !== undefined) declared.add(segment);
    }
  }
  for (const segment of UNIVERSAL_LINK_SEGMENTS) {
    assert(declared.has(segment), `/${segment} n’est pas remis à l’app par le domaine`);
  }
  for (const segment of declared) {
    assert(
      (UNIVERSAL_LINK_SEGMENTS as readonly string[]).includes(segment),
      `le domaine remet /${segment} à l’app, et rien ici ne le sait`,
    );
  }
});

Deno.test('le chemin du retour est le même des deux côtés', () => {
  assert(AUTH_CALLBACK_URL.endsWith(AUTH_CALLBACK_PATH));
  assert(AUTH_CALLBACK_DEEP_LINK.endsWith(AUTH_CALLBACK_PATH.replace('/', '')));
  assert(
    (UNIVERSAL_LINK_SEGMENTS as readonly string[]).includes(AUTH_CALLBACK_PATH.slice(1)),
  );
});

// ─── 4. LIRE CE QUE PORTE LE RETOUR — les deux moitiés, séparées ─────────────

Deno.test('une URL de retour se lit dans ses DEUX moitiés', () => {
  const parts = parseAuthCallbackUrl(
    'https://gryd.run/callback?token_hash=pkce_h9&type=signup#access_token=a&refresh_token=r',
  );
  assert(parts !== null);
  assertEquals(authCallbackParam(parts, 'token_hash', ['query', 'fragment']), 'pkce_h9');
  assertEquals(authCallbackParam(parts, 'access_token'), 'a');
  assertEquals(authCallbackParam(parts, 'refresh_token'), 'r');
  assertEquals(authCallbackParam(parts, 'absent'), null);
});

Deno.test('la moitié prioritaire est celle que l’appelant demande, pas une fusion', () => {
  // Le cas n'arrive pas chez GoTrue ; il arrive chez un client mail qui réécrit
  // l'adresse. Fusionner les deux moitiés déciderait alors en silence.
  const parts = parseAuthCallbackUrl('gryd://callback?type=magiclink#type=signup');
  assertEquals(authCallbackParam(parts, 'type', ['fragment', 'query']), 'signup');
  assertEquals(authCallbackParam(parts, 'type', ['query', 'fragment']), 'magiclink');
});

Deno.test('une valeur vide est une ABSENCE, jamais une valeur', () => {
  // `?token_hash=` est un lien tronqué. L'envoyer au serveur ferait répondre
  // « lien invalide » à quelqu'un dont le lien, lui, était bon.
  const parts = parseAuthCallbackUrl('https://gryd.run/callback?token_hash=&type=signup');
  assertEquals(authCallbackParam(parts, 'token_hash', ['query']), null);
  assertEquals(authCallbackParam(parts, 'type', ['query']), 'signup');
});

Deno.test('ce qui n’est pas une URL n’a pas de moitiés', () => {
  assertEquals(parseAuthCallbackUrl(null), null);
  assertEquals(parseAuthCallbackUrl(undefined), null);
  assertEquals(parseAuthCallbackUrl(''), null);
  assertEquals(parseAuthCallbackUrl('pas une url'), null);
  assertEquals(authCallbackParam(null, 'token_hash'), null);
});

Deno.test('LIRE n’est pas ACCEPTER : l’hôte n’est filtré que par isAuthCallbackUrl', () => {
  // Le harnais de parcours sert le retour sur l'origine locale : si la lecture
  // filtrait l'hôte, elle ne saurait plus lire ce que le harnais lui donne.
  const local = 'http://127.0.0.1:4319/callback?token_hash=h&type=signup';
  assertEquals(authCallbackParam(parseAuthCallbackUrl(local), 'token_hash', ['query']), 'h');
  // …et la question de SÉCURITÉ, elle, reste fermée sur les hôtes de GRYD.
  assertEquals(isAuthCallbackUrl(local), false);
});

// ─── 5. COUTURE — le lien que l'e-mail envoie VRAIMENT ──────────────────────

/**
 * ÉTAPE 0 — CE QUI ÉTAIT ROUGE. Les gabarits rendaient `{{ .ConfirmationURL }}`,
 * c'est-à-dire `https://<projet>.supabase.co/auth/v1/verify?…`, qui vérifie puis
 * répond 302 vers `gryd.run/callback`. iOS ne remet PAS un lien universel à
 * l'app au bout d'une chaîne de redirections : le joueur voyait donc toujours la
 * page web et devait appuyer sur « Ouvrir GRYD ». Le gabarit vise désormais
 * l'adresse finale, DIRECTEMENT.
 *
 * Ce test relit les fichiers réellement appliqués au projet Supabase
 * (`scripts/apply-auth-email-templates.mjs`), pas une intention.
 */
const GABARITS_A_LIEN_DIRECT: Readonly<Record<string, string>> = {
  'confirmation.html': 'signup',
  'magic-link.html': 'magiclink',
};

/**
 * Les gabarits DORMANTS — aucun chemin de l'app ne les déclenche (ni
 * `resetPasswordForEmail`, ni `updateUser`, ni `inviteUserByEmail` dans le
 * dépôt). Ils gardent `{{ .ConfirmationURL }}`, et chacun a sa raison propre,
 * écrite dans le README du dossier. Le test les garde tels quels pour que
 * « on n'a pas eu le temps » ne puisse pas se déguiser en « c'est fait ».
 */
const GABARITS_DORMANTS = ['recovery.html', 'email-change.html', 'invite.html'];

async function lireGabarit(fichier: string): Promise<string> {
  const url = new URL(`../../supabase/email-templates/2026-09/${fichier}`, MOBILE_DIR);
  // Les `&` d'un attribut HTML s'écrivent `&amp;` : on compare l'URL, pas son
  // échappement.
  return (await Deno.readTextFile(url)).replaceAll('&amp;', '&');
}

Deno.test('les gabarits du parcours visent l’app DIRECTEMENT, sans redirection', async () => {
  for (const [fichier, type] of Object.entries(GABARITS_A_LIEN_DIRECT)) {
    const html = await lireGabarit(fichier);
    const attendu = `{{ .SiteURL }}${AUTH_CALLBACK_PATH}?token_hash={{ .TokenHash }}&type=${type}`;
    assert(html.includes(attendu), `${fichier} doit viser ${attendu}`);
    // Le bouton ET le lien de secours (href + texte visible) : trois fois.
    assertEquals(
      html.split(attendu).length - 1,
      3,
      `${fichier} : le bouton et le lien de secours doivent porter la MÊME adresse`,
    );
    assertEquals(
      html.includes('{{ .ConfirmationURL }}'),
      false,
      `${fichier} : une seule adresse par gabarit, sinon la moitié des joueurs passe par la redirection`,
    );
    // Aucun code à six chiffres : l'écran n'en réclame pas (emailDelivery2026).
    assertEquals(html.includes('{{ .Token }}'), false, `${fichier} ne doit pas promettre un code`);
  }
});

Deno.test('les gabarits dormants n’ont PAS été basculés en douce', async () => {
  for (const fichier of GABARITS_DORMANTS) {
    const html = await lireGabarit(fichier);
    assert(
      html.includes('{{ .ConfirmationURL }}'),
      `${fichier} est dormant : il garde la redirection de GoTrue (voir le README du dossier)`,
    );
    assertEquals(html.includes('token_hash'), false, `${fichier} : ni moitié basculé, ni oublié`);
  }
});
