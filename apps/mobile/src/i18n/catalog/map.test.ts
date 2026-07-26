/**
 * GRYD — la Carte ne renvoie plus un cycliste vers « tes courses passées ».
 *
 * POURQUOI CES TESTS. `BattleMapOverlays` reçoit `activity` en prop et commute
 * déjà dessus (état vide vélo). Le bloc « DÉTAILS » de son peek mission, lui,
 * rendait deux textes SANS CONDITION : « Tes courses passées » à l'écran et
 * « Historique de mes courses » dans l'arbre d'accessibilité. Un cycliste
 * dépliait sa sheet et lisait — ou entendait — l'effort de quelqu'un d'autre.
 *
 * CE QUI EST VERROUILLÉ ICI, ET DANS LES DEUX SENS :
 *  1. le lien ne nomme AUCUN effort, dans les cinq langues (le défaut revient
 *     ⇒ ce test tombe) ;
 *  2. il n'a PAS de jumeau par discipline (quelqu'un en fabrique un par
 *     réflexe ⇒ ce test tombe aussi). La raison est factuelle : le lien décrit
 *     l'écran où il MÈNE, et `/historique` a sa propre lentille mémorisée
 *     (`gryd.activity.historique`) que ce lien ne transmet pas. Promettre
 *     « tes sorties vélo » serait un second mensonge, mieux habillé ;
 *  3. §A — les deux textes VISIBLES tiennent dans la ligne du peek, qui est
 *     rendue en `numberOfLines={1}` : au-delà, ils seraient rognés ;
 *  4. les jumeaux vélo qui existent RÉELLEMENT dans ce catalogue disent bien
 *     autre chose que leur original.
 *
 * PUR : aucun import React Native — Deno charge le catalogue tel quel.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { C } from './map.ts';
import { LOCALES, type Entry } from '../types.ts';
import { porteeDuTexte } from './disciplineVocabulary.ts';

/** Les mots qui NOMMENT la course à pied, dans les cinq langues. */
const RUN_WORDS =
  /(\bcourses?\b|\bcourir\b|\bcouru\b|\bruns?\b|\brunning\b|\bcarreras?\b|\bcorrer\b|\bcorridas?\b|\bLauf|\bLäuf)/i;

/** Les mots qui nomment le vélo — un texte « neutre » ne doit pas les porter non plus. */
const BIKE_WORDS = /(\bvélo\b|\bbici\b|\bbike\b|\bRad|\bpedal|\bride\b|Radtour)/i;

const CATALOG = C as unknown as Record<string, Entry | undefined>;

/** Les trois textes du lien « Mon historique » du peek mission. */
const HISTORY_LINK = ['historyA11y', 'myHistory', 'pastRuns'];

Deno.test('le lien vers l’historique ne nomme aucun effort — 5 langues', () => {
  for (const key of HISTORY_LINK) {
    const entry = CATALOG[key];
    assert(entry !== undefined, `clé absente du catalogue : ${key}`);
    for (const locale of LOCALES) {
      const text = entry[locale];
      assert(text.trim().length > 0, `${key}.${locale} est vide`);
      assert(!RUN_WORDS.test(text), `${key}.${locale} nomme la course — « ${text} »`);
      assert(!BIKE_WORDS.test(text), `${key}.${locale} nomme le vélo — « ${text} »`);
    }
  }
});

Deno.test('le lien vers l’historique n’a PAS de jumeau — sa destination a sa propre lentille', () => {
  for (const key of HISTORY_LINK) {
    assert(
      CATALOG[`${key}Bike`] === undefined,
      `${key}Bike : jumeau qui promet un filtrage que /historique n'applique pas`,
    );
  }
});

Deno.test('§A : la ligne du peek n’est jamais rognée (numberOfLines = 1)', () => {
  // La rangée vit dans `openBlock` (marge 16 de chaque côté sur 375), moins la
  // marge de la carte (12 × 2), la pastille d'icône (26 + 10) et le chevron
  // (16 + 10) : il reste ~257 px pour un texte de 12 px, soit ~41 caractères.
  // On borne EN DESSOUS pour garder de l'air aux tailles système agrandies.
  const MAX = 34;
  for (const key of ['myHistory', 'pastRuns']) {
    const entry = CATALOG[key];
    assert(entry !== undefined, `clé absente du catalogue : ${key}`);
    for (const locale of LOCALES) {
      assert(
        entry[locale].length <= MAX,
        `${key}.${locale} : ${entry[locale].length} caractères (max ${MAX})`,
      );
    }
  }
});

Deno.test('l’état vide sans lentille n’apprend plus « ferme une boucle EN COURANT »', () => {
  // DETTE 9 (26/07/2026). Cette ligne a DEUX consommateurs :
  //  · la Carte, où elle est la branche « course » d'un couple jumelé
  //    (BattleMapOverlays.tsx:1265-1272) — là, la lentille est connue ;
  //  · /territoire (app/territoire.tsx:246) et TerritoryFranceMap.tsx:187, où la
  //    ligne de portée n'est montée QUE si `metricKeys.length > 0`
  //    (features/territory/pageState.ts:91-99) — donc JAMAIS dans l'état vide.
  // Un cycliste sans zone lisait donc une consigne de coureur sans qu'aucun mot
  // d'écran ne nomme le monde. Neutralisation, pas jumeau : /territoire n'a
  // précisément rien pour choisir entre deux textes dans cet état.
  for (const locale of LOCALES) {
    assertEquals(
      porteeDuTexte(C.emptyNoneLine[locale]),
      'neutre',
      `emptyNoneLine.${locale} nomme une discipline : « ${C.emptyNoneLine[locale]} »`,
    );
    assert(
      !/courant|running|corriendo|Laufen|correndo/i.test(C.emptyNoneLine[locale]),
      `emptyNoneLine.${locale} : le participe de course est revenu — « ${C.emptyNoneLine[locale]} »`,
    );
  }
  // Le jumeau vélo de la Carte, lui, reste PLUS précis que le neutre : c'est le
  // sens même d'un jumeau — dire davantage quand on sait de quel monde on parle.
  for (const locale of LOCALES) {
    assertEquals(porteeDuTexte(C.emptyBikeTitle[locale]), 'velo');
  }
});

Deno.test('les jumeaux vélo de la carte disent AUTRE CHOSE que leur original', () => {
  // Un jumeau identique à son original serait deux vérités à maintenir pour
  // rien : s'il existe, c'est qu'il porte un autre fait (un autre verbe, une
  // autre échelle d'effort).
  const pairs: readonly (readonly [string, string])[] = [
    ['dataNoteEmpty', 'dataNoteEmptyBike'],
    ['emptyNoneTitle', 'emptyBikeTitle'],
    ['emptyNoneLine', 'emptyBikeLine'],
    ['zoneBoardEmpty', 'zoneBoardEmptyBike'],
  ];
  for (const [runKey, bikeKey] of pairs) {
    const run = CATALOG[runKey];
    const bike = CATALOG[bikeKey];
    assert(run !== undefined, `clé absente : ${runKey}`);
    assert(bike !== undefined, `clé absente : ${bikeKey}`);
    for (const locale of LOCALES) {
      assertNotEquals(bike[locale], run[locale], `${bikeKey}.${locale} recopie ${runKey}`);
      assert(bike[locale].trim().length > 0, `${bikeKey}.${locale} est vide`);
    }
  }
});
