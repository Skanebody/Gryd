/**
 * GRYD — la copy d'onboarding TIENT DANS L'ÉCRAN, dans les 5 langues.
 *
 * POURQUOI CES TESTS EXISTENT. L'écran `learn` a déjà débordé d'environ 70 px sur
 * un 375×667 (le texte passait SOUS le CTA) parce qu'une fusion d'écrans avait
 * additionné deux copies : il n'y a PAS de ScrollView dans l'onboarding — un
 * écran d'onboarding qui se scrolle est un écran de trop (§A). Le débordement
 * s'est vu sur UNE langue et une seule taille d'écran ; les quatre autres langues
 * n'ont jamais été mesurées. Ces tests remplacent l'œil : ils bornent la copy là
 * où le typage ne peut rien (il force la PARITÉ, pas la LONGUEUR).
 *
 * Les bornes sont dérivées de la largeur utile réelle : 375 px d'écran − 2×24 px
 * de marge = 327 px. Un titre en 28 px gras tient ~24 caractères par ligne, un
 * texte en 16 px ~40 caractères, un CTA en 16 px ~34 caractères dans une pill
 * pleine largeur. On borne EN DESSOUS pour garder de l'air.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CITIES } from '@klaim/shared';
import { C } from '../../i18n/catalog/onboarding.ts';
import { LOCALES, format, type Entry } from '../../i18n/types.ts';

/** Titre en 28 px gras : ~24 caractères par ligne sur 327 px utiles. */
const TITLE_LINE_MAX = 24;
/**
 * TITRE HÉROS : 40 px, PAS 28 — et le budget ne s'estime plus, il est MESURÉ
 * (26/07/2026).
 *
 * Ce plafond a laissé passer un vrai débordement. Le titre « COURS. / PRENDS TA
 * VILLE. » tenait le compte de caractères (16 ≤ 24) mais rendu à 375 pt avec la
 * vraie fonte (InterTight_800ExtraBold 40 px, letterSpacing -0,4, 343 px utiles
 * = 375 − 2 × spacing.md), il DÉBORDAIT dans trois langues sur cinq :
 *   « TOMA TU CIUDAD. »    347,1 px   « NIMM DEINE STADT. »  379,3 px
 *   « TOMA A TUA CIDADE. » 402,6 px                          (budget 343 px)
 * — trois lignes au lieu des deux annoncées, sur un écran sans ScrollView.
 *
 * ─── OVERRIDE FONDATEUR (26/07/2026) : le titre EST « COURS. / PRENDS TA VILLE. »
 * Le débordement est neutralisé À LA SOURCE : les titres héros sont rendus en
 * `adjustsFontSizeToFit numberOfLines={2}` (ils RÉTRÉCISSENT pour tenir dans les
 * 343 px, jamais 3 lignes). Le compte de caractères n'est donc plus le garde-fou
 * du débordement (c'est le rétrécissement) ; il reste une garantie de
 * COMPOSITION : exactement 2 lignes, coupure typographique voulue, et pas de
 * rétrécissement si violent que le titre deviendrait un sous-titre.
 *
 * ⚠️ DEPUIS LE 27/07/2026 (planches E01b) CE BUDGET VAUT POUR LES CINQ ÉCRANS :
 * E02 à E05 portent le même titre display 40 px que E01 — les planches décrivent
 * une SÉQUENCE, pas un hero suivi de quatre cartes.
 */
const HERO_TITLE_LINE_MAX = 19;
/** Sous-titre en 16 px : 2 lignes de ~40 caractères. */
const TAGLINE_MAX = 72;
/** CTA en 16 px dans une pill pleine largeur : on s'arrête bien avant. */
const CTA_MAX = 26;
/**
 * LIGNE DE GARANTIE (E05) : 14 px, précédée d'une coche de 20 px et de son
 * espace (327 − 20 − 12 = 295 px utiles) → ~48 caractères par ligne. Elles ont le
 * droit de passer sur deux lignes (elles s'enroulent, elles ne se coupent pas),
 * mais trois lignes pousseraient le CTA hors de l'écran sur un 375×667.
 */
const GUARANTEE_MAX = 48;

/** Titres RENDUS en 40 px (les cinq planches). */
const HERO_TITLES: Record<string, Entry> = {
  mechanicTitle: C.mechanicTitle,
  loopTitle: C.loopTitle,
  rivalryTitle: C.rivalryTitle,
  crewTitle: C.crewTitle,
  locationTitle: C.locationTitle,
};
/**
 * Titres de la grille standard (28 px sur 327 px utiles). Il n'en reste qu'UN :
 * `cityTitle`, la copie EN ATTENTE DE SURFACE de l'écran ville du premier usage
 * réel (spec E08). Elle reste bornée pour rester utilisable telle quelle.
 */
const CARD_TITLES: Record<string, Entry> = {
  cityTitle: C.cityTitle,
};
const CARD_TAGLINES: Record<string, Entry> = {
  mechanicTagline: C.mechanicTagline,
  loopTagline: C.loopTagline,
  rivalryTagline: C.rivalryTagline,
  crewTagline: C.crewTagline,
  cityTagline: C.cityTagline,
};
const GUARANTEES: Record<string, Entry> = {
  locationGuaranteeRuns: C.locationGuaranteeRuns,
  locationGuaranteeLive: C.locationGuaranteeLive,
  locationGuaranteeBlur: C.locationGuaranteeBlur,
};
const CTAS: Record<string, Entry> = {
  ctaContinue: C.ctaContinue,
  ctaChooseCity: C.ctaChooseCity,
  cityUseLocation: C.cityUseLocation,
  /** Le CTA de E05 — le seul du flow qui DÉCIDE (il ouvre la boîte système). */
  locationAllow: C.locationAllow,
  /** Le mot posé DANS le visuel de E03 : lui non plus ne peut pas être rogné. */
  rivalryTakenLabel: C.rivalryTakenLabel,
  /** Les sorties : « Passer » (haut-droit) et « Plus tard » (E05). */
  onbSkip: C.onbSkip,
  later: C.later,
  hookSignIn: C.hookSignIn,
};

Deno.test('les titres des CINQ planches font EXACTEMENT 2 lignes, dans les 5 langues', () => {
  // La coupure est typographique (un « \n » écrit), pas laissée au hasard des
  // largeurs : « FERME / LA BOUCLE. » est une progression, pas une phrase qui
  // déborde. Deux budgets, parce qu'il reste deux gabarits : les planches en
  // 40 px, et la copie en attente de surface (écran ville) en 28 px.
  const budgets: [Record<string, Entry>, number][] = [
    [HERO_TITLES, HERO_TITLE_LINE_MAX],
    [CARD_TITLES, TITLE_LINE_MAX],
  ];
  for (const [titles, max] of budgets) {
    for (const [key, entry] of Object.entries(titles)) {
      for (const locale of LOCALES) {
        const lines = entry[locale].split('\n');
        assertEquals(lines.length, 2, `${key}.${locale} ne fait pas 2 lignes`);
        for (const line of lines) {
          assert(line.length > 0, `${key}.${locale} a une ligne vide`);
          assert(
            line.length <= max,
            `${key}.${locale} : ligne de ${line.length} caractères (max ${max}) — « ${line} »`,
          );
        }
      }
    }
  }
});

Deno.test('les sous-titres tiennent en 2 lignes et ne coupent pas eux-mêmes', () => {
  for (const [key, entry] of Object.entries(CARD_TAGLINES)) {
    for (const locale of LOCALES) {
      const text = entry[locale];
      assert(!text.includes('\n'), `${key}.${locale} force une coupure de ligne`);
      assert(
        text.length <= TAGLINE_MAX,
        `${key}.${locale} : ${text.length} caractères (max ${TAGLINE_MAX})`,
      );
    }
  }
});

Deno.test('LES TROIS GARANTIES DE E05 TIENNENT SOUS LE TITRE, dans les 5 langues', () => {
  // Elles s'empilent AU-DESSUS du CTA, sur un écran sans scroll : une garantie
  // qui passe à trois lignes pousse le bouton hors de l'écran sur un 375×667 —
  // et c'est très exactement la faute payée par l'écran `learn`.
  for (const [key, entry] of Object.entries(GUARANTEES)) {
    for (const locale of LOCALES) {
      const text = entry[locale];
      assert(!text.includes('\n'), `${key}.${locale} force une coupure de ligne`);
      assert(
        text.length <= GUARANTEE_MAX,
        `${key}.${locale} : ${text.length} caractères (max ${GUARANTEE_MAX}) — « ${text} »`,
      );
    }
  }
});

Deno.test('aucun texte d’action n’est tronqué ni abrégé par des points de suspension', () => {
  // §A : « aucun texte d'action coupé par “…” ». Un CTA qui ne tient pas se
  // réécrit, il ne s'abrège pas.
  for (const [key, entry] of Object.entries(CTAS)) {
    for (const locale of LOCALES) {
      const text = entry[locale];
      assert(text.length > 0, `${key}.${locale} est vide`);
      assert(!text.includes('…') && !text.includes('...'), `${key}.${locale} est abrégé`);
      assert(
        text.length <= CTA_MAX,
        `${key}.${locale} : ${text.length} caractères (max ${CTA_MAX}) — « ${text} »`,
      );
    }
  }
});

Deno.test('« Continuer avec {city} » tient AVEC le nom de ville réel le plus long', () => {
  // Le CTA nomme la ville : ce n'est donc pas sa longueur nue qui compte, mais la
  // longueur RENDUE. « Métropole de Lille » est le pire cas réel aujourd'hui
  // (game-rules.CITIES) — et c'est bien une vraie ville seedée, pas un exemple.
  const longest = Object.values(CITIES)
    .map((c) => c.name)
    .sort((a, b) => b.length - a.length)[0]!;
  for (const locale of LOCALES) {
    const rendered = format(C.cityContinueWith, { city: longest }, locale);
    assert(!rendered.includes('{city}'), `placeholder non résolu en ${locale}`);
    assert(
      rendered.length <= 36,
      `cityContinueWith.${locale} rendu en ${rendered.length} caractères — « ${rendered} »`,
    );
  }
});

Deno.test('le placeholder {city} existe une fois et une seule dans les 5 langues', () => {
  // Un placeholder perdu à la traduction produit un CTA qui ne nomme plus rien
  // (« Weiter mit ») : le typage force la parité des CLÉS, pas celle du contenu.
  for (const locale of LOCALES) {
    const occurrences = C.cityContinueWith[locale].split('{city}').length - 1;
    assertEquals(occurrences, 1, `cityContinueWith.${locale} : ${occurrences} placeholder(s)`);
  }
});

Deno.test('la copy de l’onboarding emploie l’apostrophe typographique, jamais l’ASCII', () => {
  const entries: Record<string, Entry> = {
    ...HERO_TITLES,
    ...CARD_TITLES,
    ...CARD_TAGLINES,
    ...GUARANTEES,
    ...CTAS,
    mechanicKicker: C.mechanicKicker,
    cityKicker: C.cityKicker,
    profileKicker: C.profileKicker,
    profileTitle: C.profileTitle,
    profilePrivacyNote: C.profilePrivacyNote,
    cityNoMatch: C.cityNoMatch,
    cityLocationOutside: C.cityLocationOutside,
    cityLocationFailed: C.cityLocationFailed,
    cityLocationDenied: C.cityLocationDenied,
    cityLocationWhy: C.cityLocationWhy,
    locationUnavailable: C.locationUnavailable,
    firstRunGpsNote: C.firstRunGpsNote,
  };
  for (const [key, entry] of Object.entries(entries)) {
    for (const locale of LOCALES) {
      assert(!entry[locale].includes("'"), `${key}.${locale} : apostrophe ASCII`);
    }
  }
});

Deno.test('les écrans pédagogiques ne NOMMENT aucun lieu', () => {
  // LA FRONTIÈRE : une illustration a le droit d'ENSEIGNER (chip « Exemple »,
  // aucun chiffre attribué, aucune célébration) ; elle n'a jamais le droit de se
  // faire passer pour l'état du monde du joueur. Nommer un quartier ou une ville
  // sur E02/E03/E04 franchirait exactement cette ligne : le plateau deviendrait
  // « ta ville », avec de faux propriétaires dedans.
  const forbidden = [
    ...Object.values(CITIES).map((c) => c.name),
    'République',
    'Bastille',
    'Villemin',
    'Paris',
  ];
  const teaching: Entry[] = [
    C.mechanicKicker,
    C.mechanicTitle,
    C.mechanicTagline,
    C.exampleTag,
    C.loopTitle,
    C.loopTagline,
    C.rivalryTitle,
    C.rivalryTagline,
    C.rivalryTakenLabel,
    C.crewTitle,
    C.crewTagline,
  ];
  for (const entry of teaching) {
    for (const locale of LOCALES) {
      for (const name of forbidden) {
        assert(!entry[locale].includes(name), `un écran pédagogique nomme « ${name} » (${locale})`);
      }
    }
  }
});

Deno.test('l’onboarding ne DÉCLARE aucune discipline, dans les 5 langues', () => {
  /**
   * LE MENSONGE LE PLUS EN AMONT DE TOUTE L'APP (corrigé le 26/07/2026). Le
   * premier texte lu par un joueur annonçait un jeu de COURSE À PIED — « COURS. /
   * PRENDS TA VILLE. », « Cours seul ou défends-la avec ton crew. », « Tu courras
   * quand tu seras prêt. », « à ta première course » — alors que le vélo est une
   * discipline RÉELLE, avec ses territoires et ses classements.
   *
   * Pourquoi NEUTRALISER et non pas décliner : l'onboarding ne porte AUCUNE
   * lentille de discipline (le choix n'existe pas encore à ce stade). Une jumelle
   * `…Bike` y serait un texte sans surface — la règle est donc « aucune discipline
   * nommée », pas « les deux nommées ».
   *
   * Le périmètre est celui des phrases qui PROMETTENT quelque chose sur le jeu.
   * Les libellés d'authentification en sont exclus à dessein (« Continuar por
   * correo » n'est pas une promesse de course) — et les frontières de mots
   * empêchent de toute façon « correo » ou « parcours » de faire un faux positif.
   */
  const PROMISES: Record<string, Entry> = {
    mechanicKicker: C.mechanicKicker,
    // `mechanicTitle` EXEMPTÉ (override fondateur 26/07/2026) : la planche E01 EST
    // « COURS. / PRENDS TA VILLE. », le fondateur l'a réaffirmé deux fois. Le titre
    // héros nomme donc la course À DESSEIN — décision assumée, sa planche prime sur
    // la neutralité. TOUT LE RESTE de l'onboarding reste sous le garde-fou :
    // c'est l'unique exception, pas une brèche.
    mechanicTagline: C.mechanicTagline,
    loopTitle: C.loopTitle,
    loopTagline: C.loopTagline,
    rivalryTitle: C.rivalryTitle,
    rivalryTagline: C.rivalryTagline,
    rivalryTakenLabel: C.rivalryTakenLabel,
    crewTitle: C.crewTitle,
    crewTagline: C.crewTagline,
    locationTitle: C.locationTitle,
    locationGuaranteeRuns: C.locationGuaranteeRuns,
    locationGuaranteeLive: C.locationGuaranteeLive,
    locationGuaranteeBlur: C.locationGuaranteeBlur,
    locationAllow: C.locationAllow,
    locationUnavailable: C.locationUnavailable,
    cityKicker: C.cityKicker,
    cityTitle: C.cityTitle,
    cityTagline: C.cityTagline,
    profileKicker: C.profileKicker,
    profileTitle: C.profileTitle,
    firstRunGpsNote: C.firstRunGpsNote,
    ageTagline: C.ageTagline,
    ageBlockedTagline: C.ageBlockedTagline,
    accountTaglineRequired: C.accountTaglineRequired,
    notifTitle: C.notifTitle,
    notifTagline: C.notifTagline,
  };
  const DISCIPLINE_WORDS = [
    // course à pied
    'cours', 'courir', 'courras', 'course', 'courses', 'run', 'runs', 'running',
    'corre', 'correr', 'correrás', 'corra', 'carrera', 'corrida', 'lauf', 'laufen',
    'läuft', 'pied',
    // vélo
    'roule', 'rouler', 'vélo', 'bike', 'ride', 'rides', 'riding', 'cycling',
    'bici', 'pedala', 'pedalar', 'pedalea', 'rad', 'fahrrad', 'radeln',
  ];
  for (const [key, entry] of Object.entries(PROMISES)) {
    for (const locale of LOCALES) {
      for (const word of DISCIPLINE_WORDS) {
        const re = new RegExp(`\\b${word}\\b`, 'i');
        assert(
          !re.test(entry[locale]),
          `${key}.${locale} nomme une discipline (« ${word} ») — « ${entry[locale]} »`,
        );
      }
    }
  }
});

Deno.test('les phrases d’échec de la ville n’inventent JAMAIS de repli', () => {
  // Le repli silencieux sur une ville par défaut est le bug le plus grave trouvé
  // par AMENDEMENT-47 (« le repli ÉTAIT le mensonge »). Ces phrases doivent
  // renvoyer au CHOIX, pas nommer une ville à la place du joueur.
  const cityNames = Object.values(CITIES).map((c) => c.name);
  for (const entry of [
    C.cityLocationOutside,
    C.cityLocationFailed,
    C.cityLocationDenied,
    C.cityNoMatch,
  ]) {
    for (const locale of LOCALES) {
      for (const name of cityNames) {
        assert(!entry[locale].includes(name), `une phrase d’échec nomme « ${name} » (${locale})`);
      }
    }
  }
});
