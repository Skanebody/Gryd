/**
 * GRYD — LA CONSERVATION DES TRACÉS EST UN CHOIX, ET SON DÉFAUT NE DÉTRUIT RIEN.
 *
 * ═══ ÉTAPE 0 — LE DÉFAUT EXISTAIT ═══════════════════════════════════════════
 * Avant ce lot, GRYD gardait DEUX formes de la même trace avec deux durées de
 * vie opposées, et le joueur n'avait son mot à dire sur aucune :
 *   · `runs.polyline_masked` était effacée à 90 jours POUR TOUT LE MONDE — la
 *     constante `RAW_POLYLINE_RETENTION_DAYS` (90) et son job (0101 + 0102) ;
 *   · `runs.trace_points_2026` (points complets, horodatés) ne l'était JAMAIS.
 * Le premier test rejoue ce fait sur les constantes partagées : `keep` n'existe
 * pas dans l'ancien monde, et 90 y était une valeur unique, pas un choix.
 *
 * PUR : aucun import React Native, aucun réseau — Deno-testable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  RAW_POLYLINE_RETENTION_DAYS,
  TRACE_DELETE_REFUSALS_2026,
  TRACE_RETENTION_CHOICES_2026,
  TRACE_RETENTION_DEFAULT_2026,
} from '@klaim/shared';
import {
  TRACE_RETENTION_ORDER,
  parseTraceDelete,
  parseTraceRetention,
  traceDeleteFailure,
  traceRetentionDays,
  traceRetentionWriteFailure,
} from './traceRetention.ts';

Deno.test('étape 0 — 90 jours était une valeur UNIQUE, imposée à tout le monde', () => {
  // La constante de l'ancien monde existe toujours (une migration ne se
  // réécrit jamais, et `premium/analytics` s'en sert pour sa fenêtre) : ce
  // qu'elle n'est plus, c'est la SEULE durée possible.
  assertEquals(RAW_POLYLINE_RETENTION_DAYS, 90);
  assert(
    !(TRACE_RETENTION_CHOICES_2026 as readonly string[]).includes('90'),
    'la durée n’est plus un nombre nu : c’est un choix nommé',
  );
});

Deno.test('LE DÉFAUT NE DÉTRUIT RIEN — et c’est la décision du fondateur', () => {
  // « … mais ne pas purger directement » (11/09/2026). Le défaut est `keep`, et
  // `keep` n'a AUCUNE durée : aucune purge ne peut en découler.
  assertEquals(TRACE_RETENTION_DEFAULT_2026, 'keep');
  assertEquals(traceRetentionDays('keep'), null);
  assertEquals(traceRetentionDays('days_90'), 90);
  assertEquals(traceRetentionDays('days_365'), 365);
});

Deno.test('l’ordre d’affichage est celui de la constante partagée, défaut en tête', () => {
  assertEquals([...TRACE_RETENTION_ORDER], [...TRACE_RETENTION_CHOICES_2026]);
  assertEquals(TRACE_RETENTION_ORDER[0], TRACE_RETENTION_DEFAULT_2026);
});

Deno.test('AUCUN REPLI INVENTÉ : ce que le serveur n’a pas dit reste null', () => {
  for (const choice of TRACE_RETENTION_CHOICES_2026) {
    assertEquals(parseTraceRetention(choice), choice);
  }
  // Clé absente (serveur antérieur à 0195), valeur inconnue, type inattendu :
  // trois causes, une seule réponse — « on n'a pas pu lire ». Jamais `keep`,
  // qui serait un réglage affirmé que personne n'a confirmé.
  for (const raw of [undefined, null, 90, 'days_30', 'forever', '', {}, ['keep']]) {
    assertEquals(parseTraceRetention(raw), null, String(raw));
  }
});

Deno.test('profile_required a son verdict à lui, distinct d’un échec', () => {
  assertEquals(traceRetentionWriteFailure('profile_required'), { kind: 'profile-required' });
  assertEquals(traceRetentionWriteFailure('invalid_trace_retention'), { kind: 'failed' });
  assertEquals(traceRetentionWriteFailure('network request failed'), { kind: 'failed' });
});

Deno.test('les refus de l’effacement sont ceux que le SQL nomme', () => {
  // La liste partagée EST le contrat entre 0195 et l'écran : un refus que le
  // client ne saurait pas traduire deviendrait un « échec réseau » mensonger.
  assertEquals([...TRACE_DELETE_REFUSALS_2026].sort(), ['not_found', 'review_open', 'signed_out']);
  assertEquals(traceDeleteFailure('review_open'), { kind: 'review-open' });
  assertEquals(traceDeleteFailure('not_found'), { kind: 'not-found' });
  assertEquals(traceDeleteFailure('authentication_required'), { kind: 'signed-out' });
  // Ce qui n'est pas reconnu tombe sur `failed` — jamais sur un succès.
  assertEquals(traceDeleteFailure('deadline exceeded'), { kind: 'failed' });
});

Deno.test('« effacé » vient du SERVEUR, jamais de l’absence d’erreur', () => {
  assertEquals(parseTraceDelete({ deleted: true, runId: 'x' }), { kind: 'deleted' });
  // Idempotence : « il n'y avait rien à effacer » n'est ni un succès ni un
  // échec, et l'écran doit pouvoir le dire autrement.
  assertEquals(parseTraceDelete({ deleted: false, reason: 'already_empty' }), {
    kind: 'already-empty',
  });
  // Une forme inattendue n'annonce JAMAIS un effacement.
  for (const raw of [null, undefined, {}, { deleted: 'oui' }, { deleted: false }, 'ok']) {
    assertEquals(parseTraceDelete(raw), { kind: 'failed' }, String(raw));
  }
});
