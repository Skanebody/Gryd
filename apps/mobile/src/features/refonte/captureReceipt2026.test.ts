/**
 * GRYD — LE REÇU DE CAPTURE NE MENT PAS (recette R2C, constat 2 — 10/09/2026).
 *
 * ─── ÉTAPE 0 : LES DEUX DÉFAUTS QUE CES TESTS AURAIENT FAIT ÉCHOUER ─────────
 * ① `RunResult` formatait TOUTE surface en km² avec trois décimales. Une
 *    capture de 400 m² — au-dessus du minimum admissible d'une boucle à pied
 *    (5 000 m² § 5.5, donc a fortiori une part de gain plus petite) — s'affichait
 *    « +0 km² » : un gain réel annoncé comme un zéro nu, ce que L8/L14
 *    interdisent.
 * ② `captureExplanation2026` finissait par `return null` : tout motif que le
 *    client ne connaissait pas (et le serveur en gagne — lot R2S) était AVALÉ,
 *    et l'écran retombait sur « Sortie enregistrée ». Le joueur ne pouvait pas
 *    savoir pourquoi sa boucle n'avait pas pris de terrain.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  captureAreaLabel2026,
  captureExplanation2026,
  type CaptureReceipt2026,
} from './captureReceipt2026.ts';

const receipt = (over: Partial<CaptureReceipt2026>): CaptureReceipt2026 => ({
  ruleset: '2026.1',
  status: 'no_loop',
  loopAreaM2: 0,
  newTerrainM2: null,
  alreadyOwnedM2: null,
  neutralTakenM2: null,
  takenFromOthersM2: null,
  ...over,
});

Deno.test('surface : sous 0,01 km², on parle en m² — jamais un « 0 » nu', () => {
  assertEquals(captureAreaLabel2026(400, true), '400 m²');
  assert(captureAreaLabel2026(9_999, true)?.endsWith('m²'), '9 999 m² reste en m²');
  assert(!(captureAreaLabel2026(400, true) ?? '0').startsWith('0'), 'un gain réel ne s’affiche jamais 0');
});

Deno.test('surface : au-dessus du seuil, l’unité de la carte reste le km²', () => {
  assertEquals(captureAreaLabel2026(180_000, true), '0,18 km²');
  assertEquals(captureAreaLabel2026(180_000, false), '0.18 km²');
  assertEquals(captureAreaLabel2026(10_000, true), '0,01 km²');
});

Deno.test('surface : ce qui n’est pas une surface ne s’invente pas', () => {
  assertEquals(captureAreaLabel2026(Number.NaN, true), null);
  assertEquals(captureAreaLabel2026(-3, true), null);
  assertEquals(captureAreaLabel2026(null, true), null);
  assertEquals(captureAreaLabel2026(0, true), '0 m²');
});

Deno.test('motif inconnu : il est DIT, jamais avalé en « Sortie enregistrée »', () => {
  const unknown = captureExplanation2026(receipt({ status: 'no_loop', reason: 'closure_ambiguous' }), true);
  assert(unknown !== null, 'un motif que le client ne connaît pas doit rester visible');
  assert(unknown!.body.includes('closure_ambiguous'), 'le motif brut du serveur est affiché tel quel');
});

Deno.test('statut inconnu du client (contrat R2S) : dit, et jamais confondu avec une capture', () => {
  const rejected = captureExplanation2026(receipt({ status: 'rejected', reason: 'anticheat_review' }), true);
  assert(rejected !== null, 'un statut que le client ne connaît pas ne devient pas un gain');
  assert(rejected!.body.includes('anticheat_review'));
  assertEquals(captureExplanation2026(receipt({ status: 'published' }), true), null);
});
