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
  setFinishedTrace,
} from './finishedTrace.ts';

Deno.test('état initial : aucun tracé (jamais un tracé fantôme au premier rendu)', () => {
  clearFinishedTrace();
  assertEquals(getFinishedTrace(), []);
});

Deno.test('armer puis lire : le tracé mesuré ressort tel quel', () => {
  const trace = [
    { lat: 48.87, lng: 2.35 },
    { lat: 48.871, lng: 2.351 },
    { lat: 48.8705, lng: 2.3515 },
  ];
  setFinishedTrace(trace);
  assertEquals(getFinishedTrace(), trace);
});

Deno.test('PURGE au départ : la course N+1 ne récupère JAMAIS le tracé de la course N', () => {
  setFinishedTrace([
    { lat: 50.63, lng: 3.06 },
    { lat: 50.631, lng: 3.061 },
  ]);
  // Départ de la course suivante → purge (comme clearLastRunResult).
  clearFinishedTrace();
  assertEquals(getFinishedTrace(), []);
});
