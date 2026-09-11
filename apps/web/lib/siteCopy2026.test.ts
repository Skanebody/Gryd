/**
 * GRYD — LE VERROU DE LA COPIE DE TOUT LE SITE (lot W3).
 *
 * ÉTAPE 0, LE DÉFAUT QU'ON MESURE : avant ce lot, UNE page (l'accueil) était
 * relue par un test, et les huit autres n'existaient pas encore. Le site en
 * ligne le 12/09/2026, lui, vendait « GRYD Club », un « Founder Pack à vie »,
 * une « monnaie de style » et un seuil de 500 inscrits par quartier ; il
 * écrivait « GRYD » en capitales dans des phrases courtes, et des tirets longs
 * partout. Ce fichier étend à TOUTES les pages les règles que
 * `homeCopy2026.test.ts` tenait sur une seule, et y ajoute ce qui ne se vérifie
 * que sur l'ensemble : les plafonds de référencement, le plan du site, les
 * ancres du guide et les treize questions.
 *
 * ⚠ POURQUOI AUCUN IMPORT EXTERNE ET UN `Deno` DÉCLARÉ LOCALEMENT — même
 * arbitrage que `homeCopy2026.test.ts` : ce fichier est lu par DEUX outils aux
 * attentes opposées. Deno l'exécute (`npm run test:web`), et `tsc --noEmit` le
 * typecheck (il tombe sous `include: ["**\/*.ts"]` d'`apps/web/tsconfig.json`,
 * donc aussi pendant `next build`). Un spécificateur `https://deno.land/std…`
 * fait échouer `tsc`. Une déclaration de portée module satisfait les deux.
 *
 * Les trois lectures de fichier (`Deno.readTextFileSync`) ne sont PAS un effet
 * de bord : ce sont les seules façons de prouver qu'une valeur écrite ici est
 * encore celle de l'application (`HELP_CHAPTER_IDS`), du fichier Apple
 * (`apple-app-site-association`) et du plan publié (`sitemap.xml`). Trois
 * duplications assumées, trois verrous qui les tiennent.
 */
import { MIN_AGE_YEARS, SHARE_TRIM_M, TERRITORY_RULES_2026 } from '@klaim/shared';
import { DEEP_LINK_PAGES, NOT_FOUND_COPY, appDeepLink } from './deepLinkCopy2026.ts';
import { factValues } from './facts2026.ts';
import { FAQ_COPY, faqEntries } from './faqCopy2026.ts';
import { GUIDE_COPY, guideChapterIds } from './guideCopy2026.ts';
import { OFFER_COPY } from './offerCopy2026.ts';
import { PRIVACY_COPY } from './privacyCopy2026.ts';
import {
  EXCLUDED_FROM_SITEMAP,
  LEGAL_PATHS,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  SITE_PAGES,
  copyStrings,
} from './siteCopy2026.ts';
import {
  SEASON_ZERO_END_ISO,
  SEASON_ZERO_END_LABEL,
  SEASON_ZERO_NAME,
  SEASON_ZERO_START_ISO,
  SEASON_ZERO_START_LABEL,
} from './season2026.ts';
import { FOOTER_PRODUCT, PRIMARY_NAV, SITE_ORIGIN } from './site2026.ts';

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(path: string | URL): string;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message?: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message ?? 'valeurs différentes'} — attendu ${String(expected)}, reçu ${String(actual)}`);
  }
}

/** Toute la prose du site : les huit pages du plan, plus les pages d'arrivée. */
function everyString(): string[] {
  return [
    ...SITE_PAGES.flatMap((page) => copyStrings(page.copy)),
    ...copyStrings(DEEP_LINK_PAGES),
    ...copyStrings(NOT_FOUND_COPY),
  ];
}

/** La prose seule : ni adresse, ni ancre, ni schéma d'application. */
function proseStrings(): string[] {
  return everyString().filter(
    (value) => !value.startsWith('/') && !value.startsWith('#') && !value.includes('://'),
  );
}

Deno.test('aucune page du site ne contient de tiret long', () => {
  // Cahier §4.1 : « Aucun tiret long. Ni — ni –. Une virgule, un deux-points ou
  // un point font le travail. » Le même verrou existe côté application
  // (`apps/mobile/src/i18n/noDashFr2026.test.ts`).
  for (const value of everyString()) {
    for (const dash of ['—', '–', '‒', '―']) {
      assert(!value.includes(dash), `tiret long ${JSON.stringify(dash)} dans : ${JSON.stringify(value)}`);
    }
  }
});

Deno.test('« GRYD » en capitales n existe que dans le nom de l offre', () => {
  // Cahier §4.2 : les capitales appartiennent au LOGO DESSINÉ et aux
  // IDENTIFIANTS. Dans la prose, la marque s'écrit « Gryd ». Seule exception :
  // le nom exact de l'offre, `GRYD+`, dont les CGV corrigées le 11/09 dépendent.
  for (const value of everyString()) {
    let at = value.indexOf('GRYD');
    while (at !== -1) {
      assert(
        value.slice(at + 4, at + 5) === '+',
        `« GRYD » en capitales hors du nom de l offre dans : ${JSON.stringify(value)}`,
      );
      at = value.indexOf('GRYD', at + 1);
    }
  }
  assert(
    proseStrings().some((value) => value.includes('Gryd')),
    'aucune page ne nomme Gryd : le test précédent ne prouverait rien',
  );
});

Deno.test('aucun mot de l ancien site ne survit nulle part', () => {
  // Cahier §4.4, « Mots bannis, hérités de l'ancien site ». Chacun a été affiché
  // en ligne ; chacun décrit une mécanique qui n'existe pas.
  const bannis = [
    'War Room', 'Warroom', 'Arsenal', 'GRYD Club', 'Gryd Club', 'Founder Pack',
    'monnaie de style', 'quartier débloqué', 'pass de saison', 'battle pass',
    'season pass', 'bouclier de', 'gel de série', 'hexagone', 'runners', 'raid',
  ];
  for (const value of proseStrings()) {
    const bas = value.toLowerCase();
    for (const mot of bannis) {
      assert(!bas.includes(mot.toLowerCase()), `mot banni « ${mot} » dans : ${JSON.stringify(value)}`);
    }
  }
});

Deno.test('le site tutoie, il ne vouvoie jamais', () => {
  // Cahier §4.1 : « Tutoiement, toujours. »
  //
  // UNE exception, et elle est écrite dans le cahier §3.9 : sur la page de
  // parrainage, « vous recevez tous les deux les objets du Relais, toi et la
  // personne qui t'a invité » emploie un « vous » PLURIEL qui désigne deux
  // personnes nommées dans la phrase. Ce n'est pas un vouvoiement, et le
  // remplacer casserait le sens. Elle est listée ici pour qu'elle reste
  // délibérée : toute AUTRE occurrence fait tomber le test.
  //
  // Le `(?<!-)` n'est pas une coquetterie : sans lui, « un rendez-vous de crew »
  // serait compté comme un vouvoiement, et la seule façon de faire passer le
  // test serait de retirer le mot juste du cahier.
  const pluriel = DEEP_LINK_PAGES.referral.body;
  assert(pluriel.includes('vous recevez tous les deux'), 'l exception de tutoiement ne décrit plus la phrase du Relais');
  for (const value of proseStrings()) {
    if (value === pluriel) continue;
    assert(!/(?<!-)\b(vous|votre|vos)\b/i.test(value), `vouvoiement dans : ${JSON.stringify(value)}`);
  }
});

Deno.test('aucun chiffre de jeu n est tapé à la main', () => {
  // Cahier §4.3 : « Aucun chiffre de jeu ne se tape à la main. Chaque valeur
  // vient de `packages/shared/src/game-rules.ts` et doit être importée. » La
  // règle a une histoire : le site a un jour affiché un Founder Pack à 149 €
  // contre 9,99 € dans la source, un facteur 15 entre le lien public et la
  // vérité.
  //
  // Comment ce test procède : il extrait CHAQUE suite de chiffres de CHAQUE
  // phrase du site, et exige qu'elle vienne d'une valeur dérivée des constantes
  // (`facts2026.ts`) ou d'une des trois exceptions ci-dessous, qui ne sont pas
  // des règles de jeu et n'existent dans aucune constante partagée.
  const autorises = new Set<string>();
  const collect = (source: string): void => {
    for (const digits of source.match(/\d+/g) ?? []) autorises.add(digits);
  };
  for (const value of factValues()) collect(value);

  // Exception 1 — LES DATES DE LA SAISON 0, données d'exploitation, miroir de
  // `season_collections_2026` (voir `season2026.ts`).
  for (const value of [SEASON_ZERO_START_LABEL, SEASON_ZERO_END_LABEL, SEASON_ZERO_NAME]) collect(value);
  // Exception 2 — LES NUMÉROS DE CHAPITRE du guide, « 01 » à « 07 » : une
  // position dans une liste, pas une mesure.
  for (const chapter of GUIDE_COPY.chapters) collect(chapter.index);
  // Exception 3 — LA DATE DE L'ÉTAT RÉEL, « au 12 septembre 2026 », qui date le
  // constat « Gryd n'est pas encore sur l'App Store ». Elle n'annonce aucune
  // sortie : le cahier §4.5 interdit une date à venir, pas une date passée.
  collect('12 septembre 2026');

  for (const value of proseStrings()) {
    for (const digits of value.match(/\d+/g) ?? []) {
      assert(
        autorises.has(digits),
        `le nombre « ${digits} » est tapé à la main dans : ${JSON.stringify(value)}`,
      );
    }
  }
});

Deno.test('les chiffres affichés sont bien ceux des constantes', () => {
  // Le test précédent prouve qu'aucun nombre n'est ÉTRANGER aux constantes.
  // Celui-ci prouve que les valeurs clefs sont les BONNES : si une règle change
  // dans `game-rules.ts`, la page doit tomber avant d'aller la promettre.
  const boucle = GUIDE_COPY.chapters.find((chapter) => chapter.id === 'boucle');
  assert(boucle !== undefined, 'le chapitre « boucle » a disparu du guide');
  const ecart = boucle?.facts?.[0];
  assert(
    ecart?.value.includes(String(TERRITORY_RULES_2026.run.closureMaxGapM)) === true,
    'la tolérance de fermeture à pied ne vient plus de TERRITORY_RULES_2026',
  );
  assert(
    PRIVACY_COPY.hero.lead.includes(String(SHARE_TRIM_M)),
    'la coupe de partage ne vient plus de SHARE_TRIM_M',
  );
  assert(
    PRIVACY_COPY.sections.some((section) => section.body.includes(String(MIN_AGE_YEARS))),
    'l âge minimum ne vient plus de MIN_AGE_YEARS',
  );
  // Chaque chiffre affiché cite la constante dont il sort : une valeur sans
  // provenance est un nombre inventé qui attend son tour.
  const stats = [
    ...GUIDE_COPY.chapters.flatMap((chapter) => chapter.facts ?? []),
    ...PRIVACY_COPY.sections.flatMap((section) => section.facts ?? []),
    ...OFFER_COPY.never.facts,
  ];
  assert(stats.length > 0, 'aucun chiffre affiché : le test ne prouverait rien');
  for (const item of stats) {
    assert(item.rule.length > 0, `chiffre « ${item.value} » sans constante citée`);
    assert(item.value.length > 0, `constante ${item.rule} sans valeur affichée`);
    assert(item.label.length > 0, `constante ${item.rule} sans libellé`);
  }
});

Deno.test('chaque page porte un titre et une description dans les plafonds', () => {
  // Un titre trop long est TRONQUÉ par le moteur : la fin de la phrase n'est
  // alors jamais lue. Le cahier §3 compte chaque titre et chaque description au
  // caractère ; ce test vérifie qu'aucune ne dérive après lui.
  const vus = new Set<string>();
  for (const page of SITE_PAGES) {
    assert(page.path.endsWith('/'), `l adresse ${page.path} n a pas de slash final`);
    assert(page.seo.title.trim().length > 0, `${page.path} sans titre`);
    assert(page.seo.description.trim().length > 0, `${page.path} sans description`);
    assert(
      page.seo.title.length <= SEO_TITLE_MAX,
      `titre de ${page.path} trop long (${page.seo.title.length} > ${SEO_TITLE_MAX})`,
    );
    assert(
      page.seo.description.length <= SEO_DESCRIPTION_MAX,
      `description de ${page.path} trop longue (${page.seo.description.length} > ${SEO_DESCRIPTION_MAX})`,
    );
    assert(!vus.has(page.seo.title), `deux pages partagent le titre ${JSON.stringify(page.seo.title)}`);
    vus.add(page.seo.title);
  }
});

Deno.test('aucune page du plan n est orpheline', () => {
  // Cahier §2.3 : l'en-tête porte cinq liens, le pied les sept pages produit.
  // Une page absente des deux n'est liée de NULLE PART : elle existe sans que
  // personne ne puisse la trouver.
  const lies = new Set<string>([
    '/',
    ...PRIMARY_NAV.map((link) => link.href),
    ...FOOTER_PRODUCT.map((link) => link.href),
  ]);
  for (const page of SITE_PAGES) {
    assert(lies.has(page.path), `la page ${page.path} n est liée ni par l en-tête ni par le pied`);
  }
});

Deno.test('les ancres du guide sont celles de l application', () => {
  // Cahier §3.2 : « Les ancres reprennent les identifiants du guide de l'app
  // (`HELP_CHAPTER_IDS`), français PARCE QU'ILS SONT PUBLICS. » `apps/web` ne
  // peut pas importer `apps/mobile` : le test lit donc le fichier sur le disque.
  // Une adresse partagée depuis le guide de l'application doit tomber sur le bon
  // chapitre du site, et rien d'autre ne le garantit.
  const source = Deno.readTextFileSync(
    new URL('../../mobile/src/features/help/helpChapters2026.ts', import.meta.url),
  );
  const declaration = source.match(/export const HELP_CHAPTER_IDS = \[([^\]]+)\]/);
  assert(declaration !== null, 'HELP_CHAPTER_IDS introuvable dans le guide de l application');
  const identifiants = [...(declaration?.[1] ?? '').matchAll(/'([^']+)'/g)].map((found) => found[1]);
  // Le huitième identifiant de l'app (`faq`) n'est pas un chapitre du site : il
  // a une page entière, `/faq/`, vers laquelle le guide renvoie.
  assertEquals(
    guideChapterIds().join(','),
    identifiants.slice(0, guideChapterIds().length).join(','),
    'les ancres du guide du site ont dérivé de HELP_CHAPTER_IDS',
  );
  assertEquals(guideChapterIds().length, 7, 'le guide du site ne compte plus sept chapitres');
  assertEquals(GUIDE_COPY.faqCta.href, '/faq/', 'le guide ne renvoie plus vers la page des questions');
});

Deno.test('la FAQ compte treize questions, toutes répondues', () => {
  // Cahier §3.7 : cinq groupes, treize questions, reprises mot pour mot de
  // `helpFaq2026.ts`. Une réponse vide serait un accordéon qui s'ouvre sur rien,
  // donc un bouton mort au sens de la constitution.
  const entrees = faqEntries();
  assertEquals(entrees.length, 13, 'la FAQ ne compte plus treize questions');
  assertEquals(FAQ_COPY.groups.length, 5, 'la FAQ ne compte plus cinq groupes');
  const questions = new Set<string>();
  for (const entree of entrees) {
    assert(entree.question.trim().length > 0, 'une question vide');
    assert(entree.answer.trim().length > 0, `la question « ${entree.question} » n a pas de réponse`);
    assert(entree.question.endsWith('?'), `la question « ${entree.question} » n en est pas une`);
    assert(!questions.has(entree.question), `question en double : ${entree.question}`);
    questions.add(entree.question);
  }
});

Deno.test('la page de l offre ne vend rien', () => {
  // Cahier §3.5 : « Aucun bouton d'achat sur cette page. Ni « S'abonner », ni
  // « Choisir ce plan », ni formulaire. Un bouton qui ne peut rien faire est un
  // bouton mort. » Et le prix est annoncé PRÉVU avant d'être montré.
  for (const value of copyStrings(OFFER_COPY)) {
    const bas = value.toLowerCase();
    for (const interdit of ['s’abonner', "s'abonner", 'choisir ce plan', 'acheter', 'payer maintenant', 'apps.apple.com']) {
      assert(!bas.includes(interdit), `la page de l offre propose « ${interdit} » : ${JSON.stringify(value)}`);
    }
  }
  assert(OFFER_COPY.notice.title.includes('pas en vente'), 'l encart n annonce plus que rien n est en vente');
  assert(
    OFFER_COPY.notice.body.includes('prix prévu'),
    'l encart ne dit plus que le prix est prévu et non pratiqué',
  );
  assertEquals(OFFER_COPY.cta.href, '/comment-ca-marche/#points', 'le seul renvoi de la page a changé de cible');
});

Deno.test('aucune page ne promet une date, un compteur ou un absolu', () => {
  // Cahier §4.5 : aucune date non décidée, aucun nombre d'utilisateurs, aucune
  // garantie absolue, aucune ville nommée comme ouverte. La seule date écrite du
  // site est celle de la Saison 0, parce qu'elle est configurée en production.
  const interdits = [
    'bientôt', 'prochainement', 'dans les prochaines semaines', 'rejoins les milliers',
    'déjà des milliers', 'totalement sécurisé', 'parfaitement sécurisé',
    'aucune triche ne passe', 'exactitude garantie', 'ville pilote de', 'première ville',
  ];
  for (const value of proseStrings()) {
    const bas = value.toLowerCase();
    for (const interdit of interdits) {
      assert(!bas.includes(interdit), `promesse interdite « ${interdit} » dans : ${JSON.stringify(value)}`);
    }
    // « Compte à rebours » n'est interdit que comme PROMESSE. Le cahier §3.4
    // l'emploie à la forme NÉGATIVE (« sans compte à rebours et sans relance »),
    // et c'est même l'inverse d'une promesse : une expiration silencieuse.
    // Interdire le mot lui-même obligerait à retirer la phrase juste.
    assert(
      !bas.includes('compte à rebours') || bas.includes('sans compte à rebours'),
      `compte à rebours annoncé dans : ${JSON.stringify(value)}`,
    );
  }
  // La Saison 0 garde ses deux bornes réelles, et elles restent cohérentes.
  assert(SEASON_ZERO_START_ISO < SEASON_ZERO_END_ISO, 'la Saison 0 finirait avant de commencer');
  assert(SEASON_ZERO_START_LABEL.startsWith('lundi'), 'la borne d ouverture ne tombe plus un lundi');
  assert(SEASON_ZERO_END_LABEL.startsWith('dimanche'), 'la borne de clôture ne tombe plus un dimanche');
});

Deno.test('les trois liens partagés ouvrent l application, et rien d autre', () => {
  // Cahier §2.2 et §3.9. Les préfixes du routeur de `404.html` doivent être
  // EXACTEMENT ceux qu'`apple-app-site-association` déclare : une divergence, et
  // iOS remettrait à l'app une adresse que la page web ne sait pas peindre, ou
  // l'inverse.
  const aasa = Deno.readTextFileSync(
    new URL('../public/.well-known/apple-app-site-association', import.meta.url),
  );
  for (const page of Object.values(DEEP_LINK_PAGES)) {
    assert(page.prefix.startsWith('/') && page.prefix.endsWith('/'), `préfixe mal formé : ${page.prefix}`);
    assert(
      aasa.includes(`"${page.prefix}*"`),
      `le préfixe ${page.prefix}* n est pas déclaré dans apple-app-site-association`,
    );
    // Le code vient de l'URL et n'est jamais recollé tel quel : il est encodé.
    const lien = appDeepLink(page.host, 'a b/c');
    assert(lien.startsWith(`gryd://${page.host}/`), `le lien d application de ${page.prefix} a changé de schéma`);
    assert(!lien.includes(' '), 'le code n est pas encodé dans le lien d application');
    assert(!lien.includes('a b/c'), 'le code est recollé sans encodage dans le lien d application');
  }
  // La vraie 404 dit ce qu'un visiteur sans JavaScript doit savoir.
  assert(NOT_FOUND_COPY.noscript.includes('JavaScript'), 'le repli sans JavaScript ne dit plus la vérité');
  assertEquals(NOT_FOUND_COPY.download.href, '/telecharger/', 'le repli sans JavaScript ne renvoie plus vers la sortie');
});

Deno.test('le plan publié est celui du site, sans page cachée ni page morte', () => {
  // `sitemap.xml` est le plan que le site DONNE aux moteurs. S'il oublie une
  // page, elle n'est pas proposée ; s'il en annonce une qui n'existe pas, il
  // décrit un site imaginaire. Les trois adresses exclues le sont à raison :
  // `/callback/` porte des jetons, `/404.html` est une erreur, `/abonnement/`
  // n'est plus qu'une redirection vers l'offre.
  const plan = Deno.readTextFileSync(new URL('../public/sitemap.xml', import.meta.url));
  const publiees = [...plan.matchAll(/<loc>([^<]+)<\/loc>/g)].map((found) => found[1] ?? '');
  const attendues = [...SITE_PAGES.map((page) => page.path), ...LEGAL_PATHS];
  for (const path of attendues) {
    assert(publiees.includes(`${SITE_ORIGIN}${path}`), `sitemap.xml n annonce pas ${path}`);
  }
  assertEquals(publiees.length, attendues.length, 'sitemap.xml annonce des adresses hors du plan');
  // La vérification porte sur les ADRESSES PUBLIÉES, pas sur le texte du
  // fichier : le commentaire d'en-tête cite ces trois exclusions pour dire
  // pourquoi elles n'y sont pas, et un test qui lirait le fichier brut
  // condamnerait l'explication avec la faute.
  for (const exclue of EXCLUDED_FROM_SITEMAP) {
    assert(
      !publiees.some((adresse) => adresse.endsWith(exclue)),
      `sitemap.xml annonce ${exclue}, qui ne doit pas être indexée`,
    );
  }
  // `robots.txt` doit désigner CE plan, sinon un moteur ne le trouve pas.
  const robots = Deno.readTextFileSync(new URL('../public/robots.txt', import.meta.url));
  assert(robots.includes(`${SITE_ORIGIN}/sitemap.xml`), 'robots.txt ne désigne pas le plan du site');
});
