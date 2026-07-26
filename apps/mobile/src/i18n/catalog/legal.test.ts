/**
 * GRYD — LES CGU NE PEUVENT PLUS QUALIFIER DE FRAUDE LA FONCTIONNALITÉ LIVRÉE.
 *
 * Jusqu'au 26/07/2026, le contrat embarqué disait « Le territoire se capture
 * UNIQUEMENT par des courses à pied réelles » et listait « vélo » parmi les
 * simulations INTERDITES — alors que le vélo est une discipline réelle du jeu
 * (`ACTIVITIES`, `runs.activity`, migration 0070 en production). C'est le pire
 * endroit possible pour un texte faux : il engage l'éditeur.
 *
 * CE QUE CES TESTS VERROUILLENT — DANS LES DEUX SENS, ET C'EST TOUT L'ENJEU :
 *  · la clause ne doit plus EXCLURE le vélo (sinon on ment sur le jeu) ;
 *  · elle ne doit pas non plus AFFAIBLIR l'anti-triche (sinon on a corrigé un
 *    mensonge en ouvrant une porte). Les interdits structurants — engin
 *    motorisé, GPS falsifié, bots, exploitation de faille — sont donc testés
 *    présents, et le vélo n'a le droit d'être nommé QUE dans la clause de
 *    déclaration de discipline, jamais comme une pratique interdite en soi.
 *
 * Volontairement peu de littéral : on teste des INVARIANTS (le vélo n'apparaît
 * que là où il doit, les interdits subsistent), pas une formulation — une CGU se
 * réécrit, ses garanties non.
 *
 * PUR : aucun import React Native, aucun accès disque — Deno-testable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C, LEGAL_LAST_UPDATED } from './legal.ts';

/** Le corps légal fait foi en français et est PORTÉ à l'identique (cf. `fr5`). */
function assertFr5(entry: Entry, label: string): void {
  for (const locale of LOCALES) {
    assert(entry[locale].trim().length > 0, `${label}.${locale} est vide`);
    assertEquals(entry[locale], entry.fr, `${label}.${locale} a divergé du français de référence`);
  }
}

Deno.test('objet du contrat : les DEUX disciplines sont nommées', () => {
  const body = C.cguObjetBody.fr;
  assert(body.includes('course à pied'), 'l’objet ne nomme plus la course à pied');
  assert(body.includes('vélo'), 'l’objet ne nomme pas le vélo, qui capture pourtant du territoire');
  assertFr5(C.cguObjetBody, 'cguObjetBody');
});

Deno.test('règles du jeu : plus d’exclusivité course à pied, et la séparation est dite', () => {
  const body = C.cguJeuBody.fr;
  assert(
    !/uniquement par des courses à pied/i.test(body),
    'la clause exclut encore le vélo de la capture de territoire',
  );
  assert(body.includes('vélo'), 'la clause ne nomme pas le vélo');
  assert(/deux mondes|deux disciplines/i.test(body), 'la séparation des deux mondes n’est pas dite');
  // La capture reste décidée SERVEUR — garantie non négociable, jamais diluée.
  assert(/côté serveur/i.test(body), 'la clause ne dit plus que le serveur décide');
  assertFr5(C.cguJeuBody, 'cguJeuBody');
});

Deno.test('anti-triche : GRYD Verify juge une DISCIPLINE, pas un piéton', () => {
  const body = C.cguTricheBody1.fr;
  assert(
    !/parcours impossibles à pied/i.test(body),
    'GRYD Verify est encore décrit comme un détecteur de course à pied uniquement',
  );
  // INVARIANT (et pas une formulation) : la borne du PIÉTON n'est jamais citée
  // seule. Si le texte nomme « à pied », il doit nommer le vélo dans la foulée —
  // sinon le cycliste honnête relit, noir sur blanc, qu'on le juge en coureur.
  assert(
    !/à pied/i.test(body) || /vélo/i.test(body),
    'la clause cite la borne de la course à pied sans citer celle du vélo',
  );
  assert(/discipline/i.test(body), 'la clause ne dit pas que les bornes sont celles de la discipline');
  // HONNÊTETÉ : la limite réelle du moteur est ÉCRITE (aucune borne de vitesse ne
  // sépare un cycliste d'une voiture en ville — game-rules, « EN SUSPENS » §1).
  assert(
    /ne prétend pas/i.test(body),
    'la clause ne dit plus ce que GRYD Verify NE sait pas faire — elle promet au-delà du code',
  );
  assertFr5(C.cguTricheBody1, 'cguTricheBody1');
});

Deno.test('anti-triche : le vélo n’est nommé QUE dans la clause de déclaration', () => {
  const lines = C.cguTricheBody2.fr.split('\n').filter((l) => l.trim().length > 0);
  const bikeLines = lines.filter((l) => /vélo/i.test(l));
  assert(bikeLines.length > 0, 'aucune clause ne traite de la discipline déclarée');
  for (const line of bikeLines) {
    assert(
      /déclar/i.test(line),
      `le vélo est nommé hors du contexte de déclaration — donc traité en fraude : « ${line} »`,
    );
  }
});

Deno.test('anti-triche : rien n’a été DESSERRÉ en corrigeant le mensonge', () => {
  const body = C.cguTricheBody2.fr;
  // Chaque interdit structurant, et le mot qui le porte.
  assert(/moteur/i.test(body), 'les engins motorisés ne sont plus interdits');
  assert(/GPS/.test(body), 'la falsification de position n’est plus interdite');
  assert(/bots?/i.test(body), 'les outils automatisés ne sont plus interdits');
  assert(/faille/i.test(body), 'l’exploitation de faille n’est plus interdite');
  // La sanction, elle, n'a pas bougé — une course douteuse peut être rejetée.
  assert(/rejet/i.test(C.cguTricheBody3.fr), 'la sanction d’une sortie douteuse a disparu');
  assertFr5(C.cguTricheBody2, 'cguTricheBody2');
});

Deno.test('sécurité : la clause couvre la discipline réellement enregistrée', () => {
  assert(/vélo/i.test(C.cguRespBody1.fr), 'la clause de sécurité ignore le vélo');
  assert(/code de la route/i.test(C.cguRespBody1.fr), 'le renvoi au code de la route a disparu');
  assertFr5(C.cguRespBody1, 'cguRespBody1');
});

Deno.test('anti pay-to-win : la garantie couvre les deux disciplines', () => {
  assert(
    /roulant|roule/i.test(C.cguAboBody1.fr),
    'la garantie « tout se gagne à l’effort » ne parle qu’aux coureurs',
  );
  assert(/ne s’achète jamais/i.test(C.cguAboBody1.fr), 'la garantie anti-achat de territoire a sauté');
});

Deno.test('date : format neutre jj/mm/aaaa, tenue à la main', () => {
  assert(/^\d{2}\/\d{2}\/\d{4}$/.test(LEGAL_LAST_UPDATED), `date illisible : ${LEGAL_LAST_UPDATED}`);
});
