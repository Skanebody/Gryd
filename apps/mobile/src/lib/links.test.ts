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
  grydWebLinkPattern,
  isAuthCallbackUrl,
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
