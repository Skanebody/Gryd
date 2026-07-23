/**
 * GRYD — la copy d'onboarding TIENT DANS L'ÉCRAN, dans les 5 langues.
 *
 * POURQUOI CES TESTS EXISTENT. L'écran `learn` a déjà débordé d'environ 70 px
 * sur un 375×667 (le texte passait SOUS le CTA) parce qu'une fusion d'écrans
 * avait additionné deux copies : il n'y a PAS de ScrollView dans l'onboarding —
 * un écran d'onboarding qui se scrolle est un écran de trop (§A). Le débordement
 * s'est vu sur UNE langue et une seule taille d'écran ; les quatre autres
 * langues n'ont jamais été mesurées. Ces tests remplacent l'œil : ils bornent la
 * copy là où le typage ne peut rien (il force la PARITÉ, pas la LONGUEUR).
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
/** Sous-titre en 16 px : 2 lignes de ~40 caractères. */
const TAGLINE_MAX = 72;
/** CTA en 16 px dans une pill pleine largeur : on s'arrête bien avant. */
const CTA_MAX = 26;

const CARD_TITLES: Record<string, Entry> = {
  mechanicTitle: C.mechanicTitle,
  rivalryTitle: C.rivalryTitle,
  cityTitle: C.cityTitle,
};
const CARD_TAGLINES: Record<string, Entry> = {
  mechanicTagline: C.mechanicTagline,
  rivalryTagline: C.rivalryTagline,
  cityTagline: C.cityTagline,
  profileTagline: C.profileTagline,
};
const CTAS: Record<string, Entry> = {
  ctaContinue: C.ctaContinue,
  ctaChooseCity: C.ctaChooseCity,
  profileCta: C.profileCta,
  cityUseLocation: C.cityUseLocation,
  captureDemoLabel: C.captureDemoLabel,
  rivalryDemoLabel: C.rivalryDemoLabel,
};

Deno.test('les titres des 3 cartes font EXACTEMENT 2 lignes, dans les 5 langues', () => {
  // La coupure est typographique (un « \n » écrit), pas laissée au hasard des
  // largeurs : « FERME UNE BOUCLE. / PRENDS LA ZONE. » est une progression, pas
  // une phrase qui déborde.
  for (const [key, entry] of Object.entries(CARD_TITLES)) {
    for (const locale of LOCALES) {
      const lines = entry[locale].split('\n');
      assertEquals(lines.length, 2, `${key}.${locale} ne fait pas 2 lignes`);
      for (const line of lines) {
        assert(line.length > 0, `${key}.${locale} a une ligne vide`);
        assert(
          line.length <= TITLE_LINE_MAX,
          `${key}.${locale} : ligne de ${line.length} caractères (max ${TITLE_LINE_MAX}) — « ${line} »`,
        );
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
  // Le CTA nomme la ville : ce n'est donc pas sa longueur nue qui compte, mais
  // la longueur RENDUE. « Métropole de Lille » est le pire cas réel aujourd'hui
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

Deno.test('la copy des 3 cartes emploie l’apostrophe typographique, jamais l’ASCII', () => {
  const entries: Record<string, Entry> = {
    ...CARD_TITLES,
    ...CARD_TAGLINES,
    ...CTAS,
    mechanicKicker: C.mechanicKicker,
    rivalryKicker: C.rivalryKicker,
    cityKicker: C.cityKicker,
    profileKicker: C.profileKicker,
    profileTitle: C.profileTitle,
    profilePrivacyNote: C.profilePrivacyNote,
    cityNoMatch: C.cityNoMatch,
    cityLocationOutside: C.cityLocationOutside,
    cityLocationFailed: C.cityLocationFailed,
    cityLocationDenied: C.cityLocationDenied,
    cityLocationWhy: C.cityLocationWhy,
    demoReplay: C.demoReplay,
    firstRunGpsNote: C.firstRunGpsNote,
  };
  for (const [key, entry] of Object.entries(entries)) {
    for (const locale of LOCALES) {
      assert(!entry[locale].includes("'"), `${key}.${locale} : apostrophe ASCII`);
    }
  }
});

Deno.test('les cartes pédagogiques ne NOMMENT aucun lieu', () => {
  // LA FRONTIÈRE : une illustration a le droit d'ENSEIGNER (chip « Exemple »,
  // aucun chiffre attribué, aucune célébration) ; elle n'a jamais le droit de
  // se faire passer pour l'état du monde du joueur. Nommer un quartier ou une
  // ville sur la carte 1 ou 2 franchirait exactement cette ligne : le plateau
  // deviendrait « ta ville », avec de faux propriétaires dedans.
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
    C.captureDemoLabel,
    C.rivalryKicker,
    C.rivalryTitle,
    C.rivalryTagline,
    C.rivalryDemoLabel,
  ];
  for (const entry of teaching) {
    for (const locale of LOCALES) {
      for (const name of forbidden) {
        assert(!entry[locale].includes(name), `une carte pédagogique nomme « ${name} » (${locale})`);
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
