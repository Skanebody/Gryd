/**
 * GRYD — le CTA « Défier un rival » ne MENT jamais : il n'existe QUE si le
 * serveur a placé `rivalReprise` (une reprise RÉELLE) ET que la course est
 * créditée. Verrouille les deux gardes — jamais un rival déduit du vide local,
 * jamais un défi greffé sur un refus (§11).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { rivalChallengeFromResult } from './rivalChallenge.ts';

Deno.test('pas de verdict serveur → aucun rival (jamais inventé)', () => {
  assertEquals(rivalChallengeFromResult(null, true), null);
});

Deno.test('verdict sans rivalReprise → aucun rival à défier', () => {
  assertEquals(rivalChallengeFromResult({}, true), null);
});

Deno.test('rivalReprise présent ET course créditée → on propose de défier (données réelles)', () => {
  assertEquals(
    rivalChallengeFromResult(
      { rivalReprise: { rivalCrew: 'MEUTE 20', sector: 'Buttes-Chaumont', zonesLost: 14 } },
      true,
    ),
    { rivalCrew: 'MEUTE 20', sector: 'Buttes-Chaumont', zonesLost: 14 },
  );
});

Deno.test('§11 : course NON créditée (refus/signalement) → jamais de défi', () => {
  assertEquals(
    rivalChallengeFromResult(
      { rivalReprise: { rivalCrew: 'MEUTE 20', sector: 'Buttes-Chaumont', zonesLost: 14 } },
      false,
    ),
    null,
  );
});
