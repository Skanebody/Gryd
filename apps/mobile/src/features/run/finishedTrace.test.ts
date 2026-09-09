/**
 * GRYD — le tracé du Résultat ne MENT jamais entre deux courses. Verrouille
 * l'invariant qui a déjà mordu `runResult` : sans purge au départ, la course
 * N+1 afficherait le tracé de la course N. Le store est structurel/pur — testé
 * ici sans RN (Deno).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  clearFinishedTrace,
  getFinishedTrace,
  getFinishedSegments,
  setFinishedTrace,
} from './finishedTrace.ts';
import { setResultOwner2026 } from './resultOwner2026.ts';
const scope = { ownerId: 'runner-a', clientRunId: 'run-a' };

Deno.test('état initial : aucun tracé (jamais un tracé fantôme au premier rendu)', () => {
  setResultOwner2026(scope.ownerId);
  clearFinishedTrace();
  assertEquals(getFinishedTrace(), []);
});

Deno.test('armer puis lire : le tracé mesuré ressort tel quel', () => {
  const trace = [
    { lat: 48.87, lng: 2.35 },
    { lat: 48.871, lng: 2.351 },
    { lat: 48.8705, lng: 2.3515 },
  ];
  setResultOwner2026(scope.ownerId);
  setFinishedTrace(trace, undefined, scope);
  assertEquals(getFinishedTrace(), trace);
});

Deno.test('PURGE au départ : la course N+1 ne récupère JAMAIS le tracé de la course N', () => {
  setResultOwner2026(scope.ownerId);
  setFinishedTrace([
    { lat: 50.63, lng: 3.06 },
    { lat: 50.631, lng: 3.061 },
  ], undefined, scope);
  // Départ de la course suivante → purge (comme clearLastRunResult).
  clearFinishedTrace();
  assertEquals(getFinishedTrace(), []);
});

Deno.test('trace et ruptures ne traversent jamais un changement de propriétaire', () => {
  const segments = [[{ lat: 48.87, lng: 2.35 }, { lat: 48.871, lng: 2.351 }], [{ lat: 48.872, lng: 2.352 }]];
  setResultOwner2026(scope.ownerId);
  setFinishedTrace(segments.flat(), segments, scope);
  assertEquals(getFinishedSegments(scope.ownerId, scope.clientRunId), segments);
  assertEquals(getFinishedTrace(scope.ownerId, 'another-run'), []);
  for (const owner of ['runner-b', null, undefined]) {
    setResultOwner2026(owner);
    assertEquals(getFinishedTrace(), []);
    assertEquals(getFinishedSegments(), []);
    assertEquals(getFinishedTrace(scope.ownerId), [], 'nommer un compte ne remplace pas la session active');
  }
  setResultOwner2026(scope.ownerId);
  assertEquals(getFinishedSegments(), segments, 'la lecture propriétaire reste possible à son retour');
});

Deno.test('un essai local est explicitement invité, jamais une identité non résolue', () => {
  const trace = [{ lat: 50.63, lng: 3.06 }, { lat: 50.631, lng: 3.061 }];
  setResultOwner2026(null);
  setFinishedTrace(trace, undefined, { ownerId: null, clientRunId: 'guest-run' });
  assertEquals(getFinishedTrace(), trace);
  setResultOwner2026(undefined);
  assertEquals(getFinishedTrace(), []);
  setResultOwner2026('runner-a');
  assertEquals(getFinishedTrace(), []);
  setResultOwner2026(null);
  assertEquals(getFinishedTrace(), trace);
});
