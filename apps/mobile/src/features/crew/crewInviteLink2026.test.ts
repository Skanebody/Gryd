/**
 * GRYD — L'INVITATION NE PROMET PAS UNE PAGE QUI N'EXISTE PAS.
 *
 * ⚠ 11/09/2026 — CE TEST A SUIVI SON ÉCRAN. `refonte/CrewInviteScreen.tsx`
 * (un MODE de la page Crew) est devenu `crew/CrewInvitationScreen2026.tsx`
 * (la route `/crew-invitation`). La garde ci-dessous n'a pas bougé d'un mot :
 * c'est la DÉCISION du 10/09 qu'elle protège, pas un chemin de fichier.
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT, et il tenait en trois faits vérifiables :
 *   1. `CrewInviteScreen.tsx` partageait `buildInviteLink(code)`, c'est-à-dire
 *      `https://gryd.run/c/<code>` (`features/crew/invite.ts:57`) ;
 *   2. `app.json` ne déclare NI `ios.associatedDomains` NI un
 *      `android.intentFilters` sur un domaine — c'est délibéré
 *      (`_note_deeplink_invite_o10`), donc aucun OS n'intercepte ce lien ;
 *   3. `apps/web` n'a aucune route `/c/[code]`.
 *   ⇒ le lien ouvrait une 404 dans Safari. Et l'écran affirmait dessous : « Le
 *      QR et ce lien ouvrent la même invitation. » Au moment le plus fragile du
 *      produit — celui où on amène quelqu'un — l'app envoyait dans un mur.
 *
 * Ces trois faits sont RE-VÉRIFIÉS ici à chaque exécution : le jour où le
 * domaine existe (décision d'infra du fondateur, point ouvert O10), ce fichier
 * échouera et dira quoi rebrancher. C'est le but.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const SCREEN = new URL('./CrewInvitationScreen2026.tsx', import.meta.url);
const APP_JSON = new URL('../../../app.json', import.meta.url);
const WEB_APP_DIR = new URL('../../../../web/app/', import.meta.url);

Deno.test('l’invitation partage le lien profond réel, jamais un https sans page', async () => {
  const src = (await Deno.readTextFile(SCREEN)).replace(/\/\*[\s\S]*?\*\//g, '');
  assert(src.includes('buildInviteDeepLink(code)'), 'le lien partagé est `gryd://c/<code>`');
  assert(
    !/buildInviteLink\(/.test(src),
    'plus aucun `https://gryd.run/c/…` : sans domaine déclaré ni page servie, c’est une 404',
  );
});

Deno.test('le QR et le lien partagé portent le MÊME jeton, par construction', async () => {
  const src = (await Deno.readTextFile(SCREEN)).replace(/\/\*[\s\S]*?\*\//g, '');
  // UNE SEULE construction du lien dans tout l'écran : deux appels
  // indépendants divergeraient au premier changement de format, et un QR
  // imprimé ne se corrige pas.
  const appels = src.match(/buildInviteDeepLink\(/g) ?? [];
  assertEquals(appels.length, 2, 'le lien doit se construire à un seul endroit (import + appel)');
  assert(
    /const link = buildInviteDeepLink\(code\);/.test(src),
    'le lien est nommé une fois, puis réutilisé',
  );
  const qr = src.slice(src.indexOf('<QRCode'), src.indexOf('<QRCode') + 200);
  assert(qr.includes('value={link}'), 'le QR encode le lien nommé, pas une seconde construction');
  // Partager ET copier consomment le MÊME `link`.
  assert(
    /copyInviteLink\(link\)/.test(src) && /shareInviteLink\(link\)/.test(src),
    'partager et copier doivent envoyer exactement ce que le QR encode',
  );
});

Deno.test('la phrase sous le lien dit ce qui se passe SANS l’app', async () => {
  // Commentaires retirés : l'entête du fichier CITE l'ancienne phrase pour dire
  // pourquoi elle était fausse — la citer n'est pas la rendre.
  const src = (await Deno.readTextFile(SCREEN)).replace(/\/\*[\s\S]*?\*\//g, '');
  assert(
    !src.includes('ouvrent la même invitation'),
    'l’ancienne affirmation valait pour un lien https qui n’ouvrait rien',
  );
  assert(
    /si l’app est installée/.test(src) && /if the app is installed/.test(src),
    'la phrase doit poser la condition — c’est elle qui rend le lien honnête',
  );
});

Deno.test('app.json ne déclare toujours AUCUN domaine universel (décision fondateur)', async () => {
  const raw = JSON.parse(await Deno.readTextFile(APP_JSON)) as Record<string, unknown>;
  const expo = raw.expo as Record<string, unknown>;
  const ios = (expo.ios ?? {}) as Record<string, unknown>;
  const android = (expo.android ?? {}) as Record<string, unknown>;
  assertEquals(ios.associatedDomains, undefined, 'déclarer applinks est une décision d’infra, pas un correctif de code');
  assertEquals(android.intentFilters, undefined, 'idem côté Android (`assetlinks.json` requis)');
  // Le scheme, lui, NOUS appartient et fonctionne aujourd'hui.
  assertEquals(expo.scheme, 'gryd');
  // Le gabarit reste versionné, prêt à coller le jour de la décision.
  assert('_universal_links_o10' in raw, 'le gabarit O10 ne doit pas disparaître');
});

Deno.test('apps/web ne sert toujours pas /c/[code] — c’est LA raison du 404', async () => {
  const noms: string[] = [];
  for await (const entry of Deno.readDir(WEB_APP_DIR)) noms.push(entry.name);
  assert(noms.length > 0, 'chemin de apps/web faux : le test ne vérifierait rien');
  assertEquals(
    noms.includes('c'),
    false,
    'une route /c/[code] est apparue : le lien https redevient légitime — ' +
      'rebrancher `buildInviteLink`, et déclarer le domaine dans app.json.',
  );
});
