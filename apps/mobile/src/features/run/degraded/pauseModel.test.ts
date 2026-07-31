/**
 * GRYD — E23 : un test par TRANSITION et par CAS DÉGRADÉ.
 *
 * Ce que ces tests protègent tient en une phrase : l'écran ne doit jamais
 * présenter un CHOIX du joueur pour un CONSTAT de l'app, ni l'un des deux pour
 * un ACCIDENT. C'est la seule chose qu'un utilisateur en pleine sortie ne peut
 * pas vérifier lui-même.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { activityRules } from '@klaim/shared';
import {
  type ActivityPause,
  cancelActivityModel,
  describePause,
  stepPauseTelemetry,
} from './pauseModel.ts';

// ── LES TROIS SORTES D'ARRÊT NE DISENT PAS LA MÊME CHOSE ────────────────────

Deno.test('la pause MANUELLE est un choix : on en sort en tapant', () => {
  const m = describePause({ phase: 'paused-user', permissionRevoked: false });
  assertEquals(m.pause, 'user');
  assertEquals(m.origin, 'choice');
  assertEquals(m.exit, 'tap');
  assertEquals(m.recording, false);
});

Deno.test('la pause AUTO est un constat : on en sort en REPARTANT, pas en tapant', () => {
  const m = describePause({ phase: 'paused-auto', permissionRevoked: false });
  assertEquals(m.pause, 'auto_still');
  assertEquals(m.origin, 'observation');
  assertEquals(m.exit, 'movement');
});

Deno.test('la permission coupée est un ACCIDENT — ni choix, ni constat', () => {
  const m = describePause({ phase: 'tracking', permissionRevoked: true });
  assertEquals(m.pause, 'permission_revoked');
  assertEquals(m.origin, 'accident');
  assertEquals(m.exit, 'permission');
});

Deno.test('les trois arrêts ont trois origines DISTINCTES (jamais confondues)', () => {
  const origins = new Set([
    describePause({ phase: 'paused-user', permissionRevoked: false }).origin,
    describePause({ phase: 'paused-auto', permissionRevoked: false }).origin,
    describePause({ phase: 'tracking', permissionRevoked: true }).origin,
  ]);
  assertEquals(origins.size, 3);
});

// ── CAS DÉGRADÉS DE PRIORITÉ ────────────────────────────────────────────────

Deno.test('DÉGRADÉ : permission coupée PENDANT une pause manuelle — le geste du joueur reste dit', () => {
  const m = describePause({ phase: 'paused-user', permissionRevoked: true });
  assertEquals(m.pause, 'user');
  assertEquals(m.exit, 'tap');
});

Deno.test('DÉGRADÉ : permission coupée + immobilité — on ne dit pas « bouge pour reprendre »', () => {
  // Sans position, l'immobilité n'est pas observée : elle n'est pas mesurée.
  // Demander de bouger serait demander un geste qui ne marchera jamais.
  const m = describePause({ phase: 'paused-auto', permissionRevoked: true });
  assertEquals(m.pause, 'permission_revoked');
  assertEquals(m.exit, 'permission');
});

Deno.test('une activité TERMINÉE n’est pas « en pause » (elle ne peut pas repartir)', () => {
  const m = describePause({ phase: 'finished', permissionRevoked: false });
  assertEquals(m.pause, 'none');
  assertEquals(m.origin, null);
  assertEquals(m.recording, false);
});

Deno.test('une activité qui tourne enregistre, et n’offre aucun geste rare', () => {
  const m = describePause({ phase: 'tracking', permissionRevoked: false });
  assertEquals(m.pause, 'none');
  assertEquals(m.recording, true);
  assertEquals(m.offersRareGestures, false);
});

// ── LES GESTES RARES N'APPARAISSENT QUE DANS UNE PAUSE CHOISIE ──────────────

Deno.test('seule la pause CHOISIE offre Terminer/Annuler (jamais sous le pouce à un feu rouge)', () => {
  assert(describePause({ phase: 'paused-user', permissionRevoked: false }).offersRareGestures);
  for (const m of [
    describePause({ phase: 'paused-auto', permissionRevoked: false }),
    describePause({ phase: 'tracking', permissionRevoked: true }),
    describePause({ phase: 'tracking', permissionRevoked: false }),
    describePause({ phase: 'finished', permissionRevoked: false }),
    describePause({ phase: 'idle', permissionRevoked: false }),
  ]) {
    assertEquals(m.offersRareGestures, false);
  }
});

// ── TÉLÉMÉTRIE : UNE TRANSITION, UN EVENT — JAMAIS UN PAR SECONDE ───────────

Deno.test('aucun event tant que l’état ne CHANGE pas (l’écran recalcule à 1 Hz)', () => {
  const states: ActivityPause[] = ['none', 'user', 'auto_still', 'permission_revoked'];
  for (const s of states) assertEquals(stepPauseTelemetry(s, s), null);
});

Deno.test('entrée en pause manuelle → activity_paused { cause: user }', () => {
  assertEquals(stepPauseTelemetry('none', 'user'), {
    event: 'activity_paused',
    cause: 'user',
  });
});

Deno.test('entrée en pause auto → activity_paused { cause: auto_still }', () => {
  assertEquals(stepPauseTelemetry('none', 'auto_still'), {
    event: 'activity_paused',
    cause: 'auto_still',
  });
});

Deno.test('permission coupée → activity_interrupted, JAMAIS activity_paused', () => {
  const t = stepPauseTelemetry('none', 'permission_revoked');
  assertEquals(t, { event: 'activity_interrupted', cause: 'permission_revoked' });
  // La raison est écrite dans events.ts : mêler l'accident aux pauses rendrait
  // le taux de pause inexploitable (souffler ≠ le produit casse).
  assert(t !== null && t.event !== 'activity_paused');
});

Deno.test('toute reprise → activity_resumed { from: pause }, quelle que soit la pause quittée', () => {
  for (const from of ['user', 'auto_still', 'permission_revoked'] as const) {
    assertEquals(stepPauseTelemetry(from, 'none'), {
      event: 'activity_resumed',
      from: 'pause',
    });
  }
});

Deno.test('DÉGRADÉ : une pause auto qui devient un accident compte comme un accident', () => {
  assertEquals(stepPauseTelemetry('auto_still', 'permission_revoked'), {
    event: 'activity_interrupted',
    cause: 'permission_revoked',
  });
});

// ── ANNULER : LE SEUL GESTE QUI DÉTRUIT ─────────────────────────────────────

Deno.test('« Annuler » n’est offert QUE dans une pause choisie', () => {
  const base = { distanceM: 3_000, durationS: 900, activity: 'run' as const };
  assert(cancelActivityModel({ ...base, pause: 'user' }).offered);
  for (const pause of ['none', 'auto_still', 'permission_revoked'] as const) {
    assertEquals(cancelActivityModel({ ...base, pause }).offered, false);
  }
});

Deno.test('la phrase change selon que la sortie COMPTE déjà — plancher §3.2, pas un seuil local', () => {
  const rules = activityRules('run');
  const compte = cancelActivityModel({
    pause: 'user',
    distanceM: rules.minDistanceM,
    durationS: rules.minDurationS,
    activity: 'run',
  });
  assertEquals(compte.producesResult, true);
  assertEquals(compte.body, 'would_count');

  const trop_courte = cancelActivityModel({
    pause: 'user',
    distanceM: rules.minDistanceM - 1,
    durationS: rules.minDurationS,
    activity: 'run',
  });
  assertEquals(trop_courte.producesResult, false);
  assertEquals(trop_courte.body, 'plain');
});

Deno.test('DÉGRADÉ : le plancher est celui de la DISCIPLINE, pas celui de la course à pied', () => {
  const bike = activityRules('bike');
  const m = cancelActivityModel({
    pause: 'user',
    distanceM: bike.minDistanceM,
    durationS: bike.minDurationS,
    activity: 'bike',
  });
  assertEquals(m.producesResult, true);
});

Deno.test('DÉGRADÉ : distance/durée non finies ne fabriquent jamais un « ça compte »', () => {
  const m = cancelActivityModel({
    pause: 'user',
    distanceM: Number.NaN,
    durationS: 900,
    activity: 'run',
  });
  assertEquals(m.producesResult, false);
  assertEquals(m.body, 'plain');
});
