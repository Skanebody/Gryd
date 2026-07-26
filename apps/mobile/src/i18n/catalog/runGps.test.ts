/**
 * GRYD — L'ÉCRAN REGARDÉ PENDANT TOUTE LA SORTIE NE PEUT PLUS APPELER
 * « COURSE » CE QU'UN CYCLISTE ENREGISTRE.
 *
 * Le 26/07/2026, le vélo est devenu une discipline RÉELLE. Deux états de cet
 * écran avaient reçu leur twin (« EN SORTIE », « SORTIE TERMINÉE ») ; quatorze
 * autres surfaces du MÊME écran ne l'avaient pas — la limite « Course
 * enregistrée quand l'app est ouverte », le titre de la sortie interrompue
 * retrouvée, l'aide « COURIR ÉCRAN ÉTEINT », et surtout SEPT libellés lus à
 * voix haute, dont les versions visibles sont, elles, parfaitement neutres
 * (« PAUSE », « TERMINER »). C'est le pire cas : seul un cycliste utilisant un
 * lecteur d'écran l'entendait, et rien dans le code ne pouvait le signaler.
 *
 * CE QUE CES TESTS VERROUILLENT :
 *  1. EXHAUSTIVITÉ — `RUN_GPS_COPY` couvre toutes les disciplines d'ACTIVITIES.
 *  2. AUCUNE FUITE — pas un libellé du coureur ne survit dans le monde vélo.
 *     C'est le test qui attrape le copier-coller pressé : dupliquer l'entrée
 *     `run` sous un nom en `…Bike` compilerait sans broncher.
 *  3. VOCABULAIRE — aucun texte vélo ne contient un mot de course à pied dans
 *     l'une des cinq langues.
 *  4. PARITÉ 5 LANGUES — le typage impose les clés, pas la chaîne NON VIDE.
 *  5. NEUTRES PARTAGÉS — les libellés qui ne nomment aucune discipline
 *     (« EN PAUSE », « TERMINER », « BOUCLE FERMÉE », le signal GPS) n'ont PAS
 *     de twin : les dupliquer créerait deux vérités à maintenir. Ce test échoue
 *     si quelqu'un en fabrique un par réflexe.
 *
 * PUR : aucun import React Native — Deno-testable.
 */
import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES } from '@klaim/shared';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { ACTIVITY_NAME, C, RUN_GPS_COPY, type RunGpsActivityCopy } from './runGps.ts';
import { porteeDuTexte } from './disciplineVocabulary.ts';

/** Tous les champs de la table sont des textes : aucun n'échappe aux contrôles. */
const FIELDS = [
  'status',
  'statusFinished',
  'foregroundOnly',
  'restoreTitle',
  'a11yResumeInterrupted',
  'a11ySaveInterrupted',
  'bgTitle',
  'bgText',
  'a11yGpsHelp',
  'a11yLiveMap',
  'a11yFinishRun',
  'a11yPauseRun',
  'a11yResumeRun',
  'a11yClosureBadge',
  'rateLabel',
] as const satisfies readonly (keyof RunGpsActivityCopy)[];

/**
 * Mots de COURSE À PIED, par langue — ils n'ont rien à faire dans un texte
 * vélo. Bornés par `\b` (même patron que `result.test.ts`) : « ranking » ne
 * doit pas déclencher « run », « percurso » ne doit pas déclencher « corrida ».
 */
const RUN_WORDS =
  /\b(courses?|courir|couru[es]?|carrera|correr|corrida|runs?|running|lauf|laufen|läufe|gelaufen)\b/i;

Deno.test('exhaustif : chaque discipline du jeu a ses libellés de course live', () => {
  for (const activity of ACTIVITIES) {
    assert(RUN_GPS_COPY[activity], `discipline sans libellés : ${activity}`);
  }
  assertEquals(Object.keys(RUN_GPS_COPY).sort(), [...ACTIVITIES].sort());
});

Deno.test('aucune fuite : pas un libellé du coureur ne survit dans le monde vélo', () => {
  for (const field of FIELDS) {
    const run: Entry = RUN_GPS_COPY.run[field];
    const bike: Entry = RUN_GPS_COPY.bike[field];
    for (const locale of LOCALES) {
      assertNotEquals(bike[locale], run[locale], `${field} · ${locale} — twin non écrit`);
    }
  }
});

Deno.test('vocabulaire : aucun texte vélo ne parle de course à pied', () => {
  for (const field of FIELDS) {
    const bike: Entry = RUN_GPS_COPY.bike[field];
    for (const locale of LOCALES) {
      const text = bike[locale];
      assert(!RUN_WORDS.test(text), `${field} · ${locale} : « ${text} »`);
    }
  }
});

Deno.test('parité 5 langues : aucune chaîne vide (le typage ne l’attrape pas)', () => {
  for (const activity of ACTIVITIES) {
    for (const field of FIELDS) {
      const entry: Entry = RUN_GPS_COPY[activity][field];
      for (const locale of LOCALES) {
        assert(entry[locale].trim().length > 0, `${activity}.${field} · ${locale} vide`);
      }
    }
  }
});

Deno.test('la 3ᵉ métrique ne porte JAMAIS l’unité de l’autre grandeur', () => {
  // L'unité de l'allure vit dans le libellé (« ALLURE /KM ») ; celle de la
  // vitesse vit à côté du chiffre (`liveRate.SPEED_UNIT`). Un libellé de
  // vitesse qui embarquerait « KM/H » serait tronqué par « … » dans la colonne
  // du bandeau (§A9, portugais : « VELOCIDADE KM/H »).
  for (const locale of LOCALES) {
    assert(!/KM\/H/i.test(RUN_GPS_COPY.bike.rateLabel[locale]), locale);
    assert(/\/\s?KM/i.test(RUN_GPS_COPY.run.rateLabel[locale]), locale);
  }
});

Deno.test('les libellés déjà NEUTRES n’ont pas été dédoublés', () => {
  // Un twin identique au neutre serait deux vérités à maintenir pour zéro
  // information. Ces clés-là ne nomment aucune discipline : rien à décliner.
  const neutral: readonly Entry[] = [
    C.statusPaused,
    C.statusPausedAuto,
    C.statusSearchingGps,
    C.ctrlPause,
    C.ctrlResume,
    C.ctrlFinish,
    C.ctrlGpsHelp,
    C.loopClosedTitle,
    C.loopClosedPill,
    C.signalLost,
    C.signalWeak,
    C.browserForegroundOnly,
  ];
  for (const entry of neutral) {
    for (const locale of LOCALES) {
      // Aucune de ces entrées n'apparaît dans la table par discipline : si
      // l'une y entrait, c'est qu'on l'aurait dupliquée sans raison.
      for (const activity of ACTIVITIES) {
        for (const field of FIELDS) {
          assertNotEquals(
            RUN_GPS_COPY[activity][field],
            entry,
            `${activity}.${field} pointe sur un libellé neutre`,
          );
        }
      }
      assert(entry[locale].trim().length > 0, `neutre vide · ${locale}`);
    }
  }
});

Deno.test('les pills GPS n’ordonnent plus de COURIR — 5 langues, verbe compris', () => {
  // B5 (26/07/2026). `signalWeak` en allemand disait « LAUF weiter » : impératif
  // de `laufen`. Les quatre autres langues encourageaient sans nommer d'effort
  // — une seule était fautive, une seule a été corrigée (« mach weiter »).
  // Ces pills sont rendues par features/run/gps/GpsStatusUI.tsx:65-68 sur
  // l'écran regardé pendant TOUTE la sortie, vélo compris.
  for (const locale of LOCALES) {
    assertEquals(
      porteeDuTexte(C.signalWeak[locale]),
      'neutre',
      `signalWeak.${locale} nomme une discipline : « ${C.signalWeak[locale]} »`,
    );
    assertEquals(
      porteeDuTexte(C.signalRevoked[locale]),
      'neutre',
      `signalRevoked.${locale} : « ${C.signalRevoked[locale]} »`,
    );
  }
});

Deno.test('FAUX AMI : « läuft weiter » reste — c’est l’enregistrement, pas le joueur', () => {
  // Le piège du chantier : `signalLost.de` ressemble à `signalWeak.de` mais son
  // sujet est L'ENREGISTREMENT (« läuft » = tourne, fonctionne), pas une
  // personne. Le neutraliser aurait abîmé une phrase juste. Ce test échoue si
  // quelqu'un « corrige » le faux ami au prochain balayage.
  assert(
    /läuft weiter/i.test(C.signalLost.de),
    `signalLost.de a été retouché par erreur : « ${C.signalLost.de} »`,
  );
  assertEquals(porteeDuTexte(C.signalLost.de), 'neutre');
});

Deno.test('le nom de discipline reste disponible pour les phrases à trou', () => {
  // `restoreOtherActivityBody` insère ce nom : s'il disparaissait, la carte de
  // refus de fusion dirait « Une sortie d'une autre discipline » sans jamais
  // dire LAQUELLE a été retrouvée.
  for (const activity of ACTIVITIES) {
    for (const locale of LOCALES) {
      assert(ACTIVITY_NAME[activity][locale].trim().length > 0, `${activity} · ${locale}`);
    }
  }
  assert(C.restoreOtherActivityBody.fr.includes('{name}'));
});
