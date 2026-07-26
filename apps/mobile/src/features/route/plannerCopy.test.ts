/**
 * GRYD — le planificateur ne promet plus une course à un cycliste.
 *
 * POURQUOI CES TESTS. `/route-planner` est le seul écran du jeu qui connaisse sa
 * discipline SANS avoir de commutateur : elle lui est transmise par l'URL, et il
 * l'affiche lui-même dans son kicker. Trois de ses textes la contredisaient
 * quatre lignes plus bas (« BIKE » en sur-titre, « cette course » en section).
 *
 * CE QUI EST VERROUILLÉ ICI :
 *  1. la DÉRIVATION — le monde regardé choisit les trois textes, ensemble ;
 *  2. le VOCABULAIRE — aucun mot de course à pied sous lentille vélo, 5 langues ;
 *  3. la FRONTIÈRE — ce qui est déjà neutre n'a PAS de jumeau (dupliquer une
 *     phrase à l'identique, c'est deux vérités à maintenir) ;
 *  4. les ÉCRANS SANS LENTILLE (frontière d'erreur) : vocabulaire NEUTRALISÉ,
 *     et surtout pas de jumeau — rien là-bas ne pourrait le choisir ;
 *  5. l'ATTEIGNABILITÉ — la preuve, maillon par maillon, que « {n} courses
 *     analysées » ne peut PAS s'afficher sous la lentille vélo aujourd'hui.
 *     Le jour où elle le pourra, ce test tombe et réclame les jumelles.
 *
 * PUR : aucun import React Native — Deno charge tout tel quel.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, DEFAULT_ACTIVITY } from '@klaim/shared';
import { C } from '../../i18n/catalog/route.ts';
import { LOCALES, type Entry } from '../../i18n/types.ts';
import { competitiveReadAllowed } from '../../ui/activityLens.ts';
import { plannerBounds } from './activityPlanning.ts';
import { plannerDisciplineCopy } from './plannerCopy.ts';
import { resolveRouteSuggestion, routeDistancePrefsFrom, runsBeforeLearning } from './suggestion.ts';

/**
 * Les mots par lesquels la contradiction se lisait RÉELLEMENT à l'écran, dans
 * les cinq langues — pas une liste de style. `Lauf` est cherché sans frontière
 * de mot à droite (« Läufe », « Laufs ») mais avec une frontière à gauche, pour
 * ne pas confondre avec « läuft » d'« Ortung läuft… ».
 */
const RUN_WORDS =
  /(\bcourses?\b|\bcourir\b|\bcouru\b|\bruns?\b|\brunning\b|\bcarreras?\b|\bcorrer\b|\bcorridas?\b|\bLauf|\bLäuf)/i;

/** Le vocabulaire de l'autre monde — pour prouver qu'un texte NEUTRE l'est vraiment. */
const BIKE_WORDS = /(\bvélo\b|\bbici\b|\bbike\b|\bRad|\bpedal|\bride\b|\bAusfahrt\b|Radtour)/i;

/** Accès générique au catalogue (existence d'une clé jumelle). */
const CATALOG = C as unknown as Record<string, Entry | undefined>;

function hasTwin(key: string): boolean {
  return CATALOG[`${key}Bike`] !== undefined;
}

Deno.test('la dérivation choisit le monde REGARDÉ, jamais un défaut silencieux', () => {
  const bike = plannerDisciplineCopy('bike');
  assertEquals(bike.why, C.secWhyBike);
  assertEquals(bike.adjust, C.adjustRunBike);
  assertEquals(bike.objectiveA11y, C.a11yObjectiveGroupBike);

  const run = plannerDisciplineCopy('run');
  assertEquals(run.why, C.secWhy);
  assertEquals(run.adjust, C.adjustRun);
  assertEquals(run.objectiveA11y, C.a11yObjectiveGroup);
});

Deno.test('exhaustif : chaque discipline a ses trois textes, dans les 5 langues', () => {
  for (const activity of ACTIVITIES) {
    const copy = plannerDisciplineCopy(activity);
    for (const entry of [copy.why, copy.adjust, copy.objectiveA11y]) {
      for (const locale of LOCALES) {
        assert(entry[locale].trim().length > 0, `${activity} · ${locale} : texte vide`);
      }
    }
  }
});

Deno.test('aucun mot de COURSE ne survit sous la lentille vélo, 5 langues', () => {
  // ⚠️ C'EST LE FILET DU CHANTIER. Réintroduire le défaut — rendre `C.secWhy`,
  // `C.adjustRun` ou `C.a11yObjectiveGroup` sans condition — le fait tomber.
  const copy = plannerDisciplineCopy('bike');
  const named = { why: copy.why, adjust: copy.adjust, objectiveA11y: copy.objectiveA11y };
  for (const [field, entry] of Object.entries(named)) {
    for (const locale of LOCALES) {
      assert(
        !RUN_WORDS.test(entry[locale]),
        `${field} · ${locale} nomme encore la course — « ${entry[locale]} »`,
      );
    }
  }
});

Deno.test('les jumeaux disent AUTRE CHOSE, jamais une copie de politesse', () => {
  const bike = plannerDisciplineCopy('bike');
  const run = plannerDisciplineCopy('run');
  for (const locale of LOCALES) {
    assertNotEquals(bike.why[locale], run.why[locale], `secWhyBike.${locale} identique`);
    assertNotEquals(bike.adjust[locale], run.adjust[locale], `adjustRunBike.${locale} identique`);
    assertNotEquals(
      bike.objectiveA11y[locale],
      run.objectiveA11y[locale],
      `a11yObjectiveGroupBike.${locale} identique`,
    );
  }
});

Deno.test('ce qui est DÉJÀ NEUTRE n’a pas de jumeau — et ne nomme aucun effort', () => {
  // Le reste du planificateur parle de boucles, de formats et de tracés : rien
  // à décliner. Le test échoue dans les DEUX sens — si l'une de ces phrases se
  // met à nommer un effort (elle réclamerait alors sa jumelle), et si quelqu'un
  // fabrique un jumeau par réflexe pour une clé qui n'en a pas besoin.
  const neutral = [
    'secStart',
    'secFormats',
    'secObjective',
    'secExactDistance',
    'secOtherLoops',
    'planRecommended',
    'planShort',
    'planLong',
    'a11yFormatsGroup',
    'a11yLoopsGroup',
    'a11yStart',
    'distanceRangeHint',
    'summaryDuration',
    'summaryNoPace',
    'summaryGpsError',
    'summaryWaitingPosition',
    'ctaPositionRequired',
    'ctaGpsAfterCountdown',
    'whyManual',
    'whyDefaultOff',
    'whyDefaultUnknown',
    'reasonAtYourDoor',
    'reasonShortFormat',
    'reasonMediumFormat',
    'reasonLongLoop',
    'reasonFollowsStreets',
    'mapStart',
    'mapStartReturn',
  ];
  for (const key of neutral) {
    const entry = CATALOG[key];
    assert(entry !== undefined, `clé absente du catalogue : ${key}`);
    assert(!hasTwin(key), `${key} a un jumeau inutile — la clé est déjà neutre`);
    for (const locale of LOCALES) {
      const text = entry[locale];
      assert(!RUN_WORDS.test(text), `${key}.${locale} nomme la course — « ${text} »`);
      assert(!BIKE_WORDS.test(text), `${key}.${locale} nomme le vélo — « ${text} »`);
    }
  }
});

Deno.test('la frontière d’erreur ne nomme plus la course — et n’a PAS de jumeau', () => {
  // `ErrorBoundary` / `AppErrorBoundary` s'interposent au-dessus de N'IMPORTE
  // quel écran et ne reçoivent AUCUNE discipline : un jumeau y serait un texte
  // que rien ne peut choisir. La seule correction possible est la
  // NEUTRALISATION — ne pas affirmer un effort qu'on ne connaît pas.
  const lensless = ['errorTitle', 'crashBodyDisplay', 'crashBodyNetwork', 'crashAlertBody'];
  for (const key of lensless) {
    const entry = CATALOG[key];
    assert(entry !== undefined, `clé absente du catalogue : ${key}`);
    assert(!hasTwin(key), `${key} : jumeau sans surface (l'écran ne porte pas la lentille)`);
    for (const locale of LOCALES) {
      const text = entry[locale];
      assert(!RUN_WORDS.test(text), `${key}.${locale} nomme la course — « ${text} »`);
      assert(!BIKE_WORDS.test(text), `${key}.${locale} nomme le vélo — « ${text} »`);
    }
  }
});

Deno.test('§A : les textes de discipline restent courts dans les 5 langues', () => {
  // `SectionLabel` et le libellé d'accordéon s'ENROULENT (aucun numberOfLines,
  // aucune ellipse) : le budget n'est pas une garantie anti-troncature, c'est
  // une borne de sobriété — un kicker qui prendrait trois lignes casserait le
  // « compris en moins de 3 s ».
  const MAX = 32;
  for (const activity of ACTIVITIES) {
    const copy = plannerDisciplineCopy(activity);
    for (const entry of [copy.why, copy.adjust, copy.objectiveA11y]) {
      for (const locale of LOCALES) {
        assert(
          entry[locale].length <= MAX,
          `${activity} · ${locale} : ${entry[locale].length} caractères (max ${MAX})`,
        );
      }
    }
  }
});

Deno.test('« courses analysées » est INATTEIGNABLE sous la lentille vélo — la preuve', () => {
  // On ne fait pas confiance à une lecture : on rejoue la chaîne RÉELLE de
  // `useRouteSuggestion`, avec ses fonctions, maillon par maillon.
  //
  // `habits_inputs` (migration 0055) agrège `public.runs` SANS filtre
  // `activity` : la source MÉLANGE les deux mondes. Le hook la déclare donc
  // non disciplinée, et `competitiveReadAllowed` en interdit la lecture hors
  // discipline par défaut.
  const HABITS_SOURCE_IS_DISCIPLINED = false;
  assertEquals(competitiveReadAllowed('bike', HABITS_SOURCE_IS_DISCIPLINED), false);
  assertEquals(competitiveReadAllowed(DEFAULT_ACTIVITY, HABITS_SOURCE_IS_DISCIPLINED), true);

  // Lecture refusée ⇒ le hook passe `{ status: 'unavailable' }` au résolveur.
  const prefs = routeDistancePrefsFrom({ status: 'unavailable' });
  assertEquals(prefs.learning, 'unknown');
  assertEquals(prefs.manualKm, null);

  // Même avec un profil PARFAITEMENT appris sous la main, le résolveur ne le
  // consomme pas : l'inatteignabilité est structurelle, pas circonstancielle.
  const suggestion = resolveRouteSuggestion(
    { kind: 'known', typicalKm: 5.2, sampleRuns: 12, paceSKm: 320 },
    prefs,
    plannerBounds('bike'),
  );
  assertEquals(suggestion.source, 'default'); // ⇒ jamais `whyLearned`
  assertEquals(suggestion.cause, 'unavailable'); // ⇒ `whyDefaultUnknown`, neutre
  assertEquals(runsBeforeLearning(suggestion), null); // ⇒ jamais `whyDefaultLearning`

  // Et le texte réellement affiché ne nomme, lui, aucun effort.
  for (const locale of LOCALES) {
    assert(!RUN_WORDS.test(C.whyDefaultUnknown[locale]), `whyDefaultUnknown.${locale}`);
  }
});
