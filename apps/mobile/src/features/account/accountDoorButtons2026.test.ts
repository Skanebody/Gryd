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
 *
 * ─── ÉTAPE 0 DU LOT 11 : CINQ PORTES `ui` AVAIENT SURVÉCU (10/09/2026) ──────
 * Le lot 10 a nommé « les sept dernières » ; le grep qui ouvre le lot 11 en a
 * trouvé cinq de plus dans la MÊME famille, simplement écrites sous d'autres
 * primitives (une `StateCard` locale, une `ListRow`, un `EmptyState`) :
 *
 *   app/qr.tsx:166                  t(needsAccount ? C.signIn : …)  « Se connecter »
 *   app/historique.tsx:210          t(C.emptySignedOutCta)          « Se connecter »
 *   app/course/[id].tsx:584         t(C.emptySignedOutCta)          « Se connecter »
 *   app/parametres/[section].tsx:413 t(C.identitySignInLabel)       « Se connecter »
 *   app/parametres/[section].tsx:581 t(C.identitySignInLabel)       « Se connecter »
 *
 * Les quatre dernières s'effaçaient EN PLUS sans backend (`configured ? {cta}
 * : {}`, `configured ? <ListRow/> : <note/>`) ; `qr.tsx`, lui, basculait sur
 * un second bouton (« Choisir mon @handle ») qui ne mène qu'à `/profil-edit`,
 * lequel ouvre… la même porte de compte. Un détour, pas une action.
 *
 * `qr.tsx` a aussi imposé d'ÉLARGIR `fautesDePorte` : sa porte locale poussait
 * `router.push(needsAccount ? '/sign-in' : '/profil-edit')`, une forme que la
 * règle du lot 10 (littéral `router.push('/sign-in')`) ne voyait PAS. Une règle
 * aveugle à la moitié des formes n'est pas une règle — cf. la mutation §5.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../../i18n/types.ts';
import type { Entry } from '../../i18n/types.ts';
import { C as ACTIVITE } from '../../i18n/catalog/activite.ts';
import { C as CREW } from '../../i18n/catalog/crew.ts';
import { C as HISTORIQUE } from '../../i18n/catalog/historique.ts';
import { C as MOTIVATION } from '../../i18n/catalog/motivation.ts';
import { C as QR } from '../../i18n/catalog/qr.ts';
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
 * LOT 11 — les cinq portes `ui` que le lot 10 n'avait pas vues, avec le libellé
 * EXACT qu'elles peignaient avant. `qr.tsx` cite `C.signIn` et non
 * `t(C.signIn)` : son libellé vivait dans un ternaire
 * (`t(needsAccount ? C.signIn : C.stateNoHandleCta)`), et exiger la forme
 * appelée aurait rendu la règle verte sans rien lire.
 *
 * `parametres/[section].tsx` porte DEUX portes, à 170 lignes l'une de l'autre
 * et dans deux sous-pages qu'un slug sépare (`compte`, `notifications`) : on
 * ne les voit jamais ensemble, la loi L2 ne voit donc pas deux CTA concurrents.
 */
const ECRANS_LOT_11: readonly { chemin: string; avant: string; portes: number }[] = [
  { chemin: '../../../app/qr.tsx', avant: 'C.signIn', portes: 1 },
  { chemin: '../../../app/historique.tsx', avant: 't(C.emptySignedOutCta)', portes: 1 },
  { chemin: '../../../app/course/[id].tsx', avant: 't(C.emptySignedOutCta)', portes: 1 },
  { chemin: '../../../app/parametres/[section].tsx', avant: 't(C.identitySignInLabel)', portes: 2 },
] as const;

/**
 * LES TROIS FAUTES QU'UNE PORTE CONVERTIE PEUT REPRENDRE. Fonction PURE pour
 * qu'une mutation puisse la rejouer sur une copie du source (test ⑤) : une
 * règle qu'on ne sait pas faire échouer ne prouve rien.
 */
function fautesDePorte(source: string, avant: string): readonly string[] {
  const fautes: string[] = [];
  // LOT 11 — la forme, pas le littéral. `qr.tsx` poussait la connexion depuis
  // un ternaire (`router.push(needsAccount ? '/sign-in' : '/profil-edit')`) :
  // la règle du lot 10 cherchait `router.push('/sign-in')` mot pour mot et
  // passait donc à côté. Le message ne change pas : c'est la même faute.
  if (/router\.(?:push|replace|navigate)\([^)\n]*\/sign-in/.test(source)) {
    fautes.push('porte locale vers /sign-in');
  }
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

// ─── §2 · Les douze portes `ui` passent par le composant partagé ────────────
// Sept du lot 10, cinq du lot 11 : MÊMES règles, une seule liste parcourue.
// Deux boucles jumelles auraient fini par diverger — le défaut même que ces
// fichiers corrigent.

for (const { chemin, avant, portes } of [...ECRANS, ...ECRANS_LOT_11]) {
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
  // ── LOT 11 · les six raisons des cinq portes retrouvées ──────────────────
  // ÉTAPE 0, mot pour mot : « Connecte-toi pour en avoir un. » (qr),
  // « Connecte-toi pour les retrouver ici. » (historique, ×2),
  // « connecte-toi pour l'ouvrir. » (détail d'une sortie). Trois phrases qui
  // supposent le compte qu'elles sont censées faire naître.
  { cle: 'qr.stateSignedOutBody', entry: QR.stateSignedOutBody },
  { cle: 'historique.emptySignedOut', entry: HISTORIQUE.emptySignedOut },
  { cle: 'historique.emptySignedOutBike', entry: HISTORIQUE.emptySignedOutBike },
  { cle: 'historique.detailSignedOutBody', entry: HISTORIQUE.detailSignedOutBody },
  { cle: 'reglages.identitySignInDetail', entry: REGLAGES.identitySignInDetail },
  { cle: 'reglages.notifSignedOutBody', entry: REGLAGES.notifSignedOutBody },
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

Deno.test('les quatorze raisons existent dans les cinq langues, sans tiret long en français', () => {
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

Deno.test('MUTATION : la porte locale de /qr, TERNAIRE, fait rougir la règle', () => {
  // LA RÉGRESSION QUE LE LOT 10 N'AURAIT PAS VUE. `qr.tsx` n'écrivait pas
  // `router.push('/sign-in')` : il choisissait sa destination dans un ternaire.
  // Avec l'ancienne règle (littéral), cette mutation serait restée VERTE — la
  // porte locale rouverte, le test satisfait. C'est le mode d'échec le plus
  // dangereux d'un test qui lit du source : la forme qu'il ne connaît pas.
  const chemin = '../../../app/qr.tsx';
  const src = lire(new URL(chemin, import.meta.url));
  assertEquals(fautesDePorte(src, 'C.signIn'), []);
  // On rejoue le défaut du 10/09, mot pour mot, sur une COPIE en mémoire.
  const avant = `${src}
          <View style={styles.stateCta}>
            <Button
              label={t(needsAccount ? C.signIn : C.stateNoHandleCta)}
              analyticsId={needsAccount ? 'qr_sign_in' : 'qr_pick_handle'}
              onPress={() => router.push(needsAccount ? '/sign-in' : '/profil-edit')}
            />
          </View>
`;
  assertEquals(fautesDePorte(avant, 'C.signIn'), [
    'porte locale vers /sign-in',
    'libellé d’avant : C.signIn',
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

// ─── §6 · LOT 11 — ce que la conversion DOIT emporter avec elle ─────────────

Deno.test('/historique et /course/[id] n’ont plus DEUX voix pour « sans serveur »', () => {
  // ÉTAPE 0 : ces deux écrans peignaient eux-mêmes l'état sans backend
  // (`configured ? {cta} : {}` + un titre et un corps à eux). La porte partagée
  // le dit désormais, une fois, avec les mots de `/sign-in`. Garder l'ancien
  // texte À CÔTÉ d'elle donnerait deux formulations du même fait sur le même
  // écran — exactement la divergence que le lot 9 a payée treize fois.
  const historique = lire(new URL('../../../app/historique.tsx', import.meta.url));
  for (const mort of ['noBackendTitle', 'noBackendBody']) {
    assert(
      !historique.includes(mort),
      `/historique repeint « ${mort} » : la porte dit déjà que le serveur manque`,
    );
  }
  const detail = lire(new URL('../../../app/course/[id].tsx', import.meta.url));
  for (const mort of ['detailNoBackendTitle', 'noBackendBody']) {
    assert(
      !detail.includes(mort),
      `/course/[id] repeint « ${mort} » : la porte dit déjà que le serveur manque`,
    );
  }
});

Deno.test('/qr ne renvoie plus vers /profil-edit pour « avoir un @handle »', () => {
  // ÉTAPE 0 : sans backend, `/qr` remplaçait sa porte par « Choisir mon
  // @handle » vers `/profil-edit`. Or `/profil-edit` refuse toute saisie sans
  // session (`profileStore.save` lève `authentication_required`) et rend, lui
  // aussi, la porte de compte du lot 9. Le bouton menait donc à la MÊME porte,
  // un écran plus loin : un détour, pas une seconde action.
  const src = lire(new URL('../../../app/qr.tsx', import.meta.url));
  assert(
    !src.includes("'/profil-edit'"),
    '/qr propose à nouveau le détour par /profil-edit à qui n’a pas de compte',
  );
  assert(
    !src.includes('C.stateNoHandleCta'),
    '/qr repeint « Choisir mon @handle » : ce geste n’existe pas sans compte',
  );
});
