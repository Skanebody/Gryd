/**
 * GRYD — LES SEPT DERNIÈRES PORTES DE COMPTE (lot 10, 10/09/2026).
 *
 * ─── ÉTAPE 0 : LE DÉFAUT AVAIT SURVÉCU DANS UNE AUTRE FAMILLE ───────────────
 * Le lot 9 a réuni treize portes dans `AccountDoor2026`, mais toutes vivaient
 * dans la même famille de primitives (`ProfilePrimitives`, échelle
 * `refonteColors`). Sept portes peignaient encore la leur dans l'AUTRE famille
 * (`ui/Button` + `Card` + `StackScreen`, échelle `colors.*`), et chacune
 * répétait le mot qui ne s'adresse qu'à quelqu'un qui a DÉJÀ un compte :
 *
 *   app/defis.tsx:152            label={t(C.signIn)}              « Se connecter »
 *   app/activite.tsx:255         label: t(C.signInCta)            « Se connecter »
 *   app/challenges/index.tsx:184 label={t(C.todaySignIn)}         « Se connecter »
 *   app/c/[code].tsx:321         label={t(C.rlSignIn)}            « Se connecter »
 *   app/crew-create.tsx:185      label={t(C.createSignIn)}        « Créer mon compte »
 *   app/confidentialite.tsx:547  label={t(C.identitySignInLabel)} « Se connecter »
 *   app/confidentialite.tsx:876  label={t(C.identitySignInLabel)} « Se connecter »
 *
 * Six des sept étaient EN PLUS gardées par `{configured ? <Bouton/> : null}` :
 * sur un build sans adresse Supabase, la porte disparaissait sans un mot. C'est
 * le repli muet que la constitution interdit (L8, L14, L19).
 *
 * `crew-create` mérite sa ligne : son bouton disait déjà « Créer mon compte »
 * (commit f4996f3), mais la phrase au-dessus disait « Connecte-toi pour créer
 * ton crew » et la porte restait LOCALE. Un libellé juste dans une porte
 * dupliquée finit toujours par diverger de l'original.
 *
 * ─── CE QUE CES TESTS PROUVENT, ET CE QU'ILS NE PEUVENT PAS ─────────────────
 * Ils lisent la SOURCE et les CATALOGUES. Aucun React ne tourne sous Deno : ni
 * rendu, ni pixel, ni contraste. Ils prouvent qu'il n'existe toujours qu'UN
 * composant de porte, qu'il sait rendre les DEUX familles de primitives sans
 * recopier un seul mot, que les sept écrans l'appellent, et qu'aucun d'eux n'a
 * gardé son libellé d'avant.
 *
 * `accountDoorShared2026.test.ts` (lot 9) tient les treize premiers écrans et
 * la grammaire du composant. Ce fichier-ci ne les rejoue pas : il tient la
 * SECONDE famille, celle que le lot 9 n'avait pas de raison de regarder.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../../i18n/types.ts';
import type { Entry } from '../../i18n/types.ts';
import { C as ACTIVITE } from '../../i18n/catalog/activite.ts';
import { C as CREW } from '../../i18n/catalog/crew.ts';
import { C as MOTIVATION } from '../../i18n/catalog/motivation.ts';
import { C as REGLAGES } from '../../i18n/catalog/reglages.ts';
import { C as SOCIAL } from '../../i18n/catalog/social.ts';

const PORTE = new URL('./AccountDoor2026.tsx', import.meta.url);

/** Le code hors commentaires : citer un défaut dans une prose ne le recrée pas. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('{/*') && !l.trim().startsWith('*'))
    .join('\n');
}

function lire(url: URL): string {
  const brut = Deno.readTextFileSync(url);
  // Un chemin faux rendrait toutes les règles vertes sans rien vérifier.
  assert(brut.length > 400, `source introuvable ou vide : ${url.pathname}`);
  return codeSeul(brut);
}

/**
 * Les sept écrans du lot 10, avec le libellé EXACT qu'ils peignaient avant et
 * le nombre de portes que l'écran doit rendre (`confidentialite` en a DEUX :
 * l'audience et le RGPD, deux sections qu'on ne voit jamais ensemble).
 */
const ECRANS: readonly { chemin: string; avant: string; portes: number }[] = [
  { chemin: '../../../app/defis.tsx', avant: 't(C.signIn)', portes: 1 },
  { chemin: '../../../app/activite.tsx', avant: 't(C.signInCta)', portes: 1 },
  { chemin: '../../../app/challenges/index.tsx', avant: 't(C.todaySignIn)', portes: 1 },
  { chemin: '../../../app/c/[code].tsx', avant: 't(C.rlSignIn)', portes: 1 },
  { chemin: '../../../app/crew-create.tsx', avant: 't(C.createSignIn)', portes: 1 },
  { chemin: '../../../app/confidentialite.tsx', avant: 't(C.identitySignInLabel)', portes: 2 },
] as const;

/**
 * LES TROIS FAUTES QU'UNE PORTE CONVERTIE PEUT REPRENDRE. Fonction PURE pour
 * qu'une mutation puisse la rejouer sur une copie du source (test ⑤) : une
 * règle qu'on ne sait pas faire échouer ne prouve rien.
 */
function fautesDePorte(source: string, avant: string): readonly string[] {
  const fautes: string[] = [];
  if (source.includes("router.push('/sign-in')")) fautes.push('porte locale vers /sign-in');
  if (source.includes(avant)) fautes.push(`libellé d’avant : ${avant}`);
  // La porte NE DOIT PAS être gardée par `configured` : sans backend elle dit
  // qu'elle est fermée, elle ne s'efface pas (c'est tout l'objet du lot 9).
  if (/configured\s*(\?|&&)\s*\(?\s*<AccountDoor2026/.test(source)) {
    fautes.push('porte gardée par `configured` : elle redisparaît sans backend');
  }
  return fautes;
}

// ─── §1 · UN composant, DEUX familles de primitives, ZÉRO texte recopié ─────

Deno.test('la porte partagée sait rendre la famille `ui` (Button + Card)', () => {
  const src = lire(PORTE);
  assert(/family\??:/.test(src), 'la porte n’a pas de réglage de famille de primitives');
  assert(
    /import \{ Button \} from '[^']*ui\/Button'/.test(src),
    'la famille `ui` ne rend pas le Button unique du dépôt',
  );
  assert(
    /import \{ Card \} from '[^']*ui\/Card'/.test(src),
    'la famille `ui` ne rend pas la surface N1 partagée (Card)',
  );
  // L'autre famille reste servie : on AJOUTE un rendu, on n'en remplace pas un.
  assert(src.includes('ProfileButton'), 'la famille `profile` a disparu du composant');
});

Deno.test('les trois mots de la porte ne sont écrits QU’UNE FOIS', () => {
  const src = lire(PORTE);
  // Deux rendus qui recopient les mêmes `t(…)` sont deux portes qui
  // divergeront : c'est exactement le défaut que le lot 9 a payé treize fois.
  for (const mot of ['t(C.methodsTitle)', 't(C.doorCta)', 't(C.doorOrSignIn)']) {
    assertEquals(
      src.split(mot).length - 1,
      1,
      `${mot} est rendu ${src.split(mot).length - 1} fois : les deux familles recopient le texte`,
    );
  }
});

Deno.test('aucune des deux familles ne peut rendre `null`', () => {
  const src = lire(PORTE);
  assert(!/return\s+null/.test(src), 'la porte peut rendre `null` : le repli muet est revenu');
  assert(
    !/configured\s*\?[^]*?:\s*null/.test(src),
    'la porte est redevenue muette sans backend : `configured ? … : null`',
  );
});

// ─── §2 · Les sept portes passent par le composant partagé ──────────────────

for (const { chemin, avant, portes } of ECRANS) {
  const nom = chemin.split('/').pop()!;
  const ou = portes > 1 ? `${nom} (×${portes})` : nom;

  Deno.test(`${ou} : la porte de compte est le composant partagé`, () => {
    const src = lire(new URL(chemin, import.meta.url));
    assert(
      /import \{ AccountDoor2026 \} from '[^']*AccountDoor2026'/.test(src),
      `${nom} n’importe pas AccountDoor2026 : il a gardé sa porte à lui`,
    );
    assertEquals(
      src.split('<AccountDoor2026').length - 1,
      portes,
      `${nom} ne rend pas ses ${portes} porte(s) de compte`,
    );
    // La famille `ui` : sans elle, la porte peindrait ses textes de l'échelle
    // claire sur le carbone de ces écrans — le mot serait là, illisible.
    assert(
      /<AccountDoor2026[^>]*family="ui"/.test(src),
      `${nom} rend la porte dans la mauvaise famille de primitives`,
    );
    // La RAISON est locale : « tes défis » n'est pas « ton export RGPD ».
    assert(
      /<AccountDoor2026[^>]*reason=/.test(src),
      `${nom} rend une porte sans dire ce que le compte débloque ICI`,
    );
  });

  Deno.test(`${ou} : plus aucune porte locale, plus aucun libellé d’avant`, () => {
    const src = lire(new URL(chemin, import.meta.url));
    assertEquals(
      fautesDePorte(src, avant),
      [],
      `${nom} a repris une faute de porte`,
    );
  });
}

// ─── §3 · Les raisons rendues par la porte ne parlent plus qu'aux revenants ──

/**
 * Ce que chaque porte dit AU-DESSUS du bouton. Ces phrases-là restent locales
 * (le compte ne débloque pas la même chose partout), mais aucune ne peut plus
 * commencer par un impératif qui suppose un compte existant.
 */
const RAISONS: readonly { cle: string; entry: Entry }[] = [
  { cle: 'social.signedOutBody', entry: SOCIAL.signedOutBody },
  { cle: 'activite.signedOutBody', entry: ACTIVITE.signedOutBody },
  { cle: 'motivation.challengesEmptySignedOutBody', entry: MOTIVATION.challengesEmptySignedOutBody },
  { cle: 'crew.cInviteSignedOutBody', entry: CREW.cInviteSignedOutBody },
  { cle: 'crew.rlSignedOutBody', entry: CREW.rlSignedOutBody },
  { cle: 'crew.createSignedOut', entry: CREW.createSignedOut },
  { cle: 'reglages.audienceSignedOutBody', entry: REGLAGES.audienceSignedOutBody },
  { cle: 'reglages.rgpdSignedOutBody', entry: REGLAGES.rgpdSignedOutBody },
];

Deno.test('aucune raison n’ordonne « Connecte-toi » à qui n’a pas de compte', () => {
  for (const { cle, entry } of RAISONS) {
    // ÉTAPE 0, mot pour mot : « Connecte-toi pour la suivre ici. »,
    // « Connecte-toi pour suivre ta progression… », « Connecte-toi pour créer
    // ton crew. » — trois phrases qui excluent le joueur qu'on veut inscrire.
    assert(
      !/connecte-toi pour/i.test(entry.fr),
      `${cle}.fr ordonne une connexion à qui n’a pas de compte : « ${entry.fr} »`,
    );
    assert(
      !/\bsign in to\b/i.test(entry.en),
      `${cle}.en ordonne une connexion à qui n’a pas de compte : « ${entry.en} »`,
    );
  }
});

Deno.test('les huit raisons existent dans les cinq langues, sans tiret long en français', () => {
  for (const { cle, entry } of RAISONS) {
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `${cle}.${locale} est vide`);
    }
    assert(!/[—–]/.test(entry.fr), `${cle}.fr contient un tiret long : « ${entry.fr} »`);
  }
});

// ─── §4 · Ce que la conversion ne doit PAS emporter avec elle ───────────────

Deno.test('la session EXPIRÉE garde « Se connecter » : ce joueur A un compte', () => {
  // `crew-public` et `crew-discovery` partagent `rlSignIn` avec `c/[code]`.
  // Leur joueur a déjà un compte (sa session vient d'expirer) : leur proposer
  // d'en CRÉER un serait le second mensonge, symétrique du premier.
  for (const locale of LOCALES) assert(CREW.rlSignIn[locale].trim().length > 0);
  assert(
    !/cr[ée]e/i.test(CREW.rlSignIn.fr),
    `« ${CREW.rlSignIn.fr} » : la porte de session expirée s’est mise à créer des comptes`,
  );
  for (const ecran of ['../../../app/crew-public.tsx', '../../../app/crew-discovery.tsx']) {
    const src = lire(new URL(ecran, import.meta.url));
    assert(
      src.includes("router.push('/sign-in')"),
      `${ecran.split('/').pop()} : la porte de session expirée a disparu`,
    );
  }
});

Deno.test('la porte de c/[code] garde la promesse qui la distingue', () => {
  const src = lire(new URL('../../../app/c/[code].tsx', import.meta.url));
  // Sans backend, « on garde ton invitation, dès que ton compte existe tu
  // entres dans le crew » serait une promesse invérifiable : l'écran choisit
  // déjà l'autre raison. La conversion ne doit pas aplatir cette distinction.
  assert(
    src.includes('C.cInviteSignedOutBody') && src.includes('C.rlSignedOutBody'),
    'l’invitation ne distingue plus « on la garde » de « il n’y a pas de serveur »',
  );
  assert(src.includes('<CodePlate'), 'le code de l’invitation a disparu de l’état sans compte');
});

// ─── §5 · MUTATION — la règle attrape bien la régression qu'elle vise ───────

Deno.test('MUTATION : une porte locale restaurée sur /defis fait rougir la règle', () => {
  const chemin = '../../../app/defis.tsx';
  const src = lire(new URL(chemin, import.meta.url));
  assertEquals(fautesDePorte(src, 't(C.signIn)'), []);
  // On rejoue le défaut du 10/09, mot pour mot, sur une COPIE en mémoire.
  const avant = `${src}
      {configured ? (
        <View style={styles.stateAction}>
          <Button variant="ghost" size="md" label={t(C.signIn)}
            onPress={() => router.push('/sign-in')} analyticsId="defis_sign_in" />
        </View>
      ) : null}
`;
  assertEquals(fautesDePorte(avant, 't(C.signIn)'), [
    'porte locale vers /sign-in',
    'libellé d’avant : t(C.signIn)',
  ]);
});

Deno.test('MUTATION : une porte gardée par `configured` fait rougir la règle', () => {
  const chemin = '../../../app/activite.tsx';
  const src = lire(new URL(chemin, import.meta.url));
  assertEquals(fautesDePorte(src, 't(C.signInCta)'), []);
  // La régression la plus discrète : la porte partagée est bien là, mais elle
  // s'efface sur un build sans serveur — l'écran redevient muet.
  const garde = src.replace(
    '<AccountDoor2026',
    'configured ? (\n        <AccountDoor2026',
  );
  assertEquals(fautesDePorte(garde, 't(C.signInCta)'), [
    'porte gardée par `configured` : elle redisparaît sans backend',
  ]);
});
