/**
 * GRYD — LE RÉSULTAT NE PEUT PLUS APPELER « COURSE » UNE SORTIE À VÉLO.
 *
 * Le 26/07/2026, le vélo est devenu une discipline RÉELLE. Cet écran affichait
 * « RÉSULTAT DE COURSE » / « COURSE TERMINÉE » / « Personne n'avait couru ici »
 * au-dessus d'une sortie qui peut être un vélo : littéralement faux, donc
 * interdit par la charte (« l'app ne ment jamais »).
 *
 * CE QUE CES TESTS VERROUILLENT, ET POURQUOI CHACUN EXISTE :
 *  1. EXHAUSTIVITÉ — `RESULT_COPY` couvre toutes les disciplines d'`ACTIVITIES`.
 *     Une 3ᵉ discipline ajoutée sans ses phrases tombe ici (et à la compilation).
 *  2. AUCUNE FUITE — pas un seul libellé du coureur ne se retrouve dans le monde
 *     vélo. C'est le test qui attrape le copier-coller pressé : dupliquer
 *     l'entrée `run` sous le nom `…Bike` compilerait sans broncher.
 *  3. VOCABULAIRE — aucun texte vélo ne contient un mot de course à pied dans
 *     l'une des cinq langues (course/couru, run, Lauf/gelaufen, carrera/corrida).
 *  4. PARITÉ 5 LANGUES sur les entrées ajoutées (le typage l'impose déjà, ce test
 *     attrape la chaîne VIDE, qui, elle, passe le typage).
 *  5. DÉFAUT — `resultCopy()` sans argument rend la version course, la discipline
 *     par DÉFAUT du jeu (`DEFAULT_ACTIVITY`) : un appelant qui ignore encore la
 *     notion de discipline ne doit rien voir changer.
 *  6. RAISONS DE REFUS — seules les deux qui NOMMENT la discipline divergent ;
 *     les autres restent partagées (une seule vérité à maintenir).
 *
 * PUR : aucun import React Native, aucun accès disque — Deno-testable. Le
 * CÂBLAGE (les templates lisent-ils vraiment ces jumeaux ?) se vérifie ailleurs,
 * sur la source : features/share/exportedCardCopy.test.ts.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, DEFAULT_ACTIVITY } from '@klaim/shared';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import {
  C,
  REJECT_REASON_COPY,
  REJECT_REASON_COPY_BIKE,
  REJECT_REASON_COPY_BY_ACTIVITY,
  RESULT_COPY,
  resultCopy,
  type ResultActivityCopy,
} from './result.ts';

/** Les champs « texte » d'un jeu de libellés (hors `rejectReason`, qui est un Record). */
const TEXT_FIELDS = [
  'barKicker',
  'heroPrivate',
  'heroDone',
  'heroFlagged',
  'flaggedWhy',
  'heroPioneerSub',
  'a11yResultTrace',
  'a11yHeroMapAfter',
  'a11yHeroMapBefore',
  'privateLine',
  'privateNote',
  'coCapturedNote',
  'rendezvousOffer',
  'rendezvousNotifBody',
  'shareRunTitle',
  // Les trois titres IMPRIMÉS dans le PNG exporté + la note de tracé manquant
  // (26/07/2026). Ils sont dans la MÊME liste que le reste, et c'est le but :
  // « aucune fuite », « vocabulaire » et « parité » s'appliquent à eux sans une
  // ligne de test de plus — un jumeau copié-collé du coureur tombe ici.
  'cardHeroLogged',
  'cardHeroForCrewNamed',
  'cardHeroForCrewNoName',
  'traceUnavailableNote',
  'reasonCrew',
  'reasonRanking',
  'reasonEffort',
  'noResultTitle',
  'noResultBody',
] as const satisfies readonly (keyof ResultActivityCopy)[];

/**
 * Mots de COURSE À PIED, par langue. Ils n'ont rien à faire dans un texte vélo.
 * Bornés par `\b` : « ranking » ne doit pas déclencher « run », « percurso » ne
 * doit pas déclencher « corrida ».
 */
const RUN_WORDS = /\b(courses?|couru[es]?|carrera|corrida|runs?|running|lauf|läufe|gelaufen)\b/i;

Deno.test('exhaustif : chaque discipline du jeu a ses libellés de résultat', () => {
  for (const activity of ACTIVITIES) {
    assert(RESULT_COPY[activity], `discipline sans libellés : ${activity}`);
  }
  assertEquals(Object.keys(RESULT_COPY).sort(), [...ACTIVITIES].sort());
});

Deno.test('aucune fuite : pas un libellé du coureur ne survit dans le monde vélo', () => {
  for (const field of TEXT_FIELDS) {
    const run: Entry = RESULT_COPY.run[field];
    const bike: Entry = RESULT_COPY.bike[field];
    for (const locale of LOCALES) {
      assertNotEquals(
        bike[locale],
        run[locale],
        `${field}.${locale} : le texte vélo est celui de la course (copier-coller ?)`,
      );
    }
  }
});

Deno.test('vocabulaire : aucun texte vélo ne parle de course à pied, dans aucune langue', () => {
  for (const field of TEXT_FIELDS) {
    const bike: Entry = RESULT_COPY.bike[field];
    for (const locale of LOCALES) {
      const text = bike[locale];
      assert(
        !RUN_WORDS.test(text),
        `${field}.${locale} nomme la course à pied sur une sortie vélo : « ${text} »`,
      );
    }
  }
});

Deno.test('parité 5 langues : aucune chaîne vide (ce que le typage ne voit pas)', () => {
  for (const activity of ACTIVITIES) {
    for (const field of TEXT_FIELDS) {
      const entry: Entry = RESULT_COPY[activity][field];
      for (const locale of LOCALES) {
        assert(
          entry[locale].trim().length > 0,
          `${activity}.${field}.${locale} est vide`,
        );
      }
    }
  }
});

Deno.test('défaut : sans discipline, on obtient EXACTEMENT les textes d’avant le vélo', () => {
  assertEquals(resultCopy(), RESULT_COPY[DEFAULT_ACTIVITY]);
  assertEquals(resultCopy('run'), RESULT_COPY.run);
  assertEquals(resultCopy('bike'), RESULT_COPY.bike);
  // `DEFAULT_ACTIVITY` EST la course : une sortie sans discipline déclarée n'est
  // pas « inconnue », elle est de la course à pied (game-rules).
  assertEquals(RESULT_COPY[DEFAULT_ACTIVITY], RESULT_COPY.run);
});

Deno.test('kicker « RUN LIBRE » : l’invariant maison n’est traduit dans AUCUNE langue', () => {
  // B6 (26/07/2026). « RUN » est le nom du 3ᵉ mode d'intention (à côté de
  // CONQUÊTE et DÉFENSE), pas le nom d'une discipline — c'est pourquoi fr/es/pt
  // le gardent tel quel. L'allemand l'avait TRADUIT en « FREIER LAUF », ce qui
  // nommait la course à pied juste sous une ligne héros qui imprime BIKE pour
  // une sortie vélo libre (app/course-result.tsx:807 via intention.ts:170).
  // Le verrou est l'invariant lui-même : le jeton « RUN » dans les 5 langues.
  for (const locale of LOCALES) {
    const texte = C.kickerFreeRun[locale];
    assert(
      /\bRUN\b/.test(texte),
      `kickerFreeRun.${locale} a perdu l’invariant « RUN » : « ${texte} »`,
    );
    assert(
      !/\b(LAUF|LÄUFE|CARRERA|CORRIDA|COURSE)\b/i.test(texte),
      `kickerFreeRun.${locale} traduit l’invariant en nom de discipline : « ${texte} »`,
    );
  }
  // Les deux autres kickers de la même rangée ne nomment aucun monde : si l'un
  // d'eux se mettait à en nommer un, la rangée deviendrait incohérente.
  for (const locale of LOCALES) {
    assert(!/\b(LAUF|RUN|CARRERA|CORRIDA|COURSE)\b/i.test(C.kickerConquest[locale]));
    assert(!/\b(LAUF|RUN|CARRERA|CORRIDA|COURSE)\b/i.test(C.kickerDefense[locale]));
  }
});

Deno.test('refus serveur : seules les raisons qui NOMMENT la discipline divergent', () => {
  const reasons = Object.keys(REJECT_REASON_COPY) as (keyof typeof REJECT_REASON_COPY)[];
  const diverging = reasons.filter((r) => REJECT_REASON_COPY_BIKE[r] !== REJECT_REASON_COPY[r]);
  assertEquals(diverging.sort(), ['pace_too_fast', 'pace_too_slow']);
  // Les deux qui divergent doivent VRAIMENT parler d'autre chose que de course.
  for (const reason of diverging) {
    for (const locale of LOCALES) {
      assert(
        !RUN_WORDS.test(REJECT_REASON_COPY_BIKE[reason][locale]),
        `${reason}.${locale} refuse une sortie vélo en invoquant la course à pied`,
      );
    }
  }
  // Le Record par discipline pointe bien les deux jeux, sans troisième copie.
  assertEquals(REJECT_REASON_COPY_BY_ACTIVITY.run, REJECT_REASON_COPY);
  assertEquals(REJECT_REASON_COPY_BY_ACTIVITY.bike, REJECT_REASON_COPY_BIKE);
  assertEquals(RESULT_COPY.bike.rejectReason, REJECT_REASON_COPY_BIKE);
});
