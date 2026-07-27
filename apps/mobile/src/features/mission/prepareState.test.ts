/**
 * GRYD — E17 « Préparation d'activité » : verrouillage des trois ÉTATS
 * TECHNIQUES et de l'objectif recommandé.
 *
 * POURQUOI CE TEST EXISTE. Les trois lignes de cet écran sont lues en trois
 * secondes, dehors, juste avant d'appuyer sur DÉMARRER. Chacune peut mentir
 * SILENCIEUSEMENT dans la même direction — vers le rassurant : une batterie non
 * mesurée affichée « OK », une file d'envoi illisible affichée « à jour », un
 * signal médiocre affiché « net ». Ce fichier verrouille l'inverse : là où rien
 * n'est mesuré, la ligne dit qu'elle ne sait pas.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import type { RealMission } from './deriveMission.ts';
import {
  BATTERY_LOW_PERCENT,
  BATTERY_TONE,
  GPS_TONE,
  SYNC_TONE,
  batteryRowKey,
  defendAvailable,
  effectiveObjective,
  gpsRowKey,
  objectiveReasonKey,
  recommendedObjective,
  syncRow,
} from './prepareState.ts';
import { recommendedMissionView } from './recommendedMission.ts';

const ANCHOR = { lat: 48.86, lng: 2.4 };
const DEFEND: RealMission = {
  kind: 'defend_expiring',
  anchor: ANCHOR,
  hoursLeft: 5,
  distanceM: 900,
  areaM2: 15_000,
};
const EXPAND: RealMission = { kind: 'expand', anchor: ANCHOR, distanceM: 900 };

// ─── Objectif ────────────────────────────────────────────────────────────────

Deno.test('« Défendre » n’est proposé que s’il existe VRAIMENT une zone menacée', () => {
  assertEquals(defendAvailable(DEFEND), true);
  assertEquals(defendAvailable(EXPAND), false);
  assertEquals(defendAvailable({ kind: 'first_capture' }), false);
  assertEquals(defendAvailable(null), false);
});

Deno.test('la recommandation suit la mission réelle, jamais un défaut arbitraire', () => {
  assertEquals(recommendedObjective(DEFEND), 'defend');
  assertEquals(recommendedObjective(EXPAND), 'conquer');
  assertEquals(recommendedObjective(null), 'conquer');
});

Deno.test('un « défendre » devenu sans cible retombe sur la recommandation', () => {
  // La zone est tombée pendant la préparation : garder l'objectif afficherait
  // une cible qui n'existe plus, et le CTA partirait défendre du vide.
  assertEquals(effectiveObjective('defend', EXPAND), 'conquer');
  assertEquals(effectiveObjective('defend', DEFEND), 'defend');
  assertEquals(effectiveObjective('conquer', DEFEND), 'conquer');
  assertEquals(effectiveObjective(null, DEFEND), 'defend');
});

// ─── La RAISON de la recommandation ──────────────────────────────────────────
//
// Le verrou central de ce fichier. « Rien ne presse ailleurs » est une
// AFFIRMATION sur le territoire du joueur ; jusqu'au 27/07/2026 l'écran
// l'écrivait par DÉFAUT, sur une lecture qui n'avait pas eu lieu.

Deno.test('RAISON : aucune lecture aboutie ⇒ on ne recommande RIEN sur le terrain', () => {
  // Les cinq statuts non-`ready`, avec la mission `null` qu'ils produisent tous.
  for (const status of ['idle', 'loading', 'failed', 'signed-out', 'unconfigured'] as const) {
    assertEquals(
      objectiveReasonKey({ status, mission: null, objective: 'conquer' }),
      'unknown',
      `${status} : l’écran a affirmé quelque chose sur les zones du joueur`,
    );
  }
});

Deno.test('RAISON : lecture aboutie SANS aucune zone ⇒ « la première », pas « agrandir »', () => {
  // Le cas de 100 % des ouvertures tant que la base est vide.
  assertEquals(
    objectiveReasonKey({ status: 'ready', mission: { kind: 'first_capture' }, objective: 'conquer' }),
    'first',
  );
  // Défensif : `mission === null` sur un statut `ready` (contrat impossible
  // aujourd'hui) ne doit pas retomber sur « agrandir » non plus.
  assertEquals(
    objectiveReasonKey({ status: 'ready', mission: null, objective: 'conquer' }),
    'first',
  );
});

Deno.test('RAISON : « agrandir » exige une lecture aboutie ET du territoire', () => {
  assertEquals(
    objectiveReasonKey({ status: 'ready', mission: EXPAND, objective: 'conquer' }),
    'expand',
  );
  // Le même EXPAND sur une lecture non aboutie ne peut pas exister (le moteur ne
  // le produit pas sans zones), mais si ça arrivait, le statut prime.
  assertEquals(
    objectiveReasonKey({ status: 'loading', mission: EXPAND, objective: 'conquer' }),
    'unknown',
  );
});

Deno.test('RAISON : l’échéance ne s’écrit que sur une mission de défense RÉELLE', () => {
  assertEquals(
    objectiveReasonKey({ status: 'ready', mission: DEFEND, objective: 'defend' }),
    'expiring',
  );
  // Objectif « défendre » sans mission de défense : jamais une échéance
  // inventée. (`effectiveObjective` l'empêche déjà en amont — deux verrous.)
  assertEquals(
    objectiveReasonKey({ status: 'ready', mission: EXPAND, objective: 'defend' }),
    'expand',
  );
  // Une défense RÉELLE que le joueur a choisi de délaisser pour conquérir :
  // c'est bien « agrandir » qu'on explique, pas l'échéance.
  assertEquals(
    objectiveReasonKey({ status: 'ready', mission: DEFEND, objective: 'conquer' }),
    'expand',
  );
});

Deno.test('RAISON : E16 et E17 ne se contredisent plus sur le même fait', () => {
  // La donnée du joueur neuf : lecture aboutie, aucune zone.
  const input = { status: 'ready', mission: { kind: 'first_capture' } as const } as const;
  // E16 refuse de recommander une mission…
  assertEquals(
    recommendedMissionView({
      status: input.status,
      mission: input.mission,
      opened: null,
      now: new Date(),
      ego: null,
      mine: [],
    }).kind,
    'empty',
  );
  // …et E17 ne dit plus « rien ne presse ailleurs » sur cette même donnée.
  assertEquals(
    objectiveReasonKey({ status: input.status, mission: input.mission, objective: 'conquer' }),
    'first',
  );
});

// ─── GPS ─────────────────────────────────────────────────────────────────────

Deno.test('GPS : aucune mesure ⇒ « recherche », jamais une bande peinte', () => {
  assertEquals(gpsRowKey({ kind: 'idle' }), 'searching');
  assertEquals(gpsRowKey({ kind: 'probing' }), 'searching');
  assertEquals(GPS_TONE.searching, 'unknown');
});

Deno.test('GPS : les bandes viennent des seuils d’E19, pas d’une seconde règle', () => {
  assertEquals(gpsRowKey({ kind: 'measured', accuracyM: 8 }), 'ready');
  assertEquals(gpsRowKey({ kind: 'measured', accuracyM: 22 }), 'approximate');
  assertEquals(gpsRowKey({ kind: 'measured', accuracyM: 120 }), 'poor');
});

Deno.test('GPS : précision NON chiffrée ⇒ « aucune mesure », pas une bande rouge', () => {
  assertEquals(gpsRowKey({ kind: 'measured', accuracyM: null }), 'unavailable');
  assertEquals(gpsRowKey({ kind: 'unavailable' }), 'unavailable');
  assertEquals(GPS_TONE.unavailable, 'blocked');
});

// ─── Batterie ────────────────────────────────────────────────────────────────

Deno.test('BATTERIE : sans mesure, la ligne dit « inconnu » — jamais « OK »', () => {
  assertEquals(batteryRowKey({ kind: 'unknown' }), 'unknown');
  // Et sa tonalité n'est PAS celle du succès : une ignorance ne se peint pas en
  // vert. C'est le point exact où cet écran pouvait devenir rassurant à tort.
  assertEquals(BATTERY_TONE.unknown, 'unknown');
});

Deno.test('BATTERIE : le seuil d’alerte est celui du système, et il est franc', () => {
  assertEquals(batteryRowKey({ kind: 'measured', percent: BATTERY_LOW_PERCENT, charging: false }), 'low');
  assertEquals(
    batteryRowKey({ kind: 'measured', percent: BATTERY_LOW_PERCENT + 1, charging: false }),
    'ok',
  );
});

Deno.test('BATTERIE : en charge, on n’alarme pas sur un téléphone branché', () => {
  assertEquals(batteryRowKey({ kind: 'measured', percent: 4, charging: true }), 'charging');
  assertEquals(BATTERY_TONE.charging, 'ok');
});

// ─── Synchronisation ─────────────────────────────────────────────────────────

Deno.test('SYNCHRO : file illisible ⇒ « inconnu », jamais « à jour »', () => {
  assertEquals(syncRow({ backend: true, signedIn: true, queue: { readable: false } }), {
    key: 'unknown',
    pending: 0,
  });
  // Lecture pas encore revenue : même refus d'affirmer.
  assertEquals(syncRow({ backend: true, signedIn: true, queue: null }), {
    key: 'unknown',
    pending: 0,
  });
  assertEquals(SYNC_TONE.unknown, 'unknown');
});

Deno.test('SYNCHRO : la profondeur affichée est celle de la file RÉELLE', () => {
  assertEquals(syncRow({ backend: true, signedIn: true, queue: { readable: true, depth: 2 } }), {
    key: 'pending',
    pending: 2,
  });
  assertEquals(syncRow({ backend: true, signedIn: true, queue: { readable: true, depth: 0 } }), {
    key: 'ready',
    pending: 0,
  });
});

Deno.test('SYNCHRO : sans session ou sans backend, aucune sortie ne peut partir', () => {
  assertEquals(syncRow({ backend: true, signedIn: false, queue: { readable: true, depth: 0 } }), {
    key: 'signed-out',
    pending: 0,
  });
  assertEquals(syncRow({ backend: false, signedIn: true, queue: { readable: true, depth: 0 } }), {
    key: 'signed-out',
    pending: 0,
  });
});
