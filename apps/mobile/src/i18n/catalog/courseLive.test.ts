/**
 * GRYD — L'ÉCRAN DE BLOCAGE AU DÉPART NE REFUSE PLUS « UNE COURSE » À UN
 * CYCLISTE.
 *
 * `RunUnavailable` est le premier — et parfois le seul — écran qu'une sortie
 * produit : la position manque, rien ne sera mesuré. Il disait « Pas de
 * position, pas de course » et « GRYD mesure ta course avec le GPS » à
 * quelqu'un qui partait à vélo. Le refus est légitime ; l'erreur sur ce que la
 * personne faisait ne l'est pas.
 *
 * CE QUE CES TESTS VERROUILLENT :
 *  1. EXHAUSTIVITÉ — `COURSE_LIVE_COPY` couvre toutes les disciplines.
 *  2. AUCUNE FUITE sur les phrases qui NOMMENT l'effort.
 *  3. VOCABULAIRE — aucun mot de course à pied dans un texte vélo, 5 langues.
 *  4. LE NEUTRE RESTE PARTAGÉ — « le capteur n'a rien renvoyé, va dehors » ne
 *     nomme aucune discipline : les deux mondes pointent sur la MÊME entrée.
 *     Le test échoue si quelqu'un en fabrique un twin par réflexe.
 *  5. LE PRÉFLIGHT NE NOMME PLUS LA DISCIPLINE dans son libellé de conteneur :
 *     elle est déclarée juste en dessous par un contrôle qui la dit en toutes
 *     lettres, et elle est corrigeable d'un tap — un libellé de conteneur porté
 *     par l'état pourrait rester périmé dans l'arbre d'accessibilité.
 *
 * PUR : aucun import React Native — Deno-testable.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES } from '@klaim/shared';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C, COURSE_LIVE_COPY, type CourseLiveActivityCopy } from './courseLive.ts';

/** Les phrases qui NOMMENT l'effort — celles qui doivent diverger. */
const NAMED_FIELDS = [
  'noGpsTitle',
  'noGpsNativeBody',
  'noGpsDeniedWebBody',
  'noGpsServicesOffBody',
  'noGpsNoSensorBody',
] as const satisfies readonly (keyof CourseLiveActivityCopy)[];

const RUN_WORDS =
  /\b(courses?|courir|couru[es]?|carrera|correr|corrida|runs?|running|lauf|laufen|läufe|gelaufen)\b/i;

Deno.test('exhaustif : chaque discipline a ses phrases de blocage', () => {
  assertEquals(Object.keys(COURSE_LIVE_COPY).sort(), [...ACTIVITIES].sort());
});

Deno.test('aucune fuite : le refus ne parle pas de course à un cycliste', () => {
  for (const field of NAMED_FIELDS) {
    const run: Entry = COURSE_LIVE_COPY.run[field];
    const bike: Entry = COURSE_LIVE_COPY.bike[field];
    for (const locale of LOCALES) {
      assertNotEquals(bike[locale], run[locale], `${field} · ${locale} — twin non écrit`);
      assert(!RUN_WORDS.test(bike[locale]), `${field} · ${locale} : « ${bike[locale]} »`);
      assert(bike[locale].trim().length > 0, `${field} · ${locale} vide`);
    }
  }
});

Deno.test('le texte NEUTRE reste une seule entrée partagée, jamais dédoublée', () => {
  // « Le capteur n'a rien renvoyé, va dehors » ne nomme aucune discipline. Une
  // copie par monde n'ajouterait rien et devrait être maintenue deux fois.
  assertEquals(COURSE_LIVE_COPY.bike.noGpsUnavailableBody, COURSE_LIVE_COPY.run.noGpsUnavailableBody);
  for (const locale of LOCALES) {
    assert(!RUN_WORDS.test(C.noGpsUnavailableBody[locale]), locale);
  }
});

Deno.test('le préflight ne nomme plus la discipline dans son libellé de conteneur', () => {
  // La discipline est DÉCLARÉE juste en dessous (`a11yPreflightActivity`), et
  // elle est corrigeable pendant le décompte : ce libellé-ci doit rester vrai
  // dans les deux mondes, après n'importe quelle correction.
  for (const locale of LOCALES) {
    assert(!RUN_WORDS.test(C.a11yPreflight[locale]), `${locale} : « ${C.a11yPreflight[locale]} »`);
    assert(C.a11yPreflight[locale].trim().length > 0, locale);
  }
  // …et la ligne qui la déclare, elle, la nomme bien en toutes lettres.
  assert(C.a11yPreflightActivity.fr.includes('{name}'));
});
