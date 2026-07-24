/**
 * GRYD — la célébration du pionnier ne MENT jamais : elle n'existe QUE si le
 * serveur a placé communeOpened ET que la course est créditée. Verrouille les
 * deux gardes (jamais une célébration déduite, jamais du festif sur un refus).
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { pioneerCelebration } from './pioneerCelebration.ts';

Deno.test('pas de verdict serveur → aucun pionnier (jamais déduit du vide local)', () => {
  assertEquals(pioneerCelebration(null, true), null);
});

Deno.test('verdict sans communeOpened → aucun pionnier', () => {
  assertEquals(pioneerCelebration({}, true), null);
});

Deno.test('communeOpened présent ET course créditée → on célèbre (nom réel)', () => {
  assertEquals(
    pioneerCelebration({ communeOpened: { insee: '48137', nom: 'Saint-Bauzile' } }, true),
    { insee: '48137', nom: 'Saint-Bauzile' },
  );
});

Deno.test('§11 : course NON créditée (refus/signalement) → jamais de célébration', () => {
  assertEquals(
    pioneerCelebration({ communeOpened: { insee: '48137', nom: 'Saint-Bauzile' } }, false),
    null,
  );
});
