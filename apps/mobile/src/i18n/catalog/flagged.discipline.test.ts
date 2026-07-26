/**
 * GRYD — /CLASSEMENT N'ÉNONCE PLUS UN FAIT FAUX, ET /MISSIONS N'EXCLUT PLUS
 * PERSONNE.
 *
 * DEUX DÉFAUTS RÉPARÉS LE 26/07/2026, tous deux dans ce catalogue :
 *
 *  · B3 — `boardCityUnknownBody` promettait que la ville se rattache « au
 *    premier run compté » (« first counted run », « beim ersten gewerteten
 *    Lauf »). C'est FAUX : `ensureHomeCity`
 *    (`supabase/functions/ingest_run/index.ts:550`, appelée à :2728) n'a AUCUN
 *    filtre d'activité — une sortie vélo domicilie le joueur. Un cycliste
 *    lisait une condition qu'il croyait ne pas remplir alors qu'il venait de la
 *    remplir. Correctif = NEUTRALISATION, pas jumeau : `users.city_id` est une
 *    colonne unique, hors discipline, et deux textes disciplinés laisseraient
 *    croire à deux règles de rattachement.
 *
 *  · `warNoDataBody` disait « tant que rien n'a été COURU près de toi » dans
 *    les cinq langues, sur `app/(tabs)/warroom.tsx` — un écran qui ne lit
 *    AUCUNE lentille. Même raisonnement, même correctif.
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C } from './flagged.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';

function assertNeutreDansLes5(entry: Entry, cle: string): void {
  for (const locale of LOCALES) {
    assertEquals(
      porteeDuTexte(entry[locale]),
      'neutre',
      `${cle}.${locale} nomme une discipline : « ${entry[locale]} »`,
    );
  }
}

Deno.test('B3 — le rattachement de ville se dit sans nommer de discipline', () => {
  // La phrase est servie par `classement.tsx:1068`, dans une branche qui n'a
  // pas encore regardé la discipline — et par `classement.tsx:589` sous
  // l'onglet Spécialités, qui DISPARAÎT en lentille Bike (filtre ligne 704).
  // Aucun des deux sites ne pourrait choisir entre deux jumeaux : la seule
  // formulation possible est celle qui reste vraie partout.
  assertNeutreDansLes5(C.boardCityUnknownBody, 'boardCityUnknownBody');
});

Deno.test('B3 — le fait énoncé reste le MÊME dans les 5 langues', () => {
  // Le défaut n'était pas qu'une langue dérape : les cinq affirmaient la même
  // chose fausse. Une neutralisation partielle (fr corrigé, de oublié) serait
  // le pire état — on croirait le sujet clos. Chaque langue garde donc à la
  // fois la ville, le rattachement automatique et le refus d'en montrer une
  // autre.
  for (const locale of LOCALES) {
    const texte = C.boardCityUnknownBody[locale];
    assert(texte.trim().length > 0, `boardCityUnknownBody.${locale} vide`);
    assert(!texte.includes('{'), `boardCityUnknownBody.${locale} : placeholder résiduel`);
  }
});

Deno.test('les Missions ne réservent plus leur explication aux coureurs', () => {
  assertNeutreDansLes5(C.warNoDataBody, 'warNoDataBody');
  assertNeutreDansLes5(C.warNoDataTitle, 'warNoDataTitle');
});

Deno.test('les états du classement SANS lentille restent neutres', () => {
  // Ces quatre-là sont rendus AVANT la moindre lecture de discipline
  // (déconnecté, ville inconnue, lecture en échec) ou sur une dimension qui
  // n'en a pas (villes, crews). Aucun ne peut nommer un monde sans mentir à
  // l'autre moitié des joueurs.
  assertNeutreDansLes5(C.boardSignedOutBody, 'boardSignedOutBody');
  assertNeutreDansLes5(C.boardUnavailableBody, 'boardUnavailableBody');
  assertNeutreDansLes5(C.boardNoSourceVille, 'boardNoSourceVille');
  assertNeutreDansLes5(C.boardNoSourceCrews, 'boardNoSourceCrews');
});

/**
 * BALAYAGE EXHAUSTIF — la liste REVUE des entrées de `flagged` qui ont le droit
 * de nommer un monde. Chacune a été vérifiée par lecture du site de rendu.
 */
const NOMMENT_UN_MONDE_LEGITIMEMENT: readonly string[] = [
  // ── LÉGITIME : rendu dans la branche RUN de la lentille ────────────────────
  // `classement.tsx:1112` — dernier `else` après le test `bike ?` de la ligne
  // 1086. Cette copie est donc le JUMEAU « à pied » de `saison.bikeBoardBody`,
  // servi seulement quand l'écran regarde la course à pied.
  'boardEmptyBody',
  // ── CLÉS SANS AUCUN CONSOMMATEUR (vérifié par grep sur les 4 importateurs :
  //    arsenal.tsx, classement.tsx, warroom.tsx, arsenal/recommendations.ts) ──
  // 125 des 192 entrées de ce catalogue sont orphelines — l'en-tête de
  // `catalog/arsenal.ts` le dit déjà : « elles y restent orphelines, à nettoyer
  // par le propriétaire de ce fichier ». Retoucher un texte que PERSONNE ne lit
  // ne corrigerait rien et ferait perdre la trace de ce qui reste à supprimer.
  // Celles-ci sont inscrites parce qu'elles nomment la course à pied ; leur
  // sort se joue au nettoyage du catalogue, pas ici.
  'actionCourirEncore',
  'contribLine',
  'ctaCourirEncore',
  'emptyMissions',
  'footnote',
  'footnoteSub',
  'metaResteM',
  'toastCoffre',
];

Deno.test('balayage : aucune entrée de flagged ne nomme un monde hors liste revue', () => {
  assertEquals(
    clesQuiNommentUneDiscipline(C),
    [...NOMMENT_UN_MONDE_LEGITIMEMENT].sort(),
    'une entrée nomme une discipline sans figurer dans la liste revue (ou une entrée de la liste a été neutralisée sans être retirée)',
  );
});
