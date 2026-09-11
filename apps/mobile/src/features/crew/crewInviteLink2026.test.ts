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
 *   2. `app.json` ne déclarait NI `ios.associatedDomains` NI un
 *      `android.intentFilters` sur un domaine, donc aucun OS n'interceptait ce
 *      lien. ⚠️ CE FAIT-LÀ EST MORT LE 12/09/2026 : le domaine est acheté,
 *      `apps/web` publie son `apple-app-site-association`, et app.json le
 *      déclare. Le test correspondant a donc changé de sens, comme annoncé ;
 *   3. `apps/web` n'a aucune route `/c/[code]`.
 *   ⇒ le lien ouvrait une 404 dans Safari. Et l'écran affirmait dessous : « Le
 *      QR et ce lien ouvrent la même invitation. » Au moment le plus fragile du
 *      produit — celui où on amène quelqu'un — l'app envoyait dans un mur.
 *
 * CE QUI RESTE VRAI, ET QUI SUFFIT À GARDER `gryd://c/…` : le fait n°3. Un
 * lien universel n'ouvre l'app que si elle est INSTALLÉE ; sinon le navigateur
 * demande la page, et il n'y en a pas. Le jour où `apps/web` en sert une, le
 * dernier test de ce fichier échouera et dira quoi rebrancher. C'est le but.
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

/**
 * ⚠️ CE TEST A CHANGÉ DE SENS LE 12/09/2026, ET C'ÉTAIT ÉCRIT D'AVANCE.
 *
 * Il gardait l'ABSENCE de domaine universel : « le jour où le domaine existe,
 * ce fichier échouera et dira quoi rebrancher. C'est le but. » Le domaine
 * existe (`gryd.run` acheté et servi, `apps/web` publie
 * `/.well-known/apple-app-site-association`), `app.json` le déclare, et ce
 * test est donc passé rouge exactement comme prévu.
 *
 * CE QU'IL GARDE MAINTENANT : que la déclaration soit COMPLÈTE. Un
 * `associatedDomains` sur `gryd.run` fait remettre `/c/*` à l'app par iOS — le
 * lien https redevient donc légitime POUR QUI A L'APP. Il ne l'est toujours pas
 * pour les autres tant qu'`apps/web` ne sert pas `/c/[code]` : c'est la seule
 * raison pour laquelle l'écran d'invitation continue de partager `gryd://c/…`.
 * Les deux conditions sont vérifiées séparément, ci-dessus et ci-dessous.
 */
Deno.test('app.json déclare le domaine universel, et le scheme reste le repli', async () => {
  const raw = JSON.parse(await Deno.readTextFile(APP_JSON)) as Record<string, unknown>;
  const expo = raw.expo as Record<string, unknown>;
  const ios = (expo.ios ?? {}) as Record<string, unknown>;
  assertEquals(ios.associatedDomains, ['applinks:gryd.run', 'webcredentials:gryd.run']);
  // Le scheme NOUS appartient et reste le chemin de repli : c'est lui que la
  // page web ouvre quand le lien universel n'est pas vérifié.
  assertEquals(expo.scheme, 'gryd');
  // Le gabarit O10 a été SUPPRIMÉ : il est appliqué, et un gabarit conservé à
  // côté de son application est la prochaine divergence.
  assertEquals('_universal_links_o10' in raw, false);
});

Deno.test('apps/web ne sert toujours pas /c/[code] — c’est LA raison du repli', async () => {
  const noms: string[] = [];
  for await (const entry of Deno.readDir(WEB_APP_DIR)) noms.push(entry.name);
  assert(noms.length > 0, 'chemin de apps/web faux : le test ne vérifierait rien');
  assertEquals(
    noms.includes('c'),
    false,
    'une route /c/[code] est apparue, et le domaine est déjà déclaré : le lien ' +
      'https devient légitime pour TOUT LE MONDE — rebrancher `buildInviteLink`.',
  );
});
