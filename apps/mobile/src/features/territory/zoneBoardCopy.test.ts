/**
 * GRYD — le classement de zone ne parle jamais d'un effort qu'on ne regarde pas.
 *
 * POURQUOI CES TESTS. `/territoire` porte le commutateur de discipline et NOMME
 * le monde montré au-dessus de ses métriques. Tant que la ligne d'absence du
 * classement était unique, la page disait « à vélo » en en-tête et « personne
 * n'a couru ici » en pied — sur le même écran, pour le même joueur.
 * Ces tests verrouillent la dérivation ET la frontière : ce qui NOMME l'effort
 * se décline, ce qui est neutre reste unique.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { C } from '../../i18n/catalog/map.ts';
import { LOCALES } from '../../i18n/types.ts';
import { zoneBoardEmptyEntry, zoneBoardEmptyLine } from './zoneBoardCopy.ts';

Deno.test('la lentille VÉLO ne sert jamais la ligne de la course', () => {
  assertEquals(zoneBoardEmptyEntry('bike'), C.zoneBoardEmptyBike);
  assertEquals(zoneBoardEmptyEntry('run'), C.zoneBoardEmpty);
});

Deno.test('aucun verbe de COURSE ne survit sous la lentille vélo, dans les 5 langues', () => {
  // Les racines que la revue a relevées à l'écran — pas une liste de style :
  // ce sont exactement les mots par lesquels la contradiction se lisait.
  const runVerbs = ['couru', 'cour', 'runs', 'run ', 'corra', 'corre', 'läuft', 'lauf', 'correr'];
  for (const locale of LOCALES) {
    const line = zoneBoardEmptyLine('bike', locale).toLowerCase();
    for (const verb of runVerbs) {
      assert(!line.includes(verb), `zoneBoardEmptyBike.${locale} dit encore « ${verb} » — « ${line} »`);
    }
  }
});

Deno.test('la ligne vélo est BIEN un autre fait, pas une copie de politesse', () => {
  // Une jumelle identique à son original serait deux vérités à maintenir pour
  // rien : si elle existe, c'est qu'elle dit autre chose.
  for (const locale of LOCALES) {
    assertNotEquals(
      zoneBoardEmptyLine('bike', locale),
      zoneBoardEmptyLine('run', locale),
      `zoneBoardEmptyBike.${locale} est identique à zoneBoardEmpty.${locale}`,
    );
  }
});

Deno.test('les deux mondes disent la même CHOSE : aucun classement, et pourquoi', () => {
  // La jumelle change le verbe, pas le fait. Elle ne doit ni promettre un
  // palmarès (aucune table ne l'agrège), ni annoncer un chiffre.
  for (const locale of LOCALES) {
    for (const activity of ['run', 'bike'] as const) {
      const line = zoneBoardEmptyLine(activity, locale);
      assert(line.length > 0, `${activity}.${locale} est vide`);
      assert(!/\d/.test(line), `${activity}.${locale} affiche un chiffre — « ${line} »`);
      assert(!line.includes('…') && !line.includes('...'), `${activity}.${locale} est abrégé`);
      assert(!line.includes("'"), `${activity}.${locale} : apostrophe ASCII`);
    }
  }
});

Deno.test('le TITRE de la section reste unique — il ne nomme aucun effort', () => {
  // §A / règle des jumelles : pas de twin pour une clé déjà neutre. Si
  // « CLASSEMENT DE ZONE » venait à nommer un effort, ce test tomberait et
  // demanderait une jumelle, au lieu de laisser passer une contradiction.
  const effort = ['cour', 'run', 'corr', 'lauf', 'läuf', 'roul', 'ride', 'rad', 'bici', 'bike', 'pedal'];
  for (const locale of LOCALES) {
    const title = C.zoneBoardTitle[locale].toLowerCase();
    for (const word of effort) {
      assert(!title.includes(word), `zoneBoardTitle.${locale} nomme un effort (« ${word} »)`);
    }
  }
});

Deno.test('la ligne d’absence tient sous le titre de section, à 375 pt', () => {
  // §A : texte court, jamais tronqué. La section est rendue dans le ScrollView
  // de /territoire (marge d'écran spacing.cardPadding = 20 de chaque côté →
  // 335 px utiles), en 12 px. À ~6,2 px/caractère, deux lignes tiennent
  // largement sous 55 caractères — on borne EN DESSOUS pour garder de l'air.
  const MAX = 55;
  for (const locale of LOCALES) {
    for (const activity of ['run', 'bike'] as const) {
      const line = zoneBoardEmptyLine(activity, locale);
      assert(line.length <= MAX, `${activity}.${locale} : ${line.length} caractères (max ${MAX})`);
    }
  }
});
